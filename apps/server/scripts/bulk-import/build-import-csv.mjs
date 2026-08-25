#!/usr/bin/env node
/**
 * Expands the flat dataset catalog into a Vendure product-import CSV, giving every
 * product a size axis and — where the data actually supports one — a colour axis whose
 * swatches change the photo.
 *
 *     node apps/server/scripts/bulk-import/build-import-csv.mjs
 *     node apps/server/scripts/bulk-import/build-import-csv.mjs --limit=1        # one product
 *     node apps/server/scripts/bulk-import/build-import-csv.mjs --min-colours=2  # only multi-colour
 *
 * Input:  static/a/catalog.csv          (one row per photo, no options)
 *         static/a/dataset_clean/<category>/img_XXXX.jpg
 * Output: static/a/catalog-import.csv   (ready for importProducts)
 *
 * Four things the source file cannot be fed to Vendure as-is for:
 *
 *   1. Asset paths are bare filenames and 1186 of them collide across category folders
 *      (casual_shirts/img_0001.jpg and jeans/img_0001.jpg both exist). They are
 *      rewritten to <category>/<file>, resolved against importExportOptions.importAssetsDir.
 *   2. Prices are in minor units. The importer multiplies the CSV value by 100, so 3900
 *      would import as $3,900. They are divided by 100 here.
 *   3. Slugs are duplicated. Duplicates are suffixed -2, -3, ... so every product keeps a
 *      stable, addressable storefront URL.
 *   4. There are no option groups at all, which is what this script exists to add.
 *
 * ---------------------------------------------------------------------------
 * HOW COLOUR WORKS, AND WHY IT IS NOT INVENTED
 *
 * An earlier version of this script gave every product a synthetic Black/White colour
 * axis. That was wrong in a way that showed up directly in the storefront: all four
 * variants pointed at the product's single photo, so changing colour changed nothing on
 * screen, and a "White" swatch could sit on a photo of a blue shirt.
 *
 * The colourways are already in the source data — they were just spread across separate
 * rows. 61% of rows sit in a group where the same garment appears in several genuinely
 * different colours, each with its own photo, and the colour word in the product name is
 * accurate to the image. So instead of inventing colours, this groups rows that describe
 * the same garment and turns their real colours into the axis:
 *
 *   - The colour word(s) are stripped from the name to give a "base" garment key, e.g.
 *     "Olive Plaid Flannel Shirt" and "Burgundy Plaid Flannel Shirt" both key to
 *     "plaid flannel shirt" within the Casual Shirts category.
 *   - Rows in a group are bucketed by colour. Each bucket keeps ALL its photos; nothing
 *     is discarded, which matters because visual search embeds every product asset
 *     (see visual-search.service.ts) and dropping photos would shrink the index.
 *   - Buckets deeper than one photo are spread across sibling products round-robin:
 *     product #1 takes photo 1 of each colour, product #2 takes photo 2, and so on. That
 *     keeps the catalog broad instead of collapsing 325 near-duplicate "Slim Fit Formal
 *     Pants" listings into one monster product.
 *   - Colours per product are capped at MAX_COLOURS_PER_PRODUCT; a group with 28 colours
 *     becomes several products of a few swatches each rather than one unusable picker.
 *
 * Rows whose name carries no recognisable colour word (about a quarter of the catalog)
 * get no colour axis at all. That is the honest outcome: a product with one colourway
 * should not show a colour picker. The colour is still emitted as a facet either way, so
 * it stays filterable.
 *
 * TWO CAVEATS, both worth knowing before reading the result as ground truth:
 *   - Grouping merges garments that share a generic name. Every "Plaid Flannel Shirt"
 *     colourway lands on one product, and those are genuinely different plaids, not one
 *     plaid in several colours. It is defensible merchandising, not truth.
 *   - Sizes remain synthetic (S/M for tops, 30/32 for legwear). That is fine in a way
 *     synthetic colour was not: a size does not change the photograph, so an invented
 *     size promises the storefront nothing it cannot deliver.
 *
 * ---------------------------------------------------------------------------
 * WHY SIZE IS A SHARED GROUP AND COLOUR IS NOT
 *
 * `Name:code` syntax makes Vendure reuse one shared option group across products instead
 * of creating a group per product. Size uses it (two codes, since tops get S/M and
 * legwear 30/32) because those value sets are fixed for every product declaring them.
 *
 * Colour deliberately does NOT, because a shared group cannot vary per product. In
 * Importer.buildSharedOptionGroupMap only the FIRST occurrence of a code defines the
 * group's values, and any later product declaring a value outside that set throws
 * `Option value "X" not found in shared option group`. A shared colour code would abort
 * the import on the second product with a different colour. Omitting the code takes the
 * importer's per-product branch, which accepts an arbitrary value set.
 *
 * That costs one option group per multi-colour product. It is cheaper than it sounds:
 * the shared map is rebuilt per importProducts request and creates its groups
 * unconditionally, so even the "shared" codes already produce one group per batch, not
 * one per catalog.
 */
import {readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';

import {parseCsv, toCsv} from './csv.mjs';

const SERVER_DIR = path.resolve(import.meta.dirname, '../..');
const DATASET_DIR = path.join(SERVER_DIR, 'static/a/dataset_clean');
const DEFAULT_IN = path.join(SERVER_DIR, 'static/a/catalog.csv');
const DEFAULT_OUT = path.join(SERVER_DIR, 'static/a/catalog-import.csv');

/**
 * How many colour swatches one product may show. Four fits the storefront's
 * `grid-cols-2 sm:grid-cols-3` option layout without wrapping into a wall of buttons,
 * and keeps the widest group (38 colours) from becoming a single unusable product.
 * Raising it merges more aggressively: fewer products, each with a longer picker.
 */
const MAX_COLOURS_PER_PRODUCT = 4;

/**
 * Matched against the product name, longest first so "light blue" wins over "blue" and
 * "navy blue" over both. Multi-word entries must therefore precede their single-word
 * components. This is the vocabulary the dataset's generated names actually use; a word
 * missing here does not corrupt anything, it just leaves that row without a colour axis.
 */
const COLOUR_WORDS = [
    'charcoal grey', 'charcoal gray', 'light blue', 'dark blue', 'navy blue', 'sky blue',
    'royal blue', 'off white', 'light grey', 'dark grey', 'light gray', 'dark gray',
    'light green', 'dark green', 'light brown', 'dark brown', 'light pink',
    'black', 'white', 'grey', 'gray', 'red', 'blue', 'navy', 'green', 'olive', 'khaki',
    'beige', 'cream', 'brown', 'tan', 'charcoal', 'pink', 'purple', 'yellow', 'orange',
    'maroon', 'burgundy', 'indigo', 'ivory', 'sand', 'stone', 'mint', 'teal', 'lavender',
    'mustard', 'rust', 'wine', 'peach', 'coral', 'lilac', 'silver', 'gold', 'turquoise',
];

const COLOUR_PATTERN = new RegExp(
    `\\b(${[...COLOUR_WORDS].sort((a, b) => b.length - a.length).join('|')})\\b`,
    'g',
);

/**
 * Maps the source `facets` value onto its image folder and its size group. Two size
 * codes means two shared groups; products only ever reference the one for their category.
 */
const CATEGORIES = {
    'Casual Shirts': {dir: 'casual_shirts', size: {name: 'Size', code: 'size-top'}, sizes: ['S', 'M']},
    'Formal Shirts': {dir: 'formal_shirts', size: {name: 'Size', code: 'size-top'}, sizes: ['S', 'M']},
    Jeans: {dir: 'jeans', size: {name: 'Size', code: 'size-waist'}, sizes: ['30', '32']},
    'Formal Pants': {dir: 'formal_pants', size: {name: 'Size', code: 'size-waist'}, sizes: ['30', '32']},
};

/** Name of the per-product colour group. No `:code` — see the header note. */
const COLOUR_GROUP_NAME = 'Colour';

/** Facet the real colour is published under, so it stays filterable with no colour axis. */
const COLOUR_FACET = 'colour';

/** Every variant is created in stock; a 0 default would block add-to-cart on the storefront. */
const STOCK_ON_HAND = 100;

/**
 * Overrides the source CSV's `taxCategory` column for every row.
 *
 * The importer resolves this by case-insensitive regex against the tax category names in
 * the database (falling back to the first category), so 'zero' selects "Zero Tax" and
 * 'standard' would select "Standard Tax". Zero-rating is the right default for a
 * demo catalog: the channel has pricesIncludeTax: false, so a 20% category would quietly
 * show a $39.00 shirt at $46.80 on the storefront.
 *
 * Whatever this ends up as, `ensure-defaults` reads it back off the generated file and
 * guarantees a matching category exists — so the two never drift.
 */
const TAX_CATEGORY = 'zero';

const OUT_HEADER = [
    'name',
    'slug',
    'description',
    'assets',
    'facets',
    'optionGroups',
    'optionValues',
    'sku',
    'price',
    'taxCategory',
    'stockOnHand',
    'variantAssets',
    'variantFacets',
];

const args = parseArgs(process.argv.slice(2));
const inFile = args.in ? path.resolve(args.in) : DEFAULT_IN;
const outFile = args.out ? path.resolve(args.out) : DEFAULT_OUT;
const limit = args.limit ? Number(args.limit) : Infinity;
const minColours = args['min-colours'] ? Number(args['min-colours']) : 1;
const maxColours = args['max-colours'] ? Number(args['max-colours']) : MAX_COLOURS_PER_PRODUCT;
const checkImages = args['skip-image-check'] !== true;
const taxCategory = typeof args['tax-category'] === 'string' ? args['tax-category'] : TAX_CATEGORY;
/**
 * Leaves the `assets` and `variantAssets` columns empty and writes the intended wiring to
 * a sidecar JSON file instead, for `link-assets.mjs` to apply afterwards.
 *
 * Why: Vendure's importer has no notion of asset identity. It never records the CSV path
 * it read a file from (the stored `source` drops the folder and adds a collision suffix),
 * and AssetImporter's only cache is an in-memory Map for the current process. So every
 * import re-uploads every image even when the bucket already holds it — and because
 * `fileExists` probes the bucket rather than the database, each abandoned generation of
 * files makes the next import's name-collision search longer. Uploads had reached ~10
 * round trips per image on this catalog.
 *
 * Deferring makes the import pure database work, then relinks to the assets already
 * stored. See link-assets.mjs for how the sidecar is resolved back to Asset rows.
 */
const deferAssets = args['defer-assets'] === true;
const sidecarFile = `${outFile.replace(/\.csv$/, '')}.assets.json`;

if (Number.isNaN(limit) || limit <= 0) {
    fail(`--limit must be a positive number, got "${args.limit}"`);
}
if (Number.isNaN(maxColours) || maxColours < 1) {
    fail(`--max-colours must be at least 1, got "${args['max-colours']}"`);
}

const rows = parseCsv(await readFile(inFile, 'utf8'));
if (rows.length < 2) fail(`${inFile} has no data rows`);

const header = rows[0].map(h => h.trim());
const col = Object.fromEntries(header.map((name, i) => [name, i]));
for (const required of ['name', 'slug', 'description', 'assets', 'facets', 'sku', 'price', 'taxCategory']) {
    if (col[required] == null) fail(`${inFile} is missing the "${required}" column`);
}

// ---------------------------------------------------------------------------
// Pass 1: read every source row into a record, resolving its category and colour.
// ---------------------------------------------------------------------------

const records = [];
const missingImages = [];
const skipped = [];

for (const [index, row] of rows.slice(1).entries()) {
    const line = index + 2;
    const get = name => (row[col[name]] ?? '').trim();

    const name = get('name');
    if (name === '') continue; // blank trailing line

    const facets = get('facets');
    const categoryName = facets.split(':')[1]?.trim();
    const category = CATEGORIES[categoryName];
    if (!category) {
        skipped.push(`line ${line}: unknown category "${facets}"`);
        continue;
    }

    const assetPath = `${category.dir}/${get('assets')}`;
    if (checkImages && !(await exists(path.join(DATASET_DIR, assetPath)))) {
        missingImages.push(`line ${line}: ${assetPath}`);
        continue;
    }

    const {colour, base} = splitColour(name);

    records.push({
        order: index,
        name,
        // Always normalised, never passed through raw. Vendure slugifies on import, so a
        // source slug like "men's-striped-oxford-shirt" is stored as "mens-striped-..."
        // and the sidecar written by this script would then name a product that does not
        // exist, leaving those products unlinked.
        slug: slugify(get('slug') || name),
        description: get('description'),
        assetPath,
        facets,
        categoryName,
        category,
        price: toMajorUnits(get('price'), line),
        sku: get('sku') || slugify(name).toUpperCase(),
        // `colour` is null when the name carries no recognisable colour word, which
        // routes the record straight to a single-colourway product below.
        colour,
        base,
    });
}

// ---------------------------------------------------------------------------
// Pass 2: group same-garment rows, then chunk each group into products.
// ---------------------------------------------------------------------------

/** (category, colour-stripped name) -> colour -> records, preserving source order. */
const groups = new Map();
const solo = [];

for (const record of records) {
    if (!record.colour) {
        solo.push(record);
        continue;
    }
    const key = `${record.categoryName} ${record.base}`;
    let byColour = groups.get(key);
    if (!byColour) groups.set(key, (byColour = new Map()));
    const bucket = byColour.get(record.colour);
    if (bucket) bucket.push(record);
    else byColour.set(record.colour, [record]);
}

/** Each entry is the member list of one product: [{colour, record}, ...]. */
const productPlans = [];

for (const byColour of groups.values()) {
    // Deepest bucket first so the widest colour choice lands on the earliest sibling,
    // and alphabetically within equal depth so output is stable across runs.
    const colours = [...byColour.keys()].sort(
        (a, b) => byColour.get(b).length - byColour.get(a).length || a.localeCompare(b),
    );

    for (let start = 0; start < colours.length; start += maxColours) {
        const chunk = colours.slice(start, start + maxColours);
        const depth = Math.max(...chunk.map(colour => byColour.get(colour).length));

        for (let nth = 0; nth < depth; nth++) {
            const members = chunk
                .filter(colour => byColour.get(colour).length > nth)
                .map(colour => ({colour, record: byColour.get(colour)[nth]}));
            productPlans.push(members);
        }
    }
}

for (const record of solo) {
    productPlans.push([{colour: null, record}]);
}

// Emit in source order of each product's first photo, so a --limit run reads like the
// top of the source file rather than an arbitrary slice of the grouping.
productPlans.sort((a, b) => a[0].record.order - b[0].record.order);

// ---------------------------------------------------------------------------
// Pass 3: write the CSV.
// ---------------------------------------------------------------------------

const out = [];
const usedSlugs = new Set();
const usedSkus = new Set();
const colourHistogram = new Map();
/** slug -> {assets: [path], variants: {sku: path}}, consumed by link-assets.mjs. */
const assetPlan = {};
let products = 0;
let variants = 0;
let multiColourProducts = 0;
let photosUsed = 0;

for (const members of productPlans) {
    if (products >= limit) break;
    if (members.length < minColours) continue;

    const lead = members[0].record;
    const multiColour = members.length > 1;
    const {category} = lead;

    // A multi-colour product must not keep a colour in its own name — "Olive Plaid
    // Flannel Shirt" with a Burgundy swatch reads as a mistake. Single-colourway
    // products keep the original name, which is more specific and better for search.
    const displayName = multiColour ? titleCase(lead.base) : lead.name;
    const slug = uniqueSlug(multiColour ? slugify(displayName) : lead.slug, usedSlugs);

    const optionGroups = multiColour
        ? `${category.size.name}:${category.size.code}|${COLOUR_GROUP_NAME}`
        : `${category.size.name}:${category.size.code}`;

    // Product-level assets carry every colourway photo: it fills the storefront carousel
    // and, because the visual-search indexer embeds all of a product's assets, keeps
    // every image in the search index.
    const assets = members.map(member => member.record.assetPath).join('|');

    // The category facet comes from the source row; colour facets are added so colour
    // stays filterable even on products that have no colour axis.
    const facets = [
        lead.facets,
        ...members.filter(member => member.colour).map(member => `${COLOUR_FACET}:${colourLabel(member.colour)}`),
    ].join('|');

    const planEntry = {assets: members.map(member => member.record.assetPath), variants: {}};
    assetPlan[slug] = planEntry;

    let first = true;
    for (const member of members) {
        for (const size of category.sizes) {
            const sku = uniqueSku(`${member.record.sku}-${skuPart(size)}`, usedSkus);
            planEntry.variants[sku] = member.record.assetPath;
            out.push([
                first ? displayName : '',
                first ? slug : '',
                first ? lead.description : '',
                first && !deferAssets ? assets : '',
                first ? facets : '',
                first ? optionGroups : '',
                multiColour ? `${size}|${colourLabel(member.colour)}` : size,
                sku,
                // Per-colourway price, taken from that colour's own source row rather
                // than the product lead's — the dataset prices them differently.
                member.record.price,
                taxCategory,
                STOCK_ON_HAND,
                // The one photo for this colourway. Both sizes of a colour share it,
                // which is correct: a size does not change what the garment looks like.
                // AssetImporter caches by path for the whole run, so naming the same
                // path at product and variant level reuses one Asset row and uploads
                // nothing extra — it just adds the variant link and its featuredAssetId.
                deferAssets ? '' : member.record.assetPath,
                '', // variantFacets
            ]);
            first = false;
            variants++;
        }
    }

    products++;
    photosUsed += members.length;
    if (multiColour) multiColourProducts++;
    colourHistogram.set(members.length, (colourHistogram.get(members.length) ?? 0) + 1);
}

await writeFile(outFile, toCsv(OUT_HEADER, out), 'utf8');
await writeFile(sidecarFile, JSON.stringify(assetPlan, null, 0), 'utf8');

console.log(`wrote ${path.relative(process.cwd(), outFile)}`);
console.log(`wrote ${path.relative(process.cwd(), sidecarFile)} (${Object.keys(assetPlan).length} products)`);
if (deferAssets) {
    console.log('  assets DEFERRED — the CSV carries no image paths, so the import uploads nothing.');
    console.log('  run link-assets.mjs after importing to wire up the assets already in storage.');
}
console.log(`  ${products} products, ${variants} variants, ${photosUsed} photos used`);
console.log(
    `  ${multiColourProducts} products (${pct(multiColourProducts, products)}) have a real colour choice` +
        `, capped at ${maxColours} swatches`,
);
console.log(`  colours per product: ${[...colourHistogram.keys()].sort((a, b) => a - b)
    .map(n => `${n}x${colourHistogram.get(n)}`).join('  ')}`);
console.log(`  option groups: 2 shared size codes (size-top, size-waist) + one colour group per multi-colour product`);
console.log(`  tax category:  "${taxCategory}" (matched by regex against the database)`);
if (photosUsed !== records.length && limit === Infinity && minColours === 1) {
    console.warn(`  WARNING: ${records.length - photosUsed} source photos were not used`);
}
if (skipped.length) {
    console.warn(`  skipped ${skipped.length} rows with an unknown category:`);
    for (const s of skipped.slice(0, 5)) console.warn(`    ${s}`);
}
if (missingImages.length) {
    console.warn(`  skipped ${missingImages.length} rows whose image is missing from ${path.relative(process.cwd(), DATASET_DIR)}:`);
    for (const m of missingImages.slice(0, 5)) console.warn(`    ${m}`);
}
console.log(`\nnext: node apps/server/scripts/bulk-import/import-catalog.mjs`);

/**
 * Splits a product name into its colour and the garment underneath.
 *
 * "Navy and Red Checkered Flannel Shirt" -> {colour: 'navy/red', base: 'checkered flannel shirt'}
 *
 * Returns colour: null when nothing matches, or when removing the colour leaves too
 * little to identify a garment (a name that is only a colour word), so the caller can
 * fall back to a single-colourway product.
 */
function splitColour(name) {
    const lower = name.toLowerCase();
    const matches = lower.match(COLOUR_PATTERN);
    if (!matches) return {colour: null, base: null};

    const base = lower
        .replace(COLOUR_PATTERN, ' ')
        .replace(/\band\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[-\s]+|[-\s]+$/g, '');

    if (base.length < 3) return {colour: null, base: null};

    // De-duplicated so "Blue and Blue-Grey" cannot yield 'blue/blue', and sorted so word
    // order in the source name cannot split one colourway in two: without this, "Navy and
    // Red Checkered Flannel Shirt" and "Red and Navy Checkered Flannel Shirt" become two
    // separate swatches on the same product. Sorting loses which colour the name led
    // with, which is a fair trade for not showing the shopper the same colourway twice.
    return {colour: [...new Set(matches)].sort().join('/'), base};
}

/** 'navy/red' -> 'Navy / Red', the label shown on the swatch. */
function colourLabel(colour) {
    return colour.split('/').map(titleCase).join(' / ');
}

function titleCase(value) {
    return value.replace(/\b[a-z]/g, c => c.toUpperCase());
}

function pct(part, whole) {
    return whole === 0 ? '0%' : `${Math.round((part / whole) * 100)}%`;
}

function toMajorUnits(raw, line) {
    const minor = Number(raw);
    if (!Number.isFinite(minor)) fail(`line ${line}: price "${raw}" is not a number`);
    return (minor / 100).toFixed(2);
}

function slugify(value) {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function uniqueSlug(base, used) {
    if (!used.has(base)) {
        used.add(base);
        return base;
    }
    for (let n = 2; ; n++) {
        const candidate = `${base}-${n}`;
        if (!used.has(candidate)) {
            used.add(candidate);
            return candidate;
        }
    }
}

function uniqueSku(base, used) {
    if (!used.has(base)) {
        used.add(base);
        return base;
    }
    for (let n = 2; ; n++) {
        const candidate = `${base}-${n}`;
        if (!used.has(candidate)) {
            used.add(candidate);
            return candidate;
        }
    }
}

function skuPart(value) {
    return value.toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

async function exists(file) {
    try {
        await access(file);
        return true;
    } catch {
        return false;
    }
}

function parseArgs(argv) {
    const parsed = {};
    for (const arg of argv) {
        const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
        if (!match) fail(`unrecognised argument "${arg}"`);
        parsed[match[1]] = match[2] ?? true;
    }
    return parsed;
}

function fail(message) {
    console.error(`build-import-csv: ${message}`);
    process.exit(1);
}

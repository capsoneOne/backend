#!/usr/bin/env node
/**
 * Expands the flat dataset catalog into a Vendure product-import CSV, giving every
 * product a 2 x 2 size/colour option matrix (four variants per product).
 *
 *     node apps/server/scripts/bulk-import/build-import-csv.mjs
 *     node apps/server/scripts/bulk-import/build-import-csv.mjs --limit=1   # one product
 *
 * Input:  static/a/catalog.csv          (one row per product, no options)
 *         static/a/dataset_clean/<category>/img_XXXX.jpg
 * Output: static/a/catalog-import.csv   (four rows per product, ready for importProducts)
 *
 * Four things the source file cannot be fed to Vendure as-is for, all handled here:
 *
 *   1. Asset paths are bare filenames and 1186 of them collide across category folders
 *      (casual_shirts/img_0001.jpg and jeans/img_0001.jpg both exist). They are
 *      rewritten to <category>/<file>, resolved against importExportOptions.importAssetsDir.
 *   2. Prices are in minor units. The importer multiplies the CSV value by 100, so 3900
 *      would import as $3,900. They are divided by 100 here.
 *   3. 2350 slugs are duplicated. Duplicates are suffixed -2, -3, ... so every product
 *      keeps a stable, addressable storefront URL.
 *   4. There are no option groups at all, which is what this script exists to add.
 *
 * Option groups are emitted with the `Name:code` syntax, which makes Vendure reuse ONE
 * shared group across every product that names the same code instead of creating a new
 * group per product. At this catalog size that is the difference between 3 option groups
 * and 8,590 of them.
 *
 * Sizes are category-aware — tops get S/M, legwear gets 30/32 — via two distinct shared
 * codes. A shared group's value set is fixed by its first occurrence, so every product
 * declaring a given code must emit exactly that set.
 *
 * NOTE ON COLOUR: the colour values are synthetic. Each product has exactly one photo,
 * and both colour variants point at it, so a "White" variant may show a blue shirt. That
 * is fine for exercising cart/checkout option selection and harmless for visual search
 * (embeddings are per product asset, not per variant), but do not read the swatches as
 * ground truth. Change COLOUR_VALUES below if a different pair reads better in the UI.
 */
import {readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';

import {parseCsv, toCsv} from './csv.mjs';

const SERVER_DIR = path.resolve(import.meta.dirname, '../..');
const DATASET_DIR = path.join(SERVER_DIR, 'static/a/dataset_clean');
const DEFAULT_IN = path.join(SERVER_DIR, 'static/a/catalog.csv');
const DEFAULT_OUT = path.join(SERVER_DIR, 'static/a/catalog-import.csv');

/** Shared across every product, so all four categories share one Colour group. */
const COLOUR_GROUP = {name: 'Colour', code: 'colour'};
const COLOUR_VALUES = ['Black', 'White'];

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
const checkImages = args['skip-image-check'] !== true;
const taxCategory = typeof args['tax-category'] === 'string' ? args['tax-category'] : TAX_CATEGORY;

if (Number.isNaN(limit) || limit <= 0) {
    fail(`--limit must be a positive number, got "${args.limit}"`);
}

const rows = parseCsv(await readFile(inFile, 'utf8'));
if (rows.length < 2) fail(`${inFile} has no data rows`);

const header = rows[0].map(h => h.trim());
const col = Object.fromEntries(header.map((name, i) => [name, i]));
for (const required of ['name', 'slug', 'description', 'assets', 'facets', 'sku', 'price', 'taxCategory']) {
    if (col[required] == null) fail(`${inFile} is missing the "${required}" column`);
}

const out = [];
const usedSlugs = new Set();
const usedSkus = new Set();
const missingImages = [];
const skipped = [];
let products = 0;
let variants = 0;

for (const [index, row] of rows.slice(1).entries()) {
    if (products >= limit) break;
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

    const slug = uniqueSlug(get('slug') || slugify(name), usedSlugs);
    const price = toMajorUnits(get('price'), line);
    const baseSku = get('sku') || slug.toUpperCase();
    const optionGroups = `${category.size.name}:${category.size.code}|${COLOUR_GROUP.name}:${COLOUR_GROUP.code}`;

    let first = true;
    for (const size of category.sizes) {
        for (const colour of COLOUR_VALUES) {
            const sku = uniqueSku(`${baseSku}-${skuPart(size)}-${skuPart(colour)}`, usedSkus);
            out.push([
                first ? name : '',
                first ? slug : '',
                first ? get('description') : '',
                first ? assetPath : '',
                first ? facets : '',
                first ? optionGroups : '',
                `${size}|${colour}`,
                sku,
                price,
                taxCategory,
                STOCK_ON_HAND,
                // Same path as the product's asset, not a second copy. AssetImporter
                // caches by path for the whole run, so this reuses the one Asset row and
                // uploads nothing extra — it just adds the variant link and sets the
                // variant's featuredAssetId. Without it variants render with no image,
                // because a variant does not inherit its product's asset in Vendure.
                assetPath,
                '', // variantFacets
            ]);
            first = false;
            variants++;
        }
    }
    products++;
}

await writeFile(outFile, toCsv(OUT_HEADER, out), 'utf8');

console.log(`wrote ${path.relative(process.cwd(), outFile)}`);
console.log(`  ${products} products x ${variants / (products || 1)} variants = ${variants} variants`);
console.log(`  option groups: 3 shared (size-top, size-waist, colour)`);
console.log(`  tax category:  "${taxCategory}" (matched by regex against the database)`);
if (skipped.length) {
    console.warn(`  skipped ${skipped.length} rows with an unknown category:`);
    for (const s of skipped.slice(0, 5)) console.warn(`    ${s}`);
}
if (missingImages.length) {
    console.warn(`  skipped ${missingImages.length} rows whose image is missing from ${path.relative(process.cwd(), DATASET_DIR)}:`);
    for (const m of missingImages.slice(0, 5)) console.warn(`    ${m}`);
}
console.log(`\nnext: node apps/server/scripts/bulk-import/import-catalog.mjs`);

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

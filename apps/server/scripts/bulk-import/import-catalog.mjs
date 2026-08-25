#!/usr/bin/env node
/**
 * Dumps the generated import CSV into a running Vendure server via the Admin API's
 * `importProducts` mutation, in resumable batches.
 *
 *     node apps/server/scripts/bulk-import/import-catalog.mjs
 *     node apps/server/scripts/bulk-import/import-catalog.mjs --limit=1     # smoke test
 *     node apps/server/scripts/bulk-import/import-catalog.mjs --batch=10
 *     node apps/server/scripts/bulk-import/import-catalog.mjs --restart     # ignore saved progress
 *
 * Requires the server to be running (`npm run dev:server`) and its config to point
 * importExportOptions.importAssetsDir at static/a/dataset_clean — the CSV's asset paths
 * are resolved relative to that directory, server-side.
 *
 * Runs `ensure-defaults.mjs` inline first (skip with --skip-setup). That step reuses
 * whatever the database already has and only creates what is missing, so it costs one
 * round of queries on an already-configured server and removes the failure mode where
 * an import dies 3,000 products in because nothing set a default tax zone.
 *
 * Why batches rather than one request: the mutation creates every product, variant and
 * asset inside a single HTTP request. The full catalog is ~4,300 products, ~17,200
 * variants and ~4,300 image uploads; one request would sit far past Node's 5-minute
 * response-headers timeout and lose everything already done. Batches also give real
 * progress and let a failure be retried from where it stopped.
 *
 * Why a progress file: `importProducts` always creates, never upserts. Re-running from
 * the top would duplicate every product already in the database. Progress is written
 * after each successful batch and keyed to the CSV's size and mtime, so editing the CSV
 * invalidates it rather than silently resuming into a different file.
 */
import {readFile, writeFile, stat, unlink} from 'node:fs/promises';
import path from 'node:path';

import {createAdminClient} from './admin-api.mjs';
import {parseCsv, toCsv, groupByProduct} from './csv.mjs';
import {ensureDefaults} from './ensure-defaults.mjs';

const SERVER_DIR = path.resolve(import.meta.dirname, '../..');
const DEFAULT_CSV = path.join(SERVER_DIR, 'static/a/catalog-import.csv');

const client = createAdminClient();
const {gql, upload} = client;
const ADMIN_API = client.endpoint;

const args = parseArgs(process.argv.slice(2));
const csvFile = args.file ? path.resolve(args.file) : DEFAULT_CSV;
const stateFile = `${csvFile}.progress.json`;
const batchSize = positiveInt(args.batch, 25);
const limit = args.limit == null ? Infinity : positiveInt(args.limit, 0);
const dryRun = args['dry-run'] === true;
const reindexAfter = args['no-reindex'] !== true;
const setupFirst = args['skip-setup'] !== true;
/**
 * Abort once a batch reports this many row errors, unless --allow-errors is passed.
 *
 * `importProducts` reports a failed asset as a per-row error and then creates the product
 * anyway, with no images. That is close to the worst outcome available: the run "succeeds",
 * the counts look right, and the catalog is silently blank. Losing R2 mid-import once
 * produced 12,543 such errors and left 97% of products imageless, so the default is now to
 * stop at the first batch that looks systemically broken rather than plough on.
 */
const maxBatchErrors = args['allow-errors'] === true ? Infinity : positiveInt(args['max-errors'], 5);

const csvText = await readFile(csvFile, 'utf8').catch(() => {
    fail(
        `cannot read ${path.relative(process.cwd(), csvFile)}\n` +
            'Generate it first: node apps/server/scripts/bulk-import/build-import-csv.mjs',
    );
});
const rows = parseCsv(csvText);
if (rows.length < 2) fail(`${csvFile} has no data rows`);

const header = rows[0];
const products = groupByProduct(rows.slice(1));
const selected = products.slice(0, limit === Infinity ? products.length : limit);
const variantCount = selected.reduce((n, group) => n + group.length, 0);

// Read the tax category out of the file rather than hardcoding it, so the setup step
// guarantees exactly what this CSV asks for. Changing the generator's TAX_CATEGORY then
// needs no matching edit here, and the two cannot drift apart unnoticed.
const taxCategoryColumn = header.indexOf('taxCategory');
const csvTaxCategory = taxCategoryColumn === -1 ? undefined : rows[1][taxCategoryColumn]?.trim();

console.log(`${path.relative(process.cwd(), csvFile)}: ${products.length} products, ${rows.length - 1} variant rows`);
console.log(`importing ${selected.length} products (${variantCount} variants) in batches of ${batchSize}`);

if (dryRun) {
    const batches = Math.ceil(selected.length / batchSize);
    console.log(`dry run — would send ${batches} request${batches === 1 ? '' : 's'} to ${ADMIN_API}`);
    process.exit(0);
}

const fingerprint = await fingerprintOf(csvFile);
let done = 0;
if (args.restart === true) {
    await unlink(stateFile).catch(() => {});
} else {
    const saved = await readState();
    if (saved) {
        if (saved.fingerprint !== fingerprint) {
            fail(
                `${path.relative(process.cwd(), stateFile)} was written for a different version of the CSV.\n` +
                    'Re-run with --restart if the database was reset, or delete the progress file.',
            );
        }
        done = saved.products;
        if (done > 0) console.log(`resuming after ${done} products already imported`);
    }
}

if (done >= selected.length) {
    console.log('nothing left to import');
    process.exit(0);
}

await client.login();

if (setupFirst) {
    console.log('\nchecking import prerequisites (reuses anything that already exists)');
    const setup = await ensureDefaults(client, {
        taxCategory: csvTaxCategory,
        log: line => console.log(line),
    });
    console.log(`  -> variants will import against tax category "${setup.taxCategory.name}"\n`);
}

let imported = 0;
let processed = 0;
const errors = [];
const startedAt = Date.now();

for (let offset = done; offset < selected.length; offset += batchSize) {
    const batch = selected.slice(offset, offset + batchSize);
    const csv = toCsv(header, batch.flat());
    const label = `${offset + 1}-${offset + batch.length} / ${selected.length}`;

    let info;
    try {
        info = await importProducts(csv);
    } catch (e) {
        console.error(`\nbatch ${label} failed: ${e.message}`);
        if (/HEADERS_TIMEOUT|terminated|fetch failed/i.test(e.message)) {
            console.error('The batch probably outran the response timeout. Retry with a smaller --batch.');
        }
        console.error(`Progress is saved — re-run the same command to resume at product ${offset + 1}.`);
        process.exit(1);
    }

    imported += info.imported;
    processed += info.processed;
    if (info.errors?.length) {
        errors.push(...info.errors);
        console.warn(`\nbatch ${label}: ${info.errors.length} error(s), first: ${info.errors[0]}`);
    }
    await writeState(offset + batch.length, fingerprint);

    if (info.errors?.length > maxBatchErrors) {
        console.error(
            `\nbatch ${label} reported ${info.errors.length} errors, over the --max-errors limit of ${maxBatchErrors}.\n` +
                'Products are created even when their assets fail, so continuing would import a\n' +
                'catalog with missing images. Fix the cause and re-run to resume from here, or\n' +
                'pass --allow-errors if these errors are genuinely expected.',
        );
        process.exit(1);
    }

    const elapsed = (Date.now() - startedAt) / 1000;
    const rate = (offset + batch.length - done) / elapsed;
    const remaining = Math.round((selected.length - offset - batch.length) / (rate || 1));
    process.stdout.write(
        `\r  ${label} imported  (${rate.toFixed(1)} products/s, ~${remaining}s left)          `,
    );
}

console.log(`\n\nimported ${imported} products (${processed} processed) with ${errors.length} error(s)`);
for (const error of errors.slice(0, 10)) console.log(`  ${error}`);
if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);

if (reindexAfter) {
    const search = await gql(`mutation { reindex { id } }`);
    console.log(`keyword search reindex queued, job ${search.reindex.id}`);
    const visual = await gql(`mutation { reindexVisualSearch }`);
    console.log(`visual search: ${visual.reindexVisualSearch} products queued for embedding`);
    console.log('Both run on the worker — watch its log, and do not evaluate search until they finish.');
} else {
    console.log('skipped reindexing; keyword and visual search will not see these products until you do.');
}

/** `importProducts` takes an Upload scalar, so this goes up as a multipart file. */
async function importProducts(csv) {
    const data = await upload(
        `mutation Import($file: Upload!) {
            importProducts(csvFile: $file) { imported processed errors }
        }`,
        {content: csv, filename: 'catalog-import.csv', mimeType: 'text/csv'},
    );
    return data.importProducts;
}

async function fingerprintOf(file) {
    const s = await stat(file);
    return `${s.size}:${Math.round(s.mtimeMs)}`;
}

async function readState() {
    try {
        return JSON.parse(await readFile(stateFile, 'utf8'));
    } catch {
        return null;
    }
}

async function writeState(productsDone, fp) {
    await writeFile(stateFile, JSON.stringify({products: productsDone, fingerprint: fp}, null, 2), 'utf8');
}

function positiveInt(value, fallback) {
    if (value == null || value === true) return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) fail(`expected a positive integer, got "${value}"`);
    return n;
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
    console.error(`import-catalog: ${message}`);
    process.exit(1);
}

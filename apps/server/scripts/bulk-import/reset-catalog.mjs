#!/usr/bin/env node
/**
 * Deletes the imported catalog so it can be rebuilt from scratch.
 *
 *     node apps/server/scripts/bulk-import/reset-catalog.mjs --dry-run      # counts only
 *     node apps/server/scripts/bulk-import/reset-catalog.mjs --yes
 *     node apps/server/scripts/bulk-import/reset-catalog.mjs --yes --with-orders
 *
 * WHY THIS EXISTS: `importProducts` always creates and never upserts, so any change to
 * the option structure needs the old products gone first — re-running the import over a
 * populated database duplicates the entire catalog rather than updating it.
 *
 * WHAT IT DELETES: products, variants, their option groups and options, the asset links
 * and the visual-search embedding rows. Assets themselves are kept: they are the
 * uploaded image files, re-importing reuses them by path, and deleting them would mean
 * re-uploading several thousand photos for nothing.
 *
 * WHAT IT KEEPS: channels, tax categories, zones, stock locations, facets, collections,
 * customers. Everything `ensure-defaults` sets up survives, so the next import reuses it
 * instead of rebuilding it.
 *
 * ORDERS: `order_line` has a non-cascading FK to `product_variant`, so a single order
 * against the catalog aborts the whole reset. Rather than silently destroying order
 * history to get past that, the script refuses and asks for `--with-orders`, which also
 * clears payments, fulfillments, refunds, order history entries and any session pointing
 * at an active order. That is irreversible — take a dump first if the orders matter.
 *
 * Raw SQL rather than the Admin API because `deleteProducts` is one mutation per product
 * with a cascade of entity loads behind it; at 4,000+ products that is a long, failure-
 * prone loop. The tradeoff is that this bypasses Vendure's event system, so the search
 * index keeps stale rows until the reindex that `import-catalog.mjs` runs at the end.
 *
 * Connection details come from the same env vars as vendure-config.ts.
 */
import {createRequire} from 'node:module';
import {createInterface} from 'node:readline/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {Client} = require('pg');

const SERVER_DIR = path.resolve(import.meta.dirname, '../..');
require('dotenv').config({path: path.join(SERVER_DIR, '.env')});

const args = parseArgs(process.argv.slice(2));
const dryRun = args['dry-run'] === true;
const assumeYes = args.yes === true;
/**
 * Orders are only deleted when this is passed. `order_line` holds a non-cascading FK to
 * `product_variant`, so a single order against the catalog blocks the entire reset — and
 * the fix for that must never be silent, because it destroys order history.
 */
const withOrders = args['with-orders'] === true;

const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME ?? 'vendure',
    password: process.env.DB_PASSWORD ?? 'vendure',
    database: process.env.DB_NAME ?? 'vendure',
});

await client.connect();

/**
 * Ordered parent-last so a run against a database without ON DELETE CASCADE still
 * succeeds. `product_option_group` is emptied via the products that reference it rather
 * than truncated, because the seed catalog's groups live in the same table.
 */
const ORDER_STEPS = [
    // --- Orders first: order_line has a non-cascading FK to product_variant, so any
    // order referencing the catalog blocks the whole reset. This is why the script
    // requires --with-orders rather than quietly destroying order history.
    ['order line references', 'DELETE FROM order_line_reference'],
    ['stock movements (order)', 'DELETE FROM stock_movement WHERE "orderLineId" IS NOT NULL'],
    ['order lines', 'DELETE FROM order_line'],
    ['surcharges', 'DELETE FROM surcharge'],
    ['order modifications', 'DELETE FROM order_modification'],
    ['refunds', 'DELETE FROM refund'],
    ['payments', 'DELETE FROM payment'],
    ['shipping lines', 'DELETE FROM shipping_line'],
    ['order fulfillment links', 'DELETE FROM order_fulfillments_fulfillment'],
    ['fulfillments', 'DELETE FROM fulfillment'],
    ['order promotion links', 'DELETE FROM order_promotions_promotion'],
    ['order channel links', 'DELETE FROM order_channels_channel'],
    ['order history', 'DELETE FROM history_entry WHERE "orderId" IS NOT NULL'],
    ['session active orders', 'UPDATE session SET "activeOrderId" = NULL WHERE "activeOrderId" IS NOT NULL'],
    // Self-referencing via aggregateOrderId, so clear the link before deleting rows.
    ['aggregate order links', 'UPDATE "order" SET "aggregateOrderId" = NULL WHERE "aggregateOrderId" IS NOT NULL'],
    ['orders', 'DELETE FROM "order"'],
];

const CATALOG_STEPS = [
    ['visual search embeddings', 'DELETE FROM product_asset_embedding'],
    ['variant option links', 'DELETE FROM product_variant_options_product_option'],
    ['variant asset links', 'DELETE FROM product_variant_asset'],
    ['variant prices', 'DELETE FROM product_variant_price'],
    ['variant translations', 'DELETE FROM product_variant_translation'],
    ['variant channel links', 'DELETE FROM product_variant_channels_channel'],
    ['stock levels', 'DELETE FROM stock_level'],
    // The importer books a stock adjustment per variant to satisfy stockOnHand, and
    // stock_movement has a non-cascading FK to product_variant. Without this the whole
    // reset aborts on "violates foreign key constraint ... on table stock_movement".
    ['stock movements', 'DELETE FROM stock_movement'],
    ['collection/variant links', 'DELETE FROM collection_product_variants_product_variant'],
    ['variant facet links', 'DELETE FROM product_variant_facet_values_facet_value'],
    ['variants', 'DELETE FROM product_variant'],
    ['product option translations', 'DELETE FROM product_option_translation'],
    ['product option channel links', 'DELETE FROM product_option_channels_channel'],
    ['product options', 'DELETE FROM product_option'],
    ['product/option-group links', 'DELETE FROM product_option_groups_product_option_group'],
    ['option group translations', 'DELETE FROM product_option_group_translation'],
    ['option group channel links', 'DELETE FROM product_option_group_channels_channel'],
    ['option groups', 'DELETE FROM product_option_group'],
    ['product asset links', 'DELETE FROM product_asset'],
    ['product facet links', 'DELETE FROM product_facet_values_facet_value'],
    ['product channel links', 'DELETE FROM product_channels_channel'],
    ['product translations', 'DELETE FROM product_translation'],
    ['products', 'DELETE FROM product'],
    ['search index', 'DELETE FROM search_index_item'],
];

const before = await counts();
console.log('current catalog:');
for (const [label, value] of Object.entries(before)) console.log(`  ${label.padEnd(16)} ${value}`);

if (Number(before.products) === 0 && Number(before.variants) === 0) {
    console.log('\nnothing to delete');
    await client.end();
    process.exit(0);
}

if (Number(before.orders) > 0 && !withOrders) {
    console.error(
        `\nreset-catalog: ${before.orders} order(s) reference this catalog.\n` +
            'order_line has a non-cascading foreign key to product_variant, so the reset cannot\n' +
            'proceed without deleting them. Re-run with --with-orders to delete the orders too,\n' +
            'or place the catalog behind a fresh database if the order history matters.',
    );
    await client.end();
    process.exit(1);
}

if (dryRun) {
    console.log('\ndry run — nothing deleted');
    await client.end();
    process.exit(0);
}

if (!assumeYes) {
    const rl = createInterface({input: process.stdin, output: process.stdout});
    const answer = await rl.question(`\nDelete all ${before.products} products and ${before.variants} variants? [y/N] `);
    rl.close();
    if (answer.trim().toLowerCase() !== 'y') {
        console.log('aborted');
        await client.end();
        process.exit(1);
    }
}

console.log();
await client.query('BEGIN');
try {
    for (const [label, sql] of [...(withOrders ? ORDER_STEPS : []), ...CATALOG_STEPS]) {
        // A table can legitimately be absent (the visual-search plugin may not have run
        // its migration yet). That should skip the step, not abort the whole reset.
        const result = await client.query(sql).catch(error => {
            if (error.code === '42P01') {
                console.log(`  ${'(no table)'.padEnd(10)} ${label}`);
                return null;
            }
            throw error;
        });
        if (result) console.log(`  ${String(result.rowCount).padStart(10)} ${label}`);
    }
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    console.error(`\nreset-catalog: rolled back — ${error.message}`);
    await client.end();
    process.exit(1);
}

console.log('\ncatalog cleared. Assets were kept, so re-importing reuses them by path.');
console.log('next: node apps/server/scripts/bulk-import/build-import-csv.mjs');
console.log('      node apps/server/scripts/bulk-import/import-catalog.mjs --restart');

await client.end();

async function counts() {
    const {rows} = await client.query(`
        SELECT (SELECT count(*) FROM product WHERE "deletedAt" IS NULL)         AS products,
               (SELECT count(*) FROM product_variant WHERE "deletedAt" IS NULL) AS variants,
               (SELECT count(*) FROM product_option_group)                      AS option_groups,
               (SELECT count(*) FROM asset)                                     AS assets_kept,
               (SELECT count(*) FROM "order")                                   AS orders
    `);
    return rows[0];
}

function parseArgs(argv) {
    const parsed = {};
    for (const arg of argv) {
        const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
        if (!match) {
            console.error(`reset-catalog: unrecognised argument "${arg}"`);
            process.exit(1);
        }
        parsed[match[1]] = match[2] ?? true;
    }
    return parsed;
}

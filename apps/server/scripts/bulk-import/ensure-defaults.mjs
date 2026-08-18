#!/usr/bin/env node
/**
 * Ensures the baseline records a product import needs, creating only what is missing.
 *
 *     node apps/server/scripts/bulk-import/ensure-defaults.mjs
 *     node apps/server/scripts/bulk-import/ensure-defaults.mjs --dry-run
 *     node apps/server/scripts/bulk-import/ensure-defaults.mjs --tax-rate=0
 *
 * `importProducts` does not create infrastructure. It assumes a channel that can already
 * price a variant, and fails in two ways that read as bugs in the CSV when they are not:
 *
 *   - no TaxCategory at all -> the importer throws outright before touching a row
 *   - no defaultTaxZone on the channel -> every variant fails with "The active tax zone
 *     could not be determined"
 *
 * THE RULE HERE IS REUSE, NOT RECONCILE. Anything that already exists is adopted as-is and
 * never edited. The only write to an existing record is filling a channel default that is
 * currently null. That matters because this runs against databases that already have a
 * catalog: `scripts/seed/index.mjs` deliberately reshapes the channel around Cambodia —
 * disabling countries, moving zone members — and doing that from an import step would
 * silently retax an existing storefront.
 *
 * Safe to run repeatedly. Run it before `import-catalog.mjs`, which also calls it inline.
 */
import {createAdminClient} from './admin-api.mjs';

/** Used only when the database has nothing to reuse. */
const FALLBACK = {
    countryCode: 'KH',
    countryName: 'Cambodia',
    zoneName: 'Default Zone',
    // Matches the generator's TAX_CATEGORY. An import passes its CSV's actual value in,
    // so this only applies when the script is run standalone.
    taxCategory: 'zero',
    taxRateName: 'Default Rate',
    stockLocationName: 'Default Stock Location',
};

/**
 * Turns the regex-matchable value used in the CSV into a name worth showing in the admin
 * UI — 'zero' becomes "Zero Tax", which still matches /zero/i. Without this, a database
 * with no tax categories ends up with one named, literally, "zero".
 */
function displayName(value) {
    const titled = value.replace(/\b\w/g, c => c.toUpperCase());
    return /tax/i.test(titled) ? titled : `${titled} Tax`;
}

/**
 * @param client  from createAdminClient(), already logged in
 * @param options {taxCategory?, taxRate?, dryRun?, log?}
 * @returns a summary of what was found vs created
 */
export async function ensureDefaults(client, options = {}) {
    const {gql, unwrap} = client;
    const dryRun = options.dryRun === true;
    const log = options.log ?? (() => {});
    const wanted = options.taxCategory || FALLBACK.taxCategory;
    const rateValue = options.taxRate ?? 0;
    const summary = {created: [], reused: [], planned: []};

    const note = (action, what) => {
        if (action === 'create' && dryRun) {
            summary.planned.push(what);
            log(`  would create  ${what}`);
        } else if (action === 'create') {
            summary.created.push(what);
            log(`  created       ${what}`);
        } else {
            summary.reused.push(what);
            log(`  reusing       ${what}`);
        }
    };

    // --- Zone: prefer whatever the channel already points at, so tax stays consistent. -
    const {activeChannel} = await gql(`query {
        activeChannel { id code defaultTaxZone { id name } defaultShippingZone { id name } }
    }`);
    const {zones} = await gql(`query { zones { items { id name members { id } } } }`);

    let zone =
        activeChannel.defaultTaxZone ??
        zones.items.find(z => z.name === FALLBACK.zoneName) ??
        zones.items.find(z => z.members.length > 0) ??
        zones.items[0];

    if (zone) {
        note('reuse', `zone "${zone.name}"`);
    } else {
        // Only now does a country matter: a zone with no members can never match an
        // address, so creating one means also having something to put in it.
        const country = await ensureCountry();
        if (dryRun) {
            note('create', `zone "${FALLBACK.zoneName}"`);
            zone = {id: null, name: FALLBACK.zoneName};
        } else {
            const r = await gql(
                `mutation Create($input: CreateZoneInput!) { createZone(input: $input) { id name } }`,
                {input: {name: FALLBACK.zoneName, memberIds: country ? [country.id] : []}},
            );
            zone = r.createZone;
            note('create', `zone "${zone.name}"`);
        }
    }

    async function ensureCountry() {
        const {countries} = await gql(`query { countries { items { id code enabled } } }`);
        const existing = countries.items.find(c => c.enabled) ?? countries.items[0];
        if (existing) {
            note('reuse', `country ${existing.code} (as zone member)`);
            return existing;
        }
        if (dryRun) {
            note('create', `country ${FALLBACK.countryCode}`);
            return null;
        }
        const r = await gql(
            `mutation Create($input: CreateCountryInput!) { createCountry(input: $input) { id code } }`,
            {
                input: {
                    code: FALLBACK.countryCode,
                    enabled: true,
                    translations: [{languageCode: 'en', name: FALLBACK.countryName}],
                },
            },
        );
        note('create', `country ${r.createCountry.code}`);
        return r.createCountry;
    }

    // --- TaxCategory: matched the same way the importer matches the CSV column. --------
    // getMatchingTaxCategoryId() does a case-insensitive regex of the CSV value against
    // each name, falling back to the first category. Picking by the same rule here means
    // what this script guarantees is what the import actually uses.
    const {taxCategories} = await gql(`query { taxCategories { items { id name } } }`);
    const pattern = new RegExp(wanted, 'i');
    let taxCategory =
        taxCategories.items.find(tc => pattern.test(tc.name)) ?? taxCategories.items[0];

    if (taxCategory) {
        note('reuse', `tax category "${taxCategory.name}" (matched "${wanted}")`);
    } else if (dryRun) {
        note('create', `tax category "${displayName(wanted)}"`);
        taxCategory = {id: null, name: displayName(wanted)};
    } else {
        const r = await gql(
            `mutation Create($input: CreateTaxCategoryInput!) {
                createTaxCategory(input: $input) { id name }
            }`,
            {input: {name: displayName(wanted), isDefault: true}},
        );
        taxCategory = r.createTaxCategory;
        note('create', `tax category "${taxCategory.name}"`);
    }

    // --- TaxRate for that exact (category, zone) pair. --------------------------------
    // A missing rate is not fatal — Vendure falls back to zero — but it is the difference
    // between a deliberate zero and an accidental one, which only shows up at checkout.
    const {taxRates} = await gql(`query {
        taxRates { items { id name value category { id } zone { id } } }
    }`);
    const existingRate = taxRates.items.find(
        r => r.category?.id === taxCategory.id && r.zone?.id === zone.id,
    );
    if (existingRate) {
        note('reuse', `tax rate "${existingRate.name}" (${existingRate.value}%)`);
    } else if (dryRun || taxCategory.id == null || zone.id == null) {
        note('create', `tax rate "${FALLBACK.taxRateName}" (${rateValue}%)`);
    } else {
        const r = await gql(
            `mutation Create($input: CreateTaxRateInput!) {
                createTaxRate(input: $input) { id name value }
            }`,
            {
                input: {
                    name: FALLBACK.taxRateName,
                    enabled: true,
                    value: rateValue,
                    categoryId: taxCategory.id,
                    zoneId: zone.id,
                },
            },
        );
        note('create', `tax rate "${r.createTaxRate.name}" (${r.createTaxRate.value}%)`);
    }

    // --- Channel defaults: the hard requirement, and the only existing row we touch. ---
    const channelPatch = {};
    if (!activeChannel.defaultTaxZone) channelPatch.defaultTaxZoneId = zone.id;
    if (!activeChannel.defaultShippingZone) channelPatch.defaultShippingZoneId = zone.id;

    if (Object.keys(channelPatch).length === 0) {
        note(
            'reuse',
            `channel defaults (tax: ${activeChannel.defaultTaxZone.name}, ` +
                `shipping: ${activeChannel.defaultShippingZone.name})`,
        );
    } else if (dryRun || zone.id == null) {
        note('create', `channel defaults -> zone "${zone.name}"`);
    } else {
        unwrap(
            (
                await gql(
                    `mutation Update($input: UpdateChannelInput!) {
                        updateChannel(input: $input) {
                            ... on Channel { id }
                            ... on ErrorResult { errorCode message }
                        }
                    }`,
                    {input: {id: activeChannel.id, ...channelPatch}},
                )
            ).updateChannel,
            'updateChannel',
        );
        note('create', `channel defaults -> zone "${zone.name}"`);
    }

    // --- Stock location: variants import with stockOnHand, which needs somewhere to go.
    const {stockLocations} = await gql(`query { stockLocations { items { id name } } }`);
    if (stockLocations.items.length > 0) {
        note('reuse', `stock location "${stockLocations.items[0].name}"`);
    } else if (dryRun) {
        note('create', `stock location "${FALLBACK.stockLocationName}"`);
    } else {
        const r = await gql(
            `mutation Create($input: CreateStockLocationInput!) {
                createStockLocation(input: $input) { id name }
            }`,
            {input: {name: FALLBACK.stockLocationName, description: 'Created by ensure-defaults'}},
        );
        note('create', `stock location "${r.createStockLocation.name}"`);
    }

    return {...summary, taxCategory, zone, channelId: activeChannel.id};
}

// --- CLI -------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = {};
    for (const arg of process.argv.slice(2)) {
        const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
        if (!m) {
            console.error(`ensure-defaults: unrecognised argument "${arg}"`);
            process.exit(1);
        }
        args[m[1]] = m[2] ?? true;
    }

    const client = createAdminClient();
    await client.login();
    console.log(`checking import prerequisites on ${client.endpoint}`);

    const result = await ensureDefaults(client, {
        dryRun: args['dry-run'] === true,
        taxCategory: typeof args['tax-category'] === 'string' ? args['tax-category'] : undefined,
        taxRate: args['tax-rate'] != null ? Number(args['tax-rate']) : undefined,
        log: line => console.log(line),
    });

    const {created, reused, planned} = result;
    console.log(
        `\n${reused.length} reused, ${created.length} created` +
            (planned.length ? `, ${planned.length} would be created` : ''),
    );
    console.log(
        `\nVariants will import against "${result.taxCategory.name}" in zone "${result.zone.name}". ` +
            "The CSV's taxCategory column is what selects it, by case-insensitive regex.",
    );
}

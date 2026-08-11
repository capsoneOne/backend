#!/usr/bin/env node
/**
 * Seeds a development catalog into an empty Vendure database.
 *
 *     npm run seed              # from the repo root
 *
 * Why this exists: `@vendure/create`'s sample data (initial-data.json, product CSV,
 * product images) is not installed in this repo, so a database built from migrations
 * has no countries, no tax zone, and no products. Without a default tax zone
 * `createProductVariants` fails outright with "The active tax zone could not be
 * determined", and with no products there is nothing for visual search to rank.
 *
 * What it creates:
 *   - a country, a zone, a tax category and a zero-rate tax, wired as the channel's
 *     default tax and shipping zone
 *   - eight products, each with one image and one variant
 *   - a clothing-store collection hierarchy used by catalogue navigation
 *   - a DefaultSearchPlugin reindex, so keyword search and the home page see them
 *   - a visual-search reindex, so the products become findable by image
 *
 * The product images are flat colour/shape renders, not photographs. They exist to
 * exercise the pipeline and to give the `sim` embedder something it can genuinely rank
 * (it encodes colour and coarse structure). They are NOT an evaluation set — see
 * eval/README.md for that distinction, which matters.
 *
 * Idempotent: re-running reuses whatever already exists and re-seeds only what is
 * missing, so it is safe to run against a partially-seeded database.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const ADMIN_API = process.env.VENDURE_ADMIN_API_URL ?? 'http://localhost:3000/admin-api';
const USERNAME = process.env.SUPERADMIN_USERNAME ?? 'superadmin';
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'superadmin';
const IMAGE_DIR = path.join(import.meta.dirname, 'images');

const PRODUCTS = [
    {slug: 'red-leather-boot', name: 'Red Leather Boot', file: 'red-boot.jpg', price: 12900,
     description: 'Ankle-height boot in deep red full-grain leather.'},
    {slug: 'blue-denim-jacket', name: 'Blue Denim Jacket', file: 'blue-jacket.jpg', price: 8900,
     description: 'Classic mid-wash denim jacket with a boxy fit.'},
    {slug: 'green-ceramic-mug', name: 'Green Ceramic Mug', file: 'green-mug.jpg', price: 1800,
     description: 'Hand-glazed stoneware mug in forest green.'},
    {slug: 'yellow-rain-coat', name: 'Yellow Rain Coat', file: 'yellow-raincoat.jpg', price: 10500,
     description: 'Waterproof shell in high-visibility yellow.'},
    {slug: 'black-sunglasses', name: 'Black Sunglasses', file: 'black-sunglasses.jpg', price: 6400,
     description: 'Matte black acetate frames with polarised lenses.'},
    {slug: 'white-sneaker', name: 'White Sneaker', file: 'white-sneaker.jpg', price: 9500,
     description: 'Minimal low-top sneaker in white leather.'},
    {slug: 'orange-backpack', name: 'Orange Backpack', file: 'orange-backpack.jpg', price: 7200,
     description: '22-litre daypack in burnt orange ripstop.'},
    {slug: 'purple-scarf', name: 'Purple Scarf', file: 'purple-scarf.jpg', price: 3400,
     description: 'Lambswool scarf in heather purple.'},
];

const COLLECTIONS = [
    {
        slug: 'featured',
        name: 'Featured',
        description: 'A curated edit of standout layers, shoes, and accessories for the season.',
        featuredProduct: 'blue-denim-jacket',
        products: [
            'red-leather-boot',
            'blue-denim-jacket',
            'yellow-rain-coat',
            'black-sunglasses',
            'white-sneaker',
            'orange-backpack',
            'purple-scarf',
        ],
    },
    {
        slug: 'clothing',
        name: 'Clothing',
        description: 'Easy layers and weather-ready outerwear for an everyday rotation.',
        featuredProduct: 'yellow-rain-coat',
        products: ['blue-denim-jacket', 'yellow-rain-coat'],
        children: [
            {
                slug: 'jackets',
                name: 'Jackets',
                description: 'Versatile jackets made for effortless layering.',
                featuredProduct: 'blue-denim-jacket',
                products: ['blue-denim-jacket'],
            },
            {
                slug: 'rainwear',
                name: 'Rainwear',
                description: 'Lightweight, weather-ready layers for grey days.',
                featuredProduct: 'yellow-rain-coat',
                products: ['yellow-rain-coat'],
            },
        ],
    },
    {
        slug: 'shoes',
        name: 'Shoes',
        description: 'Everyday sneakers and statement boots built to go anywhere.',
        featuredProduct: 'white-sneaker',
        products: ['red-leather-boot', 'white-sneaker'],
        children: [
            {
                slug: 'sneakers',
                name: 'Sneakers',
                description: 'Clean low-tops for comfortable everyday wear.',
                featuredProduct: 'white-sneaker',
                products: ['white-sneaker'],
            },
            {
                slug: 'boots',
                name: 'Boots',
                description: 'Polished boots with a confident, easy silhouette.',
                featuredProduct: 'red-leather-boot',
                products: ['red-leather-boot'],
            },
        ],
    },
    {
        slug: 'accessories',
        name: 'Accessories',
        description: 'The finishing pieces: bags, eyewear, and soft accessories.',
        featuredProduct: 'orange-backpack',
        products: ['black-sunglasses', 'orange-backpack', 'purple-scarf'],
        children: [
            {
                slug: 'bags',
                name: 'Bags',
                description: 'Practical carryalls designed for days on the move.',
                featuredProduct: 'orange-backpack',
                products: ['orange-backpack'],
            },
            {
                slug: 'eyewear',
                name: 'Eyewear',
                description: 'Modern frames that finish the look.',
                featuredProduct: 'black-sunglasses',
                products: ['black-sunglasses'],
            },
            {
                slug: 'scarves',
                name: 'Scarves',
                description: 'Soft colour and warmth for cooler days.',
                featuredProduct: 'purple-scarf',
                products: ['purple-scarf'],
            },
        ],
    },
];

let token;

async function gql(query, variables = {}) {
    let res;
    try {
        res = await fetch(ADMIN_API, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(token ? {Authorization: `Bearer ${token}`} : {}),
            },
            body: JSON.stringify({query, variables}),
        });
    } catch (e) {
        throw new Error(
            `cannot reach the Admin API at ${ADMIN_API} (${e.message}).\n` +
                'Is the server running? Try: npm run dev',
        );
    }
    const auth = res.headers.get('vendure-auth-token');
    if (auth) token = auth;
    const body = await res.json();
    if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
    return body.data;
}

/** createAssets takes an Upload scalar, so this follows the graphql-multipart-request spec. */
async function uploadAsset(file) {
    const bytes = await readFile(path.join(IMAGE_DIR, file));
    const form = new FormData();
    form.append(
        'operations',
        JSON.stringify({
            query: `mutation Upload($file: Upload!) {
                createAssets(input: [{file: $file}]) {
                    ... on Asset { id name }
                    ... on ErrorResult { errorCode message }
                }
            }`,
            variables: {file: null},
        }),
    );
    form.append('map', JSON.stringify({0: ['variables.file']}));
    form.append('0', new Blob([bytes], {type: 'image/jpeg'}), file);

    const res = await fetch(ADMIN_API, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`},
        body: form,
    });
    const body = await res.json();
    if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
    const asset = body.data.createAssets[0];
    if (asset.errorCode) throw new Error(`${asset.errorCode}: ${asset.message}`);
    return asset.id;
}

async function login() {
    const r = await gql(
        `mutation Login($u: String!, $p: String!) {
            login(username: $u, password: $p) {
                ... on CurrentUser { identifier }
                ... on ErrorResult { errorCode message }
            }
        }`,
        {u: USERNAME, p: PASSWORD},
    );
    if (r.login.errorCode) throw new Error(`${r.login.errorCode}: ${r.login.message}`);
    return r.login.identifier;
}

/**
 * Country, zone, tax, and the channel defaults that point at them.
 *
 * A schema built purely from migrations has none of these rows. The channel's
 * defaultTaxZone is the one that actually blocks seeding: without it, variant
 * creation cannot resolve a tax rate and fails.
 */
async function ensureChannelSetup() {
    const {countries} = await gql(`query { countries { items { id code } } }`);
    let country = countries.items.find(c => c.code === 'US');
    if (!country) {
        const r = await gql(
            `mutation Create($input: CreateCountryInput!) { createCountry(input: $input) { id code } }`,
            {
                input: {
                    code: 'US',
                    enabled: true,
                    translations: [{languageCode: 'en', name: 'United States'}],
                },
            },
        );
        country = r.createCountry;
        console.log('  country', country.code);
    }

    const {zones} = await gql(`query { zones { items { id name } } }`);
    let zone = zones.items.find(z => z.name === 'Default Zone');
    if (!zone) {
        const r = await gql(
            `mutation Create($input: CreateZoneInput!) { createZone(input: $input) { id name } }`,
            {input: {name: 'Default Zone', memberIds: [country.id]}},
        );
        zone = r.createZone;
        console.log('  zone', zone.name);
    }

    const {taxCategories} = await gql(`query { taxCategories { items { id name } } }`);
    let category = taxCategories.items[0];
    if (!category) {
        const r = await gql(
            `mutation Create($input: CreateTaxCategoryInput!) { createTaxCategory(input: $input) { id name } }`,
            {input: {name: 'Standard Tax', isDefault: true}},
        );
        category = r.createTaxCategory;
        console.log('  tax category', category.name);
    }

    const {taxRates} = await gql(`query { taxRates { items { id } } }`);
    if (taxRates.items.length === 0) {
        await gql(
            `mutation Create($input: CreateTaxRateInput!) { createTaxRate(input: $input) { id name } }`,
            {
                input: {
                    name: 'Zero Rate',
                    enabled: true,
                    value: 0,
                    categoryId: category.id,
                    zoneId: zone.id,
                },
            },
        );
        console.log('  zero-rate tax');
    }

    const {activeChannel} = await gql(`query { activeChannel { id } }`);
    await gql(
        `mutation Update($input: UpdateChannelInput!) {
            updateChannel(input: $input) {
                ... on Channel { id }
                ... on ErrorResult { errorCode message }
            }
        }`,
        {input: {id: activeChannel.id, defaultTaxZoneId: zone.id, defaultShippingZoneId: zone.id}},
    );
    return zone;
}

async function ensureProducts() {
    const {products} = await gql(`query { products(options: {take: 100}) { items { id slug featuredAsset { id } } } }`);
    const existing = new Map(products.items.map(p => [p.slug, p]));
    const catalog = new Map();

    for (const p of PRODUCTS) {
        if (existing.has(p.slug)) {
            const product = existing.get(p.slug);
            catalog.set(p.slug, {id: product.id, assetId: product.featuredAsset?.id});
            continue;
        }
        const assetId = await uploadAsset(p.file);
        const created = await gql(
            `mutation Create($input: CreateProductInput!) { createProduct(input: $input) { id name } }`,
            {
                input: {
                    featuredAssetId: assetId,
                    assetIds: [assetId],
                    enabled: true,
                    translations: [
                        {
                            languageCode: 'en',
                            name: p.name,
                            slug: p.slug,
                            description: p.description,
                        },
                    ],
                },
            },
        );
        await gql(
            `mutation Variants($input: [CreateProductVariantInput!]!) {
                createProductVariants(input: $input) { ... on ProductVariant { id } }
            }`,
            {
                input: [
                    {
                        productId: created.createProduct.id,
                        sku: p.slug.toUpperCase(),
                        price: p.price,
                        stockOnHand: 100,
                        featuredAssetId: assetId,
                        translations: [{languageCode: 'en', name: p.name}],
                    },
                ],
            },
        );
        catalog.set(p.slug, {id: created.createProduct.id, assetId});
        console.log('  product', created.createProduct.name);
    }
    return catalog;
}

function collectionInput(definition, catalog, parentId) {
    const productIds = definition.products.map(slug => catalog.get(slug)?.id).filter(Boolean);
    const featuredAssetId = catalog.get(definition.featuredProduct)?.assetId;

    return {
        isPrivate: false,
        inheritFilters: false,
        ...(parentId ? {parentId} : {}),
        ...(featuredAssetId ? {featuredAssetId, assetIds: [featuredAssetId]} : {}),
        translations: [
            {
                languageCode: 'en',
                name: definition.name,
                slug: definition.slug,
                description: definition.description,
            },
        ],
        filters: [
            {
                code: 'product-id-filter',
                arguments: [
                    {name: 'productIds', value: JSON.stringify(productIds)},
                    {name: 'combineWithAnd', value: 'false'},
                ],
            },
        ],
    };
}

async function ensureCollection(definition, catalog, existing, parentId) {
    const current = existing.get(definition.slug);
    const input = collectionInput(definition, catalog, parentId);

    if (current) {
        await gql(
            `mutation Update($input: UpdateCollectionInput!) { updateCollection(input: $input) { id slug } }`,
            {input: {id: current.id, ...input}},
        );
        console.log('  collection', definition.slug, '(updated)');
        return current.id;
    }

    const created = await gql(
        `mutation Create($input: CreateCollectionInput!) { createCollection(input: $input) { id slug } }`,
        {input},
    );
    existing.set(definition.slug, created.createCollection);
    console.log('  collection', definition.slug);
    return created.createCollection.id;
}

async function ensureCollections(catalog) {
    const {collections} = await gql(`query { collections(options: {take: 100}) { items { id slug } } }`);
    const existing = new Map(collections.items.map(collection => [collection.slug, collection]));

    for (const definition of COLLECTIONS) {
        const parentId = await ensureCollection(definition, catalog, existing);
        for (const child of definition.children ?? []) {
            await ensureCollection(child, catalog, existing, parentId);
        }
    }
}

// --- run ---------------------------------------------------------------------

console.log('seeding', ADMIN_API);
console.log('authenticated as', await login());

console.log('channel setup:');
await ensureChannelSetup();

console.log('catalog:');
const catalog = await ensureProducts();

console.log('collections:');
await ensureCollections(catalog);

console.log('indexes:');
const search = await gql(`mutation { reindex { id } }`);
console.log('  keyword search reindex queued, job', search.reindex.id);
const visual = await gql(`mutation { reindexVisualSearch }`);
console.log(`  visual search: ${visual.reindexVisualSearch} products queued for embedding`);

console.log('\ndone. Embedding runs in the background — check with:');
console.log('  query { visualSearchIndexStatus { revision current stale products } }');

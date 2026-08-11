#!/usr/bin/env node
/**
 * Visual search evaluation harness.
 *
 *     npm run eval
 *
 * Measures the whole system end to end — query image in, ranked products out —
 * through the same REST endpoint the storefront uses. It never imports the model or
 * the plugin, so it keeps working unchanged when the embedder is replaced. That is
 * the point: `ds-handoff.md` §5 asks for a metric that stays fixed across model
 * versions so numbers are comparable.
 *
 * Results are written to eval/results/<revision>.json, keyed by the embedder's own
 * revision string, so a score always maps to an exact model state. Re-running against
 * the same revision overwrites that file; a new revision writes a new one and the
 * summary prints the delta.
 *
 * Environment:
 *   VENDURE_SHOP_URL    default http://localhost:3000
 *   VENDURE_ADMIN_API   default http://localhost:3000/admin-api
 *   EMBEDDER_URL        default http://localhost:8100
 *   SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD   default superadmin / superadmin
 */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {readdir} from 'node:fs/promises';
import path from 'node:path';

const SHOP_URL = process.env.VENDURE_SHOP_URL ?? 'http://localhost:3000';
const ADMIN_API = process.env.VENDURE_ADMIN_API ?? 'http://localhost:3000/admin-api';
const EMBEDDER_URL = process.env.EMBEDDER_URL ?? 'http://localhost:8100';
const USERNAME = process.env.SUPERADMIN_USERNAME ?? 'superadmin';
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'superadmin';

const DIR = import.meta.dirname;
const IMAGE_DIR = path.join(DIR, 'queries', 'images');
const RESULTS_DIR = path.join(DIR, 'results');

/** Cutoffs reported. TAKE must be >= the largest of these. */
const K_VALUES = [1, 5, 10];
const TAKE = 10;

// --- helpers -----------------------------------------------------------------

function die(message, hint) {
    console.error(`\n✗ ${message}`);
    if (hint) console.error(`  ${hint}`);
    process.exit(1);
}

async function adminQuery(query, variables = {}, token) {
    const res = await fetch(ADMIN_API, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        body: JSON.stringify({query, variables}),
    });
    const body = await res.json();
    if (body.errors) throw new Error(JSON.stringify(body.errors));
    return {data: body.data, token: res.headers.get('vendure-auth-token') ?? token};
}

function quantile(sorted, q) {
    if (sorted.length === 0) return null;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function summarize(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
        n: sorted.length,
        min: +sorted[0].toFixed(4),
        p10: +quantile(sorted, 0.1).toFixed(4),
        median: +quantile(sorted, 0.5).toFixed(4),
        mean: +(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(4),
        p90: +quantile(sorted, 0.9).toFixed(4),
        // The contract budgets the query path at p95 < 800 ms, so report that directly.
        p95: +quantile(sorted, 0.95).toFixed(4),
        max: +sorted[sorted.length - 1].toFixed(4),
    };
}

// --- preflight ---------------------------------------------------------------

/**
 * Refuse to produce numbers from an index that cannot support them.
 *
 * A stale or empty index still returns confident-looking distances, so an
 * unguarded run reports a low score that looks like a model problem and is
 * actually an indexing problem. Contract §4 exists for exactly this reason.
 */
async function preflight() {
    let health;
    try {
        health = await (await fetch(`${EMBEDDER_URL}/health`)).json();
    } catch (e) {
        die(`cannot reach the embedder at ${EMBEDDER_URL} (${e.message})`, 'Try: npm run infra:up');
    }
    if (health.status !== 'ok') {
        die(`embedder is not ready (status=${health.status})`, 'Wait for model load, then retry.');
    }

    let token;
    try {
        const login = await adminQuery(
            `mutation Login($u: String!, $p: String!) {
                login(username: $u, password: $p) {
                    ... on CurrentUser { identifier }
                    ... on ErrorResult { errorCode message }
                }
            }`,
            {u: USERNAME, p: PASSWORD},
        );
        if (login.data.login.errorCode) die(`admin login failed: ${login.data.login.message}`);
        token = login.token;
    } catch (e) {
        die(`cannot reach the Admin API at ${ADMIN_API} (${e.message})`, 'Is the server running?');
    }

    const {data} = await adminQuery(
        `query { visualSearchIndexStatus { revision modelId current stale products } }`,
        {},
        token,
    );
    const status = data.visualSearchIndexStatus;

    if (status.products === 0) {
        die('the visual search index is empty', 'Seed and index first: npm run seed');
    }
    if (status.revision !== health.revision) {
        die(
            `index revision ${status.revision} != embedder revision ${health.revision}`,
            'The stored vectors live in a different space. Reindex before evaluating.',
        );
    }
    if (status.stale > 0) {
        console.warn(
            `⚠ ${status.stale} embeddings are stranded on an older revision. ` +
                'They are excluded from queries, so recall is measured against a partial index.',
        );
    }

    return {health, status};
}

// --- run ---------------------------------------------------------------------

async function runQuery(query) {
    const bytes = await readFile(path.join(IMAGE_DIR, query.image));
    const form = new FormData();
    form.append('image', new Blob([bytes], {type: 'image/jpeg'}), query.image);

    const started = Date.now();
    const res = await fetch(`${SHOP_URL}/visual-search/search?take=${TAKE}`, {
        method: 'POST',
        body: form,
    });
    const latencyMs = Date.now() - started;

    if (!res.ok) {
        throw new Error(`${query.id}: HTTP ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    const ranked = body.items.map(i => ({slug: i.product.slug, distance: i.distance}));

    const relevant = new Set(query.relevantSlugs);
    const hitIndex = ranked.findIndex(r => relevant.has(r.slug));

    return {
        id: query.id,
        kind: query.kind,
        rank: hitIndex === -1 ? null : hitIndex + 1,
        latencyMs,
        // Distance of the correct product, and of the best-ranked wrong one. The gap
        // between these two distributions is what a "no good match" cutoff is set from.
        relevantDistance: hitIndex === -1 ? null : ranked[hitIndex].distance,
        topDistractorDistance: ranked.find(r => !relevant.has(r.slug))?.distance ?? null,
        top: ranked.slice(0, 3).map(r => `${r.slug}@${r.distance.toFixed(3)}`),
    };
}

const {health, status} = await preflight();

const spec = JSON.parse(await readFile(path.join(DIR, 'queries', 'queries.json'), 'utf8'));
console.log(`query set : ${spec.set} (${spec.queries.length} queries)`);
console.log(`model     : ${health.model_id}`);
console.log(`revision  : ${health.revision}`);
console.log(`index     : ${status.products} products, ${status.current} embeddings\n`);

const perQuery = [];
for (const q of spec.queries) {
    perQuery.push(await runQuery(q));
}

// --- metrics -----------------------------------------------------------------

const recall = Object.fromEntries(
    K_VALUES.map(k => [
        `recall@${k}`,
        +(perQuery.filter(r => r.rank !== null && r.rank <= k).length / perQuery.length).toFixed(4),
    ]),
);
const mrr = +(
    perQuery.reduce((acc, r) => acc + (r.rank ? 1 / r.rank : 0), 0) / perQuery.length
).toFixed(4);

/**
 * What a coin flip would score on this catalog.
 *
 * With N indexed products, ranking at random puts a relevant product in the top k
 * with probability k/N. On a small catalog that is a high number — at N=8, random
 * recall@5 is 0.625 — so recall@5 near 1.0 says almost nothing. Reporting the two
 * side by side stops a ceiling effect being mistaken for a good model, which is the
 * easiest way to overclaim in a write-up.
 */
const randomBaseline = Object.fromEntries(
    K_VALUES.map(k => [`recall@${k}`, +Math.min(1, k / status.products).toFixed(4)]),
);
const headroom = Object.fromEntries(
    K_VALUES.map(k => {
        const key = `recall@${k}`;
        const ceiling = 1 - randomBaseline[key];
        return [key, ceiling === 0 ? null : +((recall[key] - randomBaseline[key]) / ceiling).toFixed(4)];
    }),
);

const byKind = {};
for (const kind of [...new Set(spec.queries.map(q => q.kind))]) {
    const subset = perQuery.filter(r => r.kind === kind);
    byKind[kind] = Object.fromEntries(
        K_VALUES.map(k => [
            `recall@${k}`,
            +(subset.filter(r => r.rank !== null && r.rank <= k).length / subset.length).toFixed(4),
        ]),
    );
}

const calibration = {
    relevant: summarize(perQuery.map(r => r.relevantDistance).filter(v => v !== null)),
    topDistractor: summarize(perQuery.map(r => r.topDistractorDistance).filter(v => v !== null)),
};

const result = {
    revision: health.revision,
    modelId: health.model_id,
    embeddingDim: health.embedding_dim,
    querySet: spec.set,
    ranAt: new Date().toISOString(),
    indexedProducts: status.products,
    metrics: {...recall, mrr},
    randomBaseline,
    /** (score - random) / (1 - random): 0 = no better than chance, 1 = perfect. */
    headroomCaptured: headroom,
    byKind,
    latencyMs: summarize(perQuery.map(r => r.latencyMs)),
    calibration,
    perQuery,
};

await mkdir(RESULTS_DIR, {recursive: true});
const outFile = path.join(RESULTS_DIR, `${health.revision}.json`);
await writeFile(outFile, JSON.stringify(result, null, 2) + '\n');

// --- report ------------------------------------------------------------------

console.log('per query:');
for (const r of perQuery) {
    const rank = r.rank === null ? 'miss' : `#${r.rank}`;
    console.log(`  ${rank.padEnd(5)} ${r.id.padEnd(26)} ${r.top.join('  ')}`);
}

console.log('\nmetrics:');
console.log(`  ${''.padEnd(10)} ${'score'.padStart(6)}  ${'random'.padStart(6)}  headroom captured`);
for (const [k, v] of Object.entries(recall)) {
    const rnd = randomBaseline[k];
    const h = headroom[k];
    console.log(
        `  ${k.padEnd(10)} ${v.toFixed(3).padStart(6)}  ${rnd.toFixed(3).padStart(6)}  ` +
            (h === null ? 'n/a (random already 1.0)' : h.toFixed(3)),
    );
}
console.log(`  ${'mrr'.padEnd(10)} ${mrr.toFixed(3).padStart(6)}`);
if (status.products < 50) {
    console.log(
        `\n  ⚠ only ${status.products} products indexed. recall@k is close to its ceiling by ` +
            'construction here — read recall@1 and headroom, not recall@5.',
    );
}

console.log('\nby query kind:');
for (const [kind, m] of Object.entries(byKind)) {
    console.log(`  ${kind.padEnd(10)} ${Object.entries(m).map(([k, v]) => `${k}=${v.toFixed(3)}`).join('  ')}`);
}

console.log('\ncalibration (cosine distance, lower = more similar):');
console.log(`  correct match    ${JSON.stringify(calibration.relevant)}`);
console.log(`  best distractor  ${JSON.stringify(calibration.topDistractor)}`);
if (calibration.relevant && calibration.topDistractor) {
    const gap = +(calibration.topDistractor.median - calibration.relevant.median).toFixed(4);
    console.log(
        `  median separation ${gap}` +
            (gap <= 0
                ? '  ← correct matches are NOT closer than distractors; a distance cutoff cannot work here'
                : ''),
    );
}

console.log(`\nlatency ms: ${JSON.stringify(result.latencyMs)}`);

// Compare against every other revision on record.
const others = (await readdir(RESULTS_DIR))
    .filter(f => f.endsWith('.json') && f !== `${health.revision}.json`)
    .sort();
if (others.length > 0) {
    console.log('\nvs other revisions:');
    for (const file of others) {
        const prev = JSON.parse(await readFile(path.join(RESULTS_DIR, file), 'utf8'));
        const delta = +(result.metrics['recall@5'] - prev.metrics['recall@5']).toFixed(4);
        const sign = delta > 0 ? '+' : '';
        console.log(
            `  ${prev.revision.padEnd(14)} recall@5 ${prev.metrics['recall@5'].toFixed(3)}` +
                `  →  ${result.metrics['recall@5'].toFixed(3)}  (${sign}${delta.toFixed(3)})` +
                (prev.querySet !== result.querySet ? '  ⚠ different query set, not comparable' : ''),
        );
    }
}

console.log(`\nwritten to ${path.relative(process.cwd(), outFile)}`);

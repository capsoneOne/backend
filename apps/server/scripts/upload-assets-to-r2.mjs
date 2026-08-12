#!/usr/bin/env node
/**
 * One-off: push existing local assets to R2, preserving their keys.
 *
 * Vendure stores an asset's identifier as a path relative to the upload dir, e.g.
 * "source/b6/photo.jpg". The bucket keys must match those identifiers exactly, or
 * every existing asset row points at an object that isn't there.
 *
 * Safe to re-run: it skips objects already present unless --force is passed.
 *
 *   node scripts/upload-assets-to-r2.mjs [--dry-run] [--force]
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../static/assets');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const required = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    console.error('Add them to apps/server/.env first.');
    process.exit(1);
}

const MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
    '.svg': 'image/svg+xml', '.tiff': 'image/tiff',
};

const s3 = new S3Client({
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function* walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else if (entry.isFile() && !entry.name.startsWith('.')) yield full;
    }
}

async function exists(key) {
    try {
        await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
        return true;
    } catch {
        return false;
    }
}

let uploaded = 0, skipped = 0, failed = 0, bytes = 0;

try {
    await stat(ROOT);
} catch {
    console.error(`No local assets at ${ROOT}`);
    process.exit(1);
}

for await (const file of walk(ROOT)) {
    // Keys use forward slashes on every platform; the DB identifiers do too.
    const key = relative(ROOT, file).split(sep).join('/');

    // The `cache/` tree holds generated transforms. Vendure regenerates them on
    // demand, so copying them wastes bandwidth and storage.
    if (key.startsWith('cache/')) { skipped++; continue; }

    if (!FORCE && (await exists(key))) {
        console.log(`  skip    ${key}`);
        skipped++;
        continue;
    }
    if (DRY) {
        console.log(`  would   ${key}`);
        uploaded++;
        continue;
    }
    try {
        const body = await readFile(file);
        const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
        await s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: MIME[ext] ?? 'application/octet-stream',
        }));
        bytes += body.length;
        uploaded++;
        console.log(`  put     ${key}  (${(body.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
        failed++;
        console.error(`  FAILED  ${key}: ${e.message}`);
    }
}

console.log(
    `\n${DRY ? '[dry run] ' : ''}uploaded ${uploaded}, skipped ${skipped}, failed ${failed}` +
    (bytes ? `, ${(bytes / 1048576).toFixed(1)} MB transferred` : ''),
);
process.exit(failed ? 1 : 0);

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
    AssetService,
    ConfigService,
    ID,
    JobQueue,
    JobQueueService,
    Logger,
    Product,
    ProductService,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
    Translated,
} from '@vendure/core';
import { In } from 'typeorm';

import {
    EMBEDDING_DIM,
    INDEX_PRODUCT_QUEUE,
    loggerCtx,
    UNPINNED_REVISION_MARKER,
    VISUAL_SEARCH_PLUGIN_OPTIONS,
} from '../constants';
import { ProductAssetEmbedding } from '../entities/product-asset-embedding.entity';
import { VisualSearchPluginOptions } from '../types';
import { EmbedderService } from './embedder.service';

export interface VisualSearchHit {
    product: Translated<Product>;
    /** Cosine distance in [0, 2]. Lower is more similar. */
    distance: number;
    /** The product asset that actually matched, for "matched on this image" UI. */
    assetId: ID;
}

/**
 * Products per index job.
 *
 * Matched to the embedder's own per-request cap (32), so one job becomes one HTTP call
 * for a catalogue with one photo per product. Larger would just be re-chunked inside
 * EmbedderService while making each job's failure blast radius bigger — a job retries
 * as a unit, so 32 is also the most work a transient embedder error can cost.
 */
const INDEX_BATCH_SIZE = 32;

/**
 * How many asset rows to pull from the ANN index before collapsing to products.
 *
 * The index grain is (product, asset), so `take` products can need many more than
 * `take` asset rows — a product with four photos can occupy four of them. The query
 * therefore over-fetches assets, collapses to one row per product, then trims.
 *
 * Deliberately generous against the observed catalogue (mean 1.46 assets/product,
 * max 4). Under-fetching silently returns fewer products than asked for, which is a
 * correctness bug; over-fetching costs a millisecond or two inside a scan that
 * already completes in single-digit ms.
 */
const ANN_OVERFETCH_FACTOR = 8;
const ANN_MIN_OVERFETCH = 100;
const ANN_MAX_OVERFETCH = 500;

/**
 * Accepts the batch shape and the pre-batch single-product shape jobs may still hold.
 *
 * `revision` is the embedder identity the job was queued against. A full reindex runs
 * for minutes; if the embedder is swapped or restarts into a different revision partway
 * through, the remaining jobs would stamp rows with the new identity and leave the index
 * split across two incomparable vector spaces. Carrying the expectation in the payload
 * lets each job detect that and refuse. Absent for event-driven single-product jobs,
 * which should simply use whatever model is current.
 */
type IndexJobData = { productIds?: ID[]; productId?: ID; revision?: string };

@Injectable()
export class VisualSearchService implements OnModuleInit {
    private indexQueue: JobQueue<IndexJobData>;

    constructor(
        private connection: TransactionalConnection,
        private jobQueueService: JobQueueService,
        private assetService: AssetService,
        private productService: ProductService,
        private configService: ConfigService,
        private requestContextService: RequestContextService,
        private embedder: EmbedderService,
        @Inject(VISUAL_SEARCH_PLUGIN_OPTIONS)
        private options: VisualSearchPluginOptions,
    ) {}

    /**
     * Read one asset, but never wait forever.
     *
     * `readFileToBuffer` resolves or rejects at the storage driver's discretion, and
     * the S3 driver will happily hang on a connection that is open but silent. There
     * is no AbortSignal on the strategy interface, so the losing request is abandoned
     * rather than cancelled — it keeps its socket until the driver gives up. That is
     * an accepted leak: an orphaned fetch costs one socket, whereas an un-timed await
     * costs the entire reindex, because four parked jobs fill the queue's concurrency
     * and everything behind them stops with nothing logged.
     *
     * A timeout surfaces as a normal read failure, so the product keeps the vectors it
     * already had instead of being emptied.
     */
    private async readAsset(source: string): Promise<Buffer> {
        const ms = this.options.assetReadTimeoutMs ?? 15_000;
        const storage = this.configService.assetOptions.assetStorageStrategy;
        let timer: NodeJS.Timeout | undefined;
        try {
            return await Promise.race([
                storage.readFileToBuffer(source),
                new Promise<never>((_, reject) => {
                    timer = setTimeout(
                        () => reject(new Error(`timed out after ${ms}ms`)),
                        ms,
                    );
                }),
            ]);
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    async onModuleInit(): Promise<void> {
        this.indexQueue = await this.jobQueueService.createQueue<IndexJobData>({
            name: INDEX_PRODUCT_QUEUE,
            process: async job => {
                // NOT RequestContext.empty() — that context carries no channel, so
                // channel-scoped lookups like productService.findOne() return undefined
                // and the job completes successfully having done nothing. Silent no-op.
                const ctx = await this.requestContextService.create({ apiType: 'admin' });
                // Tolerate the old single-product payload: jobs queued before this
                // change may still be sitting in the database when it deploys.
                const ids = job.data.productIds ?? (job.data.productId != null ? [job.data.productId] : []);
                await this.indexProducts(ctx, ids, job.data.revision);
            },
        });
    }

    // --- Indexing ------------------------------------------------------------

    /**
     * Enqueue non-deleted products for embedding, in batches. Returns how many were
     * queued.
     *
     * `onlyMissing` makes the operation resumable. A reindex is hundreds of independent
     * jobs with no progress file, so a cancelled or crashed run leaves the index part
     * built with no record of where it stopped. Re-running with `onlyMissing` enqueues
     * just the products that have no row at the live revision, which turns "start over"
     * into "finish the job" — the difference between minutes and a full re-run.
     */
    async reindexAll(ctx: RequestContext, onlyMissing = false): Promise<number> {
        // Force a fresh /health before writing thousands of revision-stamped rows. A
        // cached revision from before a model swap would stamp every one of them with
        // an identity the vectors do not belong to, and nothing would report an error.
        const health = await this.embedder.refreshHealth();

        // Refuse to build an index against an identity that will not survive a restart.
        // The vectors would be perfectly good and every row would still be orphaned the
        // moment the embedder next resolves its real revision, with no error anywhere.
        if (health.revision.includes(UNPINNED_REVISION_MARKER)) {
            throw new Error(
                `Embedder revision is unpinned (${health.revision}): it could not reach the ` +
                    'model hub to resolve a commit sha, so this identity will change on its ' +
                    'next successful start and orphan everything written now. Restart the ' +
                    'embedder with working network access, confirm GET /health, then retry.',
            );
        }

        const qb = this.connection
            .getRepository(ctx, Product)
            .createQueryBuilder('product')
            .select(['product.id'])
            .where('product.deletedAt IS NULL');

        if (onlyMissing) {
            // Products with no assets never produce a row, so they are re-queued every
            // time. That is cheap — two lookups and no embedding — and keeps the check
            // honest about what "indexed" means rather than tracking attempts.
            qb.andWhere(
                `NOT EXISTS (
                    SELECT 1 FROM product_asset_embedding e
                    WHERE e."productId" = product.id AND e.revision = :revision
                )`,
                { revision: health.revision },
            );
        }

        const products = await qb.getMany();

        let jobs = 0;
        for (let i = 0; i < products.length; i += INDEX_BATCH_SIZE) {
            const productIds = products.slice(i, i + INDEX_BATCH_SIZE).map(p => p.id);
            await this.indexQueue.add({ productIds, revision: health.revision }, { retries: 2 });
            jobs++;
        }
        Logger.info(
            `Queued ${products.length} products for embedding in ${jobs} job(s) ` +
                `at revision ${health.revision}${onlyMissing ? ' (missing only)' : ''}`,
            loggerCtx,
        );
        return products.length;
    }

    async enqueueProduct(productId: ID): Promise<void> {
        await this.indexQueue.add({ productIds: [productId] }, { retries: 2 });
    }

    /** Embed one product's assets. Thin wrapper — the batch path does the work. */
    async indexProduct(ctx: RequestContext, productId: ID): Promise<number> {
        return this.indexProducts(ctx, [productId]);
    }

    /**
     * Embed every asset of several products in one pass, and replace their rows.
     *
     * Batching products rather than looping one at a time is the whole point. The
     * embedder accepts up to 32 images per call, but a catalogue where each product has
     * a single photo could never fill that when the unit of work was one product — so
     * a full reindex paid one HTTP round trip, and one job-queue poll, per image.
     *
     * Reads the *source* file, not the preview: the preview is capped at 1600px and
     * already EXIF-rotated by Sharp, whereas the contract wants original bytes with all
     * preprocessing done inside the embedder. The embedder applies its own EXIF
     * transpose, so orientation is handled there.
     *
     * A product only joins the replace set once all of its images have been read. The
     * replace is a delete followed by an insert, so admitting a product whose source
     * image is unreachable would drop the vectors it already had and write nothing back
     * — losing it from search entirely while the job still reported success.
     */
    async indexProducts(
        ctx: RequestContext,
        productIds: ID[],
        expectedRevision?: string,
    ): Promise<number> {
        if (productIds.length === 0) {
            return 0;
        }

        const health = await this.embedder.getHealth();
        const revision = health.revision;

        // The embedder changed identity between this job being queued and it running.
        // Writing now would put two incomparable vector spaces under one index with no
        // error anywhere, so fail instead: the job retries, then surfaces as failed, and
        // the operator restarts the reindex against a single model.
        if (expectedRevision && expectedRevision !== revision) {
            throw new Error(
                `embedder revision changed mid-run: this job was queued at ` +
                    `${expectedRevision} but the embedder now reports ${revision}. ` +
                    'Nothing was written. Re-run the reindex against one model.',
            );
        }

        // Item ids are composite, not bare asset ids. An asset can legitimately belong
        // to more than one product, and the contract rejects duplicate ids within a
        // request (§3.5) — keying on assetId alone would fail the whole batch the first
        // time two products shared a photo.
        const payload: Array<{ id: string; data: Buffer }> = [];
        const owner = new Map<string, { productId: ID; assetId: ID }>();
        const indexed: ID[] = [];
        const unreadable: ID[] = [];
        let assetCount = 0;

        for (const productId of productIds) {
            const product = await this.productService.findOne(ctx, productId);
            if (!product) {
                // Log rather than return quietly: the usual cause is a context without a
                // channel, which produces 'success, indexed nothing' across every job.
                Logger.warn(`Product ${productId} not visible in this context; skipped`, loggerCtx);
                continue;
            }

            const assets = (await this.assetService.getEntityAssets(ctx, product)) ?? [];
            if (assets.length === 0) {
                // Still a member of the replace set: replacing with nothing is how rows
                // for images detached since the last run get dropped.
                Logger.verbose(`Product ${productId} has no assets; skipped`, loggerCtx);
                indexed.push(productId);
                continue;
            }

            // Staged per product, and only merged into the batch once every one of this
            // product's images has been read. The replace below is a delete, so a
            // partially-read product would have its existing vectors dropped and only
            // partly rewritten — a transient storage error would silently shrink the
            // index while the job still reported success.
            const staged: Array<{ id: string; data: Buffer }> = [];
            let readFailed = false;

            for (const asset of assets) {
                const key = `${productId}:${asset.id}`;
                try {
                    staged.push({ id: key, data: await this.readAsset(asset.source) });
                    owner.set(key, { productId, assetId: asset.id });
                } catch (e: any) {
                    Logger.warn(`Asset ${asset.id}: cannot read ${asset.source} (${e.message})`, loggerCtx);
                    readFailed = true;
                    break;
                }
            }

            if (readFailed) {
                // Leave this product exactly as it was, including its owner entries, so
                // nothing downstream can attribute a vector to it.
                for (const item of staged) {
                    owner.delete(item.id);
                }
                unreadable.push(productId);
                continue;
            }

            assetCount += assets.length;
            indexed.push(productId);
            payload.push(...staged);
        }

        if (unreadable.length > 0) {
            Logger.error(
                `${unreadable.length} product(s) kept their existing vectors because a source ` +
                    `image could not be read: ${unreadable.join(', ')}`,
                loggerCtx,
            );
        }

        // Every product carrying images failed to read. That is a storage fault, not a
        // data fault, so fail the job: it retries, and then surfaces as failed instead
        // of reporting success for a batch that indexed nothing.
        if (unreadable.length > 0 && payload.length === 0) {
            throw new Error(
                `could not read any source image for ${unreadable.length} product(s); ` +
                    `check asset storage before retrying`,
            );
        }

        const results = payload.length > 0 ? await this.embedder.embedImages(payload) : [];
        const repo = this.connection.getRepository(ctx, ProductAssetEmbedding);

        // Replace rows wholesale rather than upserting per asset. This makes reindexing
        // idempotent AND drops rows for assets detached from the product since the last
        // run, which a per-asset upsert would strand. Scoped to products whose images
        // were *fully* read, so neither a product that vanished mid-batch nor one whose
        // source images are unreachable loses what it already had.
        if (indexed.length > 0) {
            await repo.delete({ productId: In(indexed as any[]) });
        }

        const rows = results
            .filter(r => {
                if (!r.vector) {
                    Logger.warn(`Item ${r.id}: ${r.error?.code} ${r.error?.message}`, loggerCtx);
                }
                return r.vector != null;
            })
            .map(r => {
                const o = owner.get(r.id)!;
                return new ProductAssetEmbedding({
                    productId: o.productId,
                    assetId: o.assetId,
                    embedding: r.vector as number[],
                    revision,
                    modelId: health.model_id,
                });
            });

        if (rows.length > 0) {
            await repo.save(rows);
        }

        Logger.verbose(
            `Indexed ${indexed.length} product(s): embedded ${rows.length}/${assetCount} assets` +
                (unreadable.length > 0 ? `, ${unreadable.length} left untouched` : ''),
            loggerCtx,
        );
        return rows.length;
    }

    // --- Query ---------------------------------------------------------------

    /**
     * Nearest-neighbour search over the current revision only.
     *
     * Rows from an older revision live in a different vector space, so mixing them
     * in produces confident-looking nonsense. Filtering by revision means a partial
     * reindex degrades recall (fewer candidates) instead of corrupting precision.
     */
    async searchByImage(
        ctx: RequestContext,
        image: Buffer,
        take = 12,
    ): Promise<VisualSearchHit[]> {
        const [result] = await this.embedder.embedImages([{ id: 'query', data: image }]);
        if (!result?.vector) {
            throw new Error(result?.error?.message ?? 'could not embed the query image');
        }
        return this.searchByVector(ctx, result.vector, take);
    }

    async searchByText(ctx: RequestContext, text: string, take = 12): Promise<VisualSearchHit[]> {
        const health = await this.embedder.getHealth();
        if (!health.shared_space || !health.modalities.includes('text')) {
            throw new Error('the configured model does not support text-to-image search');
        }
        const [result] = await this.embedder.embedText([{ id: 'query', text }]);
        if (!result?.vector) {
            throw new Error(result?.error?.message ?? 'could not embed the query text');
        }
        return this.searchByVector(ctx, result.vector, take);
    }

    /**
     * Uses an already-indexed catalogue image as the query. This powers "find
     * similar" without downloading and embedding the same product image again.
     */
    async searchSimilarToProduct(
        ctx: RequestContext,
        productId: ID,
        assetId: ID | undefined,
        take = 12,
    ): Promise<VisualSearchHit[]> {
        const revision = await this.embedder.getRevision();
        const rows: Array<{embedding: string}> = assetId == null
            ? await this.connection.rawConnection.query(
                `
            SELECT embedding::text AS embedding
            FROM product_asset_embedding
            WHERE "productId" = $1 AND revision = $2
            ORDER BY "assetId" ASC
            LIMIT 1
            `,
                [productId, revision],
            )
            : await this.connection.rawConnection.query(
                `
            SELECT embedding::text AS embedding
            FROM product_asset_embedding
            WHERE "productId" = $1 AND revision = $2 AND "assetId" = $3
            LIMIT 1
            `,
                [productId, revision, assetId],
            );

        if (!rows[0]?.embedding) return [];

        const vector = JSON.parse(rows[0].embedding) as number[];
        const hits = await this.searchByVector(ctx, vector, take + 1);
        return hits.filter(hit => String(hit.product.id) !== String(productId)).slice(0, take);
    }

    private async searchByVector(
        ctx: RequestContext,
        vector: number[],
        take: number,
    ): Promise<VisualSearchHit[]> {
        if (vector.length !== EMBEDDING_DIM) {
            throw new Error(`query vector has ${vector.length} dims, expected ${EMBEDDING_DIM}`);
        }
        const revision = await this.embedder.getRevision();
        const literal = `[${vector.join(',')}]`;
        const overFetch = Math.min(
            ANN_MAX_OVERFETCH,
            Math.max(ANN_MIN_OVERFETCH, take * ANN_OVERFETCH_FACTOR),
        );

        // Two stages, and the split is load-bearing rather than stylistic.
        //
        // The inner query is the ONLY shape pgvector's HNSW index can serve: order
        // directly by the distance expression, with a LIMIT. The previous single-stage
        // version wrapped this in DISTINCT ON (productId), which forces Postgres to
        // sort by productId before it can dedupe — and an HNSW scan emits rows in
        // *distance* order, so the two orderings are incompatible and the planner
        // silently fell back to a sequential scan over every row. Nothing errored and
        // the results stayed correct; it just did O(N) work forever. Measured on a
        // 4,295-vector index: 385 ms sequential scan vs 6.6 ms via the index.
        //
        // Confirm with EXPLAIN after any edit here — the failure mode is invisible
        // otherwise. `eval/compare-hnsw.sh` checks that this returns the same products
        // as an exact scan (100/100 queries, identical sets, at the time of writing).
        //
        // The product join stays in the OUTER stage on purpose: joining inside the ANN
        // subquery also prevents the index scan. The cost is that disabled or deleted
        // products consume over-fetch slots, which the generous factor absorbs.
        const rows: Array<{ productId: string; assetId: string; distance: string }> =
            await this.connection.rawConnection.transaction(async manager => {
                // hnsw.ef_search caps how many rows a single index scan can return,
                // and pgvector's default is 40 — so `LIMIT 100` silently yields 40
                // rows unless this is raised. Set to the over-fetch so the LIMIT means
                // what it says. It is also the recall/latency dial: more candidates
                // tracked during the graph walk, less chance of stopping in a local
                // minimum.
                //
                // SET LOCAL so it reverts at COMMIT rather than leaking into whatever
                // this pooled connection serves next, and interpolated because Postgres
                // does not accept bind parameters on SET. `overFetch` is derived from
                // Math.min/Math.max over numbers, so it is always an integer.
                await manager.query(`SET LOCAL hnsw.ef_search = ${overFetch}`);
                return manager.query(
                    `
                    SELECT best."productId", best."assetId", best.distance
                    FROM (
                        SELECT DISTINCT ON (c."productId")
                            c."productId",
                            c."assetId",
                            c.distance
                        FROM (
                            SELECT
                                e."productId",
                                e."assetId",
                                (e.embedding <=> $1::vector) AS distance
                            FROM product_asset_embedding e
                            WHERE e.revision = $2
                            ORDER BY e.embedding <=> $1::vector
                            LIMIT $3
                        ) c
                        INNER JOIN product p ON p.id = c."productId"
                        WHERE p."deletedAt" IS NULL
                          AND p.enabled = true
                        ORDER BY c."productId", c.distance ASC
                    ) best
                    ORDER BY best.distance ASC
                    LIMIT $4
                    `,
                    [literal, revision, overFetch, take],
                );
            });

        if (rows.length === 0) {
            return [];
        }

        const ids = rows.map(r => r.productId as unknown as ID);
        const products = await this.productService.findByIds(ctx, ids);
        const byId = new Map(products.map(p => [String(p.id), p]));

        // Preserve distance ordering; findByIds does not guarantee input order.
        return rows
            .map(r => {
                const product = byId.get(String(r.productId));
                return product
                    ? {
                          product,
                          distance: Number(r.distance),
                          assetId: r.assetId as unknown as ID,
                      }
                    : undefined;
            })
            .filter((h): h is VisualSearchHit => h !== undefined);
    }

    // --- Diagnostics ---------------------------------------------------------

    /** Index health: how many rows are on the live revision vs stranded on old ones. */
    async getIndexStatus(ctx: RequestContext): Promise<{
        revision: string;
        modelId: string;
        current: number;
        stale: number;
        products: number;
    }> {
        const health = await this.embedder.getHealth(true);
        const repo = this.connection.getRepository(ctx, ProductAssetEmbedding);
        const current = await repo.count({ where: { revision: health.revision } });
        const total = await repo.count();
        const distinct: Array<{ count: string }> = await this.connection.rawConnection.query(
            `SELECT COUNT(DISTINCT "productId") AS count FROM product_asset_embedding WHERE revision = $1`,
            [health.revision],
        );
        return {
            revision: health.revision,
            modelId: health.model_id,
            current,
            stale: total - current,
            products: Number(distinct[0]?.count ?? 0),
        };
    }

    /**
     * The embedder's own account of itself, for the admin health panel.
     *
     * Unlike every other call into EmbedderService this one never throws. A health
     * check that errors when the thing it checks is down tells the operator nothing
     * except that something is broken — the panel needs to render "unreachable, here
     * is why" instead of an empty page. Forces a refresh: a cached answer is exactly
     * what you do not want when you are asking whether the service is alive.
     */
    async getEmbedderHealth(): Promise<{
        reachable: boolean;
        status: string | null;
        modelId: string | null;
        revision: string | null;
        embeddingDim: number | null;
        expectedDim: number;
        dimMatches: boolean;
        normalized: boolean | null;
        modalities: string[] | null;
        sharedSpace: boolean | null;
        pinned: boolean;
        error: string | null;
    }> {
        const unreachable = {
            reachable: false,
            status: null,
            modelId: null,
            revision: null,
            embeddingDim: null,
            expectedDim: EMBEDDING_DIM,
            dimMatches: false,
            normalized: null,
            modalities: null,
            sharedSpace: null,
            pinned: false,
            error: null as string | null,
        };
        try {
            const h = await this.embedder.getHealth(true);
            return {
                reachable: true,
                status: h.status,
                modelId: h.model_id,
                revision: h.revision,
                embeddingDim: h.embedding_dim,
                expectedDim: EMBEDDING_DIM,
                dimMatches: h.embedding_dim === EMBEDDING_DIM,
                normalized: h.normalized,
                modalities: h.modalities,
                sharedSpace: h.shared_space,
                // Surfaced because reindexAll refuses to run in this state, and the
                // operator otherwise has no way to see why from the dashboard.
                pinned: !h.revision.includes(UNPINNED_REVISION_MARKER),
                error: null,
            };
        } catch (e: any) {
            Logger.warn(`Embedder health check failed: ${e.message}`, loggerCtx);
            return { ...unreachable, error: e.message };
        }
    }
}

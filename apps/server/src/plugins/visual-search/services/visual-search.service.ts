import { Injectable, OnModuleInit } from '@nestjs/common';
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

import { EMBEDDING_DIM, INDEX_PRODUCT_QUEUE, loggerCtx } from '../constants';
import { ProductAssetEmbedding } from '../entities/product-asset-embedding.entity';
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

/** Accepts the batch shape and the pre-batch single-product shape jobs may still hold. */
type IndexJobData = { productIds?: ID[]; productId?: ID };

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
    ) {}

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
                await this.indexProducts(ctx, ids);
            },
        });
    }

    // --- Indexing ------------------------------------------------------------

    /** Enqueue every non-deleted product, in batches. Returns how many were queued. */
    async reindexAll(ctx: RequestContext): Promise<number> {
        // Force a fresh /health before writing thousands of revision-stamped rows. A
        // cached revision from before a model swap would stamp every one of them with
        // an identity the vectors do not belong to, and nothing would report an error.
        const health = await this.embedder.refreshHealth();

        const products = await this.connection
            .getRepository(ctx, Product)
            .createQueryBuilder('product')
            .select(['product.id'])
            .where('product.deletedAt IS NULL')
            .getMany();

        let jobs = 0;
        for (let i = 0; i < products.length; i += INDEX_BATCH_SIZE) {
            const productIds = products.slice(i, i + INDEX_BATCH_SIZE).map(p => p.id);
            await this.indexQueue.add({ productIds }, { retries: 2 });
            jobs++;
        }
        Logger.info(
            `Queued ${products.length} products for embedding in ${jobs} job(s) ` +
                `at revision ${health.revision}`,
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
     */
    async indexProducts(ctx: RequestContext, productIds: ID[]): Promise<number> {
        if (productIds.length === 0) {
            return 0;
        }

        const storage = this.configService.assetOptions.assetStorageStrategy;
        const health = await this.embedder.getHealth();
        const revision = health.revision;

        // Item ids are composite, not bare asset ids. An asset can legitimately belong
        // to more than one product, and the contract rejects duplicate ids within a
        // request (§3.5) — keying on assetId alone would fail the whole batch the first
        // time two products shared a photo.
        const payload: Array<{ id: string; data: Buffer }> = [];
        const owner = new Map<string, { productId: ID; assetId: ID }>();
        const indexed: ID[] = [];
        let assetCount = 0;

        for (const productId of productIds) {
            const product = await this.productService.findOne(ctx, productId);
            if (!product) {
                // Log rather than return quietly: the usual cause is a context without a
                // channel, which produces 'success, indexed nothing' across every job.
                Logger.warn(`Product ${productId} not visible in this context; skipped`, loggerCtx);
                continue;
            }
            indexed.push(productId);

            const assets = (await this.assetService.getEntityAssets(ctx, product)) ?? [];
            if (assets.length === 0) {
                Logger.verbose(`Product ${productId} has no assets; skipped`, loggerCtx);
                continue;
            }
            assetCount += assets.length;

            for (const asset of assets) {
                const key = `${productId}:${asset.id}`;
                try {
                    payload.push({ id: key, data: await storage.readFileToBuffer(asset.source) });
                    owner.set(key, { productId, assetId: asset.id });
                } catch (e: any) {
                    Logger.warn(`Asset ${asset.id}: cannot read ${asset.source} (${e.message})`, loggerCtx);
                }
            }
        }

        const results = payload.length > 0 ? await this.embedder.embedImages(payload) : [];
        const repo = this.connection.getRepository(ctx, ProductAssetEmbedding);

        // Replace rows wholesale rather than upserting per asset. This makes reindexing
        // idempotent AND drops rows for assets detached from the product since the last
        // run, which a per-asset upsert would strand. Scoped to products actually seen,
        // so a product that vanished mid-batch keeps whatever it had.
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
            `Indexed ${indexed.length} product(s): embedded ${rows.length}/${assetCount} assets`,
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

        // One row per product: its best-matching asset. DISTINCT ON is evaluated
        // before the outer ORDER BY, so the inner ordering picks the winning asset
        // per product and the outer ordering ranks products against each other.
        const rows: Array<{ productId: string; assetId: string; distance: string }> =
            await this.connection.rawConnection.query(
                `
                SELECT * FROM (
                    SELECT DISTINCT ON (e."productId")
                        e."productId",
                        e."assetId",
                        (e.embedding <=> $1::vector) AS distance
                    FROM product_asset_embedding e
                    INNER JOIN product p ON p.id = e."productId"
                    WHERE e.revision = $2
                      AND p."deletedAt" IS NULL
                      AND p.enabled = true
                    ORDER BY e."productId", distance ASC
                ) best
                ORDER BY best.distance ASC
                LIMIT $3
                `,
                [literal, revision, take],
            );

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
}

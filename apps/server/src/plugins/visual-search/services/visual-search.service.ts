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

@Injectable()
export class VisualSearchService implements OnModuleInit {
    private indexQueue: JobQueue<{ productId: ID }>;

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
        this.indexQueue = await this.jobQueueService.createQueue<{ productId: ID }>({
            name: INDEX_PRODUCT_QUEUE,
            process: async job => {
                // NOT RequestContext.empty() — that context carries no channel, so
                // channel-scoped lookups like productService.findOne() return undefined
                // and the job completes successfully having done nothing. Silent no-op.
                const ctx = await this.requestContextService.create({ apiType: 'admin' });
                await this.indexProduct(ctx, job.data.productId);
            },
        });
    }

    // --- Indexing ------------------------------------------------------------

    /** Enqueue every non-deleted product. Returns how many jobs were queued. */
    async reindexAll(ctx: RequestContext): Promise<number> {
        const products = await this.connection
            .getRepository(ctx, Product)
            .createQueryBuilder('product')
            .select(['product.id'])
            .where('product.deletedAt IS NULL')
            .getMany();

        for (const p of products) {
            await this.indexQueue.add({ productId: p.id }, { retries: 2 });
        }
        Logger.info(`Queued ${products.length} products for embedding`, loggerCtx);
        return products.length;
    }

    async enqueueProduct(productId: ID): Promise<void> {
        await this.indexQueue.add({ productId }, { retries: 2 });
    }

    /**
     * Embed every asset of one product and replace its rows.
     *
     * Reads the *source* file, not the preview: the preview is capped at 1600px and
     * already EXIF-rotated by Sharp, whereas the contract wants original bytes with
     * all preprocessing done inside the embedder. The embedder applies its own EXIF
     * transpose, so orientation is handled there.
     */
    async indexProduct(ctx: RequestContext, productId: ID): Promise<number> {
        const product = await this.productService.findOne(ctx, productId);
        if (!product) {
            // Log rather than return quietly: the usual cause is a context without a
            // channel, which produces 'success, indexed nothing' across every job.
            Logger.warn(`Product ${productId} not visible in this context; skipped`, loggerCtx);
            return 0;
        }
        const assets = (await this.assetService.getEntityAssets(ctx, product)) ?? [];
        if (assets.length === 0) {
            Logger.verbose(`Product ${productId} has no assets; skipped`, loggerCtx);
            return 0;
        }

        const storage = this.configService.assetOptions.assetStorageStrategy;
        const revision = await this.embedder.getRevision();
        const health = await this.embedder.getHealth();

        const payload: Array<{ id: string; data: Buffer }> = [];
        for (const asset of assets) {
            try {
                payload.push({ id: String(asset.id), data: await storage.readFileToBuffer(asset.source) });
            } catch (e: any) {
                Logger.warn(`Asset ${asset.id}: cannot read ${asset.source} (${e.message})`, loggerCtx);
            }
        }

        const results = await this.embedder.embedImages(payload);
        const repo = this.connection.getRepository(ctx, ProductAssetEmbedding);

        // Replace the product's rows wholesale rather than upserting per asset. This
        // makes reindexing idempotent AND drops rows for assets that were detached
        // from the product since the last run, which a per-asset upsert would strand.
        await repo.delete({ productId });

        const rows = results
            .filter(r => {
                if (!r.vector) {
                    Logger.warn(`Asset ${r.id}: ${r.error?.code} ${r.error?.message}`, loggerCtx);
                }
                return r.vector != null;
            })
            .map(
                r =>
                    new ProductAssetEmbedding({
                        productId,
                        assetId: r.id as unknown as ID,
                        embedding: r.vector as number[],
                        revision,
                        modelId: health.model_id,
                    }),
            );

        if (rows.length > 0) {
            await repo.save(rows);
        }
        const written = rows.length;

        Logger.verbose(`Product ${productId}: embedded ${written}/${assets.length} assets`, loggerCtx);
        return written;
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

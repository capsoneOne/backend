import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, Unique } from 'typeorm';

/**
 * One embedded image. Grain is (product, asset) rather than (product) so a product
 * with several photos is findable from any of them — the caller collapses rows to
 * products by taking each product's best-matching asset.
 *
 * `embedding` is declared here as text but created by the migration as pgvector's
 * `vector(N)`. TypeORM has no vector type; Postgres accepts the '[1,2,...]' text
 * form on write, and all distance queries are raw SQL, so the loose declaration
 * costs nothing. The transformer handles the array <-> literal conversion.
 */
// Unique on the pair, not on assetId: Vendure allows one Asset to be attached to
// several products, and a unique assetId would make indexing the second product fail.
@Entity()
@Unique('UQ_visual_search_product_asset', ['productId', 'assetId'])
export class ProductAssetEmbedding extends VendureEntity {
    constructor(input?: DeepPartial<ProductAssetEmbedding>) {
        super(input);
    }

    // @EntityId, not @Column: Vendure's ID type is `string | number` and the concrete
    // column type isn't known until runtime, when the configured EntityIdStrategy is
    // available. A plain @Column() makes TypeORM see `Object` and fail at bootstrap.
    @Index()
    @EntityId()
    productId: ID;

    @EntityId()
    assetId: ID;

    @Column({
        type: 'text',
        transformer: {
            to: (value: number[] | null) => (value == null ? null : `[${value.join(',')}]`),
            from: (value: string | null) =>
                value == null ? null : (JSON.parse(value) as number[]),
        },
    })
    embedding: number[];

    /**
     * The embedder's `revision` at the time this row was written. A row whose
     * revision differs from the live embedder is stale: its vector lives in a
     * different space and its distances are meaningless. Never compare across
     * revisions — reindex instead.
     */
    @Index()
    @Column()
    revision: string;

    @Column()
    modelId: string;
}

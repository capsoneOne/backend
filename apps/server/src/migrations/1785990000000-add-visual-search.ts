import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Visual search index.
 *
 * Hand-written rather than generated: TypeORM has no `vector` type, so a generated
 * migration would emit `text` for the embedding column and the ANN index could not
 * be built. The entity declares the column as text with a transformer; Postgres
 * accepts pgvector's '[1,2,...]' literal form on write.
 *
 * The vector width (512) is fixed here. Changing the embedding model to one with a
 * different dimension requires a new migration and a full reindex — see
 * docs/embedding-service-contract.md §4.
 */
export class AddVisualSearch1785990000000 implements MigrationInterface {
    name = 'AddVisualSearch1785990000000';

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`, undefined);

        await queryRunner.query(
            `CREATE TABLE "product_asset_embedding" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "productId" integer NOT NULL,
                "assetId" integer NOT NULL,
                "embedding" vector(512) NOT NULL,
                "revision" character varying NOT NULL,
                "modelId" character varying NOT NULL,
                CONSTRAINT "PK_product_asset_embedding" PRIMARY KEY ("id")
            )`,
            undefined,
        );

        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_visual_search_product_asset" ON "product_asset_embedding" ("productId", "assetId")`,
            undefined,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_pae_product" ON "product_asset_embedding" ("productId")`,
            undefined,
        );
        // Every query filters on revision, so it carries its own index.
        await queryRunner.query(
            `CREATE INDEX "IDX_pae_revision" ON "product_asset_embedding" ("revision")`,
            undefined,
        );

        // CASCADE so deleting a product or asset cannot leave an orphan vector that
        // still matches queries and resolves to nothing.
        await queryRunner.query(
            `ALTER TABLE "product_asset_embedding"
             ADD CONSTRAINT "FK_pae_product" FOREIGN KEY ("productId")
             REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            undefined,
        );
        await queryRunner.query(
            `ALTER TABLE "product_asset_embedding"
             ADD CONSTRAINT "FK_pae_asset" FOREIGN KEY ("assetId")
             REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            undefined,
        );

        // HNSW with cosine ops, matching the `<=>` operator used by the search query.
        // Vectors are L2-normalized by the embedder, so cosine and inner product rank
        // identically; cosine is kept because its [0, 2] range is easier to reason about.
        await queryRunner.query(
            `CREATE INDEX "IDX_pae_embedding_hnsw" ON "product_asset_embedding"
             USING hnsw ("embedding" vector_cosine_ops)`,
            undefined,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE IF EXISTS "product_asset_embedding"`, undefined);
        // The vector extension is left in place: other things may depend on it, and
        // dropping it is not required to reverse this migration.
    }
}

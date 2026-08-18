-- Gives every variant the assets of its parent product.
--
--     docker exec -e PGPASSWORD=$DB_PASSWORD visual-search-capstone-postgres_db-1 \
--       psql -U vendure -d vendure -f - < backfill-variant-assets.sql
--
-- Why this exists: a Vendure variant does not inherit its product's assets. It has its
-- own product_variant_asset links and its own featuredAssetId, and a storefront that
-- renders variant.featuredAsset shows nothing when they are null. The import CSV's
-- `variantAssets` column is what normally fills them; rows imported before that column
-- was populated need this backfill.
--
-- Raw SQL rather than the Admin API because updateProductVariants is one mutation per
-- variant — 17,180 round trips against two statements.
--
-- WHAT THIS DOES NOT DO: it bypasses Vendure's event system, so search_index_item keeps
-- its stale (null) asset columns until you run `mutation { reindex }`. It does not touch
-- visual search, which embeds product assets and never reads variant links.
--
-- Idempotent and non-destructive: NOT EXISTS skips links that already exist, and the
-- UPDATE only fills a featuredAssetId that is currently null. Re-running changes nothing.

BEGIN;

-- 1. Link each variant to every asset of its product, preserving the product's ordering.
INSERT INTO product_variant_asset ("createdAt", "updatedAt", "assetId", "position", "productVariantId")
SELECT now(), now(), pa."assetId", pa."position", pv.id
FROM product_variant pv
JOIN product_asset pa ON pa."productId" = pv."productId"
WHERE pv."deletedAt" IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM product_variant_asset pva
      WHERE pva."productVariantId" = pv.id
        AND pva."assetId" = pa."assetId"
  );

-- 2. Point each variant's featured asset at its product's, which is what the storefront
--    actually renders. Only fills nulls, so a deliberately-set variant image survives.
UPDATE product_variant pv
SET "featuredAssetId" = p."featuredAssetId",
    "updatedAt" = now()
FROM product p
WHERE p.id = pv."productId"
  AND pv."deletedAt" IS NULL
  AND pv."featuredAssetId" IS NULL
  AND p."featuredAssetId" IS NOT NULL;

COMMIT;

-- Verification: expect variants_missing_featured = 0 for every product that has an asset.
SELECT
    (SELECT count(*) FROM product_variant WHERE "deletedAt" IS NULL) AS variants,
    (SELECT count(*) FROM product_variant_asset) AS variant_asset_links,
    (SELECT count(*)
       FROM product_variant pv
       JOIN product p ON p.id = pv."productId"
      WHERE pv."deletedAt" IS NULL
        AND p."featuredAssetId" IS NOT NULL
        AND pv."featuredAssetId" IS NULL) AS variants_missing_featured;

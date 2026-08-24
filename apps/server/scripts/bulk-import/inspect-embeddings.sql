-- Inspecting the visual-search vectors.
--
--     docker exec -e PGPASSWORD=$DB_PASSWORD visual-search-capstone-postgres_db-1 \
--       psql -U vendure -d vendure -f - < inspect-embeddings.sql
--
-- Vectors live in `product_asset_embedding`, one row per (product, asset), written by
-- VisualSearchService.indexProduct. `embedding` is a pgvector `vector(512)` — psql
-- prints it as a bracketed float list, so every query here truncates it.

-- 1. What is in the index, grouped by model revision.
--    Rows on a revision other than the embedder's current one are invisible to search:
--    every query filters on revision, by design, so a partial reindex degrades recall
--    instead of mixing incomparable vector spaces.
SELECT revision,
       "modelId",
       count(*)                     AS rows,
       count(DISTINCT "productId")  AS products,
       min("createdAt")             AS first_written,
       max("createdAt")             AS last_written
FROM product_asset_embedding
GROUP BY 1, 2
ORDER BY rows DESC;

-- 2. Individual vectors, with the two properties worth checking.
--    dims must be 512 (the column enforces it) and norm must be 1.0 — the service
--    normalizes before returning, so cosine reduces to an inner product. A norm that
--    is not 1.0 means something wrote to this table bypassing the service.
--    l2_norm() is overloaded across vector/halfvec/sparsevec and cannot resolve here,
--    hence the inner-product form: sqrt(-(v <#> v)) == sqrt(v . v).
SELECT e."productId"                                        AS pid,
       left(pt.slug, 40)                                    AS slug,
       vector_dims(e.embedding)                             AS dims,
       round(sqrt(-(e.embedding <#> e.embedding))::numeric, 6) AS norm,
       left(e.embedding::text, 52) || ' ...'                AS first_dims
FROM product_asset_embedding e
JOIN product_translation pt ON pt."baseId" = e."productId"
ORDER BY e."productId"
LIMIT 20;

-- 3. Nearest neighbours to one product, the query visual search actually runs.
--    `<=>` is cosine distance in [0, 2]; lower is more similar, and a product against
--    itself is 0. Set the id and revision to taste.
WITH q AS (
    SELECT embedding
    FROM product_asset_embedding
    WHERE "productId" = 3501
      AND revision = (SELECT revision FROM product_asset_embedding
                      ORDER BY "createdAt" DESC LIMIT 1)
)
SELECT left(pt.slug, 40)                              AS slug,
       round((e.embedding <=> q.embedding)::numeric, 4) AS cosine_distance
FROM product_asset_embedding e
JOIN product_translation pt ON pt."baseId" = e."productId"
CROSS JOIN q
WHERE e.revision = (SELECT revision FROM product_asset_embedding
                    ORDER BY "createdAt" DESC LIMIT 1)
ORDER BY e.embedding <=> q.embedding
LIMIT 10;

-- 4. Products that should be searchable but are not — indexed assets missing entirely.
--    Non-zero after a full reindex means the embedder failed on those images; the
--    worker log names each one.
SELECT count(*) AS products_with_asset_but_no_vector
FROM product p
WHERE p."deletedAt" IS NULL
  AND p."featuredAssetId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM product_asset_embedding e WHERE e."productId" = p.id);

#!/usr/bin/env bash
#
# Does using the HNSW index cost us any accuracy?
#
# Compares the two candidate query shapes on the live index:
#   Method A — exact: DISTINCT ON over every row. What production runs today.
#              Cannot use the HNSW index (DISTINCT ON forces a sort by productId,
#              HNSW emits rows in distance order — incompatible orderings).
#   Method B — HNSW: over-fetch top-N assets via the index, then collapse to products.
#
# Reports how often the two return the same top-12, and the mean set overlap.
# Overlap is the number that matters: a difference in ORDER between two exactly-tied
# distances is not a recall loss, whereas a missing product is.
#
# Usage: ./eval/compare-hnsw.sh [num_queries] [ef_search]
#
# NOTE ON ef_search: pgvector will never return more rows from one HNSW scan than
# hnsw.ef_search (default 40). Writing `LIMIT 100` with ef_search=40 silently gives
# you 40 rows. Keep ef_search >= the over-fetch limit or the over-fetch is a fiction.

set -euo pipefail

CONTAINER=${PG_CONTAINER:-visual-search-capstone-postgres_db-1}
DB="docker exec $CONTAINER psql -U vendure -d vendure -tAX"
N=${1:-100}
EF=${2:-200}
FETCH=100

REV=$($DB -c "SELECT revision FROM product_asset_embedding LIMIT 1")
echo "revision   : $REV"
echo "queries    : $N"
echo "ef_search  : $EF   (over-fetch limit: $FETCH)"
echo

IDS=$($DB -c "SELECT id FROM product_asset_embedding ORDER BY id LIMIT $N")
identical=0; total=0; overlap_sum=0

for ID in $IDS; do
  Q="(SELECT embedding FROM product_asset_embedding WHERE id = $ID)"

  # Method A — exact brute force (production today)
  A=$($DB -c "
    SELECT string_agg(pid::text, ',' ORDER BY rn) FROM (
      SELECT best.\"productId\" AS pid, row_number() OVER (ORDER BY best.distance) AS rn
      FROM (
        SELECT DISTINCT ON (e.\"productId\") e.\"productId\", (e.embedding <=> $Q) AS distance
        FROM product_asset_embedding e
        JOIN product p ON p.id = e.\"productId\"
        WHERE e.revision = '$REV' AND p.\"deletedAt\" IS NULL AND p.enabled
        ORDER BY e.\"productId\", distance
      ) best ORDER BY best.distance LIMIT 12
    ) t")

  # Method B — HNSW over-fetch then collapse
  B=$($DB -c "SET hnsw.ef_search = $EF" -c "
    SELECT string_agg(pid::text, ',' ORDER BY rn) FROM (
      SELECT best.\"productId\" AS pid, row_number() OVER (ORDER BY best.distance) AS rn
      FROM (
        SELECT DISTINCT ON (c.\"productId\") c.\"productId\", c.distance
        FROM (
          SELECT e.\"productId\", (e.embedding <=> $Q) AS distance
          FROM product_asset_embedding e
          WHERE e.revision = '$REV'
          ORDER BY e.embedding <=> $Q
          LIMIT $FETCH
        ) c
        JOIN product p ON p.id = c.\"productId\"
        WHERE p.\"deletedAt\" IS NULL AND p.enabled
        ORDER BY c.\"productId\", c.distance
      ) best ORDER BY best.distance LIMIT 12
    ) t" | tail -1)

  total=$((total+1))
  [ "$A" == "$B" ] && identical=$((identical+1)) || {
    echo "  order differs on query id=$ID"; }
  ov=$(python3 -c "print(len(set('$A'.split(','))&set('$B'.split(','))))")
  overlap_sum=$((overlap_sum+ov))
done

echo
echo "identical top-12 (incl. order) : $identical/$total"
echo "mean set overlap               : $(python3 -c "print(f'{$overlap_sum/$total:.2f}/12')")"
echo
echo "Set overlap of 12.00/12 means zero recall loss: HNSW found every product"
echo "brute force found. Order-only differences are ties, not misses."

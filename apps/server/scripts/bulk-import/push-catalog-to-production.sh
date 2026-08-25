#!/usr/bin/env bash
# Streams the local catalog into the Railway production database, table by table.
#
#     bash scripts/bulk-import/push-catalog-to-production.sh "$URL"
#
# where $URL is the production Postgres connection string reached over its TCP proxy:
#
#     URL=$(railway variables -s Postgres --json | python3 -c "import json,sys;\
#       d=json.load(sys.stdin);u=d['DATABASE_URL'];\
#       print(u.replace(d['RAILWAY_PRIVATE_DOMAIN']+':'+str(d['RAILWAY_TCP_APPLICATION_PORT']),\
#                       d['RAILWAY_TCP_PROXY_DOMAIN']+':'+str(d['RAILWAY_TCP_PROXY_PORT'])))")
#
# WHY NOT pg_dump / pg_restore: the production database already holds its own
# infrastructure rows — channel, administrator, roles, seller, stock location. A full
# restore needs DROP SCHEMA and would replace production's admin credentials with the
# local ones, so the password in Railway's SUPERADMIN_PASSWORD would stop matching the
# account it names. This copies only the catalog and the reference data it depends on,
# leaving production's own identity untouched.
#
# SAFE TO RUN because the catalog tables in production are empty. It is NOT idempotent:
# running it twice duplicates rows and will collide on primary keys. To re-run, clear the
# catalog first with reset-catalog.mjs pointed at production.
#
# FK ordering is sidestepped with session_replication_role = replica, so the table order
# below does not have to be topological. That needs superuser on the target, which the
# Railway `postgres` role has.
#
# The local and production `channel`, `seller` and `stock_location` rows must share ids
# (all are 1 on a default install) or the copied rows will point at nothing. Verify with:
#     SELECT id, code FROM channel;
#
# AFTERWARDS: this writes rows directly and bypasses Vendure's event system. The search
# index and embeddings are copied verbatim, so no reindex is required — but restart or
# redeploy the backend so it picks up the new data cleanly:
#     railway redeploy -s backend
set -euo pipefail

LOCAL_CTR=visual-search-capstone-postgres_db-1
LOCAL_PW=${LOCAL_DB_PASSWORD:-vendure}
PGIMAGE=postgres:18-alpine

if [ $# -lt 1 ]; then
  echo "usage: $0 <production-postgres-url>" >&2
  exit 1
fi
URL="$1"

# Deliberately excludes the tables production already owns: session, migrations, role,
# administrator, user, authentication_method, channel, seller, stock_location,
# global_settings, settings_store_entry, scheduled_task_record, job_record. Also excludes
# local test data with no place in production: customer, address, history_entry, and
# stock_movement (adjustment history, not needed to make stock correct).
TABLES=(
  region region_translation zone zone_members_region
  tax_category tax_rate
  facet facet_channels_channel facet_translation
  facet_value facet_value_channels_channel facet_value_translation
  asset asset_channels_channel asset_translation
  collection collection_translation collection_channels_channel collection_asset collection_closure
  product product_translation product_channels_channel product_asset product_facet_values_facet_value
  product_option_group product_option_group_translation product_option_group_channels_channel
  product_option product_option_translation product_option_channels_channel
  product_option_groups_product_option_group
  product_variant product_variant_translation product_variant_channels_channel
  product_variant_asset product_variant_price product_variant_options_product_option
  stock_level
  product_asset_embedding
  search_index_item
  payment_method payment_method_translation payment_method_channels_channel
  shipping_method shipping_method_translation shipping_method_channels_channel
)

echo "streaming ${#TABLES[@]} tables to production"
for t in "${TABLES[@]}"; do
  n=$(docker exec -e PGPASSWORD="$LOCAL_PW" "$LOCAL_CTR" \
        psql -U vendure -d vendure -t -A -c "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo 0)
  if [ "$n" = "0" ]; then
    printf '  %-46s skipped (empty locally)\n' "$t"
    continue
  fi
  docker exec -e PGPASSWORD="$LOCAL_PW" "$LOCAL_CTR" \
      psql -U vendure -d vendure -c "\\copy \"$t\" TO STDOUT" \
  | docker run --rm -i "$PGIMAGE" psql "$URL" -q \
      -c "SET session_replication_role = replica;" \
      -c "\\copy \"$t\" FROM STDIN" >/dev/null
  printf '  %-46s %s rows\n' "$t" "$n"
done

# Every id column keeps its local value, so each sequence still points at 1 and the next
# insert through the Admin API would collide. Fast-forward them all to max(id).
echo
echo "resetting id sequences"
docker run --rm "$PGIMAGE" psql "$URL" -q -c "
DO \$\$
DECLARE r record; mx bigint;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col, pg_get_serial_sequence(c.relname, a.attname) AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE c.relkind = 'r' AND pg_get_serial_sequence(c.relname, a.attname) IS NOT NULL
  LOOP
    EXECUTE format('SELECT coalesce(max(%I),0) FROM %I', r.col, r.tbl) INTO mx;
    IF mx > 0 THEN PERFORM setval(r.seq, mx); END IF;
  END LOOP;
END \$\$;"

echo
echo "done — verify with:"
echo "  docker run --rm $PGIMAGE psql \"\$URL\" -c \"SELECT"
echo "    (SELECT count(*) FROM product WHERE \\\"deletedAt\\\" IS NULL) AS products,"
echo "    (SELECT count(*) FROM product_variant WHERE \\\"deletedAt\\\" IS NULL AND \\\"featuredAssetId\\\" IS NULL) AS variants_missing_image,"
echo "    (SELECT count(*) FROM product_asset_embedding) AS embeddings;\""
echo "then: railway redeploy -s backend"

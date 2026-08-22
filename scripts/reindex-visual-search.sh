#!/usr/bin/env bash
# Trigger a visual-search reindex and watch it land.
#
# Usage:  ./scripts/reindex-visual-search.sh            # full reindex
#         ./scripts/reindex-visual-search.sh --resume   # only products missing a vector
#
# Credentials are read from apps/server/.env at runtime and never stored here.
# Prints one progress line every 20s, and stops early if progress stalls.
# Read the reindex runbook in AGENTS.md first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/apps/server/.env"
ADMIN_API="${ADMIN_API:-http://localhost:3000/admin-api}"
EMBEDDER="${EMBEDDER_URL:-http://localhost:8100}"
PG=(docker exec visual-search-capstone-postgres_db-1 psql -U vendure -d vendure -t -A -c)

ONLY_MISSING=false
[ "${1:-}" = "--resume" ] && ONLY_MISSING=true

envval() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
SU="$(envval SUPERADMIN_USERNAME)"
SP="$(envval SUPERADMIN_PASSWORD)"
[ -n "$SU" ] && [ -n "$SP" ] || { echo "ABORT: superadmin credentials not found in $ENV_FILE"; exit 1; }

# Refuse an index stamped with an identity that will not survive a restart. The
# backend enforces this too; failing here just saves the round trip.
REV="$(curl -s "$EMBEDDER/health" | python3 -c 'import json,sys;print(json.load(sys.stdin)["revision"])')"
case "$REV" in
  *-unpinned-*) echo "ABORT: embedder revision is unpinned ($REV). Restart it with network access."; exit 1 ;;
esac
echo "embedder revision : $REV"

COOKIE="$(mktemp)"
trap 'rm -f "$COOKIE"' EXIT
LOGIN="$(python3 - "$SU" "$SP" <<'PY'
import json, sys
print(json.dumps({"query": "mutation($u:String!,$p:String!){login(username:$u,password:$p){__typename}}",
                  "variables": {"u": sys.argv[1], "p": sys.argv[2]}}))
PY
)"
curl -s -c "$COOKIE" -X POST "$ADMIN_API" -H 'content-type: application/json' -d "$LOGIN" > /dev/null

RESP="$(curl -s -b "$COOKIE" -X POST "$ADMIN_API" -H 'content-type: application/json' \
  -d "{\"query\":\"mutation{reindexVisualSearch(onlyMissing:$ONLY_MISSING)}\"}")"
echo "trigger response  : $RESP"
case "$RESP" in *'"errors"'*) echo "ABORT: mutation failed."; exit 1 ;; esac

TARGET="$("${PG[@]}" "SELECT COUNT(*) FROM product p WHERE p.\"deletedAt\" IS NULL AND EXISTS (SELECT 1 FROM product_asset a WHERE a.\"productId\"=p.id);")"
echo "products w/ assets: $TARGET"
echo

# A full 32-image batch can legitimately take ~90s (EmbedderService.timeoutFor scales
# the deadline with batch size), so a stall is only real after several quiet ticks.
STALL_TICKS=8
LAST=-1; STABLE=0
while :; do
  sleep 20
  # The most common reason progress stops is that the Vendure process died, which
  # leaves jobs stranded in RUNNING and looks identical to a slow batch from the
  # embedding count alone. Distinguish the two rather than reporting "stalled".
  if ! curl -s -m 5 -o /dev/null "${ADMIN_API%/admin-api}/health"; then
    echo; echo "SERVER DOWN: Vendure stopped responding at $(date +%H:%M:%S)."
    echo "Jobs left in RUNNING are stranded. Restart the server, then re-run with --resume."
    break
  fi
  NOW="$("${PG[@]}" "SELECT COUNT(DISTINCT \"productId\") FROM product_asset_embedding WHERE revision='$REV';")"
  PENDING="$("${PG[@]}" "SELECT COUNT(*) FROM job_record WHERE \"queueName\"='visual-search-index-product' AND state IN ('PENDING','RUNNING');")"
  FAILED="$("${PG[@]}" "SELECT COUNT(*) FROM job_record WHERE \"queueName\"='visual-search-index-product' AND state='FAILED';")"
  printf '%s  indexed %s/%s  jobs-left %s  failed %s\n' "$(date +%H:%M:%S)" "$NOW" "$TARGET" "$PENDING" "$FAILED"
  if [ "$NOW" = "$TARGET" ]; then echo; echo "COMPLETE: $NOW/$TARGET"; break; fi
  if [ "$PENDING" = "0" ]; then
    echo; echo "QUEUE DRAINED at $NOW/$TARGET with $FAILED failed job(s)."
    echo "Products short of the target had unreadable images or failed jobs; see the server log."
    break
  fi
  if [ "$NOW" = "$LAST" ]; then STABLE=$((STABLE+1)); else STABLE=0; fi
  LAST="$NOW"
  if [ "$STABLE" -ge "$STALL_TICKS" ]; then
    echo; echo "STALLED at $NOW/$TARGET (no change in $((STALL_TICKS * 20))s, $PENDING job(s) still queued)."
    echo "Check the Vendure server log for VisualSearchPlugin errors."
    break
  fi
done

echo "--- final, by revision ---"
docker exec visual-search-capstone-postgres_db-1 psql -U vendure -d vendure -c \
  "SELECT revision, COUNT(*) AS rows, COUNT(DISTINCT \"productId\") AS products
   FROM product_asset_embedding GROUP BY 1 ORDER BY rows DESC;"

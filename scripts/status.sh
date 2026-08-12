#!/usr/bin/env bash
#
# One view of whether the stack is actually working.
#
# Exists because "is it running?" has needed four separate commands: lsof for the
# apps, docker compose ps for the containers, a curl for the embedder, and a psql
# query for the index. Each of those was where a silent failure hid.
#
#   npm run status

set -uo pipefail
COMPOSE_FILE="apps/server/docker-compose.yml"

ok()   { printf '  \033[32m●\033[0m %-22s %s\n' "$1" "$2"; }
bad()  { printf '  \033[31m○\033[0m %-22s %s\n' "$1" "$2"; }
warn() { printf '  \033[33m◐\033[0m %-22s %s\n' "$1" "$2"; }

printf '\nProcesses\n'
for entry in "server:3000:/shop-api" "storefront:3001:/en"; do
    IFS=: read -r name port path <<<"$entry"
    pid=$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null | head -1)
    if [[ -z "$pid" ]]; then
        bad "$name" "not running (:$port free)"
    else
        code=$(curl -s -o /dev/null -w '%{http_code}' -m 4 -L "http://localhost:${port}${path}" 2>/dev/null)
        # A bare GET on a GraphQL endpoint is a 400 by design, not a fault.
        if [[ "$code" == "200" || "$code" == "400" ]]; then
            ok "$name" "pid $pid · :$port · HTTP $code"
        else
            warn "$name" "pid $pid · :$port · HTTP ${code:-no response}"
        fi
    fi
done

printf '\nContainers\n'
if ! docker info >/dev/null 2>&1; then
    bad "docker" "daemon not reachable"
else
    while IFS='|' read -r n s; do
        [[ -z "$n" ]] && continue
        case "$s" in
            *healthy*)  ok   "${n##*-capstone-}" "$s" ;;
            *Up*)       warn "${n##*-capstone-}" "$s" ;;
            *)          bad  "${n##*-capstone-}" "$s" ;;
        esac
    done < <(docker compose -f "$COMPOSE_FILE" ps -a --format '{{.Name}}|{{.Status}}' 2>/dev/null)
fi

printf '\nEmbedder\n'
health=$(curl -s -m 4 http://localhost:8100/health 2>/dev/null)
if [[ -z "$health" ]]; then
    bad "model" "unreachable on :8100"
    live_rev=""
else
    live_rev=$(printf '%s' "$health" | python3 -c 'import json,sys;print(json.load(sys.stdin)["revision"])' 2>/dev/null)
    model=$(printf '%s' "$health" | python3 -c 'import json,sys;print(json.load(sys.stdin)["model_id"])' 2>/dev/null)
    shared=$(printf '%s' "$health" | python3 -c 'import json,sys;print(json.load(sys.stdin)["shared_space"])' 2>/dev/null)
    ok "model" "$model · rev=$live_rev · shared_space=$shared"
    case "$model" in
        stub*) warn "warning" "stub model — results are meaningless, do not demo" ;;
        sim*)  warn "warning" "simulator — good for UI work, not for reported numbers" ;;
    esac
fi

printf '\nIndex\n'
rows=$(docker compose -f "$COMPOSE_FILE" exec -T postgres_db psql -U vendure -d vendure -tAc \
    "SELECT revision||'|'||count(*) FROM product_asset_embedding GROUP BY revision;" 2>/dev/null | tr -d '\r')
if [[ -z "$rows" ]]; then
    bad "embeddings" "none, or database unreachable"
else
    while IFS='|' read -r rev n; do
        [[ -z "$rev" ]] && continue
        if [[ -n "$live_rev" && "$rev" != "$live_rev" ]]; then
            bad "$rev" "$n rows — STALE, excluded from search. Reindex."
        else
            ok "$rev" "$n rows"
        fi
    done <<<"$rows"
fi

printf '\nAssets\n'
if grep -q '^R2_BUCKET=.' apps/server/.env 2>/dev/null; then
    bucket=$(grep '^R2_BUCKET=' apps/server/.env | cut -d= -f2-)
    ok "storage" "Cloudflare R2 · $bucket"
else
    warn "storage" "local disk (apps/server/static/assets)"
fi

printf '\n'

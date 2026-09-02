#!/usr/bin/env bash
# Points the Railway backend at the embedder running on this machine, via a Cloudflare
# tunnel, and verifies the whole path end to end.
#
#     bash scripts/start-embedder-tunnel.sh
#     bash scripts/start-embedder-tunnel.sh --status     # is it currently wired up?
#     bash scripts/start-embedder-tunnel.sh --stop       # kill the tunnel
#
# WHY THIS EXISTS: the embedder cannot run on Railway's Trial plan. `/health` answers
# fine, but any /embed/images call allocates model activations on top of the resident
# weights, the container is OOM-killed, and Railway's edge returns
# "502 Application failed to respond". The service then restarts and looks healthy again,
# which makes a hard failure look intermittent. Running the model here and tunnelling it
# in is the workaround until the plan is upgraded.
#
# THE REVISION MUST MATCH. Every similarity query filters on the embedder's revision, so
# a query vector from a different model or revision matches nothing and returns an empty
# result set with NO error. This script refuses to wire up a mismatch — that failure is
# far more expensive to debug than a refusal here.
#
# WHY IT REDEPLOYS: `EMBEDDER_URL` is read once at config load into
# visualSearchOptions.embedderUrl. Setting the Railway variable alone changes nothing
# until the process restarts. Forgetting the redeploy is the single most likely way to
# conclude "the tunnel is broken" when it is fine.
#
# Quick tunnels get a random hostname per process, so the URL changes every time this
# runs. That is precisely what this script automates away: it re-points and redeploys in
# one step. A brief network drop does NOT change the URL — cloudflared reconnects to the
# same hostname. A LONG one does: the quick-tunnel hostname is a lease, and once Cloudflare
# drops the registration the process keeps retrying forever against a name that no longer
# resolves. A live cloudflared process is therefore not evidence of a live tunnel, which is
# why step 3 believes the health check rather than pgrep, and recycles the process when the
# two disagree.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EMBEDDER_LOCAL=http://localhost:8100
BACKEND=https://backend-production-22482.up.railway.app
TUNNEL_LOG=/tmp/embedder-tunnel.log
TEST_IMAGE="$REPO_ROOT/apps/server/static/a/dataset_clean/casual_shirts/img_0166.jpg"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }

tunnel_url() {
  grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -1
}

case "${1:-}" in
  --stop)
    pkill -f 'cloudflared tunnel --url' 2>/dev/null && ok "tunnel stopped" || bad "no tunnel running"
    echo "Production visual search will 502 until you re-run this script."
    exit 0
    ;;
  --status)
    say "tunnel"
    if pgrep -f 'cloudflared tunnel --url' >/dev/null; then
      u=$(tunnel_url)
      if curl -sf --max-time 15 "$u/health" >/dev/null 2>&1; then ok "running — $u"
      else bad "process alive but $u is not answering — re-run this script to replace it"; fi
    else bad "not running"; fi
    say "what production is pointed at"
    railway variables -s backend --json 2>/dev/null \
      | python3 -c "import json,sys;print('  EMBEDDER_URL =', json.load(sys.stdin).get('EMBEDDER_URL','(unset)'))"
    exit 0
    ;;
esac

# --- 1. The local embedder has to be up before anything else is worth doing. ----------
say "1. local embedder"
LOCAL_HEALTH=$(curl -sf --max-time 10 "$EMBEDDER_LOCAL/health" || true)
if [ -z "$LOCAL_HEALTH" ]; then
  bad "not responding at $EMBEDDER_LOCAL"
  echo "     start it with:  npm run infra:up"
  exit 1
fi
LOCAL_REV=$(printf '%s' "$LOCAL_HEALTH" | python3 -c "import json,sys;print(json.load(sys.stdin)['revision'])")
ok "up, revision $LOCAL_REV"

# --- 2. Refuse to proceed if the stored vectors came from a different revision. --------
say "2. revision check against the production index"
PGURL=$(railway variables -s Postgres --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin); u=d['DATABASE_URL']
print(u.replace(d['RAILWAY_PRIVATE_DOMAIN']+':'+str(d['RAILWAY_TCP_APPLICATION_PORT']),
                d['RAILWAY_TCP_PROXY_DOMAIN']+':'+str(d['RAILWAY_TCP_PROXY_PORT'])))")
DB_REV=$(docker run --rm postgres:18-alpine psql "$PGURL" -t -A -c \
  "SELECT revision FROM product_asset_embedding GROUP BY 1 ORDER BY count(*) DESC LIMIT 1" 2>/dev/null | tr -d '[:space:]')
if [ "$LOCAL_REV" != "$DB_REV" ]; then
  bad "MISMATCH — searches would silently return nothing"
  echo "     local embedder : $LOCAL_REV"
  echo "     stored vectors : $DB_REV"
  echo "     Reindex production, or run the embedder revision the index was built with."
  exit 1
fi
ok "match — $DB_REV"

# --- 3. Reuse a live tunnel rather than orphaning it and leaking processes. ------------
say "3. cloudflare tunnel"
start_tunnel() {
  : > "$TUNNEL_LOG"
  nohup cloudflared tunnel --url "$EMBEDDER_LOCAL" --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
  URL=""
  for _ in $(seq 1 30); do
    URL=$(tunnel_url); [ -n "$URL" ] && break; sleep 2
  done
  [ -z "$URL" ] && { bad "tunnel did not produce a URL"; tail -20 "$TUNNEL_LOG"; exit 1; }
}

URL=""
REUSED=0
if pgrep -f 'cloudflared tunnel --url' >/dev/null; then
  URL=$(tunnel_url)
  if [ -n "$URL" ]; then ok "already running — $URL"; REUSED=1; else
    bad "a cloudflared process is running but its URL is unknown; restarting it"
    pkill -f 'cloudflared tunnel --url' || true
    sleep 2
  fi
fi

if [ -z "$URL" ]; then
  start_tunnel
  ok "started — $URL"
fi

# Prove the tunnel actually carries traffic before reconfiguring production around it.
# A reused tunnel that fails here is a dead lease, not a slow start: the process is up,
# the hostname is gone, and no amount of waiting brings it back. Replace it once.
if ! curl -sf --max-time 30 "$URL/health" >/dev/null; then
  if [ "$REUSED" = 1 ]; then
    bad "the running tunnel no longer resolves — its lease expired; replacing it"
    pkill -f 'cloudflared tunnel --url' || true
    sleep 2
    start_tunnel
    ok "restarted — $URL"
  fi
  if ! curl -sf --max-time 30 "$URL/health" >/dev/null; then
    bad "tunnel URL is not serving /health"
    echo "     local embedder answered, so the fault is between here and Cloudflare."
    tail -5 "$TUNNEL_LOG"
    exit 1
  fi
fi
ok "reachable through the tunnel"

# --- 4 & 5. Re-point production, then restart it so the value is actually read. --------
#
# THE VARIABLE VALUE IS NOT EVIDENCE. EMBEDDER_URL is read once at boot, so "the
# variable matches" and "the running process is using it" are different claims, and
# only the second one matters. The gap between them is how production ends up pointed
# at a dead tunnel while this script reports success:
#
#   run 1: sets the variable, then the redeploy fails       (it used to be `|| true`,
#          so the failure was silent and the script carried on)
#   run 2: sees CURRENT == URL, prints "no redeploy needed", skips the restart
#   run N: same — the variable is right forever, the running process never reloads,
#          and every search 502s against a hostname that stopped resolving days ago
#
# So the check is behavioural, not declarative: ask production to run a real search and
# believe the answer. Exactly the principle step 3 already applies when it trusts the
# health check over pgrep. If the variable is right but a search still fails, the
# running process is stale and gets redeployed regardless of what the variable says.

# One real search against production. Returns 0 if it produced results. Used both as
# the staleness probe below and as the final verification in step 6, so the thing being
# checked and the thing being reported are always the same thing.
prod_search() {
  curl -s --max-time 90 -F "image=@$TEST_IMAGE;type=image/jpeg" \
    "$BACKEND/visual-search/search?take=3" 2>/dev/null || true
}

prod_search_ok() {
  prod_search | python3 -c "
import json,sys
try: d = json.loads(sys.stdin.read())
except Exception: sys.exit(1)
sys.exit(0 if (d.get('items') or d.get('results')) else 1)
" >/dev/null 2>&1
}

say "4. pointing production at the tunnel"
CURRENT=$(railway variables -s backend --json 2>/dev/null \
  | python3 -c "import json,sys;print(json.load(sys.stdin).get('EMBEDDER_URL',''))")
NEEDS_DEPLOY=0

if [ "$CURRENT" != "$URL" ]; then
  echo "     was: ${CURRENT:-(unset)}"
  echo "     now: $URL"
  # Errors are NOT suppressed here: a failed set that looks like a success is what
  # leaves the variable stale while the script goes on to report everything is fine.
  if ! railway variables -s backend --set "EMBEDDER_URL=$URL" --skip-deploys 2>&1 \
       | grep -qi 'set variables'; then
    bad "could not set EMBEDDER_URL — see the output above"
    exit 1
  fi
  # Read it back. Trusting the exit code of a write is how the stale-variable case got
  # missed in the first place.
  VERIFY=$(railway variables -s backend --json 2>/dev/null \
    | python3 -c "import json,sys;print(json.load(sys.stdin).get('EMBEDDER_URL',''))")
  if [ "$VERIFY" != "$URL" ]; then
    bad "EMBEDDER_URL did not stick (reads back as ${VERIFY:-(unset)})"
    exit 1
  fi
  ok "EMBEDDER_URL set and verified"
  NEEDS_DEPLOY=1
else
  ok "variable already correct — $URL"
  # The variable matches, which proves nothing about the running process. Probe it.
  say "   checking whether the RUNNING backend actually uses it"
  if prod_search_ok; then
    ok "production is already serving searches — no redeploy needed"
  else
    bad "variable is correct but production cannot search"
    echo "     the running process booted with an older EMBEDDER_URL; redeploying"
    NEEDS_DEPLOY=1
  fi
fi

if [ "$NEEDS_DEPLOY" = 1 ]; then
  say "5. redeploying backend (EMBEDDER_URL is only read at boot)"
  # No `|| true`. A redeploy that fails silently is the whole reason this script could
  # leave production pointed at a dead tunnel and still print "done".
  if ! railway redeploy -s backend --yes 2>&1 | tail -3; then
    bad "redeploy command failed"
    exit 1
  fi
  HEALTHY=0
  for _ in $(seq 1 40); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BACKEND/health")" = "200" ]; then
      HEALTHY=1; break
    fi
    sleep 10
  done
  if [ "$HEALTHY" != 1 ]; then
    bad "backend did not come back healthy within ~7 minutes"
    echo "     check:  railway logs -s backend -d"
    exit 1
  fi
  ok "backend healthy"
fi

# --- 6. End to end, with a real photo — the only check that proves the whole path. -----
say "6. live image search against production"
prod_search | python3 -c "
import json,sys
raw=sys.stdin.read()
try: d=json.loads(raw)
except Exception: print('  unparseable response:', raw[:200]); sys.exit(1)
items = d.get('items') or d.get('results') or []
if not items:
    print('  NO RESULTS —', json.dumps(d)[:220])
    print('  An empty list with no error usually means a revision mismatch.')
    sys.exit(1)
print(f'  {len(items)} results:')
for i in items[:3]:
    name = i.get('productName') or i.get('name') or i.get('slug') or '?'
    score = i.get('score') or i.get('distance') or ''
    print(f'    {str(name)[:44]:46} {score}')
" && ok "visual search is live" || { bad "verification failed"; exit 1; }

say "done"
echo "  Tunnel log:  $TUNNEL_LOG"
echo "  Keep this machine awake — it is now serving production."
echo "  Re-run this script after any reboot or if you kill cloudflared."
echo "  Check anytime with:  bash scripts/start-embedder-tunnel.sh --status"

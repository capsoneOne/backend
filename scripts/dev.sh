#!/usr/bin/env bash
#
# Run the dev stack so a single Ctrl-C tears down every child.
#
# The problem this solves: `concurrently` spawns `npm run dev -w <app>`, npm spawns a
# shell, and that shell spawns the real server. SIGINT reaches concurrently, but the
# grandchildren (next-server, the Vendure server and worker) are never signalled and
# survive as orphans still holding ports 3000 and 3001.
#
# The fix is `set -m`. With job control on, each background job becomes its own process
# group leader, so `kill -TERM -$PID` (note the minus) signals the whole tree rather than
# just the wrapper. The port sweep afterwards catches anything that ignored SIGTERM.
#
# Usage:
#   bash scripts/dev.sh              # apps only; leaves Docker running
#   STOP_INFRA=1 bash scripts/dev.sh # also stops Postgres + embedder on exit

set -uo pipefail

COMPOSE_FILE="apps/server/docker-compose.yml"
STOP_INFRA="${STOP_INFRA:-0}"
PORTS=(3000 3001)

cleanup() {
    # Ignore further signals so a second Ctrl-C can't re-enter mid-teardown.
    trap '' INT TERM

    printf '\n▸ shutting down dev stack\n'

    if [[ -n "${RUNNER_PID:-}" ]]; then
        kill -TERM -"$RUNNER_PID" 2>/dev/null || true
        # Give Next and Vendure a moment to close listeners and flush.
        for _ in 1 2 3 4 5 6 7 8 9 10; do
            kill -0 -"$RUNNER_PID" 2>/dev/null || break
            sleep 0.3
        done
        kill -KILL -"$RUNNER_PID" 2>/dev/null || true
    fi

    # Belt and braces: anything still listening did not respect the signal.
    for port in "${PORTS[@]}"; do
        pids=$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            printf '  port %s still held by %s — killing\n' "$port" "$(echo "$pids" | tr '\n' ' ')"
            # shellcheck disable=SC2086
            kill -KILL $pids 2>/dev/null || true
        fi
    done

    if [[ "$STOP_INFRA" == "1" ]]; then
        printf '  stopping Postgres + embedder\n'
        docker compose -f "$COMPOSE_FILE" stop >/dev/null 2>&1 || true
    fi

    printf '▸ done\n'
}

# --- preflight -------------------------------------------------------------
# Refuse to start on top of a running stack. Without this, the second instance's
# Next.js fails with EADDRINUSE, concurrently's --kill-others then tears down the
# *first* instance's server too, and you end up with nothing running and a
# confusing error — which is worse than either outcome on its own.
blocked=0
for port in "${PORTS[@]}"; do
    holder=$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)
    if [[ -n "$holder" ]]; then
        name=$(ps -p "$(echo "$holder" | head -1)" -o comm= 2>/dev/null || echo "?")
        printf '  port %s already in use — pid %s (%s)\n' "$port" "$(echo "$holder" | tr '\n' ' ')" "$name"
        blocked=1
    fi
done
if (( blocked )); then
    cat <<'MSG'

The dev stack appears to be running already. Nothing was started or stopped.

  npm run status    show what is up
  npm run stop      stop it, then run dev again
MSG
    trap - EXIT          # nothing was started, so skip cleanup
    exit 1
fi

# --- infrastructure --------------------------------------------------------
# Start Postgres + the embedder if they are not already healthy. `--wait` blocks
# until both report healthy, which removes the race where Vendure boots first and
# fails against a database that is not accepting connections yet.
if [[ -z "$(docker compose -f "$COMPOSE_FILE" ps --status running -q 2>/dev/null)" ]]; then
    printf '▸ starting Postgres + embedder\n'
    if ! docker compose -f "$COMPOSE_FILE" up -d --wait; then
        printf '  could not start containers — is Docker running?\n'
        trap - EXIT
        exit 1
    fi
fi

printf '▸ server :3000   storefront :3001   (Ctrl-C stops everything)\n'

trap cleanup INT TERM EXIT

# Job control: makes the background job below its own process group leader.
set -m

npx concurrently \
    -n server,storefront \
    -c blue,magenta \
    --kill-others \
    --kill-signal SIGTERM \
    "npm run dev -w server" \
    "npm run dev -w storefront" &
RUNNER_PID=$!

wait "$RUNNER_PID"

#!/usr/bin/env bash
#
# Stop the dev stack. Apps always; containers only with --all.
#
# Kills by listening port rather than by process name: `pkill -f "next dev"` also
# matches this script's own command line and any editor terminal running something
# similar, which is how a "stop" ends up killing more than intended.
#
#   npm run stop         apps only, containers keep running
#   npm run stop -- --all  also stop Postgres + embedder

set -uo pipefail
COMPOSE_FILE="apps/server/docker-compose.yml"
ALL=0
[[ "${1:-}" == "--all" ]] && ALL=1

stopped=0
for port in 3000 3001; do
    pids=$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)
    [[ -z "$pids" ]] && continue
    for pid in $pids; do
        # Signal the whole process group: npm wraps a shell which wraps the real
        # server, so signalling the listener alone orphans its parents.
        pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
        printf '  stopping :%s (pid %s)\n' "$port" "$pid"
        [[ -n "$pgid" ]] && kill -TERM -"$pgid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
        stopped=1
    done
done

if (( stopped )); then
    for _ in 1 2 3 4 5 6 7 8 9 10; do
        still=$(lsof -ti tcp:3000 -ti tcp:3001 -sTCP:LISTEN 2>/dev/null || true)
        [[ -z "$still" ]] && break
        sleep 0.3
    done
    leftover=$(lsof -ti tcp:3000 -ti tcp:3001 -sTCP:LISTEN 2>/dev/null || true)
    if [[ -n "$leftover" ]]; then
        printf '  force killing %s\n' "$(echo "$leftover" | tr '\n' ' ')"
        # shellcheck disable=SC2086
        kill -KILL $leftover 2>/dev/null || true
    fi
else
    printf '  no app processes on :3000 or :3001\n'
fi

if (( ALL )); then
    printf '  stopping Postgres + embedder\n'
    docker compose -f "$COMPOSE_FILE" stop >/dev/null 2>&1 || true
else
    printf '  containers left running (npm run stop -- --all to stop them too)\n'
fi

#!/usr/bin/env bash
# End-to-end: assumes `docker compose up -d --build` is running and a key was
# seeded. Starts a local backend, runs the agent, curls the public URL.
set -euo pipefail
cd "$(dirname "$0")/.."

API="${INDOTUNNEL_API:-http://localhost:8081}"
TUNNEL="${INDOTUNNEL_TUNNEL:-localhost:7000}"
PORT="${LOCAL_PORT:-3999}"

TOKEN="$(go run ./cmd/seed)"
echo "seeded token"

go run ./cmd/seed >/dev/null 2>&1 || true

# local backend
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
BACKEND=$!
trap 'kill $BACKEND 2>/dev/null || true; kill $AGENT 2>/dev/null || true' EXIT

INDOTUNNEL_TOKEN="$TOKEN" INDOTUNNEL_API="$API" INDOTUNNEL_TUNNEL="$TUNNEL" \
  go run ./cmd/agent "$PORT" >/tmp/agent.out 2>&1 &
AGENT=$!

for i in $(seq 1 30); do
  grep -q "Public:" /tmp/agent.out && break
  sleep 1
done

SUB="$(grep -oE 'https?://[a-z0-9]+\.indotunnel\.localhost(:[0-9]+)?' /tmp/agent.out | head -1)"
HOST="${SUB#*//}"
HOST="${HOST%%:*}"
PORT="${SUB##*:}"
[ "$PORT" = "$SUB" ] && PORT=80
echo "public: $SUB"

BODY="$(curl -s --resolve "${HOST}:${PORT}:127.0.0.1" "${SUB}/")"
echo "$BODY" | grep -q "Directory listing" && echo "E2E OK"

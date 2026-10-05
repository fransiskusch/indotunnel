# IndoTunnel

Expose your localhost to the internet in seconds — built for Indonesian developers.

```bash
npx indotunnel 3000
```

Phase 1: core tunnel (Go agent + Go server, HTTP + WebSocket forwarding, Free-plan limits).
See `indotunnel-docs/` for product docs and `docs/superpowers/specs/` for the Phase 1 design.

## Local run

```bash
docker compose -f deploy/docker-compose.yml up -d --build
bash scripts/seed.sh          # prints an API key
export INDOTUNNEL_TOKEN=sk_live_...
go run ./cmd/agent 3000
```

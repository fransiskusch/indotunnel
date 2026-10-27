# IndoTunnel

Expose your localhost to the internet in one command. Built for Indonesian developers.

```bash
npx indotunnel 3000
```

```
IndoTunnel
────────────────────────────────
Status:   Connected
Local:    http://127.0.0.1:3000
Public:   https://a8f2x.indotunnel.ai.id
Region:   jakarta
Plan:     Free
```

No SSH, no port forwarding, no DNS records. The CLI opens one outbound
connection to the gateway; public requests are multiplexed back down that
connection to your machine. Your laptop never accepts an inbound connection.

Live: [indotunnel.ai.id](https://indotunnel.ai.id)

---

## What it is

Three moving parts:

| Part | What it does | Lives in |
|---|---|---|
| **Agent** (CLI) | Dials out to the gateway, holds the tunnel open, forwards streams to your local port. | `cmd/agent`, `agent/` |
| **Server** | Control API + public edge + tunnel listener, all in one process. | `cmd/server`, `internal/` |
| **Dashboard** | Next.js app: sign in, see tunnels, read request logs, manage API keys. | `apps/dashboard` |

### Request path

```
browser → https://a8f2x.indotunnel.ai.id
       → nginx (TLS, wildcard cert)
       → edge :8080  — routes by Host header, checks plan quota
       → yamux stream over the agent's outbound connection
       → agent → http://127.0.0.1:3000
```

The edge resolves the `Host` header to a live session in the in-memory tunnel
registry, opens one yamux stream per request, and reverse-proxies over it.
Metadata is recorded asynchronously (`internal/reqlog`) so the data path never
blocks on Postgres.

### Tunnel protocol

The agent connects to `:7000`, sends a JSON handshake, and the two sides run
[yamux](https://github.com/hashicorp/yamux) over the connection. Each HTTP
request becomes one stream. This is why WebSocket and SSE work: they are just
long-lived streams, not special cases.

---

## Features

- **One command to a public URL.** `npx indotunnel 3000` → `https://<sub>.indotunnel.ai.id`.
- **Automatic HTTPS.** Wildcard cert on the edge; nothing to configure.
- **Protocol-faithful.** HTTP/1.1, HTTP/2, WebSocket and SSE forwarded as-is.
- **Live request inspector.** Method, path, status, duration, sizes per request.
- **Device login.** `indotunnel login` opens the browser; the CLI polls for a token. No copy-pasting keys.
- **Plan enforcement.** Daily request count and monthly bandwidth, per user.
- **Live updates.** SSE stream pushes tunnel and request events to the dashboard.

> Replay is advertised on the landing page but not yet implemented in the
> backend — there is no replay endpoint or dashboard action. Tracked in
> `indotunnel-docs/17-roadmap.md`.

### Free plan

| Limit | Value |
|---|---|
| Active tunnels | 1 |
| Requests per day | 5,000 (resets at Jakarta midnight) |
| Monthly bandwidth | 10 GiB |
| Random subdomain | yes (`*.indotunnel.ai.id`) |
| Custom subdomain / domain | no |

Counters live in Redis and are mirrored to Postgres (`usage_daily`) for history.

---

## Repository layout

```
cmd/
  agent/          CLI entrypoint
  server/         control API + edge + tunnel listener
  seed/           create a dev user and print an API key
  setpassword/    set a user's password (ops)
  testbackend/    throwaway origin server for manual testing
agent/            CLI internals: config, cli parsing, API client, forwarder, reconnect
internal/
  api/            HTTP handlers (bearer-key and session-cookie routes)
  auth/           API keys, sessions, CSRF, bcrypt
  config/         env-driven config
  db/             pgx pool + migration runner
  events/         in-process event bus
  gateway/        public edge: Host routing, quota check, reverse proxy
  httpx/          shared HTTP helpers
  limits/         Redis counters, Jakarta-day reset
  redisclient/    device-auth state, locks
  reqlog/         async request-log writer + bandwidth accounting
  store/          Postgres queries
  subdomain/      random subdomain generation
  tunnel/         tunnel server, yamux registry, stream listener
migrations/       SQL, applied in order on server start
apps/
  dashboard/      Next.js dashboard + marketing landing page
  indotunnel-video/  Remotion launch video (separate package, no deploy impact)
npm/              the published `indotunnel` package
deploy/           Dockerfiles, compose files, nginx vhosts
scripts/          e2e, seed, release, set-password
indotunnel-docs/  product, architecture, protocol and ops docs
docs/superpowers/ design specs and implementation plans
```

---

## Local run

Requires Go 1.26, Docker, Node 20+.

```bash
docker compose -f deploy/docker-compose.yml up -d --build
bash scripts/seed.sh                      # prints an API key
export INDOTUNNEL_TOKEN=sk_live_...
go run ./cmd/agent 3000
```

The agent prints a public URL under `indotunnel.localhost:8080`.

Dashboard:

```bash
cd apps/dashboard
npm i && npm run dev
```

### End-to-end check

```bash
bash scripts/e2e.sh          # or: pwsh scripts/e2e.ps1
```

Starts a local origin, seeds a key, runs the agent, and fetches the public URL.

---

## CLI

```
indotunnel <port>              e.g. indotunnel 3000
indotunnel <host>:<port>       e.g. indotunnel 127.0.0.1:3000
indotunnel login               log in via browser (device flow)
indotunnel login <api-key>     save an API key directly
indotunnel --version
indotunnel --help
```

| Variable | Purpose | Default |
|---|---|---|
| `INDOTUNNEL_TOKEN` | API key (overrides the saved one) | — |
| `INDOTUNNEL_API` | Control API base URL | `https://indotunnel.ai.id/api` |
| `INDOTUNNEL_TUNNEL` | Tunnel server address | `indotunnel.ai.id:7000` |

Credentials are stored on disk by `indotunnel login`, so later runs need no env vars.

---

## Server configuration

All via environment. Defaults target local development.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgres://indotunnel:indotunnel@localhost:55432/indotunnel` | |
| `REDIS_URL` | `redis://localhost:6379/0` | |
| `EDGE_ADDR` | `:8080` | public edge |
| `API_ADDR` | `:8081` | control API |
| `TUNNEL_ADDR` | `:7000` | agent listener |
| `PUBLIC_HOST_SUFFIX` | `indotunnel.localhost` | production: `indotunnel.ai.id` |
| `PUBLIC_SCHEME` | `http` | production: `https` |
| `PUBLIC_PORT` | *(empty)* | set only when the edge is hit directly, e.g. `8080` locally |
| `DASHBOARD_ORIGIN` | `http://localhost:3000` | CSRF allow-list |
| `CLIENT_IP_HASH_SALT` | `change-me` | salt for hashed client IPs |
| `MAX_STREAMS_PER_TUNNEL` | `20` | concurrent streams per tunnel |
| `REQUEST_LOG_RETENTION_DAYS` | `7` | request-log retention |
| `SESSION_TTL_HOURS` | `720` | dashboard session lifetime (30d) |
| `BCRYPT_COST` | `12` | |
| `LOGIN_RATE_LIMIT` | `10` | attempts per window |

Migrations under `migrations/` run automatically on server start.

---

## API surface

Control API is served under `/v1` and proxied by nginx at `/api`.

**Bearer API key** (used by the CLI):
`POST /v1/tunnels`, `GET|POST /v1/tunnels/{id}[/stop]`,
`GET /v1/tunnels/{id}/requests[/{request_id}]`, `GET /v1/usage/{today,month}`.

**Session cookie** (used by the dashboard):
the above plus `GET /v1/events` (SSE), `GET /v1/auth/me`, `POST /v1/auth/logout`,
`GET /v1/usage/history`, and `GET|POST|DELETE /v1/api-keys`.

**Public:** `GET /healthz`, `GET /readyz`, `POST /v1/auth/{signup,login}`,
`POST /v1/auth/device/{code,token}`.

Mutating session routes require an `Origin` matching `DASHBOARD_ORIGIN`.

---

## Deployment

Production runs on one VPS: host-level nginx terminates TLS, Docker runs the
server and dashboard, ports bind to `127.0.0.1`.

| File | Use |
|---|---|
| `deploy/docker-compose.vps.yml` | production on the VPS |
| `deploy/docker-compose.prod.yml` | fully containerised variant (nginx in Docker) |
| `deploy/nginx.vps.conf` | host nginx vhost for `indotunnel.ai.id` |
| `deploy/nginx.prod.conf` | equivalent for the containerised variant |

TLS uses a Let's Encrypt wildcard cert via the Cloudflare DNS challenge:

```bash
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d indotunnel.ai.id -d '*.indotunnel.ai.id' \
  --cert-name indotunnel.ai.id
```

Note: nginx matches SNI only against exact and wildcard `server_name`, never a
regex. The tunnel vhost uses `*.indotunnel.ai.id` on purpose.

---

## Development

```bash
go build ./...          # compile everything
go test ./...           # unit + integration tests
go vet ./...
cd apps/dashboard && npm run lint
cd apps/indotunnel-video && npm run lint
```

Integration tests use `miniredis` and skip when `DATABASE_URL` is unreachable.

### Docs

- `indotunnel-docs/` — product requirements, architecture, protocol, security, ops, roadmap.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — design specs and implementation plans.
- `DESIGN.md` — visual direction for landing page and dashboard.

---

## License

MIT

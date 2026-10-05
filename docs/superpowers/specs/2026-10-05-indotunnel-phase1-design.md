# IndoTunnel — Phase 1 Core Tunnel Design

**Date:** 2026-10-05
**Status:** Approved (design)
**Scope:** Phase 1 core tunnel end-to-end, run locally via Docker Compose.

## 1. Goal

A developer runs `indotunnel 3000` (or `npx indotunnel 3000` later) and gets a
public HTTP/HTTPS URL that forwards to their local service, with Free-plan
limits enforced. This proves the hard part: reliable bidirectional request
forwarding, WebSocket support, quota enforcement, and reconnect.

Out of scope for Phase 1: signup/login UI, dashboard, billing, custom
subdomain/domain, teams, real wildcard DNS/TLS, request body capture.

## 2. Scope Decisions

| # | Decision | Rationale |
|---|---|---|
| S1 | Single Go binary `indotunnel-server` hosts control API + edge + tunnel listener | docs `19-folder-structure.md` explicitly permits combining for small MVP; split later behind interfaces |
| S2 | Tunnel transport = `hashicorp/yamux` streams over TLS-capable TCP | docs `09` mandates a transport abstraction; yamux is that abstraction and gives multiplexing + flow control + free WebSocket support |
| S3 | Local run only: HTTP edge on `:8080`, no wildcard DNS/TLS | VPS/domain path deferred; routing by `Host` header |
| S4 | Auth = seeded API key, no signup/login | device flow + dashboard login are Phase 2; still proves authenticated tunnels |
| S5 | Random subdomain only | custom subdomain is a paid feature (docs `18`) |

### Deliberate deviations from existing docs

1. **yamux streams instead of custom WebSocket message framing** (decision
   `D-006` in `21-decision-log.md`). The message types in `09-tunnel-protocol.md`
   (`request_headers`, `request_body`, …) are replaced by real HTTP semantics
   riding on multiplexed streams. This keeps the transport swappable (TCP →
   TLS → WebSocket → QUIC) without touching request logic. WebSocket forwarding
   becomes free because raw upgrade bytes traverse the stream.
2. **Single service** instead of split API/gateway binaries.
3. **Local HTTP** instead of wildcard DNS + TLS.
4. **No signup/login**; a seed script creates the first user and key.

These deviations are intentional and reversible. The interfaces (control API,
transport, store) are kept narrow so the doc-described shape can be restored
without rewrites.

## 3. Repository Layout

```text
indotunnel/
├── go.mod                          # module indotunnel
├── cmd/
│   ├── server/main.go              # API + edge + tunnel endpoint
│   └── agent/main.go               # CLI
├── internal/
│   ├── config/                     # env loading
│   ├── db/                         # pgx pool + migrations runner
│   ├── store/                      # SQL queries (users, tunnels, logs, usage)
│   ├── redisclient/                # redis pool + Lua scripts
│   ├── auth/                       # API key generate/hash/verify, middleware
│   ├── api/                        # control-plane HTTP handlers
│   ├── gateway/                    # edge host router + ReverseProxy
│   ├── tunnel/                     # yamux server, session registry
│   ├── limits/                     # quota checks (daily, bandwidth, active tunnel)
│   ├── reqlog/                     # async buffered request-metadata writer
│   └── subdomain/                  # random subdomain generator
├── agent/
│   ├── cli/                        # arg parse, help/version, output
│   ├── cfg/                        # credential file load/save
│   ├── client/                     # control API client
│   ├── tunnel/                     # yamux client + reconnect/backoff
│   └── forward/                    # local reverse-proxy server
├── migrations/
│   ├── 0001_init.sql
│   └── 0002_seed_plans.sql
├── deploy/
│   ├── docker-compose.yml
│   ├── Dockerfile.server
│   └── Dockerfile.agent
├── scripts/
│   ├── seed.sh                     # create dev user + api key, print token
│   └── e2e.sh                      # compose up -> seed -> agent -> curl edge -> assert
├── docs/superpowers/specs/         # this spec
└── indotunnel-docs/                # existing product docs, untouched
```

## 4. Processes and Ports (local)

```text
agent (developer laptop)
   |  raw TCP :7000 (yamux handshake)
   v
indotunnel-server
   |-- tunnel listener  :7000
   |-- edge listener    :8080   (public traffic, routed by Host header)
   |-- control API      :8081
   |
   +--> PostgreSQL :5432
   +--> Redis      :6379

public client -> http://<subdomain>.indotunnel.localhost:8080
```

`*.indotunnel.localhost` resolves to `127.0.0.1` on most systems; tests use
`curl --resolve` when it does not.

## 5. Tunnel Transport

### 5.1 Handshake

Agent dials `TUNNEL_ADDR`, sends exactly one JSON line (newline-terminated):

```json
{"tunnel_id":"t_8F2A91","api_key":"sk_live_...","client_version":"0.1.0","connection_id":"conn-8291"}
```

Server:
1. Reads the line with a deadline.
2. Verifies the API key hash and that `tunnel_id` belongs to that user.
3. Checks plan allows an active tunnel.
4. Wraps the connection in `yamux.Server` with default config.
5. Registers `subdomain -> *yamux.Session` in an in-memory registry keyed by
   subdomain, value `{session, connection_id, user_id, tunnel_id}`.
6. Writes a one-line ack: `{"status":"ready","public_url":"http://a8f2x.indotunnel.localhost:8080"}`.
7. Records a `tunnel_sessions` row and sets the tunnel `status='online'`.

Agent wraps the same connection in `yamux.Client`, then runs an `http.Server`
on `session.Listener()` whose handler reverse-proxies to the configured local
target. On shutdown it closes the session; server marks the session
`disconnected` and the tunnel `offline`.

### 5.2 Streams

Every public request opens exactly one yamux stream. The edge writes the HTTP
request onto that stream; the agent's `http.Server` reads it and proxies to
localhost; the response is written back. `httputil.ReverseProxy` is used on
both sides:

- Edge `Transport.DialContext` returns `session.OpenStream()` per request.
- `FlushInterval: -1` for streaming.
- Hop-by-hop headers stripped (`Connection`, `Keep-Alive`,
  `Proxy-Authenticate`, `Proxy-Authorization`, `TE`, `Trailer`,
  `Transfer-Encoding`, `Upgrade`). `Upgrade`/`Connection` are preserved only
  for genuine WebSocket upgrades (ReverseProxy handles this natively).

### 5.3 Backpressure and safety

- yamux provides per-stream flow control (bounded buffers).
- Max concurrent streams per session capped (default 20) via a counting
  middleware on the agent and a per-session semaphore on the edge.
- Idle stream timeout and total request timeout configured.
- Client disconnect cancels the stream context.

### 5.4 Reconnect

Agent retries with exponential backoff `1s -> 2s -> 4s … capped 30s` plus
jitter. On reconnect it re-runs the handshake; the server reuses the existing
tunnel row and creates a new session row. Subdomain stays stable for the
lifetime of the tunnel.

## 6. Edge Routing

1. Parse `Host` header, strip `:port`, take the leftmost label as subdomain.
2. Look up registry. Miss → `502` with `{"error":"tunnel_offline", ...}`.
3. Enforce limits (section 8) before dialing.
4. Reverse-proxy over a new yamux stream.
5. On completion, hand metadata to the async request logger (section 9).

Non-matching host (e.g. bare `indotunnel.localhost`) → `404`.

## 7. Control API (Phase 1)

Base: `http://localhost:8081`. Auth: `Authorization: Bearer <api-key>`.

```http
POST /v1/tunnels            # create; enforce 1 active; returns tunnel_id, subdomain, public_url, status
GET  /v1/tunnels/:tunnel_id
POST /v1/tunnels/:tunnel_id/stop
GET  /v1/usage/today
GET  /v1/usage/month
GET  /v1/tunnels/:tunnel_id/requests
GET  /v1/tunnels/:tunnel_id/requests/:request_id
GET  /healthz
GET  /readyz                # checks DB + Redis
```

Error format per docs `08`:

```json
{"error":{"code":"ACTIVE_TUNNEL_LIMIT_REACHED","message":"Free plan allows one active tunnel.","details":{}}}
```

Status codes: `200/201/202/400/401/403/404/409/429/502/503`.

`POST /v1/tunnels` request:

```json
{"local_host":"127.0.0.1","local_port":3000,"protocol":"http"}
```

Validation: `local_host` restricted to loopback literals (`127.0.0.1`,
`localhost`, `::1`) — the agent must not become an open proxy (docs `12` §4).
`local_port` in `1..65535`.

## 8. Limits and Rate Limiting

### 8.1 Daily requests (atomic)

Lua script executed by the edge before forwarding:

```lua
-- KEYS[1] = indotunnel:usage:{user_id}:requests:{YYYY-MM-DD}
-- ARGV[1] = limit, ARGV[2] = ttl_seconds
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
return n
```

Date is computed in `Asia/Jakarta`; TTL is seconds until the next Jakarta
midnight. If `n > daily_request_limit` → `429` with
`{"error":{"code":"DAILY_REQUEST_LIMIT_REACHED",...}}`. Convention: the
5,000th request is allowed; the 5,001st is blocked. Tested explicitly.

### 8.2 Monthly bandwidth

After each stream closes, add `request_bytes + response_bytes` (both
directions, docs `11` §4) to
`indotunnel:usage:{user_id}:bandwidth:{YYYY-MM}` and mirror into
`usage_daily`. Before forwarding, if the monthly total already exceeds the
plan limit → `429` `BANDWIDTH_LIMIT_REACHED`. Streaming bytes are counted as
transferred, not from `Content-Length`.

### 8.3 Active tunnel = 1 (Free)

At `POST /v1/tunnels`: acquire `indotunnel:lock:user:{user_id}:active_tunnel`
(short TTL) to serialize, count tunnels with `status IN ('pending','online')`,
reject with `409 ACTIVE_TUNNEL_LIMIT_REACHED` if at limit.

### 8.4 Concurrent streams

Hidden operational cap (default 20/session) enforced at the edge; exceeding it
returns `503` `TOO_MANY_CONCURRENT_STREAMS`.

## 9. Request Logging

- Edge builds a metadata record: `request_id, tunnel_id, user_id, method,
  path, host, status_code, request_bytes, response_bytes, duration_ms,
  client_ip_hash, started_at`.
- `client_ip` is hashed (SHA-256 with server salt); raw IP never persisted.
- Records go to a buffered channel; a single writer batches inserts into
  `request_logs` every ~500 ms or 100 rows. Full channel → drop with a metric
  (data path never blocks; docs `01` §6).
- No request/response bodies stored (decision `D-007`).
- Retention: `request_logs` older than 30 days deleted by a periodic job
  (default 7 days, configurable). `usage_daily` kept 12 months.

## 10. Database Schema

Uses the schema from `04-database-schema.md` verbatim:
`users, plans, api_keys, tunnels, tunnel_sessions, request_logs, usage_daily`.

`migrations/0001_init.sql` = those tables + indexes.
`migrations/0002_seed_plans.sql` = Free plan row:

```text
code=free, max_active_tunnels=1,
daily_request_limit=5000, monthly_bandwidth_limit_bytes=10737418240
```

`scripts/seed.sh` creates one `users` row and one `api_keys` row, printing the
plaintext key once.

## 11. Agent CLI

```
indotunnel 3000
indotunnel 127.0.0.1:3000
indotunnel --help
indotunnel --version
```

- Token source: `INDOTUNNEL_TOKEN` env, else `%APPDATA%\IndoTunnel\config.json`
  (`~/.config/indotunnel/config.json` on Unix) written with owner-only
  permissions. Secrets never printed to logs.
- Startup: parse target → load credential → `POST /v1/tunnels` → open tunnel
  transport → print public URL → heartbeat/keepalive → forward loop.
- Output per docs `07` (Connected block, limit-reached block).
- Ctrl+C: stop accepting, graceful close, exit 0.

## 12. Configuration

Environment variables, with local defaults in `deploy/docker-compose.yml`:

```text
DATABASE_URL=postgres://indotunnel:indotunnel@localhost:5432/indotunnel?sslmode=disable
REDIS_URL=redis://localhost:6379/0
EDGE_ADDR=:8080
API_ADDR=:8081
TUNNEL_ADDR=:7000
PUBLIC_HOST_SUFFIX=indotunnel.localhost
PUBLIC_SCHEME=http
API_BASE_URL=http://localhost:8081
CLIENT_IP_HASH_SALT=change-me
MAX_STREAMS_PER_TUNNEL=20
REQUEST_LOG_RETENTION_DAYS=7
```

## 13. Testing Strategy

**Unit (Go, stdlib `testing`, no framework):**
- random subdomain generator: charset, length, uniqueness on collision retry
- API key: generate → hash → verify; wrong key fails
- host→subdomain parse incl. ports and bare host
- hop-by-hop header normalization
- Redis daily-limit Lua against `miniredis`: 4999 ok, 5000 ok, 5001 blocked
- config env loading + defaults

**Integration (real server, `httptest` local app, real Redis+Postgres via compose):**
- HTTP GET/POST forwarding end-to-end, status + body + headers
- large body streaming (> buffer) integrity
- WebSocket echo through tunnel
- `429` when daily quota exceeded
- `502` when no active tunnel
- reconnect: kill agent conn, restart, assert new session serves traffic
- active-tunnel=1: second create returns `409`

**E2E script** `scripts/e2e.sh`: compose up → migrate → seed → start agent
against a throwaway local server → `curl` edge → assert body → stop.

Each non-trivial unit leaves one runnable check behind. No test frameworks.

## 14. MVP Exit Criteria (Phase 1)

1. `docker compose up` starts server + Postgres + Redis, migrations run.
2. `scripts/seed.sh` prints an API key.
3. `indotunnel 3000` connects and prints a public URL.
4. HTTP and WebSocket traffic to the public URL reaches localhost.
5. Quota: 5,001st request returns `429`; monthly bandwidth enforced.
6. Second tunnel on Free returns `409`.
7. Agent reconnects automatically after network interruption.
8. Request metadata queryable via control API; bodies not stored.

## 15. Open Items (deferred, tracked)

- Dashboard (Phase 2), signup/login + device flow (Phase 2).
- Real wildcard DNS + TLS termination (VPS path).
- `npx indotunnel` npm wrapper + GitHub Releases.
- Custom subdomain/domain, teams, billing.

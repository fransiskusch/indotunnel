# IndoTunnel Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 core tunnel: a Go server (control API + public edge + tunnel endpoint) and a Go CLI agent that exposes `localhost:3000` at a public URL with Free-plan limits enforced.

**Architecture:** One `indotunnel-server` binary hosts three listeners (edge `:8080`, control API `:8081`, tunnel `:7000`). The agent dials the tunnel port, sends a one-line JSON handshake, and both sides wrap the connection in a `hashicorp/yamux` session. Every public request becomes one yamux stream; both sides use `httputil.ReverseProxy` so HTTP and WebSocket forwarding fall out of standard library behavior. Limits and counters live in Redis (Lua, atomic); durable metadata lives in PostgreSQL.

**Tech Stack:** Go 1.25, `github.com/jackc/pgx/v5`, `github.com/redis/go-redis/v9`, `github.com/hashicorp/yamux`, PostgreSQL 16, Redis 7, Docker Compose. Tests use stdlib `testing` + `github.com/alicebob/miniredis/v2`.

**Spec:** `docs/superpowers/specs/2026-10-05-indotunnel-phase1-design.md`

## Global Constraints

- Go module path: `indotunnel`. Go version floor: `go 1.25`.
- Only these external deps: `pgx/v5`, `go-redis/v9`, `yamux`; test-only: `miniredis/v2`. No web framework, no ORM, no CLI framework, no test framework.
- Config via environment variables only (spec §12). Exact keys and defaults are in Task 1.
- `local_host` accepted values: `127.0.0.1`, `localhost`, `::1` only (spec §7).
- Quota convention: the 5,000th request is allowed; the 5,001st returns `429` (spec §8.1).
- No request/response bodies stored (spec §9). Client IP stored only as salted SHA-256.
- Public URL form: `{scheme}://{subdomain}.{PUBLIC_HOST_SUFFIX}:{edge port}` for local runs; scheme/host from config.
- Error JSON shape is always `{"error":{"code":...,"message":...,"details":{}}}` (spec §7).
- Secrets never logged.

## Review Focus

Inputs/conditions the spec implies but does not spell out — each gets a test in the owning task:

1. `Host` header with a port, uppercase, or trailing dot — must normalize before subdomain lookup (Task 8).
2. `Content-Length` absent / chunked request body — bandwidth must count actual bytes transferred, not the declared length (Task 9).
3. Agent reconnect must not orphan the old session row or leave a stale registry entry that serves dead streams (Task 11).
4. Second `POST /v1/tunnels` racing with the first — the Redis lock must serialize so exactly one succeeds (Task 7).
5. `local_host` set to a non-loopback value (e.g. `0.0.0.0`, `10.0.0.5`) — must be rejected so the agent is not an open proxy (Task 7).

---

### Task 1: Repo scaffold, config, and module

**Files:**
- Create: `go.mod`
- Create: `internal/config/config.go`
- Test: `internal/config/config_test.go`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces:
  - `config.Config` struct with fields `DatabaseURL, RedisURL, EdgeAddr, APIAddr, TunnelAddr, PublicHostSuffix, PublicScheme, APIBaseURL, ClientIPHashSalt string`, `MaxStreamsPerTunnel int`, `RequestLogRetentionDays int`.
  - `config.Load() (Config, error)` — reads env, applies defaults, errors only on unparseable ints.

- [ ] **Step 1: Write the failing test**

```go
package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("EDGE_ADDR", "")
	c, err := Load()
	if err != nil { t.Fatal(err) }
	if c.EdgeAddr != ":8080" { t.Fatalf("EdgeAddr=%q", c.EdgeAddr) }
	if c.PublicHostSuffix != "indotunnel.localhost" { t.Fatalf("suffix=%q", c.PublicHostSuffix) }
	if c.MaxStreamsPerTunnel != 20 { t.Fatalf("max=%d", c.MaxStreamsPerTunnel) }
}

func TestLoadOverride(t *testing.T) {
	t.Setenv("EDGE_ADDR", ":9090")
	c, _ := Load()
	if c.EdgeAddr != ":9090" { t.Fatalf("got %q", c.EdgeAddr) }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/config/ -run TestLoad -v`
Expected: FAIL — package/config undefined.

- [ ] **Step 3: Implement `internal/config/config.go`**

`Load()` uses `os.Getenv` with a small helper `env(key, def string) string`. Ints via `strconv.Atoi(env("MAX_STREAMS_PER_TUNNEL","20"))` and `REQUEST_LOG_RETENTION_DAYS` (default 7), returning error on parse failure. Defaults exactly per spec §12.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/config/ -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git init
git add go.mod internal/config .gitignore README.md
git commit -m "feat: scaffold module and config"
```

---

### Task 2: Database migrations, pool, and store

**Files:**
- Create: `migrations/0001_init.sql`
- Create: `migrations/0002_seed_plans.sql`
- Create: `internal/db/db.go`
- Create: `internal/store/store.go`
- Test: `internal/store/store_test.go` (build-tagged `//go:build integration`, run against compose Postgres)

**Interfaces:**
- Consumes: `config.Config`.
- Produces:
  - `db.Connect(ctx, url) (*pgxpool.Pool, error)`
  - `db.Migrate(ctx, pool, dir string) error` — applies `*.sql` in lexical order, tracking applied names in `schema_migrations`.
  - `store.Store` with methods used later: `UserByAPIKey(ctx, prefix, hash) (User, error)`, `UserByID`, `CreateTunnel`, `TunnelByID`, `TunnelsByUser`, `SetTunnelStatus`, `CreateSession`, `CloseSession`, `InsertRequestLogs(ctx, []RequestLog) error`, `UpsertUsageDaily`, `RequestsByTunnel`.

- [ ] **Step 1: Write migrations**

`0001_init.sql` = verbatim schema from `indotunnel-docs/04-database-schema.md` (all seven tables + indexes). `0002_seed_plans.sql` inserts the Free plan: `code='free', name='Free', max_active_tunnels=1, daily_request_limit=5000, monthly_bandwidth_limit_bytes=10737418240, custom_subdomain_enabled=false, custom_domain_enabled=false`. Use `ON CONFLICT (code) DO NOTHING`.

- [ ] **Step 2: Write the failing integration test**

```go
//go:build integration

package store

import "testing"

func TestFreePlanSeeded(t *testing.T) {
	p := planByCode(t, "free") // helper opens pool from DATABASE_URL, runs Migrate
	if p.DailyRequestLimit != 5000 { t.Fatalf("daily=%d", p.DailyRequestLimit) }
	if p.MaxActiveTunnels != 1 { t.Fatalf("max=%d", p.MaxActiveTunnels) }
}
```

- [ ] **Step 3: Run to verify it fails**

Run: `docker compose -f deploy/docker-compose.yml up -d postgres` then `go test -tags integration ./internal/store/ -run TestFreePlanSeeded -v`
Expected: FAIL — undefined.

- [ ] **Step 4: Implement `db` and `store`**

`db.Migrate` reads `dir`, sorts names, skips those in `schema_migrations`, runs each in a transaction. `store` uses pgx directly with hand-written SQL; scan into structs. `UserByAPIKey` joins `api_keys` (matching `key_prefix` + `secret_hash`) to `users` + `plans`.

- [ ] **Step 5: Run to verify it passes**

Run: `go test -tags integration ./internal/store/ -run TestFreePlanSeeded -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add migrations internal/db internal/store
git commit -m "feat: migrations, db pool, store"
```

---

### Task 3: Redis client and atomic limit scripts

**Files:**
- Create: `internal/redisclient/client.go`
- Create: `internal/limits/limits.go`
- Test: `internal/limits/limits_test.go`

**Interfaces:**
- Produces:
  - `redisclient.New(url string) (*redis.Client, error)`
  - `limits.Checker` with `CheckAndIncrDaily(ctx, userID string, limit int64) (allowed bool, used int64, err error)` and `AddBandwidth(ctx, userID string, bytes int64) error` and `MonthBandwidth(ctx, userID string) (int64, error)`.
  - `limits.JakartaNow() time.Time`, `limits.SecondsUntilJakartaMidnight(t time.Time) int64`.

- [ ] **Step 1: Write the failing test**

```go
package limits

import (
	"context"
	"testing"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestDailyLimitBoundary(t *testing.T) {
	mr, _ := miniredis.Run(); defer mr.Close()
	c := New(redis.NewClient(&redis.Options{Addr: mr.Addr()}))
	ctx := context.Background()
	for i := 1; i <= 5000; i++ {
		ok, _, err := c.CheckAndIncrDaily(ctx, "u1", 5000)
		if err != nil || !ok { t.Fatalf("req %d: ok=%v err=%v", i, ok, err) }
	}
	ok, used, _ := c.CheckAndIncrDaily(ctx, "u1", 5000)
	if ok { t.Fatal("5001st must be blocked") }
	if used != 5001 { t.Fatalf("used=%d", used) }
}

func TestJakartaMidnightTTL(t *testing.T) {
	// 2026-10-05T10:00:00Z == 17:00 Jakarta -> 7h to midnight
	got := SecondsUntilJakartaMidnight(time.Date(2026,10,5,10,0,0,0,time.UTC))
	if got != 7*3600 { t.Fatalf("got %d", got) }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `go test ./internal/limits/ -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

`CheckAndIncrDaily` runs the Lua script from spec §8.1 via `redis.NewScript`, key = `indotunnel:usage:{uid}:requests:{YYYY-MM-DD}` (date from `JakartaNow()`), ARGV = limit, ttl. Returns `used <= limit`. `AddBandwidth` uses `INCRBY` on `indotunnel:usage:{uid}:bandwidth:{YYYY-MM}`. Jakarta = fixed `time.FixedZone("WIB", 7*3600)`.

- [ ] **Step 4: Run to verify it passes**

Run: `go test ./internal/limits/ -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/redisclient internal/limits
git commit -m "feat: redis client and atomic daily/bandwidth limits"
```

---

### Task 4: API key auth

**Files:**
- Create: `internal/auth/auth.go`
- Test: `internal/auth/auth_test.go`

**Interfaces:**
- Produces:
  - `auth.GenerateKey() (plaintext, prefix, hash string)` — plaintext `sk_live_<32 hex>`, prefix = first 12 chars, hash = SHA-256 hex of plaintext.
  - `auth.HashKey(plaintext string) string`
  - `auth.BearerMiddleware(store APIKeyLookup) func(http.Handler) http.Handler` where `APIKeyLookup` interface has `UserByAPIKey(ctx, prefix, hash) (store.User, error)`; on success injects user into context via `auth.WithUser`/`auth.UserFrom(ctx)`.

- [ ] **Step 1: Write the failing test**

```go
func TestGenerateAndVerify(t *testing.T) {
	p, prefix, hash := GenerateKey()
	if len(p) == 0 || prefix != p[:12] { t.Fatal("prefix mismatch") }
	if HashKey(p) != hash { t.Fatal("hash mismatch") }
	if HashKey("other") == hash { t.Fatal("collision") }
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/auth/ -v` → FAIL.

- [ ] **Step 3: Implement `internal/auth/auth.go`** — crypto/rand for the 32 hex bytes; `subtle.ConstantTimeCompare` on hashes in the middleware; missing/invalid header → `401` with the error JSON shape.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/auth/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/auth
git commit -m "feat: api key generation and bearer middleware"
```

---

### Task 5: Random subdomain generator

**Files:**
- Create: `internal/subdomain/subdomain.go`
- Test: `internal/subdomain/subdomain_test.go`

**Interfaces:**
- Produces: `subdomain.Generate() string` — 5 chars from `[a-z0-9]`, first char a letter; and `subdomain.GenerateUnique(exists func(string) bool) string` retrying on collision.

- [ ] **Step 1: Write the failing test**

```go
func TestGenerateShape(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 1000; i++ {
		s := Generate()
		if len(s) != 5 { t.Fatalf("len %q", s) }
		if s[0] < 'a' || s[0] > 'z' { t.Fatalf("first %q", s) }
		seen[s] = true
	}
	if len(seen) < 990 { t.Fatalf("too many collisions: %d", len(seen)) }
}

func TestGenerateUniqueRetries(t *testing.T) {
	taken := map[string]bool{"aaaaa": true}
	s := GenerateUnique(func(x string) bool { return taken[x] })
	if s == "aaaaa" { t.Fatal("returned taken value") }
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/subdomain/ -v` → FAIL.

- [ ] **Step 3: Implement** — `math/rand/v2` `IntN`; loop with a retry cap (10) then return a longer fallback.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/subdomain/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/subdomain
git commit -m "feat: random subdomain generator"
```

---

### Task 6: Tunnel registry and yamux server handshake

**Files:**
- Create: `internal/tunnel/registry.go`
- Create: `internal/tunnel/server.go`
- Test: `internal/tunnel/registry_test.go`

**Interfaces:**
- Produces:
  - `tunnel.Registry` with `Register(subdomain string, s *Session)`, `Lookup(subdomain string) (*Session, bool)`, `Remove(subdomain, connectionID string)`.
  - `tunnel.Session` fields `ConnID, UserID, TunnelID, Subdomain string` and `Session() *yamux.Session`.
  - `tunnel.Server` with `Serve(ctx, net.Listener, authFunc, onConnect, onDisconnect)`; `authFunc(handshake) (SessionMeta, error)`.
  - `tunnel.Handshake` struct matching the JSON in spec §5.1.
  - `tunnel.ReadHandshake(r io.Reader) (Handshake, error)` (line-limited, deadline set by caller).

- [ ] **Step 1: Write the failing test**

```go
func TestRegistryRemoveOnlyMatchingConn(t *testing.T) {
	r := NewRegistry()
	s := &Session{ConnID: "c1", Subdomain: "abcde"}
	r.Register("abcde", s)
	r.Remove("abcde", "c2") // stale disconnect must not evict live session
	if _, ok := r.Lookup("abcde"); !ok { t.Fatal("live session evicted") }
	r.Remove("abcde", "c1")
	if _, ok := r.Lookup("abcde"); ok { t.Fatal("session not removed") }
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/tunnel/ -v` → FAIL.

- [ ] **Step 3: Implement**

`Registry` = `sync.RWMutex` + `map[string]*Session`. `Server.Serve` accepts, sets a 10s read deadline, `ReadHandshake`, calls `authFunc`, wraps in `yamux.Server` with `yamux.DefaultConfig()`, writes the ack line, invokes `onConnect(meta, session)`, blocks until the yamux session closes, then `onDisconnect(meta)`. `ReadHandshake` uses `bufio.Reader.ReadString('\n')` capped at 4 KiB.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/tunnel/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/tunnel
git commit -m "feat: tunnel registry and yamux server handshake"
```

---

### Task 7: Control API handlers

**Files:**
- Create: `internal/api/api.go`
- Create: `internal/api/tunnels.go`
- Create: `internal/api/errors.go`
- Test: `internal/api/tunnels_test.go`

**Interfaces:**
- Consumes: `store.Store`, `limits.Checker`, `subdomain.GenerateUnique`, `auth` middleware.
- Produces:
  - `api.New(deps Deps) *http.ServeMux` with `Deps{Store, Limits, Lock RedisLocker, Registry *tunnel.Registry, Cfg config.Config}`.
  - `api.writeError(w, status, code, msg)` producing the spec error shape.
  - `validateTarget(host string, port int) error` — loopback-only, port range.

- [ ] **Step 1: Write the failing tests**

```go
func TestRejectNonLoopback(t *testing.T) {
	for _, h := range []string{"0.0.0.0", "10.0.0.5", "example.com"} {
		if err := validateTarget(h, 3000); err == nil { t.Fatalf("%s accepted", h) }
	}
	if err := validateTarget("127.0.0.1", 3000); err != nil { t.Fatal(err) }
}

func TestCreateTunnelConflict(t *testing.T) {
	// Deps with a fake store reporting one active tunnel
	// POST /v1/tunnels -> expect 409, code ACTIVE_TUNNEL_LIMIT_REACHED
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/api/ -v` → FAIL.

- [ ] **Step 3: Implement**

Routes: `POST /v1/tunnels`, `GET /v1/tunnels/{id}`, `POST /v1/tunnels/{id}/stop`, `GET /v1/usage/today`, `GET /v1/usage/month`, `GET /v1/tunnels/{id}/requests`, `GET /v1/tunnels/{id}/requests/{request_id}`, `GET /healthz`, `GET /readyz`. Use `net/http` 1.22+ pattern routing with method+path.

Create flow: validate target → acquire `indotunnel:lock:user:{uid}:active_tunnel` via `SET NX PX` (retry briefly) → count active tunnels → if at plan limit `409` → `subdomain.GenerateUnique(store lookup)` → `CreateTunnel(status='pending')` → `201` with `{tunnel_id, subdomain, public_url, status}`. `public_url` built from `Cfg.PublicScheme`, subdomain, `Cfg.PublicHostSuffix`, and edge port parsed from `Cfg.EdgeAddr`.

`RedisLocker` interface: `Lock(ctx, key string, ttl time.Duration) (unlock func(), ok bool, err error)` — implemented in Task 3's redisclient as `SET NX PX` + Lua compare-and-delete.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/api/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/api
git commit -m "feat: control api tunnel/usage/request endpoints"
```

---

### Task 8: Edge gateway routing and reverse proxy

**Files:**
- Create: `internal/gateway/gateway.go`
- Create: `internal/gateway/host.go`
- Test: `internal/gateway/host_test.go`

**Interfaces:**
- Consumes: `tunnel.Registry`, `limits.Checker`, `reqlog.Logger` (Task 9), `config.Config`.
- Produces:
  - `gateway.Subdomain(host, suffix string) (string, bool)` — normalizes port/uppercase/trailing dot.
  - `gateway.New(cfg, registry, limits, logger) *gateway.Gateway` implementing `http.Handler`.

- [ ] **Step 1: Write the failing test**

```go
func TestSubdomain(t *testing.T) {
	cases := map[string]string{
		"a8f2x.indotunnel.localhost:8080": "a8f2x",
		"A8F2X.indotunnel.localhost":      "a8f2x",
		"a8f2x.indotunnel.localhost.":     "a8f2x",
	}
	for in, want := range cases {
		got, ok := Subdomain(in, "indotunnel.localhost")
		if !ok || got != want { t.Fatalf("%q -> %q,%v", in, got, ok) }
	}
	if _, ok := Subdomain("indotunnel.localhost", "indotunnel.localhost"); ok {
		t.Fatal("bare host must not match")
	}
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/gateway/ -v` → FAIL.

- [ ] **Step 3: Implement**

`Subdomain`: lowercase, strip `:port` via `net.SplitHostPort` fallback, trim trailing `.`, require suffix match with a non-empty leftmost label.

`Gateway.ServeHTTP`: resolve subdomain → registry lookup (miss → `502 tunnel_offline`) → `CheckAndIncrDaily` (blocked → `429 DAILY_REQUEST_LIMIT_REACHED`) → build `ReverseProxy` with `Transport.DialContext` returning `session.Session().OpenStream()`, `FlushInterval: -1`, `Rewrite` stripping hop-by-hop headers and setting `X-Forwarded-For/Proto/Host`, and rewriting `Host` to the local target. Wrap the response writer to capture status + byte counts; defer a `logger.Record(...)` call.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/gateway/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/gateway
git commit -m "feat: edge host routing and reverse proxy"
```

---

### Task 9: Async request logger

**Files:**
- Create: `internal/reqlog/reqlog.go`
- Test: `internal/reqlog/reqlog_test.go`

**Interfaces:**
- Consumes: `store.Store`.
- Produces: `reqlog.New(store Inserter, bufSize int) *Logger` with `Record(Record)`, `Close(ctx) error`. `Record` fields: `RequestID, TunnelID, UserID, Method, Path, Host string`, `StatusCode, DurationMS int`, `RequestBytes, ResponseBytes int64`, `ClientIPHash string`, `StartedAt time.Time`.

- [ ] **Step 1: Write the failing test**

```go
func TestDropsWhenFullNotBlock(t *testing.T) {
	l := New(fakeInserter{}, 1)
	done := make(chan struct{})
	go func() { for i := 0; i < 1000; i++ { l.Record(Record{}) }; close(done) }()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Record blocked when buffer full")
	}
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/reqlog/ -v` → FAIL.

- [ ] **Step 3: Implement** — buffered channel; `Record` does a non-blocking `select` with `default:` incrementing a dropped counter. Single goroutine flushes every 500 ms or 100 records via `store.InsertRequestLogs`. `Close` drains then stops. Bandwidth is also added to Redis here (`limits.AddBandwidth`) and mirrored via `store.UpsertUsageDaily`.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/reqlog/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/reqlog
git commit -m "feat: async buffered request logger"
```

---

### Task 10: Server wiring (main)

**Files:**
- Create: `cmd/server/main.go`
- Create: `internal/api/health.go`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Implement `main.go`**

Load config → connect DB → `db.Migrate(ctx, pool, "migrations")` → connect Redis → construct `store`, `limits`, `registry`, `reqlog`, `api`, `gateway`. Start three `http.Server`/listener goroutines: `API_ADDR` (api mux), `EDGE_ADDR` (gateway), `TUNNEL_ADDR` (`tunnel.Server.Serve`). `authFunc` verifies the handshake key via `store.UserByAPIKey`, checks plan allows a tunnel, and returns `SessionMeta`; `onConnect` registers in `registry` and creates a `tunnel_sessions` row + sets tunnel `online`; `onDisconnect` removes from registry (by connection id) and closes the session row + sets `offline`. `readyz` pings DB and Redis. Handle SIGINT/SIGTERM with graceful shutdown.

- [ ] **Step 2: Build and smoke test**

Run: `go build ./... && go vet ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cmd/server internal/api/health.go
git commit -m "feat: wire server listeners and lifecycle"
```

---

### Task 11: Agent tunnel client with reconnect

**Files:**
- Create: `agent/tunnel/client.go`
- Test: `agent/tunnel/backoff_test.go`

**Interfaces:**
- Produces:
  - `tunnel.Dial(ctx, addr string, hs Handshake) (*yamux.Session, error)`
  - `tunnel.RunWithReconnect(ctx, addr string, hs Handshake, onSession func(*yamux.Session) error, onStatus func(string)) error`
  - `tunnel.Backoff(attempt int) time.Duration` — `1s*2^attempt` capped 30s + jitter.

- [ ] **Step 1: Write the failing test**

```go
func TestBackoffCapAndGrowth(t *testing.T) {
	if Backoff(0) < 1*time.Second { t.Fatal("too small") }
	if Backoff(10) > 31*time.Second { t.Fatal("exceeds cap") }
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./agent/tunnel/ -v` → FAIL.

- [ ] **Step 3: Implement**

`Dial` opens TCP, writes the handshake JSON line, reads the ack, wraps in `yamux.Client`. `RunWithReconnect` loops: dial → `onStatus("connected")` → `onSession` blocks until the session dies → `onStatus("reconnecting")` → sleep `Backoff(attempt)` → retry; reset attempt on success. The `onDisconnect` on the server keys off the connection id so a stale close cannot evict the new session (spec Review Focus #3).

- [ ] **Step 4: Run to verify it passes** — `go test ./agent/tunnel/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/tunnel
git commit -m "feat: agent yamux client with reconnect backoff"
```

---

### Task 12: Agent local forwarding server

**Files:**
- Create: `agent/forward/forward.go`
- Test: `agent/forward/forward_test.go`

**Interfaces:**
- Produces: `forward.New(target string, maxStreams int) (*http.Server, error)` where `target` = `host:port`. The server's handler is an `httputil.ReverseProxy` to `http://<target>` with `FlushInterval: -1`, hop-by-hop stripping, and a concurrent-request semaphore of `maxStreams`.

- [ ] **Step 1: Write the failing test**

```go
func TestForwardsToLocal(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(201); w.Write([]byte("ok"))
	}))
	defer backend.Close()
	srv, err := New(strings.TrimPrefix(backend.URL, "http://"), 20)
	if err != nil { t.Fatal(err) }
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	go srv.Serve(ln)
	resp, err := http.Get("http://" + ln.Addr().String() + "/")
	if err != nil { t.Fatal(err) }
	if resp.StatusCode != 201 { t.Fatalf("status=%d", resp.StatusCode) }
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./agent/forward/ -v` → FAIL.

- [ ] **Step 3: Implement** — standard `ReverseProxy`; semaphore via buffered channel; on full, return `503`.

- [ ] **Step 4: Run to verify it passes** — `go test ./agent/forward/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/forward
git commit -m "feat: agent local forwarding proxy"
```

---

### Task 13: Agent CLI, config file, and main

**Files:**
- Create: `agent/cfg/cfg.go`
- Create: `agent/cli/cli.go`
- Create: `agent/client/client.go`
- Create: `cmd/agent/main.go`
- Test: `agent/cli/cli_test.go`

**Interfaces:**
- Consumes: `config`, `agent/tunnel`, `agent/forward`.
- Produces:
  - `cli.ParseTarget(args []string) (host string, port int, err error)` — `"3000"` → `127.0.0.1:3000`; `"127.0.0.1:3000"` splits; `--help`/`--version` handled by caller.
  - `cfg.Load() (cfg.Credentials, error)` / `cfg.Save(cfg.Credentials) error` — path `%APPDATA%\IndoTunnel\config.json` or `~/.config/indotunnel/config.json`; file mode 0600; token also read from `INDOTUNNEL_TOKEN`.
  - `client.CreateTunnel(ctx, apiBase, token, localHost string, port int) (TunnelResp, error)`.

- [ ] **Step 1: Write the failing test**

```go
func TestParseTarget(t *testing.T) {
	h, p, err := ParseTarget([]string{"3000"})
	if err != nil || h != "127.0.0.1" || p != 3000 { t.Fatalf("%q %d %v", h, p, err) }
	h, p, _ = ParseTarget([]string{"localhost:8000"})
	if h != "localhost" || p != 8000 { t.Fatal("explicit host") }
	if _, _, err := ParseTarget([]string{"abc"}); err == nil { t.Fatal("bad port accepted") }
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./agent/cli/ -v` → FAIL.

- [ ] **Step 3: Implement**

`main.go`: handle `--help`/`--version`; parse target; load token (env first, then file) — missing token prints a clear "run seed and set INDOTUNNEL_TOKEN" message and exits 1; `client.CreateTunnel`; print the docs `07` Connected block; `RunWithReconnect` where `onSession` serves `forward.New` over `session.Listener()`. On `429` print the limit-reached block from docs `07`. Ctrl+C cancels ctx → graceful close, exit 0. Never print the token.

- [ ] **Step 4: Run to verify it passes** — `go test ./agent/cli/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/cli agent/cfg agent/client cmd/agent
git commit -m "feat: agent cli, credentials, and main"
```

---

### Task 14: Docker Compose, Dockerfiles, and seed script

**Files:**
- Create: `deploy/docker-compose.yml`
- Create: `deploy/Dockerfile.server`
- Create: `deploy/Dockerfile.agent`
- Create: `scripts/seed.sh`

**Interfaces:**
- Produces: `scripts/seed.sh` prints one plaintext API key to stdout and writes nothing else.

- [ ] **Step 1: Write compose**

Services: `postgres:16` (env `POSTGRES_USER/PASSWORD/DB=indotunnel`, volume), `redis:7`, `server` (build `Dockerfile.server`, ports `8080:8080 8081:8081 7000:7000`, env per spec §12 with in-network `DATABASE_URL`/`REDIS_URL`, depends_on postgres+redis). Healthchecks for postgres/redis.

- [ ] **Step 2: Write Dockerfiles** — multi-stage: `golang:1.25` builder → `gcr.io/distroless/static` (or `alpine`) runtime. Server image copies `migrations/`.

- [ ] **Step 3: Write `scripts/seed.sh`**

Generate key with a tiny Go helper (`go run ./cmd/seedkey`) or `openssl rand -hex 16`, compute prefix+hash, `psql` insert into `api_keys` for the seeded user (create user if absent, plan=free), print the plaintext key once.

- [ ] **Step 4: Verify**

Run: `docker compose -f deploy/docker-compose.yml up -d --build` then `bash scripts/seed.sh`
Expected: stack healthy; script prints a `sk_live_...` key.

- [ ] **Step 5: Commit**

```bash
git add deploy scripts
git commit -m "feat: docker compose, images, and seed script"
```

---

### Task 15: End-to-end script and integration tests

**Files:**
- Create: `scripts/e2e.sh`
- Create: `internal/gateway/gateway_integration_test.go` (`//go:build integration`)
- Create: `internal/tunnel/reconnect_integration_test.go` (`//go:build integration`)

**Interfaces:**
- Consumes: full stack.

- [ ] **Step 1: Write the E2E script**

`scripts/e2e.sh`: compose up → wait `readyz` → seed (capture token) → start a throwaway local HTTP server on `:3999` → run agent with `INDOTUNNEL_TOKEN` → `curl -s --resolve <sub>.indotunnel.localhost:8080:127.0.0.1 http://<sub>.indotunnel.localhost:8080/` → assert body; then `curl` a WebSocket echo endpoint and assert; then tear down. Use the subdomain printed by the agent (parse its stdout).

- [ ] **Step 2: Write integration tests**

`gateway_integration_test.go`: HTTP GET/POST forwarding (status/body/headers), large body (> 64 KiB) integrity, `429` at quota, `502` offline. `reconnect_integration_test.go`: connect agent, kill its conn, reconnect, assert traffic flows again and exactly one registry entry remains.

- [ ] **Step 3: Run everything**

Run: `go test ./... && go test -tags integration ./... && bash scripts/e2e.sh`
Expected: all PASS; E2E prints "E2E OK".

- [ ] **Step 4: Commit**

```bash
git add scripts/e2e.sh internal/gateway/gateway_integration_test.go internal/tunnel/reconnect_integration_test.go
git commit -m "test: e2e script and integration coverage"
```

---

## Self-Review

**Spec coverage:** §3 layout → Tasks 1–15; §5 transport → Tasks 6, 11; §6 routing → Task 8; §7 API → Tasks 7, 10; §8 limits → Tasks 3, 7, 8, 9; §9 logging → Task 9; §10 schema → Task 2; §11 CLI → Task 13; §12 config → Task 1; §13 testing → tests in every task + Task 15; §14 exit criteria → Task 15. No gaps.

**Review Focus mapping:** #1 → Task 8 Step 1; #2 → Task 9 (bandwidth from actual bytes, Task 8 wrapper) + Task 15 large-body test; #3 → Task 6 registry test + Task 11 + Task 15 reconnect test; #4 → Task 7 lock test; #5 → Task 7 `TestRejectNonLoopback`.

**Type consistency:** `SessionMeta`/`Handshake` defined Task 6, used Tasks 10–11; `limits.Checker` defined Task 3, used Tasks 7–9; `reqlog.Record` defined Task 9, produced Task 8; `RedisLocker` defined Task 7, implemented Task 3.

**Proportion:** plan ≈ 1.6× spec; code blocks are tests and signatures, not bodies.

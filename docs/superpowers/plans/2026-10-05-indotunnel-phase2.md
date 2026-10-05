# IndoTunnel Phase 2 Dashboard & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/password auth (DB-backed sessions, HttpOnly cookie) and a Next.js + shadcn/ui dashboard that shows the active tunnel, usage, and request history with live SSE updates.

**Architecture:** The Go control API gains a cookie-based session auth path alongside the existing bearer API-key path; both populate `auth.UserFrom(ctx)`. An in-process event bus fans out `tunnel.status` and `request` events to a new `GET /v1/events` SSE endpoint. A new Next.js app (`apps/dashboard`) proxies `/api/*` to the Go API so the browser sees one origin and the `SameSite=Lax` cookie works without CORS.

**Tech Stack:** Go 1.25 (`golang.org/x/crypto/bcrypt`), PostgreSQL, Redis, Next.js (App Router) + TypeScript + shadcn/ui + Tailwind. Existing deps from Phase 1.

**Spec:** `docs/superpowers/specs/2026-10-05-indotunnel-phase2-design.md`

## Global Constraints

- Go module path `indotunnel`; Go floor `go 1.25`. Only new Go dep allowed: `golang.org/x/crypto` (bcrypt). No web framework, no ORM, no CLI framework, no Go test framework.
- Dashboard deps: Next.js App Router, TypeScript, Tailwind, shadcn/ui. No other UI kit. Node 24 / npm 11 available.
- Error JSON shape is always `{"error":{"code":...,"message":...,"details":{}}}` via `httpx.WriteError`.
- Two auth paths: `auth.BearerMiddleware` (API key, CLI) unchanged; new `auth.SessionMiddleware` (cookie, dashboard). Both set `auth.UserFrom`.
- Cookie name `indotunnel_session`; `HttpOnly; SameSite=Lax; Path=/`; `Secure` only when `PublicScheme == "https"`; Max-Age = `SESSION_TTL_HOURS` (default 720).
- Session token = 32 random bytes hex (64 chars); DB stores only SHA-256 hex in `sessions.token_hash`.
- Passwords: bcrypt cost from `BCRYPT_COST` (default 12), min 8 chars, max 72 bytes.
- Login rate limit: `LOGIN_RATE_LIMIT` (default 10) attempts / 15 min per `(ip,email)`; exceeded → `429 TOO_MANY_ATTEMPTS`.
- Mutating endpoints verify `Origin` against `DASHBOARD_ORIGIN` (default `http://localhost:3000`); mismatch → `403 CSRF_ORIGIN_MISMATCH`.
- No request/response bodies surfaced (Phase 1 D-007). Request detail is metadata only.
- Browser reaches API only through the Next.js rewrite: `/api/:path*` → `${API_BASE_URL}/v1/:path*`.
- Existing Phase 1 behaviour (edge routing, limits, tunnel transport) must not regress.

## Review Focus

Inputs/conditions the spec implies but does not spell out — each gets a test in the owning task:

1. Expired or revoked session cookie — must be rejected as unauthenticated, not accepted (Task 3).
2. SSE subscriber that stops reading — publishing must not block the gateway data path (Task 6).
3. Login for a seeded user with empty `password_hash` — must fail generically, never panic or accept (Task 5).
4. Duplicate signup email under concurrent requests — exactly one succeeds (Task 5).
5. Session cookie from user A must not expose user B's tunnels/requests (Task 8).

---

### Task 1: Auth schema and store session methods

**Files:**
- Create: `migrations/0003_auth.sql`
- Modify: `internal/store/store.go`
- Create: `internal/store/session.go`
- Test: `internal/store/session_integration_test.go` (`//go:build integration`)

**Interfaces:**
- Produces:
  - `store.User` gains field `PasswordHash string`.
  - `store.Session` struct: `ID uuid.UUID`, `UserID uuid.UUID`, `TokenHash string`, `UserAgent string`, `IPHash string`, `CreatedAt, ExpiresAt time.Time`, `RevokedAt *time.Time`.
  - `store.Store` methods:
    - `CreateUserWithPassword(ctx, email, name, passwordHash string, planID uuid.UUID) (User, error)` — returns `ErrEmailTaken` on duplicate.
    - `UserByEmail(ctx, email string) (User, error)`
    - `UpdatePasswordHash(ctx, userID uuid.UUID, hash string) error`
    - `CreateSession(ctx, s Session) error`
    - `SessionByTokenHash(ctx, tokenHash string) (Session, error)`
    - `RevokeSession(ctx, tokenHash string) error`
    - `DeleteExpiredSessions(ctx, olderThan time.Duration) (int64, error)`
  - `store.ErrEmailTaken` sentinel error.

- [ ] **Step 1: Write migration `migrations/0003_auth.sql`**

```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(100) NOT NULL DEFAULT '';

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    user_agent VARCHAR(255),
    ip_hash VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

- [ ] **Step 2: Write the failing integration test**

```go
//go:build integration
package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestSessionLifecycle(t *testing.T) {
	s := openTestStore(t)
	ctx := context.Background()
	plan, _ := s.PlanByCode(ctx, "free")

	email := "sess+" + uuid.NewString() + "@indotunnel.id"
	u, err := s.CreateUserWithPassword(ctx, email, "S", "hash", plan.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateUserWithPassword(ctx, email, "S", "hash", plan.ID); err != ErrEmailTaken {
		t.Fatalf("dup email err=%v", err)
	}

	tok := uuid.NewString()
	sess := Session{ID: uuid.New(), UserID: u.ID, TokenHash: tok, ExpiresAt: time.Now().Add(time.Hour)}
	if err := s.CreateSession(ctx, sess); err != nil {
		t.Fatal(err)
	}
	got, err := s.SessionByTokenHash(ctx, tok)
	if err != nil || got.UserID != u.ID {
		t.Fatalf("lookup: %v %+v", err, got)
	}
	if err := s.RevokeSession(ctx, tok); err != nil {
		t.Fatal(err)
	}
	if got, _ := s.SessionByTokenHash(ctx, tok); got.RevokedAt == nil {
		t.Fatal("revoked_at not set")
	}
}
```

- [ ] **Step 3: Run to verify it fails**

Run: `go test -tags integration ./internal/store/ -run TestSessionLifecycle -v`
Expected: FAIL — `undefined: CreateUserWithPassword`.

- [ ] **Step 4: Implement `internal/store/session.go` and extend `store.go`**

`scanUser` gains `password_hash`. `CreateUserWithPassword` inserts a user with the given plan and hash; detect `23505` on `users_email_key` → return `ErrEmailTaken`. `SessionByTokenHash` selects by hash and scans all fields. `RevokeSession` sets `revoked_at = now()`. `DeleteExpiredSessions` deletes rows with `expires_at < now()-olderThan OR revoked_at IS NOT NULL`. `UserByEmail` mirrors `UserByID` scanning.

- [ ] **Step 5: Run to verify it passes**

Run: `go test -tags integration ./internal/store/ -run TestSessionLifecycle -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add migrations/0003_auth.sql internal/store
git commit -m "feat: auth schema and store session methods"
```

---

### Task 2: Password hashing

**Files:**
- Create: `internal/auth/password.go`
- Test: `internal/auth/password_test.go`

**Interfaces:**
- Produces:
  - `auth.HashPassword(plain string, cost int) (string, error)`
  - `auth.VerifyPassword(hash, plain string) bool`
  - `auth.ErrPasswordTooShort`, `auth.ErrPasswordTooLong` sentinels.
  - `auth.ValidatePassword(plain string) error` — min 8 chars, max 72 bytes.

- [ ] **Step 1: Write the failing test**

```go
package auth

import "testing"

func TestPasswordHashVerify(t *testing.T) {
	h, err := HashPassword("correct horse battery", 4) // low cost for test speed
	if err != nil {
		t.Fatal(err)
	}
	if !VerifyPassword(h, "correct horse battery") {
		t.Fatal("valid password rejected")
	}
	if VerifyPassword(h, "wrong") {
		t.Fatal("wrong password accepted")
	}
	if VerifyPassword("not-a-hash", "x") {
		t.Fatal("garbage hash accepted")
	}
}

func TestValidatePassword(t *testing.T) {
	if err := ValidatePassword("short"); err == nil {
		t.Fatal("short accepted")
	}
	if err := ValidatePassword("longenough"); err != nil {
		t.Fatal(err)
	}
	if err := ValidatePassword(string(make([]byte, 73))); err == nil {
		t.Fatal("73 bytes accepted")
	}
}

func TestVerifyEmptyHashFails(t *testing.T) {
	if VerifyPassword("", "anything") {
		t.Fatal("empty hash accepted")
	}
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/auth/ -run 'Password|Validate' -v` → FAIL.

- [ ] **Step 3: Implement `internal/auth/password.go`**

`HashPassword` calls `ValidatePassword` then `bcrypt.GenerateFromPassword([]byte(plain), cost)`. `VerifyPassword` returns false on empty hash and on `bcrypt.CompareHashAndPassword` error. `ValidatePassword` checks rune count ≥ 8 and byte length ≤ 72.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/auth/ -run 'Password|Validate' -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/auth/password.go internal/auth/password_test.go
git commit -m "feat: bcrypt password hashing"
```

---

### Task 3: Session token, store-backed lookup, and middleware

**Files:**
- Create: `internal/auth/session.go`
- Create: `internal/auth/session_middleware.go`
- Test: `internal/auth/session_test.go`

**Interfaces:**
- Consumes: `store.Session`, `store.Store` (Task 1).
- Produces:
  - `auth.NewSessionToken() (raw, hash string)` — raw = 64 hex chars; hash = SHA-256 hex.
  - `auth.HashToken(raw string) string`
  - `auth.SessionStore` interface: `SessionByTokenHash(ctx, hash string) (store.Session, error)`, `UserByID(ctx, id uuid.UUID) (store.User, error)`.
  - `auth.SessionMiddleware(ss SessionStore, cookieName string) func(http.Handler) http.Handler`
  - `auth.SetSessionCookie(w, name, token string, maxAge int, secure bool)`, `auth.ClearSessionCookie(w, name string, secure bool)`
  - `auth.CookieName = "indotunnel_session"`

- [ ] **Step 1: Write the failing test**

```go
package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/store"
)

type fakeSessionStore struct {
	sess store.Session
	user store.User
}

func (f fakeSessionStore) SessionByTokenHash(ctx context.Context, h string) (store.Session, error) {
	return f.sess, nil
}
func (f fakeSessionStore) UserByID(ctx context.Context, id uuid.UUID) (store.User, error) {
	return f.user, nil
}

func TestSessionTokenRoundTrip(t *testing.T) {
	raw, hash := NewSessionToken()
	if len(raw) != 64 {
		t.Fatalf("raw len=%d", len(raw))
	}
	if HashToken(raw) != hash {
		t.Fatal("hash mismatch")
	}
	if HashToken("other") == hash {
		t.Fatal("collision")
	}
}

func TestSessionMiddlewareRejectsExpired(t *testing.T) {
	ss := fakeSessionStore{sess: store.Session{UserID: uuid.New(), ExpiresAt: time.Now().Add(-time.Minute)}}
	h := SessionMiddleware(ss, CookieName)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler must not run")
	}))
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: CookieName, Value: "abc"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 401 {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestSessionMiddlewareRejectsRevoked(t *testing.T) {
	now := time.Now()
	ss := fakeSessionStore{sess: store.Session{UserID: uuid.New(), ExpiresAt: now.Add(time.Hour), RevokedAt: &now}}
	h := SessionMiddleware(ss, CookieName)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler must not run")
	}))
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: CookieName, Value: "abc"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 401 {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestSessionMiddlewareAcceptsValid(t *testing.T) {
	u := store.User{ID: uuid.New(), Email: "a@b.c"}
	ss := fakeSessionStore{sess: store.Session{UserID: u.ID, ExpiresAt: time.Now().Add(time.Hour)}, user: u}
	var got string
	h := SessionMiddleware(ss, CookieName)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		usr, _ := UserFrom(r.Context())
		got = usr.Email
	}))
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: CookieName, Value: "abc"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if got != "a@b.c" {
		t.Fatalf("got %q", got)
	}
}

func TestSessionMiddlewareNoCookie(t *testing.T) {
	h := SessionMiddleware(fakeSessionStore{}, CookieName)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("ran")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != 401 {
		t.Fatalf("code=%d", rec.Code)
	}
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/auth/ -run Session -v` → FAIL.

- [ ] **Step 3: Implement `session.go` and `session_middleware.go`**

`NewSessionToken` uses `crypto/rand` 32 bytes → hex; `HashToken` = SHA-256 hex. Middleware reads the cookie; missing → 401 `UNAUTHENTICATED`; lookup `SessionByTokenHash(HashToken(raw))`; reject if `store.ErrNotFound`, `RevokedAt != nil`, or `ExpiresAt.Before(now)` → 401; else load `UserByID` and `WithUser`. Cookie helpers set `HttpOnly, SameSite=Lax, Path=/, MaxAge, Secure`.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/auth/ -v` → PASS (all auth tests).

- [ ] **Step 5: Commit**

```bash
git add internal/auth/session.go internal/auth/session_middleware.go internal/auth/session_test.go
git commit -m "feat: session tokens and cookie middleware"
```

---

### Task 4: CSRF origin check

**Files:**
- Create: `internal/auth/csrf.go`
- Test: `internal/auth/csrf_test.go`

**Interfaces:**
- Produces: `auth.CheckOrigin(r *http.Request, allowed string) bool` — true for safe methods (GET/HEAD/OPTIONS) or when `Origin`/`Referer` host matches `allowed`.

- [ ] **Step 1: Write the failing test**

```go
package auth

import (
	"net/http/httptest"
	"testing"
)

func TestCheckOrigin(t *testing.T) {
	get := httptest.NewRequest("GET", "/", nil)
	if !CheckOrigin(get, "http://localhost:3000") {
		t.Fatal("safe method rejected")
	}
	post := httptest.NewRequest("POST", "/", nil)
	if CheckOrigin(post, "http://localhost:3000") {
		t.Fatal("POST with no Origin accepted")
	}
	post.Header.Set("Origin", "http://localhost:3000")
	if !CheckOrigin(post, "http://localhost:3000") {
		t.Fatal("matching Origin rejected")
	}
	post.Header.Set("Origin", "http://evil.example")
	if CheckOrigin(post, "http://localhost:3000") {
		t.Fatal("mismatched Origin accepted")
	}
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/auth/ -run CheckOrigin -v` → FAIL.

- [ ] **Step 3: Implement `internal/auth/csrf.go`** — compare scheme+host of `Origin` (fallback `Referer`) to the allowed origin; safe methods always pass.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/auth/ -run CheckOrigin -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/auth/csrf.go internal/auth/csrf_test.go
git commit -m "feat: csrf origin check"
```

---

### Task 5: Auth endpoints (signup, login, logout, me) with rate limiting

**Files:**
- Create: `internal/api/auth_handlers.go`
- Modify: `internal/api/api.go` (add `SessionStore`, `Hasher`, `RateLimiter` to `Deps`; register routes)
- Modify: `internal/config/config.go` (add `DashboardOrigin`, `SessionTTLHours`, `BcryptCost`, `LoginRateLimit`)
- Test: `internal/api/auth_handlers_test.go`

**Interfaces:**
- Consumes: `auth.HashPassword`, `auth.VerifyPassword`, `auth.ValidatePassword`, `auth.NewSessionToken`, `auth.SetSessionCookie`, `auth.ClearSessionCookie`, `auth.CheckOrigin`, `store.CreateUserWithPassword`, `store.UserByEmail`, `store.CreateSession`, `store.RevokeSession`.
- Produces:
  - `api.SessionStore` interface: `CreateUserWithPassword(ctx, email, name, hash string, planID uuid.UUID) (store.User, error)`, `UserByEmail(ctx, email string) (store.User, error)`, `CreateSession(ctx, s store.Session) error`, `SessionByTokenHash(ctx, hash string) (store.Session, error)`, `RevokeSession(ctx, hash string) error`, `PlanByCode(ctx, code string) (store.Plan, error)`.
  - `api.RateLimiter` interface: `Allow(ctx, key string, limit int, window time.Duration) (bool, error)`.
  - Routes `POST /v1/auth/signup`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET /v1/auth/me`.

- [ ] **Step 1: Write the failing tests**

```go
func TestSignupThenLogin(t *testing.T) {
	// Deps with in-memory fakes; POST /v1/auth/signup -> 201 + Set-Cookie
	// then POST /v1/auth/login -> 200 + Set-Cookie
}

func TestSignupDuplicateEmail(t *testing.T) {
	// second signup same email -> 409 EMAIL_TAKEN
}

func TestLoginSeededUserEmptyHashFails(t *testing.T) {
	// user with PasswordHash "" -> 401 INVALID_CREDENTIALS, no panic
}

func TestLoginRateLimited(t *testing.T) {
	// RateLimiter returns false -> 429 TOO_MANY_ATTEMPTS
}

func TestSignupRejectsShortPassword(t *testing.T) {
	// -> 400 INVALID_PASSWORD
}

func TestMutatingEndpointRejectsBadOrigin(t *testing.T) {
	// POST /v1/auth/login with Origin: evil -> 403 CSRF_ORIGIN_MISMATCH
}
```

Write each with a fake `SessionStore`/`RateLimiter` (reuse the `fakeStore` pattern in `internal/api/api_test.go`).

- [ ] **Step 2: Run to verify they fail** — `go test ./internal/api/ -run 'Signup|Login|Mutating' -v` → FAIL.

- [ ] **Step 3: Implement `internal/api/auth_handlers.go`**

Signup: validate email + password (`ValidatePassword`), `PlanByCode("free")`, `CreateUserWithPassword` (map `ErrEmailTaken` → 409), create session, set cookie, return `{user,plan}`. Login: rate-limit on `(ip,email)` first, `UserByEmail`, `VerifyPassword` (generic 401 on any failure incl. empty hash), create session, set cookie. Logout: read cookie, `RevokeSession(HashToken(raw))`, clear cookie, 204. Me: `auth.UserFrom` → `{user,plan}`. Every mutating handler calls `auth.CheckOrigin(r, cfg.DashboardOrigin)` first.

Add config fields with defaults: `DASHBOARD_ORIGIN=http://localhost:3000`, `SESSION_TTL_HOURS=720`, `BCRYPT_COST=12`, `LOGIN_RATE_LIMIT=10`.

- [ ] **Step 4: Run to verify they pass** — `go test ./internal/api/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/api internal/config
git commit -m "feat: signup/login/logout/me endpoints"
```

---

### Task 6: In-process event bus

**Files:**
- Create: `internal/events/bus.go`
- Test: `internal/events/bus_test.go`

**Interfaces:**
- Produces:
  - `events.Event` struct: `Type string`, `UserID uuid.UUID`, `Payload any`.
  - `events.Bus` interface: `Publish(Event)`, `Subscribe(userID uuid.UUID) (<-chan Event, func())`.
  - `events.New() Bus` — in-process implementation.

- [ ] **Step 1: Write the failing test**

```go
package events

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestFanOut(t *testing.T) {
	b := New()
	u := uuid.New()
	ch1, cancel1 := b.Subscribe(u)
	ch2, cancel2 := b.Subscribe(u)
	defer cancel1()
	defer cancel2()

	b.Publish(Event{Type: "request", UserID: u})
	for _, ch := range []<-chan Event{ch1, ch2} {
		select {
		case e := <-ch:
			if e.Type != "request" {
				t.Fatalf("type=%q", e.Type)
			}
		case <-time.After(time.Second):
			t.Fatal("subscriber did not receive event")
		}
	}
}

func TestPublishDoesNotBlockOnSlowSubscriber(t *testing.T) {
	b := New()
	u := uuid.New()
	_, cancel := b.Subscribe(u)
	defer cancel()
	done := make(chan struct{})
	go func() {
		for i := 0; i < 10000; i++ {
			b.Publish(Event{Type: "request", UserID: u})
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Publish blocked on a slow subscriber")
	}
}

func TestUserIsolation(t *testing.T) {
	b := New()
	a, cancelA := b.Subscribe(uuid.New())
	defer cancelA()
	b.Publish(Event{Type: "request", UserID: uuid.New()})
	select {
	case <-a:
		t.Fatal("received another user's event")
	case <-time.After(100 * time.Millisecond):
	}
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/events/ -v` → FAIL.

- [ ] **Step 3: Implement `internal/events/bus.go`**

`Bus` holds `map[uuid.UUID]map[int]chan Event` under a mutex; each subscriber channel is buffered (e.g. 32). `Publish` iterates a snapshot and does a non-blocking send (drop on full). `Subscribe` returns the channel and a cancel func that removes and closes it.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/events/ -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/events
git commit -m "feat: in-process event bus"
```

---

### Task 7: SSE endpoint

**Files:**
- Create: `internal/api/events.go`
- Modify: `internal/api/api.go` (add `Bus events.Bus` to `Deps`; register `GET /v1/events` on the session-auth path)
- Test: `internal/api/events_test.go`

**Interfaces:**
- Consumes: `events.Bus` (Task 6), `auth.SessionMiddleware`.
- Produces: `api.Server.handleEvents` writing `text/event-stream`.

- [ ] **Step 1: Write the failing test**

```go
func TestEventsStreamsPublishedEvent(t *testing.T) {
	bus := events.New()
	srv := New(Deps{ /* fakes */ Bus: bus, Cfg: config.Config{DashboardOrigin: "http://localhost:3000"} })
	ts := httptest.NewServer(srv.sessionHandler()) // handler with a fixed test user
	defer ts.Close()

	req, _ := http.NewRequest("GET", ts.URL+"/v1/events", nil)
	req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: "x"})
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("content-type=%q", ct)
	}
	bus.Publish(events.Event{Type: "request", UserID: testUser().ID, Payload: map[string]any{"n": 1}})

	reader := bufio.NewReader(resp.Body)
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		line, _ := reader.ReadString('\n')
		if strings.HasPrefix(line, "event: request") {
			return
		}
	}
	t.Fatal("event not streamed")
}
```

- [ ] **Step 2: Run to verify it fails** — `go test ./internal/api/ -run TestEventsStreamsPublishedEvent -v` → FAIL.

- [ ] **Step 3: Implement `internal/api/events.go`**

Handler asserts `http.Flusher`; sets SSE headers; `ch, cancel := Bus.Subscribe(user.ID)`; writes `event: <type>\ndata: <json>\n\n`; a `time.NewTicker(25s)` writes `: ping\n\n`; loop selects on `r.Context().Done()`, the ticker, and `ch`.

- [ ] **Step 4: Run to verify it passes** — `go test ./internal/api/ -run TestEvents -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/api/events.go internal/api/events_test.go internal/api/api.go
git commit -m "feat: sse events endpoint"
```

---

### Task 8: Tunnels list, usage history, and session-auth wiring

**Files:**
- Create: `internal/api/dashboard_handlers.go`
- Modify: `internal/api/api.go` (session-auth sub-router; register `GET /v1/tunnels`, `GET /v1/usage/history`)
- Modify: `internal/store/store.go` (add `UsageHistory`)
- Modify: `cmd/server/main.go` (construct bus, wire producers, pass to api.Deps)
- Test: `internal/api/dashboard_handlers_test.go`

**Interfaces:**
- Consumes: `store.TunnelsByUser`, `store.UsageHistory`.
- Produces:
  - `store.DailyUsage` struct: `Date string`, `RequestCount int64`, `BytesIn int64`, `BytesOut int64`.
  - `store.Store.UsageHistory(ctx, userID uuid.UUID, days int) ([]DailyUsage, error)`.
  - `api.Server.handleListTunnels` (`GET /v1/tunnels`), `api.Server.handleUsageHistory` (`GET /v1/usage/history?days=7`).

- [ ] **Step 1: Write the failing tests**

```go
func TestListTunnelsOnlyOwn(t *testing.T) {
	// fake store returns tunnels for the test user; GET /v1/tunnels -> 200 with them
	// a second user's tunnel must not appear
}

func TestUsageHistoryShape(t *testing.T) {
	// GET /v1/usage/history?days=7 -> 200 {"days":[{date,request_count,bytes_in,bytes_out}...]}
}
```

- [ ] **Step 2: Run to verify they fail** — `go test ./internal/api/ -run 'ListTunnels|UsageHistory' -v` → FAIL.

- [ ] **Step 3: Implement**

`UsageHistory` selects `usage_date, request_count, bytes_in, bytes_out` from `usage_daily` for the user where `usage_date >= now()::date - days`, ordered ascending. `handleListTunnels` returns the user's tunnels (reuse `publicURL`). `handleUsageHistory` clamps `days` to 1..30 (default 7).

In `api.go`, build a second `*http.ServeMux` for session routes and apply `auth.SessionMiddleware` to it; bearer routes keep `BearerMiddleware`. `Handler()` routes `/v1/auth/*` and `/v1/events` to the session mux (unauthenticated `/v1/auth/signup|login` bypass the middleware), the rest to bearer.

- [ ] **Step 4: Run to verify they pass** — `go test ./internal/api/ -v` → PASS.

- [ ] **Step 5: Wire producers in `cmd/server/main.go`**

Create `bus := events.New()`. Pass it to `api.Deps.Bus`. In the gateway log path, after `logger.Record`, call `bus.Publish(events.Event{Type:"request", UserID: sess.UserID})`. In tunnel `OnConnect`/`OnDisconnect`, publish `events.Event{Type:"tunnel.status", UserID: meta.UserUUID, Payload: map[string]string{"status": "online"|"offline"}}`.

- [ ] **Step 6: Build and test**

Run: `go build ./... && go vet ./... && go test ./...`
Expected: clean build, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add internal/api internal/store internal/events cmd/server
git commit -m "feat: dashboard endpoints and event producers"
```

---

### Task 9: Next.js dashboard scaffold

**Files:**
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/next.config.ts`
- Create: `apps/dashboard/tsconfig.json`
- Create: `apps/dashboard/tailwind.config.ts`
- Create: `apps/dashboard/app/layout.tsx`
- Create: `apps/dashboard/app/globals.css`
- Create: `apps/dashboard/.gitignore`

**Interfaces:**
- Produces: a runnable Next.js app on `:3000` whose `/api/*` requests are rewritten to `${API_BASE_URL}/v1/*`.

- [ ] **Step 1: Scaffold**

Create `package.json` with `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@types/*`, and shadcn/ui deps (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`). Scripts: `dev`, `build`, `start`, `lint`.

- [ ] **Step 2: Configure the rewrite**

`next.config.ts`:
```ts
const API = process.env.API_BASE_URL ?? "http://localhost:8081";
const nextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/v1/:path*` }];
  },
};
export default nextConfig;
```

- [ ] **Step 3: Add root layout and globals**

`app/layout.tsx` sets `<html lang="en">`, imports `globals.css`, renders `{children}`. `globals.css` includes Tailwind directives and shadcn CSS variables.

- [ ] **Step 4: Install and verify it boots**

Run: `cd apps/dashboard && npm install && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard
git commit -m "feat: next.js dashboard scaffold"
```

---

### Task 10: Dashboard lib and auth pages

**Files:**
- Create: `apps/dashboard/lib/api.ts` — `apiFetch(path, init)` forwarding cookies server-side; `login`, `signup`, `logout`, `me`.
- Create: `apps/dashboard/lib/sse.ts` — `useEvents(onEvent)` hook wrapping `EventSource('/api/events')`.
- Create: `apps/dashboard/components/ui/*` — shadcn `button`, `input`, `card`, `form`, `table`, `tabs`, `progress`, `badge`.
- Create: `apps/dashboard/app/(auth)/login/page.tsx`
- Create: `apps/dashboard/app/(auth)/signup/page.tsx`
- Create: `apps/dashboard/middleware.ts` — redirect unauthenticated app routes to `/login`.

**Interfaces:**
- Consumes: API endpoints from Tasks 5, 7, 8.
- Produces: `login()`, `signup()`, `logout()`, `me()` returning typed results.

- [ ] **Step 1: Implement `lib/api.ts`**

Server-side fetches use `next/headers` `cookies()` and forward the `Cookie` header; client-side fetches hit `/api/...` with `credentials: "same-origin"`. Types mirror the Go JSON (`{user,plan}`, `Tunnel`, `RequestLog`, `DailyUsage`).

- [ ] **Step 2: Implement login/signup pages**

Forms posting to `login`/`signup`; on success `router.push("/")`; on error show the message from the error envelope. On any `401`, redirect to `/login`.

- [ ] **Step 3: Implement `middleware.ts`**

Matcher excludes `/login`, `/signup`, `/api`, `_next`. Checks for the `indotunnel_session` cookie; missing → redirect `/login`.

- [ ] **Step 4: Verify**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard
git commit -m "feat: dashboard api client, auth pages, and route guard"
```

---

### Task 11: Dashboard home page

**Files:**
- Create: `apps/dashboard/app/(app)/layout.tsx` — nav shell (Dashboard, Tunnels→Requests, Usage) + logout button.
- Create: `apps/dashboard/app/(app)/page.tsx` — active tunnel card, usage bars, latest requests.
- Create: `apps/dashboard/components/tunnel-card.tsx`
- Create: `apps/dashboard/components/usage-bars.tsx`
- Create: `apps/dashboard/components/request-table.tsx`

**Interfaces:**
- Consumes: `GET /v1/tunnels`, `GET /v1/usage/today`, `GET /v1/usage/month`, `GET /v1/tunnels/:id/requests`, SSE.

- [ ] **Step 1: Implement the app shell** — server component reads `me()`; renders nav and a logout button (client) that POSTs `/api/auth/logout` then redirects.

- [ ] **Step 2: Implement `TunnelCard`** — shows status badge, local target, public URL + Copy button, Stop button (POST `/api/tunnels/:id/stop`, then `router.refresh()`).

- [ ] **Step 3: Implement `UsageBars`** — `used / limit` with shadcn `Progress` for today requests and month bandwidth (format bytes to MB/GB).

- [ ] **Step 4: Implement `RequestTable`** — columns time, method, path, status, duration, size; 5 rows on home.

- [ ] **Step 5: Wire SSE** — a client component subscribes to `useEvents`; on `tunnel.status` or `request`, calls `router.refresh()` (debounced ~1s).

- [ ] **Step 6: Verify** — `npm run build` succeeds; manual: start API + `agent 3000`, load `/`, see the tunnel and a live request count.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard
git commit -m "feat: dashboard home with live updates"
```

---

### Task 12: Usage and Requests pages

**Files:**
- Create: `apps/dashboard/app/(app)/usage/page.tsx`
- Create: `apps/dashboard/app/(app)/requests/page.tsx`
- Create: `apps/dashboard/app/(app)/requests/[id]/page.tsx`
- Create: `apps/dashboard/components/usage-chart.tsx`

**Interfaces:**
- Consumes: `GET /v1/usage/history`, `GET /v1/tunnels/:id/requests`, `GET /v1/tunnels/:id/requests/:request_id`.

- [ ] **Step 1: Usage page** — today/month bars plus a 7-day chart from `usage/history` (shadcn `Chart`).

- [ ] **Step 2: Requests page** — full table with a tunnel filter and pagination (limit/offset via the existing endpoint's `limit`).

- [ ] **Step 3: Request detail** — tabs Overview/Headers/Query/Response from metadata; a Copy-as-cURL button built from method/path/host. No Body tab (bodies not stored).

- [ ] **Step 4: Verify** — `npm run build` succeeds; manual navigation works with real data.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard
git commit -m "feat: usage and requests pages"
```

---

### Task 13: Compose, nginx, set-password, and E2E

**Files:**
- Modify: `deploy/docker-compose.yml` (add `dashboard` service, `DASHBOARD_ORIGIN`, `API_BASE_URL`)
- Create: `deploy/Dockerfile.dashboard`
- Create: `deploy/nginx.conf` (prod: `/` → dashboard, `/api` → server)
- Create: `cmd/setpassword/main.go` + `scripts/set-password.ps1`
- Modify: `scripts/e2e.ps1` (add signup + dashboard load assertion)
- Create: `scripts/dashboard-smoke.ps1` (Playwright, optional)

**Interfaces:**
- Produces: `cmd/setpassword` reads `EMAIL`/`PASSWORD` env and sets the hash; prints nothing secret.

- [ ] **Step 1: Add the dashboard service** — build `Dockerfile.dashboard`, port `3000:3000`, env `API_BASE_URL=http://server:8081`, `NEXT_PUBLIC_*` as needed; `depends_on: server`.

- [ ] **Step 2: Write `deploy/nginx.conf`** — `location /api/ { proxy_pass http://server:8081/v1/; }` and `location / { proxy_pass http://dashboard:3000; }`; forward cookies.

- [ ] **Step 3: Implement `cmd/setpassword`** — look up user by email, `auth.HashPassword`, `UpdatePasswordHash`; error if user missing.

- [ ] **Step 4: Extend `scripts/e2e.ps1`** — after the agent is up, `POST /v1/auth/signup`, capture the cookie, `GET /v1/tunnels` with the cookie, assert the public URL appears; load the dashboard HTML and assert it contains the subdomain.

- [ ] **Step 5: Verify**

Run: `docker compose -f deploy/docker-compose.yml up -d --build` then `powershell -File scripts/e2e.ps1`
Expected: `E2E OK`, dashboard reachable on `:3000`.

- [ ] **Step 6: Commit**

```bash
git add deploy cmd/setpassword scripts
git commit -m "feat: dashboard deployment, set-password, and e2e"
```

---

## Self-Review

**Spec coverage:** §4 auth → Tasks 1–5; §5 routing → Task 9; §6 pages → Tasks 10–12; §7 endpoints → Tasks 5, 7, 8; §8 SSE → Tasks 6–7, 11; §9 schema → Task 1; §10 config → Tasks 5, 13; §11 testing → tests in every task + Task 13; §12 security → Tasks 3, 4, 5, 8; §13 exit criteria → Task 13. No gaps.

**Review Focus mapping:** #1 → Task 3 (`TestSessionMiddlewareRejectsExpired`, `...Revoked`); #2 → Task 6 (`TestPublishDoesNotBlockOnSlowSubscriber`); #3 → Task 5 (`TestLoginSeededUserEmptyHashFails`); #4 → Task 1 (`TestSessionLifecycle` duplicate-email) + Task 5 (`TestSignupDuplicateEmail`); #5 → Task 8 (`TestListTunnelsOnlyOwn`).

**Type consistency:** `store.Session`/`SessionStore` defined Task 1, used Tasks 3, 5; `auth.CookieName` Task 3, used Tasks 5, 7, 10; `events.Bus` Task 6, used Tasks 7, 8; `api.Deps` extended Tasks 5, 7, 8 consistently; `store.DailyUsage` Task 8, used Task 12.

**Proportion:** plan ≈ 1.3× spec; code blocks are tests and signatures, not bodies.

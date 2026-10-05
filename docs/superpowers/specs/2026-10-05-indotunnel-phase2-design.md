# IndoTunnel — Phase 2 Dashboard & Auth Design

**Date:** 2026-10-05
**Status:** Approved (design)
**Depends on:** Phase 1 core tunnel (`docs/superpowers/specs/2026-10-05-indotunnel-phase1-design.md`)

## 1. Goal

A developer opens the dashboard in a browser, signs up or logs in, and sees
their active tunnel, usage against Free-plan limits, and request history — with
live updates. This is Phase 2 of the roadmap (`indotunnel-docs/17-roadmap.md`).

Out of scope for Phase 2: admin console, user settings page, API-key
management UI, OAuth, request/response body capture, webhook replay, custom
subdomain/domain, team, billing.

## 2. Scope Decisions

| # | Decision | Rationale |
|---|---|---|
| S1 | Auth = email + password, DB-backed sessions, HttpOnly cookie | no external provider; server-side revoke/logout; no secret rotation |
| S2 | Dashboard = Next.js (App Router) + TypeScript + shadcn/ui | matches `indotunnel-docs/README.md` stack |
| S3 | Next.js proxies `/api/*` to the Go control API | single browser origin → `SameSite=Lax` cookie works, no CORS |
| S4 | Realtime via SSE from the Go API | one endpoint, native `EventSource`, push without polling |
| S5 | Pages: login, signup, Dashboard, Usage, Requests (+ detail) | the core of `indotunnel-docs/13-dashboard.md` |
| S6 | Two auth paths: cookie (dashboard) and bearer API key (CLI) | the CLI must never hold a browser session |

## 3. Repository Layout (additions)

```text
indotunnel/
├── apps/
│   └── dashboard/                # Next.js app
│       ├── app/
│       │   ├── (auth)/login/page.tsx
│       │   ├── (auth)/signup/page.tsx
│       │   ├── (app)/page.tsx            # Dashboard home
│       │   ├── (app)/usage/page.tsx
│       │   ├── (app)/requests/page.tsx
│       │   ├── (app)/requests/[id]/page.tsx
│       │   ├── api/[...path]/route.ts    # optional proxy fallback
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/           # shadcn/ui + app components
│       ├── lib/                  # api client, sse hook, auth helpers
│       ├── next.config.ts        # rewrites /api -> :8081/v1
│       ├── package.json
│       └── tsconfig.json
├── internal/
│   ├── auth/
│   │   ├── auth.go               # existing API-key path
│   │   ├── password.go           # bcrypt hash/verify
│   │   ├── session.go            # token gen/hash, store-backed lookup
│   │   └── session_middleware.go # cookie auth
│   ├── events/                   # in-process event bus
│   │   └── bus.go
│   └── api/
│       ├── auth_handlers.go      # signup/login/logout/me
│       ├── events.go             # GET /v1/events (SSE)
│       └── ...
├── migrations/0003_auth.sql
└── scripts/set-password.*
```

## 4. Authentication

### 4.1 Password

- Hashing: `golang.org/x/crypto/bcrypt`, cost 12.
- Rules: minimum 8 characters, maximum 72 bytes (bcrypt limit). Reject empty.
- Verify uses `bcrypt.CompareHashAndPassword`.

### 4.2 Sessions

Token: 32 random bytes, hex-encoded (64 chars). The DB stores only
`SHA-256(token)` in `sessions.token_hash`. The raw token lives only in the
cookie.

Cookie `indotunnel_session`:
```text
HttpOnly; SameSite=Lax; Path=/
Secure: true when PUBLIC_SCHEME=https, else false (local dev)
Max-Age: 30 days
```

Session validity: row exists, `revoked_at IS NULL`, `expires_at > now()`.
Logout sets `revoked_at = now()` and clears the cookie.

### 4.3 Two auth paths

- `auth.BearerMiddleware` (existing): `Authorization: Bearer <api-key>` for the
  CLI. Unchanged.
- `auth.SessionMiddleware` (new): reads the cookie, resolves the user via the
  session store. Used only by the browser-facing endpoints.
- Both populate the same `auth.UserFrom(ctx)` value, so handlers are agnostic.

### 4.4 Auth endpoints

```http
POST /v1/auth/signup   {email,password}   -> 201, Set-Cookie, {user,plan}
POST /v1/auth/login    {email,password}   -> 200, Set-Cookie, {user,plan}
POST /v1/auth/logout                       -> 204, clear cookie, revoke session
GET  /v1/auth/me                           -> 200 {user,plan}  (cookie required)
```

Errors use the canonical envelope (`internal/httpx`). Wrong credentials return
`401 INVALID_CREDENTIALS` with a generic message (no user enumeration). Signup
with an existing email returns `409 EMAIL_TAKEN`.

Rate limiting: login attempts limited per `(ip, email)` via Redis
(`indotunnel:auth:login:{ip}:{email}`, NX counter, 10 attempts / 15 min).
Exceeded → `429 TOO_MANY_ATTEMPTS`.

### 4.5 CSRF

`SameSite=Lax` blocks cross-site POSTs. Additionally, mutating endpoints
(`POST`/`PUT`/`DELETE`) verify the `Origin` header matches `PUBLIC_SCHEME` +
`PUBLIC_HOST_SUFFIX` (or `DASHBOARD_ORIGIN`); mismatch → `403 CSRF_ORIGIN_MISMATCH`.

### 4.6 Seeded Phase 1 user

The Phase 1 seed user has an empty `password_hash` and cannot log in. Provide
`scripts/set-password` (Go helper, like `cmd/seed`) to set a password for an
existing email, and let new users sign up normally.

## 5. Routing and Origin

```text
browser  ->  http://localhost:3000   (Next.js dev / nginx prod)
                |  rewrite /api/*  ->  http://localhost:8081/v1/*
                v
            Go control API :8081
```

- `next.config.ts` rewrites `/api/:path*` → `${API_BASE_URL}/v1/:path*`.
- Browser only ever sees the Next.js origin, so the cookie is first-party.
- Server components read the cookie via `next/headers` and forward it on
  server-side fetches.
- Production nginx: `/` → Next.js, `/api` → Go API. Phase 1's edge (`:8080`)
  is untouched.

## 6. Dashboard Pages

All app pages require a session; unauthenticated users are redirected to
`/login`.

### 6.1 Login / Signup

Forms (shadcn `Input`, `Button`, `Form`). Client-side validation, then POST to
`/api/auth/login|signup`. On success, redirect to `/`.

### 6.2 Dashboard home (`/`)

Per `indotunnel-docs/13-dashboard.md` §2:

- Active tunnel card: status (connected/offline), local target, public URL with
  a Copy button, Stop button.
- Requests today: `used / limit` with a progress bar.
- Bandwidth this month: `used / limit` with a progress bar.
- Latest requests: a short table (5 rows) linking to `/requests`.
- Live: subscribes to SSE; tunnel status and request count update without
  reload.

### 6.3 Usage (`/usage`)

- Today requests and month bandwidth with bars.
- Last 7 days: requests and bandwidth charts (shadcn `Chart`, from `usage_daily`).
- New endpoint `GET /v1/usage/history?days=7` returns per-day aggregates.

### 6.4 Requests (`/requests`)

Table: time, method, path, status, duration, size. Filter by tunnel. Paginated
(newest first). Uses existing `GET /v1/tunnels/:id/requests`.

### 6.5 Request detail (`/requests/[id]`)

Tabs: Overview, Headers, Query, Response — metadata only. Bodies are not stored
(Phase 1 decision D-007); the Body tab is absent. Actions: Copy as cURL
(client-side, from metadata).

## 7. New API Endpoints

```http
POST /v1/auth/signup
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/auth/me
GET  /v1/tunnels                 # list user's tunnels
GET  /v1/usage/history?days=7    # per-day aggregates from usage_daily
GET  /v1/events                  # SSE stream
```

`GET /v1/tunnels` uses the existing `store.TunnelsByUser`.

## 8. SSE Realtime

### 8.1 Event bus

In-process fan-out in `internal/events`:

```go
type Event struct {
    Type    string    // "tunnel.status" | "request"
    UserID  uuid.UUID
    Payload any
}
type Bus interface {
    Publish(Event)
    Subscribe(userID uuid.UUID) (<-chan Event, func())  // channel + cancel
}
```

- `Publish` is non-blocking: a slow subscriber's buffer is dropped rather than
  stalling the data path.
- Producers: the gateway publishes `request` after logging; the tunnel server
  publishes `tunnel.status` on connect/disconnect.
- `Bus` is an interface so a future multi-node deployment can swap in Redis
  pub/sub without touching producers.

### 8.2 Endpoint

`GET /v1/events`:
- Auth via session cookie.
- `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- Sends `event: <type>\ndata: <json>\n\n` per event.
- Heartbeat comment (`: ping`) every 25s to keep proxies from closing it.
- Ends when the client disconnects (request context cancelled).

### 8.3 Client

`lib/sse.ts` opens `EventSource('/api/events')` (Next rewrite forwards it with
the cookie). Dashboard components subscribe and re-render on events; on error
`EventSource` reconnects automatically.

## 9. Database Schema (migration 0003)

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

A retention job deletes expired/revoked sessions older than 30 days (reuse the
Phase 1 `retentionLoop` pattern).

## 10. Configuration (additions)

```text
DASHBOARD_ORIGIN=http://localhost:3000     # CSRF allow-list
SESSION_TTL_HOURS=720                       # 30 days
BCRYPT_COST=12
LOGIN_RATE_LIMIT=10                         # per 15 min per (ip,email)
```

`PUBLIC_SCHEME=https` turns on the `Secure` cookie flag.

## 11. Testing Strategy

**Go unit (stdlib `testing`):**
- `password.go`: hash → verify; wrong password fails; short password rejected.
- `session.go`: token hash round-trip; expired session rejected; revoked rejected.
- `events`: fan-out to N subscribers; slow subscriber dropped, not blocking.
- CSRF: matching Origin passes, mismatched → 403.
- login rate limit: N+1th attempt → 429 (miniredis).

**Go integration (real Postgres + Redis via compose):**
- signup → login → `GET /v1/auth/me` → logout → `me` returns 401.
- signup duplicate email → 409.
- session cookie auth on `GET /v1/tunnels`.
- SSE: subscribe, publish an event, receive it.

**Dashboard:**
- No new test framework. One Playwright smoke script (`scripts/dashboard-smoke.ps1`)
  that signs up, loads `/`, and asserts the tunnel card renders. Manual for the
  rest.

**E2E:** extend `scripts/e2e.ps1` — after the agent is up, sign up via the API,
load the dashboard page, assert the public URL appears.

## 12. Security Checklist

- [ ] Passwords bcrypt-hashed (cost 12); never logged.
- [ ] Session token random 32 bytes; only SHA-256 stored.
- [ ] Cookie HttpOnly + SameSite=Lax; Secure in prod.
- [ ] Login rate-limited per (ip,email).
- [ ] Generic login error (no enumeration).
- [ ] CSRF: SameSite + Origin check on mutations.
- [ ] All app pages gated by session; redirect to /login.
- [ ] Dashboard queries scoped to the authenticated user (reuse Phase 1 ownership checks).
- [ ] No request/response bodies surfaced (D-007).

## 13. Phase 2 Exit Criteria

1. New user can sign up, log in, and see an empty dashboard.
2. After running `agent 3000`, the dashboard shows the active tunnel and public URL.
3. Usage bars reflect real request counts and bandwidth.
4. Request table lists real requests; detail page opens.
5. Dashboard updates live when a tunnel connects/disconnects and when requests arrive.
6. Stop button takes the tunnel offline and the edge returns 502.
7. Logout clears the session; `/` redirects to `/login`.

## 14. Open Items (deferred)

- Admin console (`24-admin-operations.md`).
- User settings + API-key management UI.
- OAuth, magic-link.
- Body capture / inspector / replay (Phase 3).
- Redis pub/sub bus for multi-node SSE.

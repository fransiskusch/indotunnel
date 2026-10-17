# Google OAuth + Cloudflare Turnstile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" sign-in and Cloudflare Turnstile protection to the IndoTunnel login and signup forms.

**Architecture:** OAuth lives in the Go control API (`internal/oauth`), reusing the existing `indotunnel_session` cookie and `startSession`. Captcha verification lives in `internal/captcha` behind an interface so handlers can be tested with a stub. Identity is stored in a new `oauth_accounts` table. The Next.js dashboard only renders the button and the Turnstile widget.

**Tech Stack:** Go 1.26, `golang.org/x/oauth2` (+ `google` endpoint), `golang.org/x/oauth2/google`, Next.js 16, React 19, Cloudflare Turnstile.

**Spec:** `docs/superpowers/specs/2026-10-17-google-oauth-turnstile-design.md`

## Global Constraints

- All auth logic stays in the Go API. The dashboard never talks to Google directly.
- Session format is unchanged: cookie `indotunnel_session`, CSRF Origin check, `startSession`.
- `redirect_uri` comes only from env `OAUTH_REDIRECT_URL`; never from a query parameter.
- Auto-link a Google identity to an existing user only when `email_verified == true`.
- id_token is verified with the official library (signature, `iss`, `aud`, `exp`); never decode-and-trust.
- Captcha verifies server-side before any signup/login work, and fails closed on network error.
- When `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is empty, `/v1/auth/google` returns `503 OAUTH_NOT_CONFIGURED` and the UI hides the button.
- When `TURNSTILE_SECRET` is empty, captcha is skipped and `captcha disabled` is logged once at startup.
- Only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` may reach the browser. Secrets never do.
- Every OAuth failure redirects to `/login?error=<code>` so the user sees a message.
- Working directory for Go commands: repo root. For frontend commands: `apps/dashboard`.
- Verification per task: `go build ./...` + `go test ./...`; for frontend tasks also `npx tsc --noEmit` and `npm run build`.

## Review Focus

- **OAuth state mismatch / missing cookie:** a callback with a wrong or absent `state` must be rejected with `400 OAUTH_STATE_INVALID` and must not create a session. Owned by Task 5.
- **Auto-link safety:** a Google identity whose `email_verified` is false must never link to or log into an existing account. Owned by Task 4 and Task 5.
- **Captcha fail-closed:** when `TURNSTILE_SECRET` is set but the verify request errors (network/timeout), the signup/login must be rejected, not allowed. Owned by Task 6.
- **OAuth user cannot password-login:** a user created via Google has `password_hash = ''` and must not be able to sign in with any password. Owned by Task 7.
- **Unconfigured provider:** with Google env empty, the button is hidden and the start route returns 503 rather than a redirect loop. Owned by Task 8.

---

### Task 1: Config — OAuth and Turnstile settings

**Files:**
- Modify: `internal/config/config.go`
- Modify: `internal/config/config_test.go`

**Interfaces:**
- Consumes: nothing.
- Produces: `config.Config` gains fields `GoogleClientID`, `GoogleClientSecret`, `OAuthRedirectURL`, `TurnstileSecret` (all `string`), plus methods `OAuthEnabled() bool` and `CaptchaEnabled() bool`.

- [ ] **Step 1: Write the failing test**

In `internal/config/config_test.go` add:

```go
func TestOAuthAndCaptchaFlags(t *testing.T) {
	t.Setenv("GOOGLE_CLIENT_ID", "")
	t.Setenv("GOOGLE_CLIENT_SECRET", "")
	t.Setenv("TURNSTILE_SECRET", "")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.OAuthEnabled() {
		t.Fatal("OAuthEnabled should be false with empty credentials")
	}
	if c.CaptchaEnabled() {
		t.Fatal("CaptchaEnabled should be false with empty secret")
	}

	t.Setenv("GOOGLE_CLIENT_ID", "id")
	t.Setenv("GOOGLE_CLIENT_SECRET", "secret")
	t.Setenv("TURNSTILE_SECRET", "ts")
	c, err = Load()
	if err != nil {
		t.Fatal(err)
	}
	if !c.OAuthEnabled() || !c.CaptchaEnabled() {
		t.Fatal("flags should be true when both are set")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/config -run TestOAuthAndCaptchaFlags -v`
Expected: FAIL with `c.OAuthEnabled undefined`.

- [ ] **Step 3: Add fields and methods to `internal/config/config.go`**

Add to the `Config` struct: `GoogleClientID`, `GoogleClientSecret`, `OAuthRedirectURL`, `TurnstileSecret string`.
In `Load()` populate them with `env("GOOGLE_CLIENT_ID","")`, `env("GOOGLE_CLIENT_SECRET","")`, `env("OAUTH_REDIRECT_URL","")`, `env("TURNSTILE_SECRET","")`.
Add:

```go
func (c Config) OAuthEnabled() bool {
	return c.GoogleClientID != "" && c.GoogleClientSecret != "" && c.OAuthRedirectURL != ""
}

func (c Config) CaptchaEnabled() bool { return c.TurnstileSecret != "" }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/config -run TestOAuthAndCaptchaFlags -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/config/config.go internal/config/config_test.go
git commit -m "feat(config): add google oauth and turnstile settings"
```

---

### Task 2: Migration — `oauth_accounts`

**Files:**
- Create: `migrations/0004_oauth.sql`
- Create: `internal/store/oauth_test.go`

**Interfaces:**
- Consumes: nothing.
- Produces: table `oauth_accounts(id, user_id, provider, provider_user_id, email, created_at)` with `UNIQUE (provider, provider_user_id)`.

- [ ] **Step 1: Write the failing integration test**

Create `internal/store/oauth_test.go` with `//go:build integration` at the top (matching `session_integration_test.go`):

```go
//go:build integration

package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestOAuthAccountUniquePerProvider(t *testing.T) {
	s := openTestStore(t)
	ctx := context.Background()
	plan, err := s.PlanByCode(ctx, "free")
	if err != nil {
		t.Fatal(err)
	}
	u, err := s.CreateUserWithPassword(ctx, "oauth+"+uuid.NewString()+"@indotunnel.id", "O", "hash", plan.ID)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.CreateOAuthAccount(ctx, OAuthAccount{
		ID: uuid.New(), UserID: u.ID, Provider: "google", ProviderUserID: "sub-1", Email: "o@example.com",
	}); err != nil {
		t.Fatal(err)
	}
	err = s.CreateOAuthAccount(ctx, OAuthAccount{
		ID: uuid.New(), UserID: u.ID, Provider: "google", ProviderUserID: "sub-1", Email: "o@example.com",
	})
	if err == nil {
		t.Fatal("expected unique violation on duplicate provider id")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -tags=integration ./internal/store -run TestOAuthAccountUniquePerProvider -v`
Expected: FAIL — `s.CreateOAuthAccount undefined` (and, once added, missing table).

- [ ] **Step 3: Write `migrations/0004_oauth.sql`**

```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(320),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
```

- [ ] **Step 4: Add store types and methods in `internal/store/session.go`**

```go
type OAuthAccount struct {
	ID             uuid.UUID
	UserID         uuid.UUID
	Provider       string
	ProviderUserID string
	Email          string
	CreatedAt      time.Time
}

func (s *Store) CreateOAuthAccount(ctx context.Context, a OAuthAccount) error
func (s *Store) OAuthAccountByProviderID(ctx context.Context, provider, providerUserID string) (OAuthAccount, error)
func (s *Store) CreateUserWithoutPassword(ctx context.Context, email, name string, planID uuid.UUID) (User, error)
```

`CreateOAuthAccount` inserts and returns the raw error (the caller distinguishes unique violation with the existing `isUniqueViolation`). `OAuthAccountByProviderID` selects by `provider` + `provider_user_id`, returning `pgx.ErrNoRows` unchanged when absent. `CreateUserWithoutPassword` mirrors `CreateUserWithPassword` with `password_hash` omitted (relies on the `DEFAULT ''` from `0003`) and maps a unique violation to `ErrEmailTaken`.

- [ ] **Step 5: Run test to verify it passes**

Run: `go test -tags=integration ./internal/store -run TestOAuthAccountUniquePerProvider -v`
Expected: PASS (requires the integration DB; skip if unavailable).

- [ ] **Step 6: Commit**

```bash
git add migrations/0004_oauth.sql internal/store/session.go internal/store/oauth_test.go
git commit -m "feat(store): add oauth_accounts table and store methods"
```

---

### Task 3: `internal/captcha` — Turnstile verifier

**Files:**
- Create: `internal/captcha/captcha.go`
- Create: `internal/captcha/captcha_test.go`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Verifier interface { Verify(ctx context.Context, token, remoteIP string) (bool, error) }`
  - `func NewTurnstile(secret string) *Turnstile`
  - `func NewDisabled() Verifier`
  - Sentinel `var ErrUnavailable = errors.New("captcha: verifier unavailable")`

- [ ] **Step 1: Write the failing test**

```go
func TestDisabledAlwaysAllows(t *testing.T) {
	v := NewDisabled()
	ok, err := v.Verify(context.Background(), "", "")
	if err != nil || !ok {
		t.Fatalf("disabled verifier: ok=%v err=%v", ok, err)
	}
}

func TestTurnstileRejectsInvalidToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error-codes": []string{"invalid-input-response"}})
	}))
	defer srv.Close()
	v := newTurnstileWithURL("secret", srv.URL)
	ok, err := v.Verify(context.Background(), "bad", "1.2.3.4")
	if err != nil || ok {
		t.Fatalf("want (false,nil), got (%v,%v)", ok, err)
	}
}

func TestTurnstileFailsClosedOnTransportError(t *testing.T) {
	v := newTurnstileWithURL("secret", "http://127.0.0.1:1/verify")
	ok, err := v.Verify(context.Background(), "tok", "1.2.3.4")
	if ok || err == nil {
		t.Fatalf("transport error must fail closed: ok=%v err=%v", ok, err)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/captcha -v`
Expected: FAIL — package/identifiers undefined.

- [ ] **Step 3: Implement `internal/captcha/captcha.go`**

`Verifier` interface as above. `Turnstile` struct holds `secret string` and `endpoint string` (default `https://challenges.cloudflare.com/turnstile/v0/siteverify`). `NewTurnstile(secret)` returns it with the default endpoint; `newTurnstileWithURL(secret, url)` is the test seam. `Verify` POSTs form-encoded `secret`, `response`, `remoteip`, decodes `{success bool, "error-codes" []string}`, and returns `(false, nil)` for a clean rejection, `(false, ErrUnavailable)` on transport/decode error. `NewDisabled()` returns a type whose `Verify` always returns `(true, nil)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/captcha -v`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add internal/captcha/
git commit -m "feat(captcha): add turnstile verifier"
```

---

### Task 4: `internal/oauth` — Google flow primitives

**Files:**
- Create: `internal/oauth/oauth.go`
- Create: `internal/oauth/oauth_test.go`
- Modify: `go.mod`, `go.sum` (via `go get`)

**Interfaces:**
- Consumes: `config.Config`.
- Produces:
  - `type Client struct{ ... }`, `func New(cfg config.Config) *Client`
  - `func (c *Client) AuthCodeURL(state string) string`
  - `type Identity struct { Subject, Email string; EmailVerified bool }`
  - `func (c *Client) Exchange(ctx context.Context, code string) (Identity, error)`
  - `func NewState() (string, error)` — 32 random bytes, hex
  - `func StateCookieName() string` → `"indotunnel_oauth_state"`
  - Sentinels `ErrEmailUnverified`, `ErrInvalidToken`

- [ ] **Step 1: Write the failing test**

```go
func TestNewStateIsRandomAndHex(t *testing.T) {
	a, err := NewState()
	if err != nil {
		t.Fatal(err)
	}
	b, _ := NewState()
	if len(a) != 64 {
		t.Fatalf("state len=%d want 64 hex chars", len(a))
	}
	if a == b {
		t.Fatal("two states must differ")
	}
	if _, err := hex.DecodeString(a); err != nil {
		t.Fatalf("state is not hex: %v", err)
	}
}

func TestExchangeRejectsUnverifiedEmail(t *testing.T) {
	c := New(config.Config{GoogleClientID: "id", GoogleClientSecret: "s", OAuthRedirectURL: "https://x/cb"})
	if err := c.validateIdentity(Identity{Subject: "s", Email: "a@b.c", EmailVerified: false}); err != ErrEmailUnverified {
		t.Fatalf("want ErrEmailUnverified, got %v", err)
	}
}

func TestExchangeRejectsMissingSubject(t *testing.T) {
	c := New(config.Config{GoogleClientID: "id", GoogleClientSecret: "s", OAuthRedirectURL: "https://x/cb"})
	if err := c.validateIdentity(Identity{Subject: "", Email: "a@b.c", EmailVerified: true}); err != ErrInvalidToken {
		t.Fatalf("want ErrInvalidToken, got %v", err)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go get golang.org/x/oauth2 && go test ./internal/oauth -v`
Expected: FAIL — package undefined.

- [ ] **Step 3: Implement `internal/oauth/oauth.go`**

Build `oauth2.Config{ClientID, ClientSecret, RedirectURL, Scopes: []string{"openid","email","profile"}, Endpoint: google.Endpoint}`. `AuthCodeURL(state)` adds `oauth2.AccessTypeOnline`. `Exchange` calls `cfg.Exchange(ctx, code)`, reads `id_token` from the token extra, verifies it with `github.com/coreos/go-oidc/v3/oidc` (`go get github.com/coreos/go-oidc/v3`) against `https://accounts.google.com`, then maps claims `sub`, `email`, `email_verified` into `Identity`. `validateIdentity` rejects empty `Subject` (`ErrInvalidToken`) and `!EmailVerified` (`ErrEmailUnverified`). `NewState` uses `crypto/rand`.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/oauth -v`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add internal/oauth/ go.mod go.sum
git commit -m "feat(oauth): add google flow primitives"
```

---

### Task 5: OAuth handlers — start and callback

**Files:**
- Create: `internal/api/oauth_handlers.go`
- Create: `internal/api/oauth_handlers_test.go`
- Modify: `internal/api/api.go` (Deps + SessionStore interface)
- Modify: `internal/api/auth_handlers.go` (register routes)

**Interfaces:**
- Consumes: `oauth.Client` (Task 4), `store.CreateOAuthAccount` / `OAuthAccountByProviderID` / `CreateUserWithoutPassword` (Task 2), `startSession` (existing).
- Produces: routes `GET /v1/auth/google` and `GET /v1/auth/google/callback`; `Deps.OAuth *oauth.Client`.

- [ ] **Step 1: Write the failing test**

In `internal/api/oauth_handlers_test.go`:

```go
func TestGoogleCallbackRejectsBadState(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	req := httptest.NewRequest("GET", "/v1/auth/google/callback?code=c&state=wrong", nil)
	req.AddCookie(&http.Cookie{Name: oauth.StateCookieName(), Value: "expected"})
	rec := httptest.NewRecorder()
	srv.mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400", rec.Code)
	}
}

func TestGoogleStartWithoutConfigReturns503(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	req := httptest.NewRequest("GET", "/v1/auth/google", nil)
	rec := httptest.NewRecorder()
	srv.mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d want 503", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/api -run 'TestGoogle' -v`
Expected: FAIL — routes return 404.

- [ ] **Step 3: Implement `internal/api/oauth_handlers.go`**

`handleGoogleStart`: if `!s.deps.Cfg.OAuthEnabled()` → `503 OAUTH_NOT_CONFIGURED`. Else `state := oauth.NewState()`, set cookie `oauth.StateCookieName()` with value `state`, `HttpOnly`, `SameSite=Lax`, `Secure` when `PublicScheme=="https"`, `MaxAge: 600`, `Path: "/"`, then `http.Redirect(w, r, s.deps.OAuth.AuthCodeURL(state), 302)`.
`handleGoogleCallback`: read state cookie; if absent or `!= r.URL.Query().Get("state")` → clear cookie, `400 OAUTH_STATE_INVALID` and redirect to `/login?error=oauth_state`. Clear the cookie. On `?error=` from Google → redirect `/login?error=oauth_cancelled`. Call `s.deps.OAuth.Exchange`; map `ErrEmailUnverified` → `/login?error=oauth_email`, other errors → `/login?error=oauth_failed`. Resolve the user: `OAuthAccountByProviderID`; if found load `UserByID`; else `UserByEmail`; if found create the link; else `CreateUserWithoutPassword` with the free plan. Then `s.startSession(w, r, user)` and redirect `/dashboard`.

Add the two routes in `routes()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/api -run 'TestGoogle' -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/api/oauth_handlers.go internal/api/oauth_handlers_test.go internal/api/api.go internal/api/auth_handlers.go
git commit -m "feat(api): add google oauth start and callback"
```

---

### Task 6: Captcha gate on signup and login

**Files:**
- Modify: `internal/api/api.go` (Deps + `Captcha captcha.Verifier`)
- Modify: `internal/api/auth_handlers.go`
- Modify: `internal/api/auth_handlers_test.go`

**Interfaces:**
- Consumes: `captcha.Verifier` (Task 3).
- Produces: `authReqBody` gains `CaptchaToken string \`json:"captcha_token"\``.

- [ ] **Step 1: Write the failing test**

```go
func TestSignupRejectsMissingCaptcha(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	srv.deps.Captcha = stubCaptcha{ok: false}
	rec := authReq(srv, "POST", "/v1/auth/signup", `{"email":"a@b.co","password":"password123","captcha_token":""}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400", rec.Code)
	}
}

func TestLoginRejectsFailedCaptcha(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	srv.deps.Captcha = stubCaptcha{ok: false}
	rec := authReq(srv, "POST", "/v1/auth/login", `{"email":"a@b.co","password":"password123","captcha_token":"bad"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400", rec.Code)
	}
}
```

`stubCaptcha` is a test type implementing `Verify` returning a fixed result.

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/api -run 'Captcha' -v`
Expected: FAIL — signup/login still succeed without captcha.

- [ ] **Step 3: Add the gate**

In `handleSignup` and `handleLogin`, immediately after decoding the body and before the origin/limit work: if `s.deps.Captcha != nil`, call `Verify(r.Context(), req.CaptchaToken, clientIP(r))`. On `err != nil` → `503 CAPTCHA_UNAVAILABLE`; on `!ok` → `400 CAPTCHA_FAILED` with message `"Complete the captcha and try again."`.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/api -run 'Captcha' -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/api/api.go internal/api/auth_handlers.go internal/api/auth_handlers_test.go
git commit -m "feat(api): gate signup and login behind turnstile"
```

---

### Task 7: Wire OAuth and captcha in the server

**Files:**
- Modify: `cmd/server/main.go`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: running server with `Deps.OAuth` and `Deps.Captcha` populated; one startup log line when captcha is disabled.

- [ ] **Step 1: Wire the dependencies**

In `run()`, after `cfg` loads: build `var cap captcha.Verifier`; if `cfg.CaptchaEnabled()` then `cap = captcha.NewTurnstile(cfg.TurnstileSecret)` else `cap = captcha.NewDisabled()` and `log.Info("captcha disabled")`. Build `oauthClient := oauth.New(cfg)` only when `cfg.OAuthEnabled()`, otherwise leave it nil. Pass both into `api.Deps{Captcha: cap, OAuth: oauthClient}`.

- [ ] **Step 2: Verify build and tests**

Run: `go build ./... && go test ./...`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add cmd/server/main.go
git commit -m "feat(server): wire google oauth and turnstile"
```

---

### Task 8: Frontend — Google button and Turnstile widget

**Files:**
- Create: `apps/dashboard/components/turnstile.tsx`
- Modify: `apps/dashboard/components/auth-form.tsx`
- Modify: `apps/dashboard/lib/api.ts`
- Modify: `apps/dashboard/app/(auth)/login/page.tsx`
- Modify: `apps/dashboard/app/(auth)/signup/page.tsx`

**Interfaces:**
- Consumes: env `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, route `/api/auth/google`.
- Produces: `Turnstile({ onToken }: { onToken: (t: string) => void })`; `login`/`signup` accept an optional `captchaToken`.

- [ ] **Step 1: Create `components/turnstile.tsx`**

`"use client"`. Load `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` once (inject a `<script>` in an effect, guard against duplicates). Render a `<div ref>` and call `window.turnstile.render(ref.current, { sitekey, callback: onToken, theme: "dark" })`. If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is empty, render nothing. Declare `window.turnstile` in a local `declare global` block.

- [ ] **Step 2: Update `auth-form.tsx`**

Add state `captchaToken`. Render `<Turnstile onToken={setCaptchaToken} />` above the submit button. Pass `captchaToken` to `login`/`signup`. Add above the form a plain link (not a button, so it works without JS):

```tsx
<a href="/api/auth/google" className="...">Continue with Google</a>
```

Show it only when `process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "1"`. On mount, read `useSearchParams().get("error")` and map `oauth_state | oauth_cancelled | oauth_failed | oauth_email` to a readable message in the existing `error` slot.

- [ ] **Step 3: Update `lib/api.ts`**

Extend the `login` and `signup` signatures to accept an optional third argument `captchaToken?: string` and include `captcha_token` in the JSON body when present.

- [ ] **Step 4: Verify frontend builds**

Run: `cd apps/dashboard && npx tsc --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/components/turnstile.tsx apps/dashboard/components/auth-form.tsx apps/dashboard/lib/api.ts "apps/dashboard/app/(auth)/login/page.tsx" "apps/dashboard/app/(auth)/signup/page.tsx"
git commit -m "feat(dashboard): add google sign-in and turnstile"
```

---

### Task 9: Deploy configuration

**Files:**
- Modify: `deploy/docker-compose.vps.yml`
- Modify: `apps/dashboard/Dockerfile` (only if the build needs `NEXT_PUBLIC_*` at build time)

**Interfaces:**
- Consumes: Task 8's env names.
- Produces: compose service `server` passes the four server-side secrets; `dashboard` build gets `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`.

- [ ] **Step 1: Add env to compose**

Under `server.environment` add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_REDIRECT_URL`, `TURNSTILE_SECRET` with `${VAR:-}` defaults. Under `dashboard.build.args` and `dashboard.environment` add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`.

- [ ] **Step 2: Verify compose parses**

Run: `docker compose -f deploy/docker-compose.vps.yml config > /dev/null`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add deploy/docker-compose.vps.yml apps/dashboard/Dockerfile
git commit -m "chore(deploy): pass oauth and turnstile env to services"
```

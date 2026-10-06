# Implementation Plan: API Keys Management & CLI Device Authorization Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement API key management in the dashboard and RFC 8628-style device authorization in the CLI agent to eliminate manual copy-pasting of API keys.

**Architecture:** Add PostgreSQL store methods for API keys CRUD; expose session-cookie-authenticated `/v1/api-keys` endpoints; implement device-auth endpoints in control API backed by ephemeral Redis state (`indotunnel:device:...`); add `/settings` and `/activate` pages in Next.js dashboard; update `cmd/agent` to launch browser and poll for approval.

**Tech Stack:** Go 1.23, pgx/v5, go-redis/v9, Next.js 15 (App Router), Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-10-06-device-auth-and-api-keys-design.md`

## Global Constraints

- Go code must follow existing patterns in `internal/api/` and `internal/store/`.
- No new external dependencies if existing standard library or already-installed modules (`github.com/redis/go-redis/v9`, `github.com/google/uuid`, `github.com/jackc/pgx/v5`) can do the job.
- Plaintext API keys (`sk_live_...`) are only returned upon creation and never stored raw or returned in list queries.
- CSRF protection via `auth.CSRFMiddleware` must guard mutating endpoints (`/v1/api-keys`, `/v1/auth/device/verify`).
- CLI `indotunnel login <key>` syntax must continue to work for backward compatibility.

## Review Focus

- **Expired device code**: Polling or verification after 10m Redis TTL expires must return 400 `EXPIRED_TOKEN` / `CODE_NOT_FOUND` cleanly without crashing or hanging CLI.
- **Double verification race**: If user clicks approve twice, only the first request succeeds; subsequent requests return 404/400 because user_code key in Redis is deleted.
- **Revoked API key**: A revoked key cannot establish tunnels or authenticate bearer endpoints.
- **Headless CLI environment**: If browser fail to open automatically (e.g. Linux SSH / CI), CLI prints the URL and continues polling gracefully without erroring out.
- **Cross-user isolation**: User A cannot view or revoke User B's API keys.

---

### Task 1: Store Layer for API Keys

**Files:**
- Modify: `internal/store/store.go`
- Test: `internal/store/store_test.go`

**Interfaces:**
- Consumes: `auth.GenerateKey()` from `internal/auth`
- Produces:
  ```go
  type APIKey struct {
      ID         uuid.UUID  `json:"id"`
      UserID     uuid.UUID  `json:"user_id"`
      Name       string     `json:"name"`
      KeyPrefix  string     `json:"key_prefix"`
      Status     string     `json:"status"`
      LastUsedAt *time.Time `json:"last_used_at,omitempty"`
      CreatedAt  time.Time  `json:"created_at"`
  }
  CreateAPIKey(ctx context.Context, userID uuid.UUID, name string) (rawKey string, key APIKey, err error)
  ListAPIKeys(ctx context.Context, userID uuid.UUID) ([]APIKey, error)
  RevokeAPIKey(ctx context.Context, userID, keyID uuid.UUID) error
  ```

- [ ] **Step 1: Write unit tests in `internal/store/store_test.go`**
  Add `TestAPIKeysCRUD` testing creation, listing (verifying secret is not returned), and revoking keys.

- [ ] **Step 2: Run test to verify failure**
  Run: `go test -v ./internal/store -run TestAPIKeysCRUD`
  Expected: FAIL (compile error: methods not defined)

- [ ] **Step 3: Implement `CreateAPIKey`, `ListAPIKeys`, `RevokeAPIKey` in `internal/store/store.go`**
  Implement queries against PostgreSQL `api_keys` table using `s.pool`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `go test -v ./internal/store -run TestAPIKeysCRUD`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add internal/store/
  git commit -m "feat(store): add CreateAPIKey, ListAPIKeys, and RevokeAPIKey methods"
  ```

---

### Task 2: Control API Endpoints for API Key Management

**Files:**
- Create: `internal/api/apikey_handlers.go`
- Modify: `internal/api/api.go`
- Test: `internal/api/apikey_handlers_test.go`

**Interfaces:**
- Consumes: `Store` methods from Task 1, `auth.UserFrom(ctx)`
- Produces:
  - `GET /v1/api-keys`: returns `{"api_keys": [...]}`
  - `POST /v1/api-keys`: accepts `{"name": "string"}`, returns 201 with raw key
  - `DELETE /v1/api-keys/{id}`: returns 204 No Content

- [ ] **Step 1: Write handler tests in `internal/api/apikey_handlers_test.go`**
  Test list, create, and delete endpoints with fake session store, testing both happy path and unauthenticated access.

- [ ] **Step 2: Run test to verify failure**
  Run: `go test -v ./internal/api -run TestAPIKeyHandlers`
  Expected: FAIL

- [ ] **Step 3: Implement handlers in `internal/api/apikey_handlers.go` and register routes in `internal/api/api.go`**
  Register routes in `s.sessionRoutes()` and update `isSessionPath()`.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `go test -v ./internal/api -run TestAPIKeyHandlers`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add internal/api/
  git commit -m "feat(api): add session-authenticated API key CRUD handlers"
  ```

---

### Task 3: Device Authorization Endpoints (Redis & Control API)

**Files:**
- Create: `internal/api/device_handlers.go`
- Modify: `internal/api/api.go`
- Test: `internal/api/device_handlers_test.go`

**Interfaces:**
- Consumes: `redis.Client` (or `Locker`/`RateLimiter` interface extended with device auth or typed interface)
- Produces:
  - `POST /v1/auth/device/code`
  - `POST /v1/auth/device/verify`
  - `POST /v1/auth/device/token`

- [ ] **Step 1: Write unit tests in `internal/api/device_handlers_test.go`**
  Test code request, polling while pending, approving code via user session, and token polling completion.

- [ ] **Step 2: Run test to verify failure**
  Run: `go test -v ./internal/api -run TestDeviceAuthFlow`
  Expected: FAIL

- [ ] **Step 3: Implement device auth in `internal/api/device_handlers.go` and register routes in `internal/api/api.go`**
  Use Redis keys `indotunnel:device:user:{code}` and `indotunnel:device:dev:{device_code}`.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `go test -v ./internal/api -run TestDeviceAuthFlow`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add internal/api/
  git commit -m "feat(api): implement RFC 8628 device authorization endpoints"
  ```

---

### Task 4: CLI Agent Device Login

**Files:**
- Modify: `cmd/agent/main.go`
- Test: `cmd/agent/main_test.go`

**Interfaces:**
- Consumes: `POST /v1/auth/device/code`, `POST /v1/auth/device/token`
- Produces: Interactive `indotunnel login` command

- [ ] **Step 1: Write test for device login CLI helper in `cmd/agent/main_test.go`**
  Test HTTP request payload generation and response parsing with a mock `httptest.Server`.

- [ ] **Step 2: Run test to verify failure**
  Run: `go test -v ./cmd/agent -run TestDeviceLogin`
  Expected: FAIL

- [ ] **Step 3: Implement interactive device login in `cmd/agent/main.go`**
  Add OS browser launcher (`start` on Windows, `open` on Darwin, `xdg-open` on Linux) with fallback to printing instructions, plus polling loop with 2s interval.

- [ ] **Step 4: Run test to verify it passes**
  Run: `go test -v ./cmd/agent`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add cmd/agent/
  git commit -m "feat(cli): add interactive device login flow to agent"
  ```

---

### Task 5: Dashboard API Key Management UI

**Files:**
- Modify: `apps/dashboard/lib/api.ts`
- Modify: `apps/dashboard/components/nav.tsx`
- Create: `apps/dashboard/app/(app)/settings/page.tsx`
- Create: `apps/dashboard/components/api-keys-card.tsx`

**Interfaces:**
- Consumes: `/api/v1/api-keys` (Next.js rewrite to Control API)
- Produces: Settings page with API key listing, generation modal with copy button, and revoking capability.

- [ ] **Step 1: Add API client helper functions and types in `apps/dashboard/lib/api.ts`**
  Add types `APIKey` and functions `listAPIKeys()`, `createAPIKey(name: string)`, `revokeAPIKey(id: string)`.

- [ ] **Step 2: Add Settings navigation in `apps/dashboard/components/nav.tsx`**
  Include link to `/settings` with Key icon.

- [ ] **Step 3: Implement `apps/dashboard/components/api-keys-card.tsx` and `app/(app)/settings/page.tsx`**
  Implement table of keys, creation modal showing plaintext once with copy button, and confirmation dialog for revocation.

- [ ] **Step 4: Verify Next.js build passes**
  Run: `npm run build` in `apps/dashboard`
  Expected: Successful build with no TypeScript or linting errors.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/dashboard/
  git commit -m "feat(dashboard): add Settings page with API key management"
  ```

---

### Task 6: Dashboard CLI Device Activation Page

**Files:**
- Create: `apps/dashboard/app/(app)/activate/page.tsx`
- Create: `apps/dashboard/components/device-activation-form.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/auth/device/verify`
- Produces: `/activate` page reading `?code=XXXX-XXXX`, displaying approval UI, and confirming device authorization.

- [ ] **Step 1: Create `device-activation-form.tsx` component**
  Handles user code input (or reads from initial props), submits verification request, and displays success or error states.

- [ ] **Step 2: Create `app/(app)/activate/page.tsx` page**
  Protected route wrapped with app session, renders the activation form.

- [ ] **Step 3: Verify Next.js build passes**
  Run: `npm run build` in `apps/dashboard`
  Expected: Successful build.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/dashboard/
  git commit -m "feat(dashboard): add /activate page for CLI device approval"
  ```

---

### Task 7: End-to-End Verification

- [ ] **Step 1: Run full Go test suite**
  Run: `go test ./...`
  Expected: All packages pass.

- [ ] **Step 2: Run dashboard typecheck and build**
  Run: `npm run build` inside `apps/dashboard`
  Expected: Zero errors.

- [ ] **Step 3: Simulate CLI login against running mock or local server**
  Verify CLI receives device code, formats verification URL, polls, and saves credential.

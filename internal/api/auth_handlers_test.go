package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/store"
)

type fakeSessionStore struct {
	users    map[string]store.User
	createErr error
	sessions map[string]store.Session
	revoked  map[string]bool
	plan     store.Plan
}

func newFakeSessionStore() *fakeSessionStore {
	return &fakeSessionStore{
		users:    map[string]store.User{},
		sessions: map[string]store.Session{},
		revoked:  map[string]bool{},
		plan:     store.Plan{Code: "free", MaxActiveTunnels: 1, DailyRequestLimit: 5000},
	}
}

func (f *fakeSessionStore) CreateUserWithPassword(ctx context.Context, email, name, hash string, planID uuid.UUID) (store.User, error) {
	if f.createErr != nil {
		return store.User{}, f.createErr
	}
	if _, ok := f.users[email]; ok {
		return store.User{}, store.ErrEmailTaken
	}
	u := store.User{ID: uuid.New(), PlanID: planID, Email: email, Name: name, PasswordHash: hash, Plan: f.plan}
	f.users[email] = u
	return u, nil
}

func (f *fakeSessionStore) UserByEmail(ctx context.Context, email string) (store.User, error) {
	u, ok := f.users[email]
	if !ok {
		return store.User{}, store.ErrNotFound
	}
	return u, nil
}

func (f *fakeSessionStore) CreateUserSession(ctx context.Context, s store.Session) error {
	f.sessions[s.TokenHash] = s
	return nil
}

func (f *fakeSessionStore) SessionByTokenHash(ctx context.Context, hash string) (store.Session, error) {
	s, ok := f.sessions[hash]
	if !ok {
		return store.Session{}, store.ErrNotFound
	}
	return s, nil
}

func (f *fakeSessionStore) RevokeSession(ctx context.Context, hash string) error {
	f.revoked[hash] = true
	return nil
}

func (f *fakeSessionStore) PlanByCode(ctx context.Context, code string) (store.Plan, error) {
	return f.plan, nil
}

func (f *fakeSessionStore) UserByID(ctx context.Context, id uuid.UUID) (store.User, error) {
	for _, u := range f.users {
		if u.ID == id {
			return u, nil
		}
	}
	return store.User{}, store.ErrNotFound
}

type fakeRateLimiter struct{ allow bool }

func (f fakeRateLimiter) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	return f.allow, nil
}

func newAuthAPI(ss *fakeSessionStore, rl RateLimiter) *Server {
	cfg := config.Config{
		PublicScheme:     "http",
		PublicHostSuffix: "indotunnel.localhost",
		DashboardOrigin:  "http://localhost:3000",
		SessionTTLHours:  720,
		BcryptCost:       4,
		LoginRateLimit:   10,
	}
	return New(Deps{Store: &fakeStore{}, Limits: &fakeLimits{}, Lock: &fakeLocker{ok: true},
		SessionStore: ss, RateLimiter: rl, Cfg: cfg})
}

func authReq(srv *Server, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()
	srv.mux.ServeHTTP(rec, req)
	return rec
}

func TestSignupThenLogin(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})

	rec := authReq(srv, "POST", "/v1/auth/signup", `{"email":"a@b.c","password":"longenough"}`)
	if rec.Code != 201 {
		t.Fatalf("signup code=%d body=%s", rec.Code, rec.Body.String())
	}
	if len(rec.Result().Cookies()) == 0 {
		t.Fatal("signup set no cookie")
	}

	rec = authReq(srv, "POST", "/v1/auth/login", `{"email":"a@b.c","password":"longenough"}`)
	if rec.Code != 200 {
		t.Fatalf("login code=%d body=%s", rec.Code, rec.Body.String())
	}
	if len(rec.Result().Cookies()) == 0 {
		t.Fatal("login set no cookie")
	}
}

func TestSignupDuplicateEmail(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	authReq(srv, "POST", "/v1/auth/signup", `{"email":"a@b.c","password":"longenough"}`)
	rec := authReq(srv, "POST", "/v1/auth/signup", `{"email":"a@b.c","password":"longenough"}`)
	if rec.Code != 409 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "EMAIL_TAKEN") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestLoginSeededUserEmptyHashFails(t *testing.T) {
	ss := newFakeSessionStore()
	ss.users["seed@indotunnel.id"] = store.User{ID: uuid.New(), Email: "seed@indotunnel.id", PasswordHash: ""}
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	rec := authReq(srv, "POST", "/v1/auth/login", `{"email":"seed@indotunnel.id","password":"whatever1"}`)
	if rec.Code != 401 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "INVALID_CREDENTIALS") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestLoginRateLimited(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: false})
	rec := authReq(srv, "POST", "/v1/auth/login", `{"email":"a@b.c","password":"longenough"}`)
	if rec.Code != 429 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "TOO_MANY_ATTEMPTS") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestSignupRejectsShortPassword(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	rec := authReq(srv, "POST", "/v1/auth/signup", `{"email":"a@b.c","password":"short"}`)
	if rec.Code != 400 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "INVALID_PASSWORD") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestMutatingEndpointRejectsBadOrigin(t *testing.T) {
	ss := newFakeSessionStore()
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})
	req := httptest.NewRequest("POST", "/v1/auth/login", strings.NewReader(`{"email":"a@b.c","password":"longenough"}`))
	req.Header.Set("Origin", "http://evil.example")
	rec := httptest.NewRecorder()
	srv.mux.ServeHTTP(rec, req)
	if rec.Code != 403 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "CSRF_ORIGIN_MISMATCH") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestLogoutRevokesSession(t *testing.T) {
	ss := newFakeSessionStore()
	raw, hash := auth.NewSessionToken()
	u := store.User{ID: uuid.New(), Email: "a@b.c"}
	ss.users[u.Email] = u
	ss.sessions[hash] = store.Session{UserID: u.ID, TokenHash: hash, ExpiresAt: time.Now().Add(time.Hour)}
	srv := newAuthAPI(ss, fakeRateLimiter{allow: true})

	req := httptest.NewRequest("POST", "/v1/auth/logout", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != 204 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !ss.revoked[hash] {
		t.Fatal("session not revoked")
	}
}

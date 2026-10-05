package api

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/limits"
	"indotunnel/internal/store"
	"indotunnel/internal/tunnel"
)

func TestRejectNonLoopback(t *testing.T) {
	for _, h := range []string{"0.0.0.0", "10.0.0.5", "example.com", "::", ""} {
		if err := validateTarget(h, 3000); err == nil {
			t.Fatalf("%q accepted", h)
		}
	}
	for _, h := range []string{"127.0.0.1", "localhost", "::1"} {
		if err := validateTarget(h, 3000); err != nil {
			t.Fatalf("%q rejected: %v", h, err)
		}
	}
	if err := validateTarget("127.0.0.1", 0); err == nil {
		t.Fatal("port 0 accepted")
	}
	if err := validateTarget("127.0.0.1", 70000); err == nil {
		t.Fatal("port 70000 accepted")
	}
}

// --- fakes ---

type fakeStore struct {
	active    int
	created   *store.Tunnel
	subExists bool
	user      store.User
	byID      store.Tunnel
	byIDErr   error
	requests  []store.RequestLog
}

func (f *fakeStore) UserByAPIKey(ctx context.Context, prefix, hash string) (store.User, error) {
	if f.user.ID == uuid.Nil {
		return testUser(), nil
	}
	return f.user, nil
}
func (f *fakeStore) CountActiveTunnels(ctx context.Context, u uuid.UUID) (int, error) {
	return f.active, nil
}
func (f *fakeStore) SubdomainExists(ctx context.Context, s string) (bool, error) {
	return f.subExists, nil
}
func (f *fakeStore) CreateTunnel(ctx context.Context, t store.Tunnel) error {
	f.created = &t
	return nil
}
func (f *fakeStore) TunnelByID(ctx context.Context, id string) (store.Tunnel, error) {
	return f.byID, f.byIDErr
}
func (f *fakeStore) SetTunnelStatus(ctx context.Context, id, s string) error { return nil }
func (f *fakeStore) RequestsByTunnel(ctx context.Context, id uuid.UUID, limit int) ([]store.RequestLog, error) {
	return f.requests, nil
}
func (f *fakeStore) RequestByID(ctx context.Context, id string) (store.RequestLog, error) {
	if len(f.requests) == 0 {
		return store.RequestLog{}, store.ErrNotFound
	}
	return f.requests[0], nil
}
func (f *fakeStore) TunnelsByUser(ctx context.Context, id uuid.UUID) ([]store.Tunnel, error) {
	return nil, nil
}
func (f *fakeStore) UsageHistory(ctx context.Context, id uuid.UUID, days int) ([]store.DailyUsage, error) {
	return nil, nil
}

type fakeLimits struct {
	allowed bool
	used    int64
	month   int64
}

func (f *fakeLimits) CheckAndIncrDaily(ctx context.Context, u string, limit int64) (bool, int64, error) {
	return f.allowed, f.used, nil
}
func (f *fakeLimits) MonthBandwidth(ctx context.Context, u string) (int64, error) {
	return f.month, nil
}
func (f *fakeLimits) DailyUsed(ctx context.Context, u string) (int64, error)    { return f.used, nil }
func (f *fakeLimits) AddBandwidth(ctx context.Context, u string, b int64) error { return nil }

type fakeLocker struct{ ok bool }

func (f *fakeLocker) Lock(ctx context.Context, key string, ttl time.Duration) (func(), bool, error) {
	if !f.ok {
		return nil, false, nil
	}
	return func() {}, true, nil
}

func testUser() store.User {
	return store.User{
		ID:    uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Email: "dev@indotunnel.id",
		Plan: store.Plan{
			Code: "free", MaxActiveTunnels: 1,
			DailyRequestLimit: 5000, MonthlyBandwidthLimitBytes: 10737418240,
		},
	}
}

func newTestAPI(st *fakeStore, lim Limiter, lock *fakeLocker) *Server {
	cfg := config.Config{
		PublicScheme:     "http",
		PublicHostSuffix: "indotunnel.localhost",
		EdgeAddr:         ":8080",
	}
	return New(Deps{Store: st, Limits: lim, Lock: lock, Cfg: cfg})
}

func doAuthed(srv *Server, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer sk_live_abcdefghijklmnop")
	req = req.WithContext(auth.WithUser(req.Context(), testUser()))
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func TestCreateTunnelSuccess(t *testing.T) {
	st := &fakeStore{}
	srv := newTestAPI(st, &fakeLimits{}, &fakeLocker{ok: true})
	rec := doAuthed(srv, "POST", "/v1/tunnels", `{"local_host":"127.0.0.1","local_port":3000,"protocol":"http"}`)
	if rec.Code != 201 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	var resp struct {
		TunnelID  string `json:"tunnel_id"`
		Subdomain string `json:"subdomain"`
		PublicURL string `json:"public_url"`
		Status    string `json:"status"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.TunnelID == "" || resp.Subdomain == "" {
		t.Fatalf("resp=%+v", resp)
	}
	if !strings.Contains(resp.PublicURL, resp.Subdomain+".indotunnel.localhost") {
		t.Fatalf("public_url=%q", resp.PublicURL)
	}
	if resp.Status != "pending" {
		t.Fatalf("status=%q", resp.Status)
	}
}

func TestCreateTunnelConflict(t *testing.T) {
	st := &fakeStore{active: 1}
	srv := newTestAPI(st, &fakeLimits{}, &fakeLocker{ok: true})
	rec := doAuthed(srv, "POST", "/v1/tunnels", `{"local_host":"127.0.0.1","local_port":3000}`)
	if rec.Code != 409 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "ACTIVE_TUNNEL_LIMIT_REACHED") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestCreateTunnelRejectsNonLoopback(t *testing.T) {
	st := &fakeStore{}
	srv := newTestAPI(st, &fakeLimits{}, &fakeLocker{ok: true})
	rec := doAuthed(srv, "POST", "/v1/tunnels", `{"local_host":"10.0.0.5","local_port":3000}`)
	if rec.Code != 400 {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestCreateTunnelLockBusy(t *testing.T) {
	st := &fakeStore{}
	srv := newTestAPI(st, &fakeLimits{}, &fakeLocker{ok: false})
	rec := doAuthed(srv, "POST", "/v1/tunnels", `{"local_host":"127.0.0.1","local_port":3000}`)
	if rec.Code != 409 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestUsageToday(t *testing.T) {
	st := &fakeStore{}
	srv := newTestAPI(st, &fakeLimits{used: 1283}, &fakeLocker{ok: true})
	rec := doAuthed(srv, "GET", "/v1/usage/today", "")
	if rec.Code != 200 {
		t.Fatalf("code=%d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "1283") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

// countingLimiter records whether the mutating increment was called.
type countingLimiter struct {
	fakeLimits
	incrCalls int
}

func (c *countingLimiter) CheckAndIncrDaily(ctx context.Context, u string, limit int64) (bool, int64, error) {
	c.incrCalls++
	return true, c.used, nil
}

func TestUsageTodayDoesNotIncrement(t *testing.T) {
	st := &fakeStore{}
	lim := &countingLimiter{fakeLimits: fakeLimits{used: 42}}
	srv := newTestAPI(st, lim, &fakeLocker{ok: true})
	rec := doAuthed(srv, "GET", "/v1/usage/today", "")
	if rec.Code != 200 {
		t.Fatalf("code=%d", rec.Code)
	}
	if lim.incrCalls != 0 {
		t.Fatalf("usage read incremented counter %d times", lim.incrCalls)
	}
	if !strings.Contains(rec.Body.String(), "42") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestStopTunnelEvictsRegistry(t *testing.T) {
	st := &fakeStore{byID: store.Tunnel{
		UserID: testUser().ID, Subdomain: "abcde", TunnelID: "t_1", Status: "online",
	}}
	reg := tunnel.NewRegistry()
	reg.Register("abcde", tunnel.NewSession("conn-1", testUser().ID, uuid.New(), "abcde", 5000, 10737418240, nil))
	srv := New(Deps{Store: st, Limits: &fakeLimits{}, Lock: &fakeLocker{ok: true},
		Registry: reg, Cfg: config.Config{}})
	rec := doAuthed(srv, "POST", "/v1/tunnels/t_1/stop", "")
	if rec.Code != 200 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if _, ok := reg.Lookup("abcde"); ok {
		t.Fatal("registry still serves the stopped tunnel")
	}
}

func TestGetRequestRejectsForeignRequest(t *testing.T) {
	st := &fakeStore{
		byID:     store.Tunnel{UserID: testUser().ID, Subdomain: "abcde", TunnelID: "t_1"},
		requests: []store.RequestLog{{RequestID: "req_x", UserID: uuid.New()}}, // owned by someone else
	}
	srv := newTestAPI(st, &fakeLimits{}, &fakeLocker{ok: true})
	rec := doAuthed(srv, "GET", "/v1/tunnels/t_1/requests/req_x", "")
	if rec.Code != 404 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestHealthz(t *testing.T) {
	st := &fakeStore{}
	srv := newTestAPI(st, &fakeLimits{}, &fakeLocker{ok: true})
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, httptest.NewRequest("GET", "/healthz", nil))
	if rec.Code != 200 {
		t.Fatalf("code=%d", rec.Code)
	}
}

// limits.Checker satisfies the interface used by Deps at compile time.
var _ = (*limits.Checker)(nil)

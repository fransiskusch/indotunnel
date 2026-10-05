package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/events"
	"indotunnel/internal/store"
)

// fakeTunnelStore returns a fixed set of tunnels for the test user and one
// foreign tunnel.
type fakeTunnelStore struct {
	*fakeStore
	tunnels []store.Tunnel
	usage   []store.DailyUsage
}

func (f *fakeTunnelStore) TunnelsByUser(ctx context.Context, userID uuid.UUID) ([]store.Tunnel, error) {
	var out []store.Tunnel
	for _, t := range f.tunnels {
		if t.UserID == userID {
			out = append(out, t)
		}
	}
	return out, nil
}

func (f *fakeTunnelStore) UsageHistory(ctx context.Context, userID uuid.UUID, days int) ([]store.DailyUsage, error) {
	return f.usage, nil
}

func newDashboardAPI(st *fakeTunnelStore, ss *fakeSessionStore, u store.User) *Server {
	return New(Deps{
		Store:        st,
		Limits:       &fakeLimits{},
		Lock:         &fakeLocker{ok: true},
		SessionStore: ss,
		Bus:          events.New(),
		Cfg:          config.Config{EdgeAddr: ":8080", PublicScheme: "http", PublicHostSuffix: "indotunnel.localhost", DashboardOrigin: "http://localhost:3000"},
	})
}

func sessionReq(srv *Server, raw, method, path string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func TestListTunnelsOnlyOwn(t *testing.T) {
	u := testUser()
	raw, hash := auth.NewSessionToken()
	other := uuid.New()
	st := &fakeTunnelStore{
		fakeStore: &fakeStore{},
		tunnels: []store.Tunnel{
			{UserID: u.ID, TunnelID: "t_mine", Subdomain: "mine1", Status: "online"},
			{UserID: other, TunnelID: "t_theirs", Subdomain: "their", Status: "online"},
		},
	}
	ss := newFakeSessionStore()
	ss.users[u.Email] = u
	ss.sessions[hash] = store.Session{UserID: u.ID, TokenHash: hash, ExpiresAt: time.Now().Add(time.Hour)}
	srv := newDashboardAPI(st, ss, u)

	rec := sessionReq(srv, raw, "GET", "/v1/tunnels")
	if rec.Code != 200 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Tunnels []map[string]any `json:"tunnels"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if len(resp.Tunnels) != 1 || resp.Tunnels[0]["tunnel_id"] != "t_mine" {
		t.Fatalf("tunnels=%+v", resp.Tunnels)
	}
	if s, _ := resp.Tunnels[0]["public_url"].(string); s == "" {
		t.Fatalf("missing public_url: %+v", resp.Tunnels[0])
	}
}

func TestUsageHistoryShape(t *testing.T) {
	u := testUser()
	raw, hash := auth.NewSessionToken()
	st := &fakeTunnelStore{
		fakeStore: &fakeStore{},
		usage:     []store.DailyUsage{{Date: "2026-10-04", RequestCount: 3, BytesIn: 100, BytesOut: 200}},
	}
	ss := newFakeSessionStore()
	ss.users[u.Email] = u
	ss.sessions[hash] = store.Session{UserID: u.ID, TokenHash: hash, ExpiresAt: time.Now().Add(time.Hour)}
	srv := newDashboardAPI(st, ss, u)

	rec := sessionReq(srv, raw, "GET", "/v1/usage/history?days=7")
	if rec.Code != 200 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Days []struct {
			Date         string `json:"date"`
			RequestCount int64  `json:"request_count"`
			BytesIn      int64  `json:"bytes_in"`
			BytesOut     int64  `json:"bytes_out"`
		} `json:"days"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if len(resp.Days) != 1 || resp.Days[0].Date != "2026-10-04" || resp.Days[0].RequestCount != 3 {
		t.Fatalf("days=%+v", resp.Days)
	}
}

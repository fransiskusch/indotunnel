package api

import (
	"bufio"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/events"
	"indotunnel/internal/store"
)

func TestEventsStreamsPublishedEvent(t *testing.T) {
	bus := events.New()
	u := store.User{ID: testUser().ID, Email: "dev@indotunnel.id"}
	raw, hash := auth.NewSessionToken()
	ss := newFakeSessionStore()
	ss.users[u.Email] = u
	ss.sessions[hash] = store.Session{UserID: u.ID, TokenHash: hash, ExpiresAt: time.Now().Add(time.Hour)}

	srv := New(Deps{
		Store:        &fakeStore{},
		Limits:       &fakeLimits{},
		Lock:         &fakeLocker{ok: true},
		SessionStore: ss,
		Bus:          bus,
		Cfg:          config.Config{DashboardOrigin: "http://localhost:3000"},
	})
	ts := httptest.NewServer(srv.Handler())
	defer ts.Close()

	req, _ := http.NewRequest("GET", ts.URL+"/v1/events", nil)
	req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("content-type=%q", ct)
	}
	bus.Publish(events.Event{Type: "request", UserID: u.ID, Payload: map[string]any{"n": 1}})

	reader := bufio.NewReader(resp.Body)
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		line, err := reader.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		if strings.HasPrefix(line, "event: request") {
			return
		}
	}
	t.Fatal("event not streamed")
}

func TestEventsRequiresSession(t *testing.T) {
	srv := New(Deps{
		Store:        &fakeStore{},
		Limits:       &fakeLimits{},
		Lock:         &fakeLocker{ok: true},
		SessionStore: newFakeSessionStore(),
		Bus:          events.New(),
		Cfg:          config.Config{},
	})
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, httptest.NewRequest("GET", "/v1/events", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("code=%d", rec.Code)
	}
}

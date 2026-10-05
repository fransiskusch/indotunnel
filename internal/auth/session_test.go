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

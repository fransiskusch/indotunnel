package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"indotunnel/internal/store"
)

func TestGenerateAndVerify(t *testing.T) {
	p, prefix, hash := GenerateKey()
	if len(p) == 0 || prefix != p[:12] {
		t.Fatalf("prefix mismatch: p=%q prefix=%q", p, prefix)
	}
	if HashKey(p) != hash {
		t.Fatal("hash mismatch")
	}
	if HashKey("other") == hash {
		t.Fatal("collision")
	}
}

type fakeLookup struct {
	user store.User
	err  error
}

func (f fakeLookup) UserByAPIKey(ctx context.Context, prefix, hash string) (store.User, error) {
	return f.user, f.err
}

func TestMiddlewareRejectsMissing(t *testing.T) {
	h := BearerMiddleware(fakeLookup{})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler must not run")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != 401 {
		t.Fatalf("code=%d", rec.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if _, ok := body["error"]; !ok {
		t.Fatalf("missing error shape: %s", rec.Body.String())
	}
}

func TestMiddlewareInjectsUser(t *testing.T) {
	_, prefix, _ := GenerateKey()
	lookup := fakeLookup{user: store.User{Email: "dev@indotunnel.id"}}
	var got string
	h := BearerMiddleware(lookup)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := UserFrom(r.Context())
		if !ok {
			t.Fatal("no user in context")
		}
		got = u.Email
	}))
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+prefix+"suffix")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if got != "dev@indotunnel.id" {
		t.Fatalf("got %q", got)
	}
}

func TestMiddlewareRejectsUnknownKey(t *testing.T) {
	h := BearerMiddleware(fakeLookup{err: store.ErrNotFound})(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { t.Fatal("ran") }))
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer sk_live_abcdefghijkl")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 401 {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestMiddlewareRejectsBadLookupError(t *testing.T) {
	h := BearerMiddleware(fakeLookup{err: errors.New("boom")})(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { t.Fatal("ran") }))
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer sk_live_abcdefghijkl")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 503 {
		t.Fatalf("code=%d", rec.Code)
	}
}

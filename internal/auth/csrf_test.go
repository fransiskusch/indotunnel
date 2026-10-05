package auth

import (
	"net/http"
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

func TestCSRFMiddlewareRejectsMismatchedOrigin(t *testing.T) {
	var ran bool
	h := CSRFMiddleware("http://localhost:3000")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ran = true
	}))
	req := httptest.NewRequest("POST", "/v1/tunnels/t_1/stop", nil)
	req.Header.Set("Origin", "http://evil.example")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if ran {
		t.Fatal("handler ran despite mismatched Origin")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestCSRFMiddlewareAllowsMatchingOrigin(t *testing.T) {
	var ran bool
	h := CSRFMiddleware("http://localhost:3000")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ran = true
	}))
	req := httptest.NewRequest("POST", "/v1/tunnels/t_1/stop", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if !ran {
		t.Fatalf("handler did not run; code=%d", rec.Code)
	}
}

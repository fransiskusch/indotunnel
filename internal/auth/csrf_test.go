package auth

import (
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

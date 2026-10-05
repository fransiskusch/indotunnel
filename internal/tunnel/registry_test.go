package tunnel

import (
	"strings"
	"testing"
)

func TestRegistryRemoveOnlyMatchingConn(t *testing.T) {
	r := NewRegistry()
	s := &Session{ConnID: "c1", Subdomain: "abcde"}
	r.Register("abcde", s)
	r.Remove("abcde", "c2") // stale disconnect must not evict live session
	if _, ok := r.Lookup("abcde"); !ok {
		t.Fatal("live session evicted")
	}
	r.Remove("abcde", "c1")
	if _, ok := r.Lookup("abcde"); ok {
		t.Fatal("session not removed")
	}
}

func TestRegistryReplaceOnReconnect(t *testing.T) {
	r := NewRegistry()
	r.Register("abcde", &Session{ConnID: "c1", Subdomain: "abcde"})
	r.Register("abcde", &Session{ConnID: "c2", Subdomain: "abcde"})
	got, ok := r.Lookup("abcde")
	if !ok || got.ConnID != "c2" {
		t.Fatalf("got %+v ok=%v", got, ok)
	}
	// stale remove of c1 must not remove c2
	r.Remove("abcde", "c1")
	if _, ok := r.Lookup("abcde"); !ok {
		t.Fatal("c2 evicted by stale c1 remove")
	}
}

func TestReadHandshake(t *testing.T) {
	line := `{"tunnel_id":"t_1","api_key":"sk_live_x","client_version":"0.1.0","connection_id":"c1"}` + "\n"
	hs, err := ReadHandshake(strings.NewReader(line))
	if err != nil {
		t.Fatal(err)
	}
	if hs.TunnelID != "t_1" || hs.ConnectionID != "c1" {
		t.Fatalf("got %+v", hs)
	}
}

func TestReadHandshakeRejectsOversize(t *testing.T) {
	big := strings.Repeat("x", 5000) + "\n"
	if _, err := ReadHandshake(strings.NewReader(big)); err == nil {
		t.Fatal("expected oversize error")
	}
}

func TestReadHandshakeRejectsMissingFields(t *testing.T) {
	if _, err := ReadHandshake(strings.NewReader(`{"tunnel_id":"t_1"}` + "\n")); err == nil {
		t.Fatal("expected missing-field error")
	}
}

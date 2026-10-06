package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.EdgeAddr != ":8080" {
		t.Fatalf("EdgeAddr=%q", c.EdgeAddr)
	}
	if c.PublicHostSuffix != "indotunnel.localhost" {
		t.Fatalf("suffix=%q", c.PublicHostSuffix)
	}
	if c.MaxStreamsPerTunnel != 20 {
		t.Fatalf("max=%d", c.MaxStreamsPerTunnel)
	}
	if c.RequestLogRetentionDays != 7 {
		t.Fatalf("retention=%d", c.RequestLogRetentionDays)
	}
}

func TestLoadOverride(t *testing.T) {
	t.Setenv("EDGE_ADDR", ":9090")
	t.Setenv("MAX_STREAMS_PER_TUNNEL", "5")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.EdgeAddr != ":9090" {
		t.Fatalf("got %q", c.EdgeAddr)
	}
	if c.MaxStreamsPerTunnel != 5 {
		t.Fatalf("got %d", c.MaxStreamsPerTunnel)
	}
}

func TestLoadBadInt(t *testing.T) {
	t.Setenv("MAX_STREAMS_PER_TUNNEL", "notanumber")
	if _, err := Load(); err == nil {
		t.Fatal("expected error on bad int")
	}
}

// TestLoadPublicPortDefault asserts no public port is advertised by default,
// so production URLs are bare (https://sub.host) behind nginx on 443.
func TestLoadPublicPortDefault(t *testing.T) {
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.PublicPort != "" {
		t.Fatalf("PublicPort=%q, want empty", c.PublicPort)
	}
}

func TestLoadPublicPortOverride(t *testing.T) {
	t.Setenv("PUBLIC_PORT", "8080")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.PublicPort != "8080" {
		t.Fatalf("PublicPort=%q", c.PublicPort)
	}
}

// TestPublicURL covers the port-inclusion rule: omitted when PUBLIC_PORT is
// empty (production), appended when set (local dev edge on :8080).
func TestPublicURL(t *testing.T) {
	prod := Config{PublicScheme: "https", PublicHostSuffix: "indotunnel.my.id"}
	if got := prod.PublicURL("yhhi9"); got != "https://yhhi9.indotunnel.my.id" {
		t.Fatalf("without port: got %q", got)
	}

	local := Config{PublicScheme: "http", PublicHostSuffix: "indotunnel.localhost", PublicPort: "8080"}
	if got := local.PublicURL("a8f2x"); got != "http://a8f2x.indotunnel.localhost:8080" {
		t.Fatalf("with port: got %q", got)
	}
}

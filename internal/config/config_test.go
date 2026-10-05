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

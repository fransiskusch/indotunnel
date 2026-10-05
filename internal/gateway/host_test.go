package gateway

import "testing"

func TestSubdomain(t *testing.T) {
	cases := map[string]string{
		"a8f2x.indotunnel.localhost:8080": "a8f2x",
		"A8F2X.indotunnel.localhost":      "a8f2x",
		"a8f2x.indotunnel.localhost.":     "a8f2x",
		"a8f2x.INDOTUNNEL.LOCALHOST:80":   "a8f2x",
	}
	for in, want := range cases {
		got, ok := Subdomain(in, "indotunnel.localhost")
		if !ok || got != want {
			t.Fatalf("%q -> %q,%v", in, got, ok)
		}
	}
	for _, bad := range []string{
		"indotunnel.localhost",
		"indotunnel.localhost:8080",
		"other.example.com",
		"",
		".indotunnel.localhost",
	} {
		if _, ok := Subdomain(bad, "indotunnel.localhost"); ok {
			t.Fatalf("%q must not match", bad)
		}
	}
}

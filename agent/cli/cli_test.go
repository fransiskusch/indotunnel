package cli

import "testing"

func TestParseTarget(t *testing.T) {
	h, p, err := ParseTarget([]string{"3000"})
	if err != nil || h != "127.0.0.1" || p != 3000 {
		t.Fatalf("%q %d %v", h, p, err)
	}
	h, p, err = ParseTarget([]string{"localhost:8000"})
	if err != nil || h != "localhost" || p != 8000 {
		t.Fatal("explicit host")
	}
	h, p, err = ParseTarget([]string{"127.0.0.1:3000"})
	if err != nil || h != "127.0.0.1" || p != 3000 {
		t.Fatal("ipv4 explicit")
	}
	if _, _, err := ParseTarget([]string{"abc"}); err == nil {
		t.Fatal("bad port accepted")
	}
	if _, _, err := ParseTarget([]string{}); err == nil {
		t.Fatal("empty args accepted")
	}
	if _, _, err := ParseTarget([]string{"70000"}); err == nil {
		t.Fatal("out-of-range port accepted")
	}
}

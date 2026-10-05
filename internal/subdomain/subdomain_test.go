package subdomain

import "testing"

func TestGenerateShape(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 1000; i++ {
		s := Generate()
		if len(s) != 5 {
			t.Fatalf("len %q", s)
		}
		if s[0] < 'a' || s[0] > 'z' {
			t.Fatalf("first char %q", s)
		}
		for _, r := range s {
			if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') {
				t.Fatalf("bad char %q in %q", r, s)
			}
		}
		seen[s] = true
	}
	if len(seen) < 990 {
		t.Fatalf("too many collisions: %d", len(seen))
	}
}

func TestGenerateUniqueRetries(t *testing.T) {
	taken := map[string]bool{"aaaaa": true}
	s := GenerateUnique(func(x string) bool { return taken[x] })
	if s == "aaaaa" {
		t.Fatal("returned taken value")
	}
	if len(s) != 5 {
		t.Fatalf("len %q", s)
	}
}

func TestGenerateUniqueAlwaysTakenFallsBack(t *testing.T) {
	// When everything is "taken", must still return a non-empty candidate.
	s := GenerateUnique(func(x string) bool { return true })
	if s == "" {
		t.Fatal("empty fallback")
	}
}

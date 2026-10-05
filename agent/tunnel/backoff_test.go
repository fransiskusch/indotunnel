package tunnel

import (
	"testing"
	"time"
)

func TestBackoffCapAndGrowth(t *testing.T) {
	if Backoff(0) < 1*time.Second {
		t.Fatalf("attempt 0 too small: %v", Backoff(0))
	}
	if Backoff(10) > 31*time.Second {
		t.Fatalf("exceeds cap: %v", Backoff(10))
	}
	// monotonic-ish growth before cap (allowing jitter, compare mins)
	if Backoff(0) > Backoff(3) {
		t.Fatal("backoff should grow")
	}
}

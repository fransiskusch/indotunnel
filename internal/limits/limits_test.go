package limits

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newChecker(t *testing.T) *Checker {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(mr.Close)
	return New(redis.NewClient(&redis.Options{Addr: mr.Addr()}))
}

func TestDailyLimitBoundary(t *testing.T) {
	c := newChecker(t)
	ctx := context.Background()
	for i := 1; i <= 5000; i++ {
		ok, used, err := c.CheckAndIncrDaily(ctx, "u1", 5000)
		if err != nil || !ok {
			t.Fatalf("req %d: ok=%v used=%d err=%v", i, ok, used, err)
		}
	}
	ok, used, err := c.CheckAndIncrDaily(ctx, "u1", 5000)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("5001st must be blocked")
	}
	if used != 5001 {
		t.Fatalf("used=%d", used)
	}
}

func TestDailyLimitSeparateUsers(t *testing.T) {
	c := newChecker(t)
	ctx := context.Background()
	if _, _, err := c.CheckAndIncrDaily(ctx, "a", 1); err != nil {
		t.Fatal(err)
	}
	ok, _, err := c.CheckAndIncrDaily(ctx, "b", 1)
	if err != nil || !ok {
		t.Fatalf("other user blocked: ok=%v err=%v", ok, err)
	}
}

func TestJakartaMidnightTTL(t *testing.T) {
	// 2026-10-05T10:00:00Z == 17:00 Jakarta -> 7h to midnight
	got := SecondsUntilJakartaMidnight(time.Date(2026, 10, 5, 10, 0, 0, 0, time.UTC))
	if got != 7*3600 {
		t.Fatalf("got %d", got)
	}
}

func TestBandwidth(t *testing.T) {
	c := newChecker(t)
	ctx := context.Background()
	if err := c.AddBandwidth(ctx, "u1", 100); err != nil {
		t.Fatal(err)
	}
	if err := c.AddBandwidth(ctx, "u1", 50); err != nil {
		t.Fatal(err)
	}
	got, err := c.MonthBandwidth(ctx, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if got != 150 {
		t.Fatalf("got %d", got)
	}
}

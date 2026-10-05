package redisclient

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestLockMutualExclusion(t *testing.T) {
	mr, _ := miniredis.Run()
	defer mr.Close()
	l := NewLocker(redis.NewClient(&redis.Options{Addr: mr.Addr()}))
	ctx := context.Background()

	unlock1, ok, err := l.Lock(ctx, "k", time.Second)
	if err != nil || !ok {
		t.Fatalf("first lock: ok=%v err=%v", ok, err)
	}
	_, ok2, _ := l.Lock(ctx, "k", time.Second)
	if ok2 {
		t.Fatal("second lock must fail while held")
	}
	unlock1()
	_, ok3, err := l.Lock(ctx, "k", time.Second)
	if err != nil || !ok3 {
		t.Fatalf("after unlock: ok=%v err=%v", ok3, err)
	}
}

func TestLockDoesNotReleaseForeignLock(t *testing.T) {
	mr, _ := miniredis.Run()
	defer mr.Close()
	l := NewLocker(redis.NewClient(&redis.Options{Addr: mr.Addr()}))
	ctx := context.Background()
	_, _, _ = l.Lock(ctx, "k", time.Minute) // holder A
	unlockB, ok, _ := l.Lock(ctx, "k", time.Minute)
	if ok {
		t.Fatal("B should not acquire")
	}
	if unlockB != nil {
		t.Fatal("no unlock on failure")
	}
}

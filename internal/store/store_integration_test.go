//go:build integration

package store

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"indotunnel/internal/db"
)

func openTestStore(t *testing.T) *Store {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://indotunnel:indotunnel@localhost:55432/indotunnel?sslmode=disable"
	}
	ctx := context.Background()
	pool, err := db.Connect(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	migrations, _ := filepath.Abs("../../migrations")
	if err := db.Migrate(ctx, pool, migrations); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return New(pool)
}

func TestFreePlanSeeded(t *testing.T) {
	s := openTestStore(t)
	p, err := s.PlanByCode(context.Background(), "free")
	if err != nil {
		t.Fatal(err)
	}
	if p.DailyRequestLimit != 5000 {
		t.Fatalf("daily=%d", p.DailyRequestLimit)
	}
	if p.MaxActiveTunnels != 1 {
		t.Fatalf("max=%d", p.MaxActiveTunnels)
	}
	if p.MonthlyBandwidthLimitBytes != 10737418240 {
		t.Fatalf("bandwidth=%d", p.MonthlyBandwidthLimitBytes)
	}
}

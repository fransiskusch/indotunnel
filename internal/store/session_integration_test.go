//go:build integration

package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestSessionLifecycle(t *testing.T) {
	s := openTestStore(t)
	ctx := context.Background()
	plan, err := s.PlanByCode(ctx, "free")
	if err != nil {
		t.Fatal(err)
	}

	email := "sess+" + uuid.NewString() + "@indotunnel.id"
	u, err := s.CreateUserWithPassword(ctx, email, "S", "hash", plan.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateUserWithPassword(ctx, email, "S", "hash", plan.ID); err != ErrEmailTaken {
		t.Fatalf("dup email err=%v", err)
	}
	if got, err := s.UserByEmail(ctx, email); err != nil || got.ID != u.ID {
		t.Fatalf("UserByEmail: %v %+v", err, got)
	}

	tok := uuid.NewString()
	sess := Session{ID: uuid.New(), UserID: u.ID, TokenHash: tok, ExpiresAt: time.Now().Add(time.Hour)}
	if err := s.CreateUserSession(ctx, sess); err != nil {
		t.Fatal(err)
	}
	got, err := s.SessionByTokenHash(ctx, tok)
	if err != nil || got.UserID != u.ID {
		t.Fatalf("lookup: %v %+v", err, got)
	}
	if err := s.RevokeSession(ctx, tok); err != nil {
		t.Fatal(err)
	}
	if got, _ := s.SessionByTokenHash(ctx, tok); got.RevokedAt == nil {
		t.Fatal("revoked_at not set")
	}
}

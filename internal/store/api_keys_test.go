//go:build integration

package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func hashKey(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

func TestAPIKeysCRUD(t *testing.T) {
	ctx := context.Background()
	s := openTestStore(t)

	plan, err := s.PlanByCode(ctx, "free")
	if err != nil {
		t.Fatal(err)
	}

	email := "apikey-user-" + uuid.New().String()[:8] + "@example.com"
	user, err := s.CreateUserWithPassword(ctx, email, "Key User", "hash", plan.ID)
	if err != nil {
		t.Fatal(err)
	}

	rawKey, key, err := s.CreateAPIKey(ctx, user.ID, "Laptop Key")
	if err != nil {
		t.Fatalf("CreateAPIKey: %v", err)
	}
	if !strings.HasPrefix(rawKey, "sk_live_") {
		t.Fatalf("expected sk_live_ prefix, got %q", rawKey)
	}
	if key.Name != "Laptop Key" || key.Status != "active" {
		t.Fatalf("unexpected key state: %+v", key)
	}
	if key.KeyPrefix != rawKey[:12] {
		t.Fatalf("prefix mismatch: keyPrefix=%q rawKey=%q", key.KeyPrefix, rawKey[:12])
	}

	// Verify key authenticates user
	authU, err := s.UserByAPIKey(ctx, rawKey[:12], hashKey(rawKey))
	if err != nil {
		t.Fatalf("UserByAPIKey: %v", err)
	}
	if authU.ID != user.ID {
		t.Fatalf("expected user ID %v, got %v", user.ID, authU.ID)
	}

	// List keys
	keys, err := s.ListAPIKeys(ctx, user.ID)
	if err != nil {
		t.Fatalf("ListAPIKeys: %v", err)
	}
	if len(keys) != 1 || keys[0].ID != key.ID {
		t.Fatalf("expected 1 key with ID %v, got %+v", key.ID, keys)
	}

	// Revoke key
	if err := s.RevokeAPIKey(ctx, user.ID, key.ID); err != nil {
		t.Fatalf("RevokeAPIKey: %v", err)
	}

	// List keys after revoke
	keysAfter, err := s.ListAPIKeys(ctx, user.ID)
	if err != nil {
		t.Fatalf("ListAPIKeys after revoke: %v", err)
	}
	if len(keysAfter) != 1 || keysAfter[0].Status != "revoked" {
		t.Fatalf("expected revoked key, got %+v", keysAfter)
	}

	// Key should no longer authenticate
	_, err = s.UserByAPIKey(ctx, rawKey[:12], hashKey(rawKey))
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound for revoked key, got %v", err)
	}
}

package redisclient

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"indotunnel/internal/api"
	"indotunnel/internal/store"
)

func TestDeviceStoreLifecycle(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	ds := NewDeviceStore(rdb)
	ctx := context.Background()

	state := api.DeviceCodeState{
		DeviceCode: "dev-12345",
		UserCode:   "ABCD-1234",
		ClientName: "Test-CLI",
		Status:     "pending",
	}

	if err := ds.SaveDeviceCode(ctx, state, 10*time.Minute); err != nil {
		t.Fatalf("SaveDeviceCode: %v", err)
	}

	// Lookup by user code
	uState, err := ds.GetByUserCode(ctx, "ABCD-1234")
	if err != nil {
		t.Fatalf("GetByUserCode: %v", err)
	}
	if uState.DeviceCode != "dev-12345" || uState.Status != "pending" {
		t.Fatalf("unexpected state: %+v", uState)
	}

	// Lookup by device code
	dState, err := ds.GetByDeviceCode(ctx, "dev-12345")
	if err != nil {
		t.Fatalf("GetByDeviceCode: %v", err)
	}
	if dState.UserCode != "ABCD-1234" || dState.Status != "pending" {
		t.Fatalf("unexpected state: %+v", dState)
	}

	// Approve
	if err := ds.ApproveDeviceCode(ctx, "ABCD-1234", "sk_live_approved_key", 2*time.Minute); err != nil {
		t.Fatalf("ApproveDeviceCode: %v", err)
	}

	// User code should now be gone
	_, err = ds.GetByUserCode(ctx, "ABCD-1234")
	if err != store.ErrNotFound {
		t.Fatalf("expected ErrNotFound for consumed user code, got %v", err)
	}

	// Device code should now be approved
	approved, err := ds.GetByDeviceCode(ctx, "dev-12345")
	if err != nil {
		t.Fatalf("GetByDeviceCode after approve: %v", err)
	}
	if approved.Status != "approved" || approved.APIKey != "sk_live_approved_key" {
		t.Fatalf("unexpected approved state: %+v", approved)
	}

	// Consume device code
	if err := ds.ConsumeDeviceCode(ctx, "dev-12345"); err != nil {
		t.Fatalf("ConsumeDeviceCode: %v", err)
	}

	_, err = ds.GetByDeviceCode(ctx, "dev-12345")
	if err != store.ErrNotFound {
		t.Fatalf("expected ErrNotFound after consume, got %v", err)
	}
}

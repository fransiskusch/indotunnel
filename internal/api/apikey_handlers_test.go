package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/events"
	"indotunnel/internal/store"
)

type fakeKeyStore struct {
	*fakeStore
	keys   map[uuid.UUID][]store.APIKey
	rawGen string
}

func (f *fakeKeyStore) CreateAPIKey(ctx context.Context, userID uuid.UUID, name string) (string, store.APIKey, error) {
	k := store.APIKey{
		ID:        uuid.New(),
		UserID:    userID,
		Name:      name,
		KeyPrefix: "sk_live_test",
		Status:    "active",
		CreatedAt: time.Now(),
	}
	f.keys[userID] = append(f.keys[userID], k)
	raw := f.rawGen
	if raw == "" {
		raw = "sk_live_test1234567890abcdef"
	}
	return raw, k, nil
}

func (f *fakeKeyStore) ListAPIKeys(ctx context.Context, userID uuid.UUID) ([]store.APIKey, error) {
	return f.keys[userID], nil
}

func (f *fakeKeyStore) RevokeAPIKey(ctx context.Context, userID, keyID uuid.UUID) error {
	userKeys, ok := f.keys[userID]
	if !ok {
		return store.ErrNotFound
	}
	found := false
	for i, k := range userKeys {
		if k.ID == keyID {
			userKeys[i].Status = "revoked"
			found = true
			break
		}
	}
	if !found {
		return store.ErrNotFound
	}
	f.keys[userID] = userKeys
	return nil
}

func newAPIKeyTestServer(ks *fakeKeyStore, ss *fakeSessionStore) *Server {
	return New(Deps{
		Store:        ks,
		Limits:       &fakeLimits{},
		Lock:         &fakeLocker{ok: true},
		SessionStore: ss,
		Bus:          events.New(),
		Cfg: config.Config{
			EdgeAddr:        ":8080",
			PublicScheme:    "http",
			DashboardOrigin: "http://localhost:3000",
		},
	})
}

func TestAPIKeyHandlers(t *testing.T) {
	u := testUser()
	raw, hash := auth.NewSessionToken()
	ss := newFakeSessionStore()
	ss.sessions[hash] = store.Session{
		ID:        uuid.New(),
		UserID:    u.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(time.Hour),
	}
	ss.users[u.Email] = u

	ks := &fakeKeyStore{
		fakeStore: &fakeStore{},
		keys:      make(map[uuid.UUID][]store.APIKey),
	}
	srv := newAPIKeyTestServer(ks, ss)

	t.Run("list empty", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/api-keys", nil)
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}
		var res struct {
			APIKeys []store.APIKey `json:"api_keys"`
		}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatal(err)
		}
		if len(res.APIKeys) != 0 {
			t.Fatalf("expected 0 keys, got %d", len(res.APIKeys))
		}
	})

	var createdID uuid.UUID
	t.Run("create key", func(t *testing.T) {
		body := bytes.NewBufferString(`{"name": "CLI Work"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/api-keys", body)
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
		}
		var res struct {
			ID        uuid.UUID `json:"id"`
			Name      string    `json:"name"`
			KeyPrefix string    `json:"key_prefix"`
			Key       string    `json:"key"`
		}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatal(err)
		}
		if res.Name != "CLI Work" || res.Key == "" {
			t.Fatalf("invalid create response: %+v", res)
		}
		createdID = res.ID
	})

	t.Run("list after create", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/api-keys", nil)
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		var res struct {
			APIKeys []store.APIKey `json:"api_keys"`
		}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatal(err)
		}
		if len(res.APIKeys) != 1 || res.APIKeys[0].ID != createdID {
			t.Fatalf("expected 1 key with id %v, got %+v", createdID, res.APIKeys)
		}
	})

	t.Run("revoke key", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/v1/api-keys/"+createdID.String(), nil)
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected 204, got %d: %s", rec.Code, rec.Body.String())
		}
	})
}

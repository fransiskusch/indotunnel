package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/events"
	"indotunnel/internal/store"
)

type fakeDeviceStore struct {
	mu    sync.Mutex
	users map[string]DeviceCodeState
	devs  map[string]DeviceCodeState
}

func newFakeDeviceStore() *fakeDeviceStore {
	return &fakeDeviceStore{
		users: make(map[string]DeviceCodeState),
		devs:  make(map[string]DeviceCodeState),
	}
}

func (f *fakeDeviceStore) SaveDeviceCode(ctx context.Context, state DeviceCodeState, ttl time.Duration) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.users[state.UserCode] = state
	f.devs[state.DeviceCode] = state
	return nil
}

func (f *fakeDeviceStore) GetByUserCode(ctx context.Context, userCode string) (DeviceCodeState, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.users[userCode]
	if !ok {
		return DeviceCodeState{}, store.ErrNotFound
	}
	return s, nil
}

func (f *fakeDeviceStore) ApproveDeviceCode(ctx context.Context, userCode, apiKey string, ttl time.Duration) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.users[userCode]
	if !ok {
		return store.ErrNotFound
	}
	delete(f.users, userCode)
	s.Status = "approved"
	s.APIKey = apiKey
	f.devs[s.DeviceCode] = s
	return nil
}

func (f *fakeDeviceStore) GetByDeviceCode(ctx context.Context, deviceCode string) (DeviceCodeState, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.devs[deviceCode]
	if !ok {
		return DeviceCodeState{}, store.ErrNotFound
	}
	return s, nil
}

func (f *fakeDeviceStore) ConsumeDeviceCode(ctx context.Context, deviceCode string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.devs, deviceCode)
	return nil
}

func newDeviceAuthTestServer(ks *fakeKeyStore, ss *fakeSessionStore, ds *fakeDeviceStore) *Server {
	return New(Deps{
		Store:        ks,
		Limits:       &fakeLimits{},
		Lock:         &fakeLocker{ok: true},
		SessionStore: ss,
		Bus:          events.New(),
		DeviceAuth:   ds,
		Cfg: config.Config{
			EdgeAddr:        ":8080",
			PublicScheme:    "http",
			DashboardOrigin: "http://localhost:3000",
		},
	})
}

func TestDeviceAuthFlow(t *testing.T) {
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
		rawGen:    "sk_live_device_auth_token_12345",
	}
	ds := newFakeDeviceStore()
	srv := newDeviceAuthTestServer(ks, ss, ds)

	// Step 1: Request device code
	var devCode, userCode string
	{
		reqBody := bytes.NewBufferString(`{"client_name": "Frans-MacBook"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/device/code", reqBody)
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("code request failed: %d: %s", rec.Code, rec.Body.String())
		}
		var res struct {
			DeviceCode string `json:"device_code"`
			UserCode   string `json:"user_code"`
			VerifyURI  string `json:"verification_uri"`
			ExpiresIn  int    `json:"expires_in"`
			Interval   int    `json:"interval"`
		}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatal(err)
		}
		if res.DeviceCode == "" || res.UserCode == "" {
			t.Fatalf("unexpected code response: %+v", res)
		}
		devCode = res.DeviceCode
		userCode = res.UserCode
	}

	// Step 2: Poll token while pending
	{
		pollBody := bytes.NewBufferString(`{"device_code": "` + devCode + `"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/device/token", pollBody)
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("poll failed: %d", rec.Code)
		}
		var res struct {
			Status string `json:"status"`
			APIKey string `json:"api_key"`
		}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatal(err)
		}
		if res.Status != "pending" || res.APIKey != "" {
			t.Fatalf("expected pending status, got: %+v", res)
		}
	}

	// Step 3: Approve user code in Dashboard (session-authenticated)
	{
		verifyBody := bytes.NewBufferString(`{"user_code": "` + userCode + `"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/device/verify", verifyBody)
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("verify failed: %d: %s", rec.Code, rec.Body.String())
		}
		var res struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatal(err)
		}
		if res.Status != "approved" {
			t.Fatalf("expected approved status, got: %+v", res)
		}
	}

	// Step 4: Double verification should fail (404/400)
	{
		verifyBody := bytes.NewBufferString(`{"user_code": "` + userCode + `"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/device/verify", verifyBody)
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: raw})
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for double verify, got %d: %s", rec.Code, rec.Body.String())
		}
	}

	// Step 5: Poll token after approval - should return API key and status approved
	{
		pollBody := bytes.NewBufferString(`{"device_code": "` + devCode + `"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/device/token", pollBody)
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("poll after approve failed: %d: %s", rec.Code, rec.Body.String())
		}
		var res struct {
			Status string `json:"status"`
			APIKey string `json:"api_key"`
		}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatal(err)
		}
		if res.Status != "approved" || res.APIKey != "sk_live_device_auth_token_12345" {
			t.Fatalf("expected approved with api_key, got: %+v", res)
		}
	}

	// Step 6: Subsequent poll should be expired / consumed (400)
	{
		pollBody := bytes.NewBufferString(`{"device_code": "` + devCode + `"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/device/token", pollBody)
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for consumed device token, got %d", rec.Code)
		}
	}
}

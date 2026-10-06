package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"indotunnel/agent/cfg"
)

func TestPerformDeviceLogin(t *testing.T) {
	t.Setenv("APPDATA", t.TempDir())
	t.Setenv("HOME", t.TempDir())

	var pollCount int32
	var openedURL string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/auth/device/code":
			json.NewEncoder(w).Encode(map[string]any{
				"device_code":               "d-123",
				"user_code":                 "TEST-1234",
				"verification_uri":          "http://localhost:3000/activate",
				"verification_uri_complete": "http://localhost:3000/activate?code=TEST-1234",
				"expires_in":                60,
				"interval":                  1,
			})
		case "/v1/auth/device/token":
			c := atomic.AddInt32(&pollCount, 1)
			if c == 1 {
				json.NewEncoder(w).Encode(map[string]any{
					"status": "pending",
				})
				return
			}
			json.NewEncoder(w).Encode(map[string]any{
				"status":  "approved",
				"api_key": "sk_live_agent_test_key_123456",
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	var buf bytes.Buffer
	fakeOpener := func(u string) error {
		openedURL = u
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := performDeviceLogin(ctx, srv.URL, "test-host", fakeOpener, &buf)
	if err != nil {
		t.Fatalf("performDeviceLogin failed: %v", err)
	}

	if openedURL != "http://localhost:3000/activate?code=TEST-1234" {
		t.Fatalf("unexpected opened url: %q", openedURL)
	}

	out := buf.String()
	if !strings.Contains(out, "TEST-1234") {
		t.Fatalf("output missing confirmation code: %s", out)
	}

	cred, err := cfg.Load()
	if err != nil {
		t.Fatalf("cfg.Load failed: %v", err)
	}
	if cred.Token != "sk_live_agent_test_key_123456" {
		t.Fatalf("unexpected saved token: %q", cred.Token)
	}
}

func TestPerformDeviceLoginExpired(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/auth/device/code":
			json.NewEncoder(w).Encode(map[string]any{
				"device_code":               "d-expired",
				"user_code":                 "EXPI-9999",
				"verification_uri":          "http://localhost:3000/activate",
				"verification_uri_complete": "http://localhost:3000/activate?code=EXPI-9999",
				"expires_in":                60,
				"interval":                  1,
			})
		case "/v1/auth/device/token":
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]any{
				"error": map[string]string{
					"code":    "EXPIRED_TOKEN",
					"message": "expired",
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	var buf bytes.Buffer
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := performDeviceLogin(ctx, srv.URL, "test-host", nil, &buf)
	if err == nil || !strings.Contains(err.Error(), "expired") {
		t.Fatalf("expected expired error, got: %v", err)
	}
}

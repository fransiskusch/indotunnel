package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"indotunnel/internal/auth"
	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
)

type deviceCodeReq struct {
	ClientName string `json:"client_name"`
}

type deviceVerifyReq struct {
	UserCode string `json:"user_code"`
}

type deviceTokenReq struct {
	DeviceCode string `json:"device_code"`
}

const (
	deviceCodeTTL    = 10 * time.Minute
	approvedCodeTTL  = 2 * time.Minute
	userCodeAlphabet = "23456789BCDFGHJKMNPQRSTVWXYZ"
)

func generateUserCode() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		panic("device: crypto/rand failed: " + err.Error())
	}
	out := make([]byte, 8)
	for i := 0; i < 8; i++ {
		out[i] = userCodeAlphabet[int(b[i])%len(userCodeAlphabet)]
	}
	return string(out[:4]) + "-" + string(out[4:])
}

func generateDeviceCode() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic("device: crypto/rand failed: " + err.Error())
	}
	return hex.EncodeToString(b)
}

func (s *Server) handleDeviceCode(w http.ResponseWriter, r *http.Request) {
	if s.deps.DeviceAuth == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Device authentication not configured.")
		return
	}
	var req deviceCodeReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil && err.Error() != "EOF" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body.")
		return
	}
	clientName := strings.TrimSpace(req.ClientName)
	if clientName == "" {
		clientName = "CLI"
	}

	devCode := generateDeviceCode()
	userCode := generateUserCode()

	state := DeviceCodeState{
		DeviceCode: devCode,
		UserCode:   userCode,
		ClientName: clientName,
		Status:     "pending",
	}

	if err := s.deps.DeviceAuth.SaveDeviceCode(r.Context(), state, deviceCodeTTL); err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not start device authentication.")
		return
	}

	origin := s.deps.Cfg.DashboardOrigin
	if origin == "" {
		origin = "http://localhost:3000"
	}
	verifyURI := strings.TrimRight(origin, "/") + "/activate"
	verifyURIComplete := verifyURI + "?code=" + userCode

	writeJSON(w, http.StatusOK, map[string]any{
		"device_code":               devCode,
		"user_code":                 userCode,
		"verification_uri":          verifyURI,
		"verification_uri_complete": verifyURIComplete,
		"expires_in":                int(deviceCodeTTL.Seconds()),
		"interval":                  2,
	})
}

func (s *Server) handleDeviceVerify(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFrom(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Not signed in.")
		return
	}
	if s.deps.DeviceAuth == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Device authentication not configured.")
		return
	}
	var req deviceVerifyReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body.")
		return
	}
	userCode := strings.ToUpper(strings.TrimSpace(req.UserCode))
	if userCode == "" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_CODE", "User code is required.")
		return
	}

	state, err := s.deps.DeviceAuth.GetByUserCode(r.Context(), userCode)
	if err != nil {
		if err == store.ErrNotFound {
			httpx.WriteError(w, http.StatusNotFound, "NOT_FOUND", "Code expired or not found.")
			return
		}
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not verify device code.")
		return
	}

	keyName := "CLI (" + state.ClientName + ")"
	rawKey, _, err := s.deps.Store.CreateAPIKey(r.Context(), user.ID, keyName)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not create API key for device.")
		return
	}

	if err := s.deps.DeviceAuth.ApproveDeviceCode(r.Context(), userCode, rawKey, approvedCodeTTL); err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not approve device code.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"status": "approved"})
}

func (s *Server) handleDeviceToken(w http.ResponseWriter, r *http.Request) {
	if s.deps.DeviceAuth == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Device authentication not configured.")
		return
	}
	var req deviceTokenReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body.")
		return
	}
	devCode := strings.TrimSpace(req.DeviceCode)
	if devCode == "" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Device code is required.")
		return
	}

	state, err := s.deps.DeviceAuth.GetByDeviceCode(r.Context(), devCode)
	if err != nil {
		if err == store.ErrNotFound {
			httpx.WriteError(w, http.StatusBadRequest, "EXPIRED_TOKEN", "Device authorization expired or not found.")
			return
		}
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not check device token.")
		return
	}

	if state.Status == "approved" {
		_ = s.deps.DeviceAuth.ConsumeDeviceCode(r.Context(), devCode)
		writeJSON(w, http.StatusOK, map[string]any{
			"status":  "approved",
			"api_key": state.APIKey,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "pending",
	})
}

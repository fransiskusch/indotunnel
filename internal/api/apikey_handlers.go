package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
)

type createAPIKeyReq struct {
	Name string `json:"name"`
}

func (s *Server) handleListAPIKeys(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFrom(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Not signed in.")
		return
	}
	keys, err := s.deps.Store.ListAPIKeys(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not load API keys.")
		return
	}
	if keys == nil {
		keys = []store.APIKey{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"api_keys": keys})
}

func (s *Server) handleCreateAPIKey(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFrom(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Not signed in.")
		return
	}
	var req createAPIKeyReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body.")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		req.Name = "Default Key"
	}
	rawKey, key, err := s.deps.Store.CreateAPIKey(r.Context(), user.ID, req.Name)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not create API key.")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":         key.ID,
		"name":       key.Name,
		"key_prefix": key.KeyPrefix,
		"key":        rawKey,
		"created_at": key.CreatedAt,
	})
}

func (s *Server) handleRevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFrom(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Not signed in.")
		return
	}
	rawID := r.PathValue("id")
	keyID, err := uuid.Parse(rawID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_ID", "Malformed key id.")
		return
	}
	if err := s.deps.Store.RevokeAPIKey(r.Context(), user.ID, keyID); err != nil {
		if err == store.ErrNotFound {
			httpx.WriteError(w, http.StatusNotFound, "NOT_FOUND", "API key not found.")
			return
		}
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not revoke API key.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

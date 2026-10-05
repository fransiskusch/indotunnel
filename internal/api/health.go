package api

import (
	"errors"
	"net/http"

	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
)

// handleHealthz is a liveness probe.
func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleReadyz reports readiness. It uses the store's key lookup as a
// lightweight database probe; Redis readiness is checked by the server wiring.
func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	_, err := s.deps.Store.UserByAPIKey(r.Context(), "____", "____")
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		httpx.WriteError(w, http.StatusServiceUnavailable, "NOT_READY", "Dependencies unavailable.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

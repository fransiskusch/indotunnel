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

// handleReadyz reports readiness. It probes the database and every configured
// dependency (Redis) and fails if any is unavailable.
func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	_, err := s.deps.Store.UserByAPIKey(r.Context(), "____", "____")
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		httpx.WriteError(w, http.StatusServiceUnavailable, "NOT_READY", "Database unavailable.")
		return
	}
	for _, p := range s.deps.Ready {
		if err := p.Ping(r.Context()); err != nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "NOT_READY", "Dependency unavailable.")
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

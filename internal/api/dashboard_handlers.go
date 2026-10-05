package api

import (
	"net/http"
	"strconv"

	"indotunnel/internal/auth"
	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
)

// handleListTunnels returns the authenticated user's tunnels.
func (s *Server) handleListTunnels(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	tunnels, err := s.deps.Store.TunnelsByUser(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Lookup failed.")
		return
	}
	out := make([]map[string]any, 0, len(tunnels))
	for _, t := range tunnels {
		out = append(out, tunnelJSON(t, s.publicURL(t.Subdomain)))
	}
	writeJSON(w, http.StatusOK, map[string]any{"tunnels": out})
}

func tunnelJSON(t store.Tunnel, publicURL string) map[string]any {
	return map[string]any{
		"tunnel_id":  t.TunnelID,
		"subdomain":  t.Subdomain,
		"public_url": publicURL,
		"status":     t.Status,
		"local_host": t.LocalHost,
		"local_port": t.LocalPort,
		"protocol":   t.Protocol,
		"created_at": t.CreatedAt,
	}
}

// handleUsageHistory returns per-day aggregates, oldest first.
func (s *Server) handleUsageHistory(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days < 1 || days > 30 {
		days = 7
	}
	history, err := s.deps.Store.UsageHistory(r.Context(), user.ID, days)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Lookup failed.")
		return
	}
	out := make([]map[string]any, 0, len(history))
	for _, d := range history {
		out = append(out, map[string]any{
			"date":          d.Date,
			"request_count": d.RequestCount,
			"bytes_in":      d.BytesIn,
			"bytes_out":     d.BytesOut,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"days": out})
}

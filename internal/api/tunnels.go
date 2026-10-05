package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
	"indotunnel/internal/subdomain"
)

var loopbackHosts = map[string]bool{
	"127.0.0.1": true,
	"localhost": true,
	"::1":       true,
}

// validateTarget enforces the loopback-only origin rule so the agent cannot
// become an open proxy (spec §7).
func validateTarget(host string, port int) error {
	if !loopbackHosts[host] {
		return fmt.Errorf("local_host must be a loopback address")
	}
	if port < 1 || port > 65535 {
		return fmt.Errorf("local_port out of range")
	}
	return nil
}

type createTunnelReq struct {
	LocalHost string `json:"local_host"`
	LocalPort int    `json:"local_port"`
	Protocol  string `json:"protocol"`
}

type createTunnelResp struct {
	TunnelID  string `json:"tunnel_id"`
	Subdomain string `json:"subdomain"`
	PublicURL string `json:"public_url"`
	Status    string `json:"status"`
}

func (s *Server) handleCreateTunnel(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFrom(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Missing user.")
		return
	}
	var req createTunnelReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body.")
		return
	}
	if req.LocalHost == "" {
		req.LocalHost = "127.0.0.1"
	}
	if req.Protocol == "" {
		req.Protocol = "http"
	}
	if err := validateTarget(req.LocalHost, req.LocalPort); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_TARGET", err.Error())
		return
	}

	lockKey := "indotunnel:lock:user:" + user.ID.String() + ":active_tunnel"
	unlock, ok, err := s.deps.Lock.Lock(r.Context(), lockKey, 5*time.Second)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "LOCK_UNAVAILABLE", "Could not acquire tunnel lock.")
		return
	}
	if !ok {
		httpx.WriteError(w, http.StatusConflict, "TUNNEL_LOCK_BUSY", "Another tunnel request is in progress.")
		return
	}
	defer unlock()

	active, err := s.deps.Store.CountActiveTunnels(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not count tunnels.")
		return
	}
	if active >= user.Plan.MaxActiveTunnels {
		httpx.WriteError(w, http.StatusConflict, "ACTIVE_TUNNEL_LIMIT_REACHED", "Free plan allows one active tunnel.")
		return
	}

	sub := subdomain.GenerateUnique(func(cand string) bool {
		exists, err := s.deps.Store.SubdomainExists(r.Context(), cand)
		return err != nil || exists
	})

	tunnelID := "t_" + strings.ToUpper(uuid.NewString()[:6])
	t := store.Tunnel{
		ID:        uuid.New(),
		UserID:    user.ID,
		TunnelID:  tunnelID,
		Subdomain: sub,
		LocalHost: req.LocalHost,
		LocalPort: req.LocalPort,
		Protocol:  req.Protocol,
		Status:    "pending",
	}
	if err := s.deps.Store.CreateTunnel(r.Context(), t); err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not create tunnel.")
		return
	}

	writeJSON(w, http.StatusCreated, createTunnelResp{
		TunnelID:  tunnelID,
		Subdomain: sub,
		PublicURL: s.publicURL(sub),
		Status:    "pending",
	})
}

func (s *Server) publicURL(sub string) string {
	scheme := s.deps.Cfg.PublicScheme
	host := sub + "." + s.deps.Cfg.PublicHostSuffix
	if port := portOf(s.deps.Cfg.EdgeAddr); port != "" && port != "80" && port != "443" {
		return scheme + "://" + host + ":" + port
	}
	return scheme + "://" + host
}

func portOf(addr string) string {
	_, port, err := net.SplitHostPort(addr)
	if err != nil {
		return ""
	}
	return port
}

func (s *Server) handleGetTunnel(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	id := r.PathValue("tunnel_id")
	t, err := s.deps.Store.TunnelByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpx.WriteError(w, http.StatusNotFound, "TUNNEL_NOT_FOUND", "Tunnel not found.")
			return
		}
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Lookup failed.")
		return
	}
	if t.UserID != user.ID {
		httpx.WriteError(w, http.StatusNotFound, "TUNNEL_NOT_FOUND", "Tunnel not found.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"tunnel_id":  t.TunnelID,
		"subdomain":  t.Subdomain,
		"public_url": s.publicURL(t.Subdomain),
		"status":     t.Status,
		"local_host": t.LocalHost,
		"local_port": t.LocalPort,
		"protocol":   t.Protocol,
	})
}

func (s *Server) handleStopTunnel(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	id := r.PathValue("tunnel_id")
	t, err := s.deps.Store.TunnelByID(r.Context(), id)
	if err != nil || t.UserID != user.ID {
		httpx.WriteError(w, http.StatusNotFound, "TUNNEL_NOT_FOUND", "Tunnel not found.")
		return
	}
	if err := s.deps.Store.SetTunnelStatus(r.Context(), id, "offline"); err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Stop failed.")
		return
	}
	if s.deps.Registry != nil {
		s.deps.Registry.Remove(t.Subdomain, "")
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "offline"})
}

func (s *Server) handleListRequests(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	id := r.PathValue("tunnel_id")
	t, err := s.deps.Store.TunnelByID(r.Context(), id)
	if err != nil || t.UserID != user.ID {
		httpx.WriteError(w, http.StatusNotFound, "TUNNEL_NOT_FOUND", "Tunnel not found.")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	logs, err := s.deps.Store.RequestsByTunnel(r.Context(), t.ID, limit)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Lookup failed.")
		return
	}
	out := make([]map[string]any, 0, len(logs))
	for _, l := range logs {
		out = append(out, requestJSON(l))
	}
	writeJSON(w, http.StatusOK, map[string]any{"requests": out})
}

func (s *Server) handleGetRequest(w http.ResponseWriter, r *http.Request) {
	_, _ = auth.UserFrom(r.Context())
	log, err := s.deps.Store.RequestByID(r.Context(), r.PathValue("request_id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "REQUEST_NOT_FOUND", "Request not found.")
		return
	}
	writeJSON(w, http.StatusOK, requestJSON(log))
}

func requestJSON(l store.RequestLog) map[string]any {
	return map[string]any{
		"request_id":     l.RequestID,
		"method":         l.Method,
		"path":           l.Path,
		"host":           l.Host,
		"status_code":    l.StatusCode,
		"request_bytes":  l.RequestBytes,
		"response_bytes": l.ResponseBytes,
		"duration_ms":    l.DurationMS,
		"started_at":     l.StartedAt,
	}
}

func (s *Server) handleUsageToday(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	_, used, err := s.deps.Limits.CheckAndIncrDaily(r.Context(), user.ID.String(), 1<<62)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "REDIS_UNAVAILABLE", "Usage lookup failed.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"requests": user.Plan.DailyRequestLimit,
		"used":     used,
		"limit":    user.Plan.DailyRequestLimit,
	})
}

func (s *Server) handleUsageMonth(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	bytes, err := s.deps.Limits.MonthBandwidth(r.Context(), user.ID.String())
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "REDIS_UNAVAILABLE", "Usage lookup failed.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"bytes": bytes,
		"limit": user.Plan.MonthlyBandwidthLimitBytes,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

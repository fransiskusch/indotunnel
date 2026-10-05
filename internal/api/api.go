package api

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/store"
	"indotunnel/internal/tunnel"
)

// Store is the persistence surface the API needs.
type Store interface {
	UserByAPIKey(ctx context.Context, prefix, hash string) (store.User, error)
	CountActiveTunnels(ctx context.Context, userID uuid.UUID) (int, error)
	SubdomainExists(ctx context.Context, sub string) (bool, error)
	CreateTunnel(ctx context.Context, t store.Tunnel) error
	TunnelByID(ctx context.Context, tunnelID string) (store.Tunnel, error)
	SetTunnelStatus(ctx context.Context, tunnelID, status string) error
	RequestsByTunnel(ctx context.Context, tunnelID uuid.UUID, limit int) ([]store.RequestLog, error)
	RequestByID(ctx context.Context, requestID string) (store.RequestLog, error)
}

// Limiter is the quota surface the API needs.
type Limiter interface {
	CheckAndIncrDaily(ctx context.Context, userID string, limit int64) (bool, int64, error)
	DailyUsed(ctx context.Context, userID string) (int64, error)
	MonthBandwidth(ctx context.Context, userID string) (int64, error)
	AddBandwidth(ctx context.Context, userID string, bytes int64) error
}

// Locker is a short-lived mutual-exclusion lock.
type Locker interface {
	Lock(ctx context.Context, key string, ttl time.Duration) (func(), bool, error)
}

// Pinger is a liveness probe for an external dependency.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Deps are the dependencies of the control API.
type Deps struct {
	Store    Store
	Limits   Limiter
	Lock     Locker
	Registry *tunnel.Registry
	Cfg      config.Config
	Ready    []Pinger
}

// Server hosts the control-plane HTTP routes.
type Server struct {
	deps Deps
	mux  *http.ServeMux
}

// New builds the control API server and its routes.
func New(deps Deps) *Server {
	s := &Server{deps: deps, mux: http.NewServeMux()}
	s.routes()
	return s
}

// Handler returns the fully-wired HTTP handler. /healthz and /readyz are
// public; every other route requires a bearer API key.
func (s *Server) Handler() http.Handler {
	authed := auth.BearerMiddleware(s.deps.Store)(s.mux)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || r.URL.Path == "/readyz" {
			s.mux.ServeHTTP(w, r)
			return
		}
		authed.ServeHTTP(w, r)
	})
}

// routes registers every control-plane endpoint on the internal mux.
func (s *Server) routes() {
	s.mux.HandleFunc("GET /healthz", s.handleHealthz)
	s.mux.HandleFunc("GET /readyz", s.handleReadyz)
	s.mux.HandleFunc("POST /v1/tunnels", s.handleCreateTunnel)
	s.mux.HandleFunc("GET /v1/tunnels/{tunnel_id}", s.handleGetTunnel)
	s.mux.HandleFunc("POST /v1/tunnels/{tunnel_id}/stop", s.handleStopTunnel)
	s.mux.HandleFunc("GET /v1/tunnels/{tunnel_id}/requests", s.handleListRequests)
	s.mux.HandleFunc("GET /v1/tunnels/{tunnel_id}/requests/{request_id}", s.handleGetRequest)
	s.mux.HandleFunc("GET /v1/usage/today", s.handleUsageToday)
	s.mux.HandleFunc("GET /v1/usage/month", s.handleUsageMonth)
}

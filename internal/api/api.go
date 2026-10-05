package api

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/events"
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

// SessionStore is the persistence surface for dashboard auth.
type SessionStore interface {
	CreateUserWithPassword(ctx context.Context, email, name, passwordHash string, planID uuid.UUID) (store.User, error)
	UserByEmail(ctx context.Context, email string) (store.User, error)
	CreateUserSession(ctx context.Context, s store.Session) error
	SessionByTokenHash(ctx context.Context, tokenHash string) (store.Session, error)
	RevokeSession(ctx context.Context, tokenHash string) error
	PlanByCode(ctx context.Context, code string) (store.Plan, error)
	UserByID(ctx context.Context, id uuid.UUID) (store.User, error)
}

// RateLimiter counts attempts against a key for a window.
type RateLimiter interface {
	Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error)
}

// Pinger is a liveness probe for an external dependency.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Deps are the dependencies of the control API.
type Deps struct {
	Store        Store
	Limits       Limiter
	Lock         Locker
	Registry     *tunnel.Registry
	Cfg          config.Config
	Ready        []Pinger
	SessionStore SessionStore
	RateLimiter  RateLimiter
	Bus          events.Bus
}

// Server hosts the control-plane HTTP routes.
type Server struct {
	deps       Deps
	mux        *http.ServeMux
	sessionMux *http.ServeMux
}

// New builds the control API server and its routes.
func New(deps Deps) *Server {
	s := &Server{deps: deps, mux: http.NewServeMux(), sessionMux: http.NewServeMux()}
	s.routes()
	s.sessionRoutes()
	return s
}

// Handler returns the fully-wired HTTP handler. /healthz, /readyz, signup and
// login are public; session routes require a cookie; every other route
// requires a bearer API key.
func (s *Server) Handler() http.Handler {
	authed := auth.BearerMiddleware(s.deps.Store)(s.mux)
	session := s.sessionHandler()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/healthz", "/readyz", "/v1/auth/signup", "/v1/auth/login":
			s.mux.ServeHTTP(w, r)
			return
		case "/v1/auth/logout", "/v1/auth/me", "/v1/events":
			session.ServeHTTP(w, r)
			return
		}
		authed.ServeHTTP(w, r)
	})
}

// sessionHandler wraps the cookie-authenticated routes with SessionMiddleware.
func (s *Server) sessionHandler() http.Handler {
	return auth.SessionMiddleware(s.deps.SessionStore, auth.CookieName)(s.sessionMux)
}

// sessionRoutes registers cookie-authenticated endpoints.
func (s *Server) sessionRoutes() {
	s.sessionMux.HandleFunc("POST /v1/auth/logout", s.handleLogout)
	s.sessionMux.HandleFunc("GET /v1/auth/me", s.handleMe)
	s.sessionMux.HandleFunc("GET /v1/events", s.handleEvents)
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
	s.mux.HandleFunc("POST /v1/auth/signup", s.handleSignup)
	s.mux.HandleFunc("POST /v1/auth/login", s.handleLogin)
}

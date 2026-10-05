package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
)

type authReqBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleSignup(w http.ResponseWriter, r *http.Request) {
	if !auth.CheckOrigin(r, s.deps.Cfg.DashboardOrigin) {
		httpx.WriteError(w, http.StatusForbidden, "CSRF_ORIGIN_MISMATCH", "Origin not allowed.")
		return
	}
	var req authReqBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body.")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if !strings.Contains(req.Email, "@") {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_EMAIL", "Enter a valid email address.")
		return
	}
	if err := auth.ValidatePassword(req.Password); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_PASSWORD", "Password must be at least 8 characters.")
		return
	}
	hash, err := auth.HashPassword(req.Password, s.deps.Cfg.BcryptCost)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "HASH_FAILED", "Could not create account.")
		return
	}
	plan, err := s.deps.SessionStore.PlanByCode(r.Context(), "free")
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not create account.")
		return
	}
	user, err := s.deps.SessionStore.CreateUserWithPassword(r.Context(), req.Email, "", hash, plan.ID)
	if err != nil {
		if err == store.ErrEmailTaken {
			httpx.WriteError(w, http.StatusConflict, "EMAIL_TAKEN", "An account with that email already exists.")
			return
		}
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not create account.")
		return
	}
	s.startSession(w, r, user)
	writeJSON(w, http.StatusCreated, authPayload(user))
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !auth.CheckOrigin(r, s.deps.Cfg.DashboardOrigin) {
		httpx.WriteError(w, http.StatusForbidden, "CSRF_ORIGIN_MISMATCH", "Origin not allowed.")
		return
	}
	var req authReqBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body.")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if s.deps.RateLimiter != nil {
		key := "indotunnel:auth:login:" + hashIP(clientIP(r)) + ":" + req.Email
		ok, err := s.deps.RateLimiter.Allow(r.Context(), key, s.deps.Cfg.LoginRateLimit, 15*time.Minute)
		if err != nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "RATE_LIMIT_UNAVAILABLE", "Login temporarily unavailable.")
			return
		}
		if !ok {
			httpx.WriteError(w, http.StatusTooManyRequests, "TOO_MANY_ATTEMPTS", "Too many login attempts. Try again later.")
			return
		}
	}

	user, err := s.deps.SessionStore.UserByEmail(r.Context(), req.Email)
	if err != nil || !auth.VerifyPassword(user.PasswordHash, req.Password) {
		httpx.WriteError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Incorrect email or password.")
		return
	}
	s.startSession(w, r, user)
	writeJSON(w, http.StatusOK, authPayload(user))
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if !auth.CheckOrigin(r, s.deps.Cfg.DashboardOrigin) {
		httpx.WriteError(w, http.StatusForbidden, "CSRF_ORIGIN_MISMATCH", "Origin not allowed.")
		return
	}
	if c, err := r.Cookie(auth.CookieName); err == nil && c.Value != "" {
		_ = s.deps.SessionStore.RevokeSession(r.Context(), auth.HashToken(c.Value))
	}
	auth.ClearSessionCookie(w, auth.CookieName, s.deps.Cfg.PublicScheme == "https")
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFrom(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Not signed in.")
		return
	}
	writeJSON(w, http.StatusOK, authPayload(user))
}

// startSession creates a session row and sets the cookie.
func (s *Server) startSession(w http.ResponseWriter, r *http.Request, user store.User) {
	raw, hash := auth.NewSessionToken()
	sess := store.Session{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: hash,
		UserAgent: r.UserAgent(),
		IPHash:    hashIP(clientIP(r)),
		ExpiresAt: time.Now().Add(time.Duration(s.deps.Cfg.SessionTTLHours) * time.Hour),
	}
	if err := s.deps.SessionStore.CreateUserSession(r.Context(), sess); err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Could not start session.")
		return
	}
	maxAge := s.deps.Cfg.SessionTTLHours * 3600
	auth.SetSessionCookie(w, auth.CookieName, raw, maxAge, s.deps.Cfg.PublicScheme == "https")
}

func authPayload(u store.User) map[string]any {
	return map[string]any{
		"user": map[string]any{
			"id":    u.ID,
			"email": u.Email,
			"name":  u.Name,
		},
		"plan": map[string]any{
			"code":                          u.Plan.Code,
			"name":                          u.Plan.Name,
			"max_active_tunnels":            u.Plan.MaxActiveTunnels,
			"daily_request_limit":           u.Plan.DailyRequestLimit,
			"monthly_bandwidth_limit_bytes": u.Plan.MonthlyBandwidthLimitBytes,
		},
	}
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func hashIP(ip string) string {
	sum := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(sum[:])
}

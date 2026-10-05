package auth

import (
	"net/http"
	"net/url"
	"strings"

	"indotunnel/internal/httpx"
)

// CheckOrigin reports whether an unsafe request's Origin (or Referer) matches
// the allowed origin. Safe methods always pass.
func CheckOrigin(r *http.Request, allowed string) bool {
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return true
	}
	raw := r.Header.Get("Origin")
	if raw == "" {
		raw = r.Header.Get("Referer")
	}
	if raw == "" {
		return false
	}
	return sameOrigin(raw, allowed)
}

func sameOrigin(a, b string) bool {
	ua, err := url.Parse(a)
	if err != nil {
		return false
	}
	ub, err := url.Parse(b)
	if err != nil {
		return false
	}
	return strings.EqualFold(ua.Scheme, ub.Scheme) && strings.EqualFold(ua.Host, ub.Host)
}

// CSRFMiddleware rejects unsafe requests whose Origin does not match allowed.
// Apply it to any mux serving cookie-authenticated routes.
func CSRFMiddleware(allowed string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !CheckOrigin(r, allowed) {
				httpx.WriteError(w, http.StatusForbidden, "CSRF_ORIGIN_MISMATCH", "Origin not allowed.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

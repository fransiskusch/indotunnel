package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
)

// SessionStore resolves a session token hash to a session and a user.
type SessionStore interface {
	SessionByTokenHash(ctx context.Context, tokenHash string) (store.Session, error)
	UserByID(ctx context.Context, id uuid.UUID) (store.User, error)
}

// SessionMiddleware authenticates a request via its session cookie and injects
// the user. Expired or revoked sessions are rejected.
func SessionMiddleware(ss SessionStore, cookieName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(cookieName)
			if err != nil || c.Value == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Not signed in.")
				return
			}
			sess, err := ss.SessionByTokenHash(r.Context(), HashToken(c.Value))
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Session invalid.")
				return
			}
			if sess.RevokedAt != nil || !sess.ExpiresAt.After(time.Now()) {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Session expired.")
				return
			}
			user, err := ss.UserByID(r.Context(), sess.UserID)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Session invalid.")
				return
			}
			next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), user)))
		})
	}
}

// SetSessionCookie writes the session cookie. secure should be true in
// production (HTTPS).
func SetSessionCookie(w http.ResponseWriter, name, token string, maxAge int, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
}

// ClearSessionCookie expires the session cookie.
func ClearSessionCookie(w http.ResponseWriter, name string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
}

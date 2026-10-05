package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"indotunnel/internal/httpx"
	"indotunnel/internal/store"
)

// GenerateKey returns a new API key: its plaintext, its stored prefix, and its
// SHA-256 hash. Format: sk_live_<64 hex chars>.
func GenerateKey() (plaintext, prefix, hash string) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic("auth: crypto/rand failed: " + err.Error())
	}
	plaintext = "sk_live_" + hex.EncodeToString(b)
	prefix = plaintext[:12]
	hash = HashKey(plaintext)
	return
}

// HashKey returns the hex SHA-256 of a plaintext key.
func HashKey(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

// APIKeyLookup resolves a key prefix + hash to a user.
type APIKeyLookup interface {
	UserByAPIKey(ctx context.Context, prefix, hash string) (store.User, error)
}

type ctxKey struct{}

// WithUser stores a user in the request context.
func WithUser(ctx context.Context, u store.User) context.Context {
	return context.WithValue(ctx, ctxKey{}, u)
}

// UserFrom retrieves the authenticated user from the context.
func UserFrom(ctx context.Context) (store.User, bool) {
	u, ok := ctx.Value(ctxKey{}).(store.User)
	return u, ok
}

// BearerMiddleware authenticates a request via its API key and injects the user.
func BearerMiddleware(lookup APIKeyLookup) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := r.Header.Get("Authorization")
			token, ok := strings.CutPrefix(raw, "Bearer ")
			if !ok || len(token) < 12 {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Missing or malformed API key.")
				return
			}
			user, err := lookup.UserByAPIKey(r.Context(), token[:12], HashKey(token))
			if err != nil {
				if err == store.ErrNotFound {
					httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Invalid API key.")
					return
				}
				httpx.WriteError(w, http.StatusServiceUnavailable, "STORE_UNAVAILABLE", "Authentication temporarily unavailable.")
				return
			}
			next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), user)))
		})
	}
}

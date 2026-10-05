package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

// CookieName is the browser session cookie name.
const CookieName = "indotunnel_session"

// NewSessionToken returns a fresh session token: its raw hex form (64 chars)
// and its SHA-256 hash (what the database stores).
func NewSessionToken() (raw, hash string) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic("auth: crypto/rand failed: " + err.Error())
	}
	raw = hex.EncodeToString(b)
	return raw, HashToken(raw)
}

// HashToken returns the hex SHA-256 of a raw session token.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

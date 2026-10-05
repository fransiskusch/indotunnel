package auth

import (
	"errors"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

// Password validation errors.
var (
	ErrPasswordTooShort = errors.New("auth: password must be at least 8 characters")
	ErrPasswordTooLong  = errors.New("auth: password must be at most 72 bytes")
)

// ValidatePassword enforces the minimum length and bcrypt's 72-byte limit.
func ValidatePassword(plain string) error {
	if utf8.RuneCountInString(plain) < 8 {
		return ErrPasswordTooShort
	}
	if len(plain) > 72 {
		return ErrPasswordTooLong
	}
	return nil
}

// HashPassword validates and bcrypt-hashes a password at the given cost.
func HashPassword(plain string, cost int) (string, error) {
	if err := ValidatePassword(plain); err != nil {
		return "", err
	}
	h, err := bcrypt.GenerateFromPassword([]byte(plain), cost)
	if err != nil {
		return "", err
	}
	return string(h), nil
}

// VerifyPassword reports whether plain matches the bcrypt hash. An empty or
// malformed hash always returns false (never panics).
func VerifyPassword(hash, plain string) bool {
	if hash == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

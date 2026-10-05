// Package subdomain generates random public subdomains.
package subdomain

import "math/rand/v2"

const (
	letters  = "abcdefghijklmnopqrstuvwxyz"
	alphanum = "abcdefghijklmnopqrstuvwxyz0123456789"
	length   = 5
	maxTries = 10
)

// Generate returns a random 5-char subdomain: first char a letter, the rest
// lowercase letters or digits.
func Generate() string {
	b := make([]byte, length)
	b[0] = letters[rand.IntN(len(letters))]
	for i := 1; i < length; i++ {
		b[i] = alphanum[rand.IntN(len(alphanum))]
	}
	return string(b)
}

// GenerateUnique retries until exists returns false. If every attempt collides
// it appends a longer random suffix so a value is always returned.
func GenerateUnique(exists func(string) bool) string {
	for i := 0; i < maxTries; i++ {
		s := Generate()
		if !exists(s) {
			return s
		}
	}
	// ponytail: fallback widens the space when the 5-char space is saturated;
	// upgrade to a retry-forever loop with a growing length if this ever fires.
	return Generate() + string(letters[rand.IntN(len(letters))])
}

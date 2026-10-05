package gateway

import (
	"strings"
)

// Subdomain extracts the leftmost label of host when host is
// <label>.<suffix> (optionally with a port, mixed case, or trailing dot).
// It returns ok=false for the bare suffix, unrelated hosts, or an empty label.
func Subdomain(host, suffix string) (string, bool) {
	host = strings.ToLower(strings.TrimSpace(host))
	// strip port
	if i := strings.LastIndex(host, ":"); i != -1 && !strings.Contains(host[i:], "]") {
		host = host[:i]
	}
	host = strings.TrimSuffix(host, ".")
	if host == suffix {
		return "", false
	}
	rest, ok := strings.CutSuffix(host, "."+suffix)
	if !ok || rest == "" {
		return "", false
	}
	if strings.Contains(rest, ".") {
		// only a single label above the suffix is a tunnel host
		return "", false
	}
	return rest, true
}

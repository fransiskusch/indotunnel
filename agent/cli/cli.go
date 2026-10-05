// Package cli parses the agent command line and renders status output.
package cli

import (
	"fmt"
	"strconv"
	"strings"
)

// ParseTarget parses CLI args into a local host and port. A bare port implies
// 127.0.0.1; host:port is split. Port must be 1..65535.
func ParseTarget(args []string) (host string, port int, err error) {
	if len(args) == 0 {
		return "", 0, fmt.Errorf("missing target: usage: indotunnel <port>")
	}
	arg := args[0]
	if strings.Contains(arg, ":") {
		i := strings.LastIndex(arg, ":")
		host = arg[:i]
		portStr := arg[i+1:]
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return "", 0, fmt.Errorf("invalid port %q", portStr)
		}
	} else {
		host = "127.0.0.1"
		port, err = strconv.Atoi(arg)
		if err != nil {
			return "", 0, fmt.Errorf("invalid port %q", arg)
		}
	}
	if host == "" {
		host = "127.0.0.1"
	}
	if port < 1 || port > 65535 {
		return "", 0, fmt.Errorf("port out of range: %d", port)
	}
	return host, port, nil
}

// Connected renders the docs 07 "Connected" block.
func Connected(publicURL, localHost string, port int, region, plan string, used, limit int64) string {
	return fmt.Sprintf(`IndoTunnel
────────────────────────────────
Status:   Connected
Local:    http://%s:%d
Public:   %s
Region:   %s
Plan:     %s

Requests today:  %s / %s

Press Ctrl+C to stop
`, localHost, port, publicURL, region, plan, comma(used), comma(limit))
}

// LimitReached renders the docs 07 "Limit reached" block.
func LimitReached(used, limit int64) string {
	return fmt.Sprintf(`✖ Daily request limit reached.
  Used: %s / %s
  Reset: 00:00 Asia/Jakarta
`, comma(used), comma(limit))
}

func comma(n int64) string {
	s := strconv.FormatInt(n, 10)
	neg := strings.HasPrefix(s, "-")
	if neg {
		s = s[1:]
	}
	var out []byte
	for i, c := range []byte(s) {
		if i > 0 && (len(s)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, c)
	}
	if neg {
		return "-" + string(out)
	}
	return string(out)
}

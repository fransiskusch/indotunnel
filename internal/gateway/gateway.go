// Package gateway is the public edge: it routes incoming requests by Host
// header to the matching tunnel session and reverse-proxies over a yamux
// stream.
package gateway

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/config"
	"indotunnel/internal/httpx"
	"indotunnel/internal/reqlog"
	"indotunnel/internal/tunnel"
)

// Registry resolves subdomains to sessions.
type Registry interface {
	Lookup(subdomain string) (*tunnel.Session, bool)
}

// Limiter enforces quotas.
type Limiter interface {
	CheckAndIncrDaily(ctx context.Context, userID string, limit int64) (bool, int64, error)
}

// Gateway is the public edge handler.
type Gateway struct {
	cfg      config.Config
	registry Registry
	limits   Limiter
	logger   *reqlog.Logger
}

// New builds the edge gateway.
func New(cfg config.Config, registry Registry, limits Limiter, logger *reqlog.Logger) *Gateway {
	return &Gateway{cfg: cfg, registry: registry, limits: limits, logger: logger}
}

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	sub, ok := Subdomain(r.Host, g.cfg.PublicHostSuffix)
	if !ok {
		httpx.WriteError(w, http.StatusNotFound, "UNKNOWN_HOST", "No tunnel for this host.")
		return
	}
	sess, ok := g.registry.Lookup(sub)
	if !ok {
		writeOffline(w)
		return
	}

	limit := sess.DailyRequestLimit
	if limit <= 0 {
		limit = 5000
	}
	allowed, used, err := g.limits.CheckAndIncrDaily(r.Context(), sess.UserID.String(), limit)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "LIMIT_CHECK_FAILED", "Could not check quota.")
		return
	}
	if !allowed {
		httpx.WriteError(w, http.StatusTooManyRequests, "DAILY_REQUEST_LIMIT_REACHED",
			fmt.Sprintf("Daily request limit reached (%d).", used))
		return
	}

	started := time.Now()
	requestID := "req_" + uuid.NewString()[:16]
	rec := &countingWriter{ResponseWriter: w, status: 200}

	proxy := &httputil.ReverseProxy{
		FlushInterval: -1,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return sess.Yamux().OpenStream()
			},
			DisableKeepAlives: true,
		},
		Rewrite: func(pr *httputil.ProxyRequest) {
			stripHopByHop(pr.Out.Header)
			pr.Out.Header.Del("X-Forwarded-For")
			pr.Out.Header.Del("X-Forwarded-Proto")
			pr.Out.Header.Del("X-Forwarded-Host")
			pr.SetXForwarded()
			pr.Out.Host = pr.In.Host
			pr.Out.URL.Scheme = "http"
			pr.Out.URL.Host = "localhost"
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			writeOffline(w)
		},
	}
	proxy.ServeHTTP(rec, r)

	if g.logger != nil {
		g.logger.Record(reqlog.Record{
			RequestID:     requestID,
			TunnelID:      sess.TunnelID,
			UserID:        sess.UserID,
			Method:        r.Method,
			Path:          r.URL.Path,
			Host:          r.Host,
			StatusCode:    rec.status,
			RequestBytes:  r.ContentLength,
			ResponseBytes: rec.written,
			DurationMS:    int(time.Since(started).Milliseconds()),
			ClientIPHash:  hashIP(clientIP(r), g.cfg.ClientIPHashSalt),
			StartedAt:     started,
		})
	}
}

var hopByHop = []string{
	"Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization",
	"Te", "Trailer", "Transfer-Encoding",
}

func stripHopByHop(h http.Header) {
	// Preserve Connection/Upgrade when this is a protocol upgrade (WebSocket),
	// otherwise strip them too. httputil.ReverseProxy needs them intact to
	// tunnel the upgrade.
	if !isUpgrade(h) {
		h.Del("Connection")
		h.Del("Upgrade")
	}
	for _, k := range hopByHop {
		h.Del(k)
	}
}

func isUpgrade(h http.Header) bool {
	return strings.EqualFold(h.Get("Connection"), "upgrade") ||
		strings.Contains(strings.ToLower(h.Get("Connection")), "upgrade")
}

type countingWriter struct {
	http.ResponseWriter
	status  int
	written int64
}

func (c *countingWriter) WriteHeader(code int) {
	c.status = code
	c.ResponseWriter.WriteHeader(code)
}

func (c *countingWriter) Write(b []byte) (int, error) {
	n, err := c.ResponseWriter.Write(b)
	c.written += int64(n)
	return n, err
}

// Flush keeps streaming and WebSocket upgrades working through the counter.
func (c *countingWriter) Flush() {
	if f, ok := c.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Hijack lets WebSocket upgrades pass through the counter.
func (c *countingWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := c.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("gateway: ResponseWriter does not support hijacking")
	}
	return h.Hijack()
}

func writeOffline(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadGateway)
	_, _ = w.Write([]byte(`{"error":"tunnel_offline","message":"The local developer tunnel is currently offline."}`))
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i != -1 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func hashIP(ip, salt string) string {
	if ip == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(salt + "|" + ip))
	return hex.EncodeToString(sum[:])
}

// Package forward runs an HTTP server on the agent side that proxies each
// incoming tunnel stream to the developer's local service.
package forward

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
)

// New builds an *http.Server that reverse-proxies to target (host:port).
// maxStreams bounds concurrent in-flight requests; requests beyond it get 503.
func New(target string, maxStreams int) (*http.Server, error) {
	if maxStreams < 1 {
		maxStreams = 1
	}
	u, err := url.Parse("http://" + target)
	if err != nil {
		return nil, fmt.Errorf("forward: parse target: %w", err)
	}
	sem := make(chan struct{}, maxStreams)

	proxy := &httputil.ReverseProxy{
		FlushInterval: -1,
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(u)
			pr.Out.Host = pr.In.Host
			pr.Out.Header.Del("X-Forwarded-For")
			pr.Out.Header.Del("X-Forwarded-Proto")
		},
	}

	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
			proxy.ServeHTTP(w, r)
		default:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"error":"too_many_concurrent_streams"}`))
		}
	})

	return &http.Server{Handler: h}, nil
}

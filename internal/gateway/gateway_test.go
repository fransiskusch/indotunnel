package gateway

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hashicorp/yamux"

	"indotunnel/internal/config"
	"indotunnel/internal/reqlog"
	"indotunnel/internal/store"
	"indotunnel/internal/tunnel"
)

type fakeLimiter struct {
	allowed bool
	used    int64
	month   int64
}

func (f fakeLimiter) CheckAndIncrDaily(ctx context.Context, u string, limit int64) (bool, int64, error) {
	return f.allowed, f.used, nil
}

func (f fakeLimiter) MonthBandwidth(ctx context.Context, u string) (int64, error) {
	return f.month, nil
}

type singleRegistry struct{ s *tunnel.Session }

func (r singleRegistry) Lookup(sub string) (*tunnel.Session, bool) {
	if r.s != nil && r.s.Subdomain == sub {
		return r.s, true
	}
	return nil, false
}

// newTunnelPair creates a connected server/client yamux pair and a session
// whose Yamux() is the server side, with the client side serving backend.
func newTunnelPair(t *testing.T, backend http.Handler, sub string) *tunnel.Session {
	t.Helper()
	c1, c2 := net.Pipe()
	serverSess, err := yamux.Server(c1, yamux.DefaultConfig())
	if err != nil {
		t.Fatal(err)
	}
	clientSess, err := yamux.Client(c2, yamux.DefaultConfig())
	if err != nil {
		t.Fatal(err)
	}
	ln := tunnel.Listener(clientSess)
	srv := &http.Server{Handler: backend}
	go srv.Serve(ln)
	t.Cleanup(func() { srv.Close(); serverSess.Close(); clientSess.Close() })

	return tunnel.NewSessionForTest("c1", uuid.New(), uuid.New(), sub, serverSess)
}

func TestGatewayForwardsHTTP(t *testing.T) {
	backend := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Backend", "yes")
		w.WriteHeader(201)
		_, _ = w.Write([]byte("hello " + r.URL.Path))
	})
	sess := newTunnelPair(t, backend, "a8f2x")
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{sess}, fakeLimiter{allowed: true}, nil)

	req := httptest.NewRequest("GET", "http://a8f2x.indotunnel.localhost/thing", nil)
	req.Host = "a8f2x.indotunnel.localhost"
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)

	if rec.Code != 201 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("X-Backend") != "yes" {
		t.Fatal("missing backend header")
	}
	if rec.Body.String() != "hello /thing" {
		t.Fatalf("body=%q", rec.Body.String())
	}
}

func TestGatewayLargeBodyIntegrity(t *testing.T) {
	payload := strings.Repeat("abcdefghij", 20000) // 200 KB > yamux buffer
	backend := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		_, _ = w.Write(b)
	})
	sess := newTunnelPair(t, backend, "big")
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{sess}, fakeLimiter{allowed: true}, nil)

	req := httptest.NewRequest("POST", "http://big.indotunnel.localhost/", strings.NewReader(payload))
	req.Host = "big.indotunnel.localhost"
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)

	if rec.Body.String() != payload {
		t.Fatalf("body mismatch: got %d want %d", rec.Body.Len(), len(payload))
	}
}

func TestGatewayOfflineTunnel(t *testing.T) {
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{nil}, fakeLimiter{allowed: true}, nil)
	req := httptest.NewRequest("GET", "http://nope.indotunnel.localhost/", nil)
	req.Host = "nope.indotunnel.localhost"
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)
	if rec.Code != 502 {
		t.Fatalf("code=%d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "tunnel_offline") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestGatewayQuotaExceeded(t *testing.T) {
	sess := newTunnelPair(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}), "quota")
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{sess}, fakeLimiter{allowed: false, used: 5001}, nil)
	req := httptest.NewRequest("GET", "http://quota.indotunnel.localhost/", nil)
	req.Host = "quota.indotunnel.localhost"
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)
	if rec.Code != 429 {
		t.Fatalf("code=%d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "DAILY_REQUEST_LIMIT_REACHED") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestGatewayUnknownHost(t *testing.T) {
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{nil}, fakeLimiter{allowed: true}, nil)
	req := httptest.NewRequest("GET", "http://other.example.com/", nil)
	req.Host = "other.example.com"
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)
	if rec.Code != 404 {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestGatewayBandwidthExceeded(t *testing.T) {
	sess := newTunnelPair(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}), "bw")
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{sess},
		fakeLimiter{allowed: true, month: 10737418240}, nil)
	req := httptest.NewRequest("GET", "http://bw.indotunnel.localhost/", nil)
	req.Host = "bw.indotunnel.localhost"
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)
	if rec.Code != 429 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "BANDWIDTH_LIMIT_REACHED") {
		t.Fatalf("body=%s", rec.Body.String())
	}
}

func TestGatewayConcurrentStreamCap(t *testing.T) {
	release := make(chan struct{})
	entered := make(chan struct{}, 1)
	backend := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case entered <- struct{}{}:
		default:
		}
		<-release
	})
	sess := newTunnelPair(t, backend, "cap")
	sess.StreamSem = make(chan struct{}, 1)
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost", MaxStreamsPerTunnel: 1},
		singleRegistry{sess}, fakeLimiter{allowed: true}, nil)

	// First request holds the only slot.
	firstDone := make(chan struct{})
	go func() {
		req := httptest.NewRequest("GET", "http://cap.indotunnel.localhost/", nil)
		req.Host = "cap.indotunnel.localhost"
		g.ServeHTTP(httptest.NewRecorder(), req)
		close(firstDone)
	}()
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("first request never reached backend")
	}

	req := httptest.NewRequest("GET", "http://cap.indotunnel.localhost/", nil)
	req.Host = "cap.indotunnel.localhost"
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)
	if rec.Code != 503 {
		t.Fatalf("code=%d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "TOO_MANY_CONCURRENT_STREAMS") {
		t.Fatalf("body=%s", rec.Body.String())
	}
	close(release)
	<-firstDone
}

// recordingInserter captures records passed through the logger.
type recordingInserter struct {
	mu   sync.Mutex
	rows []store.RequestLog
}

func (r *recordingInserter) InsertRequestLogs(ctx context.Context, logs []store.RequestLog) error {
	r.mu.Lock()
	r.rows = append(r.rows, logs...)
	r.mu.Unlock()
	return nil
}

func TestGatewayCountsChunkedRequestBody(t *testing.T) {
	backend := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, r.Body)
		w.WriteHeader(200)
	})
	sess := newTunnelPair(t, backend, "chunk")
	ins := &recordingInserter{}
	logger := reqlog.New(ins, nil, 10)
	defer logger.Close(context.Background())
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{sess}, fakeLimiter{allowed: true}, logger)

	// A body reader with unknown length (ContentLength -1) exercises the
	// chunked/streaming path.
	payload := strings.Repeat("x", 5000)
	req := httptest.NewRequest("POST", "http://chunk.indotunnel.localhost/", io.NopCloser(strings.NewReader(payload)))
	req.Host = "chunk.indotunnel.localhost"
	req.ContentLength = -1
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, req)

	// Force the logger to flush.
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		ins.mu.Lock()
		n := len(ins.rows)
		ins.mu.Unlock()
		if n > 0 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	ins.mu.Lock()
	defer ins.mu.Unlock()
	if len(ins.rows) == 0 {
		t.Fatal("no request log recorded")
	}
	if ins.rows[0].RequestBytes != int64(len(payload)) {
		t.Fatalf("RequestBytes=%d want %d", ins.rows[0].RequestBytes, len(payload))
	}
}

var _ = fmt.Sprintf

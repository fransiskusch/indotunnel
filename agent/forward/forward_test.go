package forward

import (
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestForwardsToLocal(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(201)
		_, _ = w.Write([]byte("ok"))
	}))
	defer backend.Close()
	srv, err := New(strings.TrimPrefix(backend.URL, "http://"), 20)
	if err != nil {
		t.Fatal(err)
	}
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	defer ln.Close()
	go srv.Serve(ln)
	resp, err := http.Get("http://" + ln.Addr().String() + "/")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 201 {
		t.Fatalf("status=%d", resp.StatusCode)
	}
}

func TestConcurrentLimit(t *testing.T) {
	release := make(chan struct{})
	entered := make(chan struct{}, 1)
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case entered <- struct{}{}:
		default:
		}
		<-release
		w.WriteHeader(200)
	}))
	defer backend.Close()
	srv, _ := New(strings.TrimPrefix(backend.URL, "http://"), 1)
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	defer ln.Close()
	go srv.Serve(ln)

	// First request occupies the single slot and blocks in the backend.
	firstDone := make(chan struct{})
	go func() {
		resp, err := http.Get("http://" + ln.Addr().String() + "/")
		if err == nil {
			resp.Body.Close()
		}
		close(firstDone)
	}()

	// Wait until the first request is actually inside the backend (slot held).
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("first request never reached backend")
	}

	// Now a second request must be refused with 503.
	var got503 bool
	for i := 0; i < 20 && !got503; i++ {
		resp, err := http.Get("http://" + ln.Addr().String() + "/")
		if err == nil {
			if resp.StatusCode == 503 {
				got503 = true
			}
			resp.Body.Close()
		}
	}
	close(release)
	<-firstDone
	if !got503 {
		t.Fatal("expected 503 when stream limit reached")
	}
}

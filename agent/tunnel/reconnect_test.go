package tunnel

import (
	"context"
	"io"
	"net"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hashicorp/yamux"

	itunnel "indotunnel/internal/tunnel"
)

// TestReconnectAfterDrop verifies RunWithReconnect re-establishes a session
// after the first one dies, and that the server's registry serves the new one.
func TestReconnectAfterDrop(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()

	registry := itunnel.NewRegistry()
	srv := &itunnel.Server{
		Auth: func(hs itunnel.Handshake) (itunnel.SessionMeta, error) {
			return itunnel.SessionMeta{UserID: "u1", TunnelID: hs.TunnelID, Subdomain: "abcde"}, nil
		},
		OnConnect: func(meta itunnel.SessionMeta, connID string, s *yamux.Session) {
			registry.Register(meta.Subdomain, itunnel.NewSessionForTest(connID, uuid.Nil, uuid.Nil, meta.Subdomain, s))
			// echo one stream
			go func() {
				st, err := s.AcceptStream()
				if err != nil {
					return
				}
				_, _ = io.Copy(st, st)
				_ = st.Close()
			}()
		},
		OnDisconnect: func(meta itunnel.SessionMeta, connID string) {
			registry.Remove(meta.Subdomain, connID)
		},
		PublicURL: func(string) string { return "" },
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go srv.Serve(ctx, ln)

	sessions := make(chan *yamux.Session, 4)
	statuses := make(chan string, 8)
	agentCtx, agentCancel := context.WithCancel(context.Background())
	defer agentCancel()

	go func() {
		_ = RunWithReconnect(agentCtx, ln.Addr().String(),
			itunnel.Handshake{TunnelID: "t_1", APIKey: "k", ConnectionID: "c1"},
			func(s *yamux.Session) error {
				sessions <- s
				<-s.CloseChan()
				return nil
			},
			func(st string) { statuses <- st })
	}()

	first := waitSession(t, sessions)
	// drop the first session
	_ = first.Close()

	second := waitSession(t, sessions)
	if second == first {
		t.Fatal("expected a new session")
	}

	// registry should resolve and echo over the new session
	deadline := time.Now().Add(3 * time.Second)
	var ok bool
	for time.Now().Before(deadline) {
		if _, found := registry.Lookup("abcde"); found {
			ok = true
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if !ok {
		t.Fatal("registry did not serve the new session")
	}
}

func waitSession(t *testing.T, ch chan *yamux.Session) *yamux.Session {
	t.Helper()
	select {
	case s := <-ch:
		return s
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for session")
		return nil
	}
}

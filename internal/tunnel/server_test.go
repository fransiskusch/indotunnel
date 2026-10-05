package tunnel

import (
	"context"
	"errors"
	"io"
	"net"
	"testing"
	"time"

	"github.com/hashicorp/yamux"
)

func TestServerHandshakeAndStream(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()

	connected := make(chan struct{})
	srv := &Server{
		Auth: func(hs Handshake) (SessionMeta, error) {
			if hs.APIKey != "good" {
				return SessionMeta{}, errors.New("bad key")
			}
			return SessionMeta{UserID: "u1", TunnelID: hs.TunnelID, Subdomain: "abcde"}, nil
		},
		OnConnect: func(meta SessionMeta, connID string, s *yamux.Session) {
			close(connected)
			// Echo one stream back.
			go func() {
				st, err := s.AcceptStream()
				if err != nil {
					return
				}
				_, _ = io.Copy(st, st)
				_ = st.Close()
			}()
		},
		PublicURL: func(sub string) string { return "http://" + sub + ".indotunnel.localhost:8080" },
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go srv.Serve(ctx, l)

	conn, err := net.Dial("tcp", l.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	if err := WriteHandshake(conn, Handshake{TunnelID: "t_1", APIKey: "good", ConnectionID: "c1"}); err != nil {
		t.Fatal(err)
	}
	ack, err := ReadAck(conn)
	if err != nil {
		t.Fatal(err)
	}
	if ack.Status != "ready" || ack.PublicURL == "" {
		t.Fatalf("ack=%+v", ack)
	}
	client, err := yamux.Client(conn, yamux.DefaultConfig())
	if err != nil {
		t.Fatal(err)
	}
	select {
	case <-connected:
	case <-time.After(2 * time.Second):
		t.Fatal("OnConnect not called")
	}

	st, err := client.OpenStream()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.Write([]byte("ping")); err != nil {
		t.Fatal(err)
	}
	buf := make([]byte, 4)
	if _, err := io.ReadFull(st, buf); err != nil {
		t.Fatal(err)
	}
	if string(buf) != "ping" {
		t.Fatalf("echo=%q", buf)
	}
}

func TestServerOnDisconnectFiresOnPeerClose(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()

	disconnected := make(chan string, 1)
	srv := &Server{
		Auth: func(hs Handshake) (SessionMeta, error) {
			return SessionMeta{UserID: "u1", TunnelID: hs.TunnelID, Subdomain: "abcde"}, nil
		},
		OnConnect:    func(meta SessionMeta, connID string, s *yamux.Session) {},
		OnDisconnect: func(meta SessionMeta, connID string) { disconnected <- connID },
		PublicURL:    func(string) string { return "" },
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go srv.Serve(ctx, l)

	conn, err := net.Dial("tcp", l.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	_ = WriteHandshake(conn, Handshake{TunnelID: "t_1", APIKey: "k", ConnectionID: "c1"})
	if _, err := ReadAck(conn); err != nil {
		t.Fatal(err)
	}
	client, err := yamux.Client(conn, yamux.DefaultConfig())
	if err != nil {
		t.Fatal(err)
	}
	// Simulate the agent going away.
	_ = client.Close()
	_ = conn.Close()

	select {
	case id := <-disconnected:
		if id != "c1" {
			t.Fatalf("connID=%q", id)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("OnDisconnect never fired after peer close")
	}
}

func TestServerRejectsBadAuth(t *testing.T) {
	l, _ := net.Listen("tcp", "127.0.0.1:0")
	defer l.Close()
	srv := &Server{
		Auth:      func(hs Handshake) (SessionMeta, error) { return SessionMeta{}, errors.New("no") },
		PublicURL: func(string) string { return "" },
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go srv.Serve(ctx, l)

	conn, _ := net.Dial("tcp", l.Addr().String())
	defer conn.Close()
	_ = WriteHandshake(conn, Handshake{TunnelID: "t", APIKey: "bad", ConnectionID: "c"})
	ack, err := ReadAck(conn)
	if err != nil {
		t.Fatal(err)
	}
	if ack.Status != "error" {
		t.Fatalf("ack=%+v", ack)
	}
}

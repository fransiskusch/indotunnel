package tunnel

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"time"

	"github.com/google/uuid"
	"github.com/hashicorp/yamux"
)

// SessionMeta is what authFunc resolves from a handshake.
type SessionMeta struct {
	UserID            string
	UserUUID          uuid.UUID
	TunnelID          string
	TunnelUUID        uuid.UUID
	Subdomain         string
	DailyRequestLimit int64
}

// AuthFunc validates a handshake and returns the session metadata, or an error
// that is sent back to the agent and closes the connection.
type AuthFunc func(hs Handshake) (SessionMeta, error)

// ConnectFunc is called after a session is established.
type ConnectFunc func(meta SessionMeta, connID string, s *yamux.Session)

// DisconnectFunc is called when the session closes.
type DisconnectFunc func(meta SessionMeta, connID string)

// Server accepts agent connections, performs the handshake, and runs a yamux
// session for each.
type Server struct {
	Auth             AuthFunc
	OnConnect        ConnectFunc
	OnDisconnect     DisconnectFunc
	EdgeNode         string
	PublicURL        func(subdomain string) string
	Log              *slog.Logger
	handshakeTimeout time.Duration
}

// Serve accepts connections on l until ctx is cancelled.
func (s *Server) Serve(ctx context.Context, l net.Listener) error {
	go func() {
		<-ctx.Done()
		_ = l.Close()
	}()
	for {
		conn, err := l.Accept()
		if err != nil {
			select {
			case <-ctx.Done():
				return nil
			default:
				return fmt.Errorf("tunnel: accept: %w", err)
			}
		}
		go s.handle(ctx, conn)
	}
}

func (s *Server) handle(ctx context.Context, conn net.Conn) {
	defer conn.Close()

	timeout := s.handshakeTimeout
	if timeout == 0 {
		timeout = 10 * time.Second
	}
	_ = conn.SetReadDeadline(time.Now().Add(timeout))

	hs, err := ReadHandshake(conn)
	if err != nil {
		s.logger().Warn("tunnel: bad handshake", "err", err, "remote", conn.RemoteAddr().String())
		return
	}
	meta, err := s.Auth(hs)
	if err != nil {
		_ = WriteAck(conn, Ack{Status: "error"})
		s.logger().Warn("tunnel: auth failed", "err", err, "tunnel", hs.TunnelID)
		return
	}
	_ = conn.SetReadDeadline(time.Time{})

	cfg := yamux.DefaultConfig()
	cfg.LogOutput = io.Discard
	sess, err := yamux.Server(conn, cfg)
	if err != nil {
		s.logger().Warn("tunnel: yamux server", "err", err)
		return
	}
	defer sess.Close()

	if err := WriteAck(conn, Ack{Status: "ready", PublicURL: s.PublicURL(meta.Subdomain)}); err != nil {
		s.logger().Warn("tunnel: write ack", "err", err)
		return
	}

	if s.OnConnect != nil {
		s.OnConnect(meta, hs.ConnectionID, sess)
	}
	if s.OnDisconnect != nil {
		defer s.OnDisconnect(meta, hs.ConnectionID)
	}
	s.logger().Info("tunnel: connected", "tunnel", meta.TunnelID, "subdomain", meta.Subdomain)

	<-ctx.Done()
}

func (s *Server) logger() *slog.Logger {
	if s.Log != nil {
		return s.Log
	}
	return slog.Default()
}

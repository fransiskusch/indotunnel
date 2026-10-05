package tunnel

import (
	"net"

	"github.com/hashicorp/yamux"
)

// StreamListener adapts a yamux session to net.Listener so an http.Server can
// serve HTTP over the tunnel's streams.
type StreamListener struct {
	sess *yamux.Session
}

// Listener returns a net.Listener that accepts one yamux stream per Accept.
func Listener(s *yamux.Session) net.Listener { return &StreamListener{sess: s} }

func (l *StreamListener) Accept() (net.Conn, error) { return l.sess.AcceptStream() }

func (l *StreamListener) Close() error { return l.sess.Close() }

func (l *StreamListener) Addr() net.Addr { return l.sess.LocalAddr() }

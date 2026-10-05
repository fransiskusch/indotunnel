// Package tunnel is the agent's client side of the yamux tunnel transport.
package tunnel

import (
	"context"
	"errors"
	"math/rand/v2"
	"net"
	"time"

	"github.com/hashicorp/yamux"

	indotunnel "indotunnel/internal/tunnel"
)

// Backoff returns the reconnect delay for the given attempt: 1s*2^attempt,
// capped at 30s, with up to 1s of jitter.
func Backoff(attempt int) time.Duration {
	if attempt < 0 {
		attempt = 0
	}
	base := time.Second << uint(attempt)
	if base > 30*time.Second || base <= 0 {
		base = 30 * time.Second
	}
	jitter := time.Duration(rand.IntN(1000)) * time.Millisecond
	return base + jitter
}

// Dial opens a TCP connection to addr, performs the handshake, and returns the
// yamux client session.
func Dial(ctx context.Context, addr string, hs indotunnel.Handshake) (*yamux.Session, error) {
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, err
	}
	if dl, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(dl)
	} else {
		_ = conn.SetDeadline(time.Now().Add(10 * time.Second))
	}
	if err := indotunnel.WriteHandshake(conn, hs); err != nil {
		_ = conn.Close()
		return nil, err
	}
	ack, err := indotunnel.ReadAck(conn)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	if ack.Status != "ready" {
		_ = conn.Close()
		return nil, errors.New("tunnel: server rejected handshake: " + ack.Status)
	}
	_ = conn.SetDeadline(time.Time{})
	cfg := yamux.DefaultConfig()
	cfg.LogOutput = discard{}
	sess, err := yamux.Client(conn, cfg)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	return sess, nil
}

type discard struct{}

func (discard) Write(p []byte) (int, error) { return len(p), nil }

// RunWithReconnect keeps a tunnel session alive, reconnecting with backoff
// until ctx is cancelled. onSession is called with each new session and should
// block while serving; onStatus receives "connected"/"reconnecting".
func RunWithReconnect(ctx context.Context, addr string, hs indotunnel.Handshake,
	onSession func(*yamux.Session) error, onStatus func(string)) error {
	attempt := 0
	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		sess, err := Dial(ctx, addr, hs)
		if err != nil {
			if onStatus != nil {
				onStatus("reconnecting")
			}
			select {
			case <-time.After(Backoff(attempt)):
			case <-ctx.Done():
				return ctx.Err()
			}
			attempt++
			continue
		}
		attempt = 0
		if onStatus != nil {
			onStatus("connected")
		}
		_ = onSession(sess)
		_ = sess.Close()
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if onStatus != nil {
			onStatus("reconnecting")
		}
		select {
		case <-time.After(Backoff(0)):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

// Package tunnel implements the yamux-based tunnel transport: the session
// registry the edge looks up, and the server-side handshake.
package tunnel

import (
	"encoding/json"
	"fmt"
	"io"
	"sync"

	"github.com/google/uuid"
	"github.com/hashicorp/yamux"
)

// Handshake is the one-line JSON the agent sends to open a tunnel.
type Handshake struct {
	TunnelID      string `json:"tunnel_id"`
	APIKey        string `json:"api_key"`
	ClientVersion string `json:"client_version"`
	ConnectionID  string `json:"connection_id"`
}

// Ack is the one-line JSON the server returns once the tunnel is ready.
type Ack struct {
	Status    string `json:"status"`
	PublicURL string `json:"public_url"`
}

const maxHandshakeBytes = 4096

// ReadHandshake reads one newline-terminated JSON handshake, rejecting
// oversized lines and missing required fields. It reads byte-by-byte so it
// never consumes bytes beyond the newline (the connection is then handed to
// yamux).
func ReadHandshake(r io.Reader) (Handshake, error) {
	line, err := readLine(r, maxHandshakeBytes)
	if err != nil {
		return Handshake{}, fmt.Errorf("tunnel: read handshake: %w", err)
	}
	var hs Handshake
	if err := json.Unmarshal(line, &hs); err != nil {
		return Handshake{}, fmt.Errorf("tunnel: parse handshake: %w", err)
	}
	if hs.TunnelID == "" || hs.APIKey == "" || hs.ConnectionID == "" {
		return Handshake{}, fmt.Errorf("tunnel: handshake missing required fields")
	}
	return hs, nil
}

// readLine reads up to and including the first newline, returning the line
// without the newline. It errors if the line exceeds max bytes.
func readLine(r io.Reader, max int) ([]byte, error) {
	buf := make([]byte, 0, 128)
	one := make([]byte, 1)
	for {
		n, err := r.Read(one)
		if n > 0 {
			if one[0] == '\n' {
				return buf, nil
			}
			buf = append(buf, one[0])
			if len(buf) > max {
				return nil, fmt.Errorf("line exceeds %d bytes", max)
			}
		}
		if err != nil {
			if len(buf) > 0 {
				return buf, nil
			}
			return nil, err
		}
	}
}

// WriteAck writes the ready acknowledgement followed by a newline.
func WriteAck(w io.Writer, a Ack) error {
	b, err := json.Marshal(a)
	if err != nil {
		return err
	}
	b = append(b, '\n')
	_, err = w.Write(b)
	return err
}

// WriteHandshake writes the agent's handshake as one JSON line.
func WriteHandshake(w io.Writer, hs Handshake) error {
	b, err := json.Marshal(hs)
	if err != nil {
		return err
	}
	b = append(b, '\n')
	_, err = w.Write(b)
	return err
}

// ReadAck reads the server's one-line acknowledgement.
func ReadAck(r io.Reader) (Ack, error) {
	line, err := readLine(r, maxHandshakeBytes)
	if err != nil {
		return Ack{}, fmt.Errorf("tunnel: read ack: %w", err)
	}
	var a Ack
	if err := json.Unmarshal(line, &a); err != nil {
		return Ack{}, fmt.Errorf("tunnel: parse ack: %w", err)
	}
	return a, nil
}

// Session is one active agent connection.
type Session struct {
	ConnID            string
	UserID            uuid.UUID
	TunnelID          uuid.UUID
	Subdomain         string
	DailyRequestLimit int64
	yamux             *yamux.Session
}

// NewSession builds a Session around an established yamux session.
func NewSession(connID string, userID, tunnelID uuid.UUID, subdomain string, limit int64, s *yamux.Session) *Session {
	return &Session{
		ConnID:            connID,
		UserID:            userID,
		TunnelID:          tunnelID,
		Subdomain:         subdomain,
		DailyRequestLimit: limit,
		yamux:             s,
	}
}

// Yamux returns the underlying multiplexed session.
func (s *Session) Yamux() *yamux.Session { return s.yamux }

// NewSessionForTest builds a Session around an existing yamux session. It
// exists so integration-style tests in other packages can construct a session
// without going through the network handshake.
func NewSessionForTest(connID string, userID, tunnelID uuid.UUID, subdomain string, s *yamux.Session) *Session {
	return NewSession(connID, userID, tunnelID, subdomain, 5000, s)
}

// Registry maps subdomains to their active sessions.
type Registry struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

func NewRegistry() *Registry {
	return &Registry{sessions: make(map[string]*Session)}
}

// Register stores (or replaces, on reconnect) the session for a subdomain.
func (r *Registry) Register(subdomain string, s *Session) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sessions[subdomain] = s
}

// Lookup returns the session for a subdomain.
func (r *Registry) Lookup(subdomain string) (*Session, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	s, ok := r.sessions[subdomain]
	return s, ok
}

// Remove deletes the session only if its connection id matches, so a stale
// disconnect cannot evict a newer reconnect.
func (r *Registry) Remove(subdomain, connectionID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if s, ok := r.sessions[subdomain]; ok && s.ConnID == connectionID {
		delete(r.sessions, subdomain)
	}
}

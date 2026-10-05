package gateway

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"indotunnel/internal/config"
)

// TestGatewayWebSocket verifies that a WebSocket upgrade is forwarded through
// the tunnel and that frames flow bidirectionally.
func TestGatewayWebSocket(t *testing.T) {
	upgrader := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}
	backend := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer c.Close()
		for {
			mt, msg, err := c.ReadMessage()
			if err != nil {
				return
			}
			if err := c.WriteMessage(mt, append([]byte("echo:"), msg...)); err != nil {
				return
			}
		}
	})
	sess := newTunnelPair(t, backend, "wsaaa")
	g := New(config.Config{PublicHostSuffix: "indotunnel.localhost"}, singleRegistry{sess}, fakeLimiter{allowed: true}, nil)

	edge := httptest.NewServer(g)
	defer edge.Close()

	wsURL := "ws" + strings.TrimPrefix(edge.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Host", "wsaaa.indotunnel.localhost")
	c, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer c.Close()

	if err := c.WriteMessage(websocket.TextMessage, []byte("hi")); err != nil {
		t.Fatal(err)
	}
	_ = c.SetReadDeadline(time.Now().Add(3 * time.Second))
	_, msg, err := c.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if string(msg) != "echo:hi" {
		t.Fatalf("msg=%q", msg)
	}
}

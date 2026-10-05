// Command agent is the IndoTunnel CLI: it exposes a local port through the
// tunnel server.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hashicorp/yamux"

	"indotunnel/agent/cfg"
	"indotunnel/agent/cli"
	"indotunnel/agent/client"
	"indotunnel/agent/forward"
	atunnel "indotunnel/agent/tunnel"
	itunnel "indotunnel/internal/tunnel"
)

const version = "0.1.0"

func main() {
	args := os.Args[1:]
	if len(args) > 0 {
		switch args[0] {
		case "--version", "-v":
			fmt.Println("indotunnel " + version)
			return
		case "--help", "-h":
			usage()
			return
		}
	}
	if err := run(args); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Print(`IndoTunnel - expose localhost to the internet

Usage:
  indotunnel <port>              e.g. indotunnel 3000
  indotunnel <host>:<port>       e.g. indotunnel 127.0.0.1:3000
  indotunnel --version
  indotunnel --help

Environment:
  INDOTUNNEL_TOKEN   API key (else read from the config file)
  INDOTUNNEL_API     Control API base URL (default http://localhost:8081)
  INDOTUNNEL_TUNNEL  Tunnel address (default localhost:7000)
`)
}

func run(args []string) error {
	host, port, err := cli.ParseTarget(args)
	if err != nil {
		return err
	}
	creds, err := cfg.Load()
	if err != nil {
		return err
	}

	apiBase := env("INDOTUNNEL_API", "http://localhost:8081")
	tunnelAddr := env("INDOTUNNEL_TUNNEL", "localhost:7000")

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	tr, err := client.CreateTunnel(ctx, apiBase, creds.Token, host, port)
	if err != nil {
		var apiErr *client.APIError
		if errors.As(err, &apiErr) && apiErr.Code == "DAILY_REQUEST_LIMIT_REACHED" {
			fmt.Print(cli.LimitReached(5000, 5000))
			return nil
		}
		return err
	}

	connID := "conn-" + fmt.Sprint(time.Now().UnixNano())
	hs := itunnel.Handshake{
		TunnelID:      tr.TunnelID,
		APIKey:        creds.Token,
		ClientVersion: version,
		ConnectionID:  connID,
	}

	fmt.Print(cli.Connected(tr.PublicURL, host, port, "jakarta", "Free", 0, 5000))

	return atunnel.RunWithReconnect(ctx, tunnelAddr, hs, func(s *yamux.Session) error {
		srv, err := forward.New(fmt.Sprintf("%s:%d", host, port), 20)
		if err != nil {
			return err
		}
		ln := itunnel.Listener(s)
		return srv.Serve(ln)
	}, func(status string) {
		if status == "reconnecting" {
			fmt.Fprintln(os.Stderr, "connection lost, reconnecting...")
		}
	})
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// Command agent is the IndoTunnel CLI: it exposes a local port through the
// tunnel server.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
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

// version is set at build time via -ldflags "-X main.version=...".
var version = "0.1.0"

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
		case "login":
			if err := login(args[1:]); err != nil {
				fmt.Fprintln(os.Stderr, "error:", err)
				os.Exit(1)
			}
			return
		}
	}
	if err := run(args); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

type deviceCodeResp struct {
	DeviceCode        string `json:"device_code"`
	UserCode          string `json:"user_code"`
	VerificationURI   string `json:"verification_uri"`
	VerifyURIComplete string `json:"verification_uri_complete"`
	ExpiresIn         int    `json:"expires_in"`
	Interval          int    `json:"interval"`
}

type deviceTokenResp struct {
	Status string `json:"status"`
	APIKey string `json:"api_key"`
	Error  *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func openBrowser(url string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

func performDeviceLogin(ctx context.Context, apiBase, clientName string, opener func(string) error, out io.Writer) error {
	reqBody, _ := json.Marshal(map[string]string{"client_name": clientName})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBase+"/v1/auth/device/code", bytes.NewReader(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("could not connect to API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to initiate device login: HTTP %d", resp.StatusCode)
	}

	var codeResp deviceCodeResp
	if err := json.NewDecoder(resp.Body).Decode(&codeResp); err != nil {
		return fmt.Errorf("failed to parse code response: %w", err)
	}

	fmt.Fprintf(out, "\nTo authenticate, please visit:\n  %s\n\n", codeResp.VerifyURIComplete)
	fmt.Fprintf(out, "Confirmation code: %s\n\n", codeResp.UserCode)
	fmt.Fprintln(out, "Waiting for approval in browser...")

	if opener != nil {
		_ = opener(codeResp.VerifyURIComplete)
	}

	interval := time.Duration(codeResp.Interval) * time.Second
	if interval <= 0 {
		interval = 2 * time.Second
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			tokenReqBody, _ := json.Marshal(map[string]string{"device_code": codeResp.DeviceCode})
			tReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBase+"/v1/auth/device/token", bytes.NewReader(tokenReqBody))
			if err != nil {
				return err
			}
			tReq.Header.Set("Content-Type", "application/json")

			tResp, err := http.DefaultClient.Do(tReq)
			if err != nil {
				continue // network glitch during polling, retry
			}

			var tokResp deviceTokenResp
			_ = json.NewDecoder(tResp.Body).Decode(&tokResp)
			tResp.Body.Close()

			if tokResp.Status == "approved" && tokResp.APIKey != "" {
				if err := cfg.Save(cfg.Credentials{Token: tokResp.APIKey}); err != nil {
					return fmt.Errorf("could not save credentials: %w", err)
				}
				fmt.Fprintln(out, "Logged in. API key saved.")
				return nil
			}

			if tResp.StatusCode == http.StatusBadRequest || (tokResp.Error != nil && tokResp.Error.Code == "EXPIRED_TOKEN") {
				return errors.New("authorization expired. Please run 'indotunnel login' again")
			}
		}
	}
}

// login stores an API key so later runs need no environment variables.
func login(args []string) error {
	if len(args) > 0 && args[0] != "" {
		if err := cfg.Save(cfg.Credentials{Token: args[0]}); err != nil {
			return err
		}
		fmt.Println("Logged in. API key saved.")
		return nil
	}
	apiBase := os.Getenv("INDOTUNNEL_API")
	if apiBase == "" {
		apiBase = "https://indotunnel.my.id/api"
	}
	host, _ := os.Hostname()
	return performDeviceLogin(context.Background(), apiBase, host, openBrowser, os.Stdout)
}

func usage() {
	fmt.Print(`IndoTunnel - expose localhost to the internet

Usage:
  indotunnel <port>              e.g. indotunnel 3000
  indotunnel <host>:<port>       e.g. indotunnel 127.0.0.1:3000
  indotunnel login               log in interactively via browser
  indotunnel login <api-key>     save your API key directly
  indotunnel --version
  indotunnel --help

First time? Run:
  indotunnel login
  indotunnel 3000

Environment:
  INDOTUNNEL_TOKEN   API key (else read from the config file)
  INDOTUNNEL_API     Control API base URL (default https://indotunnel.my.id/api)
  INDOTUNNEL_TUNNEL  Tunnel address (default indotunnel.my.id:7000)
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

	apiBase := env("INDOTUNNEL_API", "https://indotunnel.my.id/api")
	tunnelAddr := env("INDOTUNNEL_TUNNEL", "indotunnel.my.id:7000")

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

	printed := false
	return atunnel.RunWithReconnect(ctx, tunnelAddr, hs, func(s *yamux.Session) error {
		srv, err := forward.New(fmt.Sprintf("%s:%d", host, port), 20)
		if err != nil {
			return err
		}
		ln := itunnel.Listener(s)
		return srv.Serve(ln)
	}, func(status string) {
		switch status {
		case "connected":
			if !printed {
				fmt.Print(cli.Connected(tr.PublicURL, host, port, "jakarta", "Free", 0, 5000))
				printed = true
			}
		case "reconnecting":
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

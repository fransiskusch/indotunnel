// Package client talks to the IndoTunnel control API.
package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// TunnelResp is the control API's create-tunnel response.
type TunnelResp struct {
	TunnelID  string `json:"tunnel_id"`
	Subdomain string `json:"subdomain"`
	PublicURL string `json:"public_url"`
	Status    string `json:"status"`
}

// CreateTunnel requests a new tunnel from the control API.
func CreateTunnel(ctx context.Context, apiBase, token, localHost string, port int) (TunnelResp, error) {
	body, _ := json.Marshal(map[string]any{
		"local_host": localHost,
		"local_port": port,
		"protocol":   "http",
	})
	req, err := http.NewRequestWithContext(ctx, "POST", apiBase+"/tunnels", bytes.NewReader(body))
	if err != nil {
		return TunnelResp{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	hc := &http.Client{Timeout: 15 * time.Second}
	resp, err := hc.Do(req)
	if err != nil {
		return TunnelResp{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		var e struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&e)
		if e.Error.Code != "" {
			return TunnelResp{}, &APIError{Status: resp.StatusCode, Code: e.Error.Code, Message: e.Error.Message}
		}
		return TunnelResp{}, fmt.Errorf("create tunnel: status %d", resp.StatusCode)
	}
	var tr TunnelResp
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return TunnelResp{}, err
	}
	return tr, nil
}

// APIError is a structured control API error.
type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

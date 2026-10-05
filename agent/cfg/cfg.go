// Package cfg loads and stores the agent's credentials.
package cfg

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Credentials is the persisted agent configuration.
type Credentials struct {
	Token string `json:"token"`
}

// path returns the credential file location for the current OS.
func path() (string, error) {
	if dir := os.Getenv("APPDATA"); dir != "" {
		return filepath.Join(dir, "IndoTunnel", "config.json"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "indotunnel", "config.json"), nil
}

// Load returns credentials from INDOTUNNEL_TOKEN if set, else from the file.
func Load() (Credentials, error) {
	if tok := os.Getenv("INDOTUNNEL_TOKEN"); tok != "" {
		return Credentials{Token: tok}, nil
	}
	p, err := path()
	if err != nil {
		return Credentials{}, err
	}
	b, err := os.ReadFile(p)
	if err != nil {
		return Credentials{}, fmt.Errorf("no token: set INDOTUNNEL_TOKEN or run scripts/seed.sh")
	}
	var c Credentials
	if err := json.Unmarshal(b, &c); err != nil {
		return Credentials{}, err
	}
	if c.Token == "" {
		return Credentials{}, fmt.Errorf("no token in %s", p)
	}
	return c, nil
}

// Save writes credentials with owner-only permissions.
func Save(c Credentials) error {
	p, err := path()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o700); err != nil {
		return err
	}
	b, _ := json.MarshalIndent(c, "", "  ")
	return os.WriteFile(p, b, 0o600)
}

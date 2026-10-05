package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all runtime configuration, loaded from environment variables.
type Config struct {
	DatabaseURL             string
	RedisURL                string
	EdgeAddr                string
	APIAddr                 string
	TunnelAddr              string
	PublicHostSuffix        string
	PublicScheme            string
	APIBaseURL              string
	ClientIPHashSalt        string
	MaxStreamsPerTunnel     int
	RequestLogRetentionDays int
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("config: %s must be an integer: %w", key, err)
	}
	return n, nil
}

// Load reads configuration from the environment, applying spec defaults.
func Load() (Config, error) {
	maxStreams, err := envInt("MAX_STREAMS_PER_TUNNEL", 20)
	if err != nil {
		return Config{}, err
	}
	retention, err := envInt("REQUEST_LOG_RETENTION_DAYS", 7)
	if err != nil {
		return Config{}, err
	}
	return Config{
		DatabaseURL:             env("DATABASE_URL", "postgres://indotunnel:indotunnel@localhost:55432/indotunnel?sslmode=disable"),
		RedisURL:                env("REDIS_URL", "redis://localhost:6379/0"),
		EdgeAddr:                env("EDGE_ADDR", ":8080"),
		APIAddr:                 env("API_ADDR", ":8081"),
		TunnelAddr:              env("TUNNEL_ADDR", ":7000"),
		PublicHostSuffix:        env("PUBLIC_HOST_SUFFIX", "indotunnel.localhost"),
		PublicScheme:            env("PUBLIC_SCHEME", "http"),
		APIBaseURL:              env("API_BASE_URL", "http://localhost:8081"),
		ClientIPHashSalt:        env("CLIENT_IP_HASH_SALT", "change-me"),
		MaxStreamsPerTunnel:     maxStreams,
		RequestLogRetentionDays: retention,
	}, nil
}

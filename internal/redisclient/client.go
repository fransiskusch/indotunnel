package redisclient

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// New parses a redis:// URL and returns a client, verifying connectivity.
func New(url string) (*redis.Client, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("redisclient: parse url: %w", err)
	}
	c := redis.NewClient(opts)
	if err := c.Ping(context.Background()).Err(); err != nil {
		_ = c.Close()
		return nil, fmt.Errorf("redisclient: ping: %w", err)
	}
	return c, nil
}

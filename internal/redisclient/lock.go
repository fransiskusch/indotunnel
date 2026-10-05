package redisclient

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/redis/go-redis/v9"
)

var unlockScript = redis.NewScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`)

// Locker provides a short-lived mutual-exclusion lock backed by Redis SET NX PX.
type Locker struct {
	rdb *redis.Client
}

func NewLocker(rdb *redis.Client) *Locker { return &Locker{rdb: rdb} }

// Lock attempts to acquire key for ttl. On success it returns ok=true and an
// unlock function that releases only if this caller still holds the lock.
func (l *Locker) Lock(ctx context.Context, key string, ttl time.Duration) (func(), bool, error) {
	token := make([]byte, 16)
	if _, err := rand.Read(token); err != nil {
		return nil, false, err
	}
	val := hex.EncodeToString(token)
	ok, err := l.rdb.SetNX(ctx, key, val, ttl).Result()
	if err != nil || !ok {
		return nil, false, err
	}
	unlock := func() {
		_ = unlockScript.Run(context.Background(), l.rdb, []string{key}, val).Err()
	}
	return unlock, true, nil
}

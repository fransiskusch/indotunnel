package limits

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// jakarta is WIB (UTC+7). Fixed offset; Indonesia has no DST.
var jakarta = time.FixedZone("WIB", 7*3600)

// JakartaNow returns the current time in Asia/Jakarta.
func JakartaNow() time.Time { return time.Now().In(jakarta) }

// SecondsUntilJakartaMidnight returns seconds from t until the next Jakarta midnight.
func SecondsUntilJakartaMidnight(t time.Time) int64 {
	lt := t.In(jakarta)
	next := time.Date(lt.Year(), lt.Month(), lt.Day(), 0, 0, 0, 0, jakarta).AddDate(0, 0, 1)
	d := next.Sub(lt)
	if d < 0 {
		d = 0
	}
	return int64(d / time.Second)
}

var dailyScript = redis.NewScript(`
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
return n
`)

// Checker wraps Redis counters for plan-limit enforcement.
type Checker struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Checker { return &Checker{rdb: rdb} }

// CheckAndIncrDaily atomically increments the user's daily request counter and
// reports whether the request is within limit. The 5000th request is allowed;
// the 5001st is blocked.
func (c *Checker) CheckAndIncrDaily(ctx context.Context, userID string, limit int64) (bool, int64, error) {
	now := JakartaNow()
	key := fmt.Sprintf("indotunnel:usage:%s:requests:%s", userID, now.Format("2006-01-02"))
	ttl := SecondsUntilJakartaMidnight(now)
	if ttl < 1 {
		ttl = 1
	}
	n, err := dailyScript.Run(ctx, c.rdb, []string{key}, limit, ttl).Int64()
	if err != nil {
		return false, 0, fmt.Errorf("limits: daily incr: %w", err)
	}
	return n <= limit, n, nil
}

func bandwidthKey(userID string) string {
	return fmt.Sprintf("indotunnel:usage:%s:bandwidth:%s", userID, JakartaNow().Format("2006-01"))
}

// DailyUsed returns the user's current daily request count without incrementing.
func (c *Checker) DailyUsed(ctx context.Context, userID string) (int64, error) {
	key := fmt.Sprintf("indotunnel:usage:%s:requests:%s", userID, JakartaNow().Format("2006-01-02"))
	n, err := c.rdb.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return n, err
}

// AddBandwidth adds actual transferred bytes to the user's monthly counter.
func (c *Checker) AddBandwidth(ctx context.Context, userID string, bytes int64) error {
	if bytes <= 0 {
		return nil
	}
	return c.rdb.IncrBy(ctx, bandwidthKey(userID), bytes).Err()
}

// MonthBandwidth returns the user's current monthly bandwidth total in bytes.
func (c *Checker) MonthBandwidth(ctx context.Context, userID string) (int64, error) {
	n, err := c.rdb.Get(ctx, bandwidthKey(userID)).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return n, err
}

// Allow counts an attempt against key and reports whether it is within limit
// for the given window. The counter expires on first increment.
func (c *Checker) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	n, err := c.rdb.Incr(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("limits: rate incr: %w", err)
	}
	if n == 1 {
		c.rdb.Expire(ctx, key, window)
	}
	return n <= int64(limit), nil
}

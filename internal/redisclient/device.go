package redisclient

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"

	"indotunnel/internal/api"
	"indotunnel/internal/store"
)

type DeviceStore struct {
	rdb *redis.Client
}

func NewDeviceStore(rdb *redis.Client) *DeviceStore {
	return &DeviceStore{rdb: rdb}
}

func (d *DeviceStore) SaveDeviceCode(ctx context.Context, state api.DeviceCodeState, ttl time.Duration) error {
	b, err := json.Marshal(state)
	if err != nil {
		return err
	}
	pipe := d.rdb.Pipeline()
	pipe.Set(ctx, "indotunnel:device:user:"+state.UserCode, b, ttl)
	pipe.Set(ctx, "indotunnel:device:dev:"+state.DeviceCode, b, ttl)
	_, err = pipe.Exec(ctx)
	return err
}

func (d *DeviceStore) GetByUserCode(ctx context.Context, userCode string) (api.DeviceCodeState, error) {
	val, err := d.rdb.Get(ctx, "indotunnel:device:user:"+userCode).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return api.DeviceCodeState{}, store.ErrNotFound
		}
		return api.DeviceCodeState{}, err
	}
	var s api.DeviceCodeState
	err = json.Unmarshal([]byte(val), &s)
	return s, err
}

func (d *DeviceStore) ApproveDeviceCode(ctx context.Context, userCode, apiKey string, ttl time.Duration) error {
	state, err := d.GetByUserCode(ctx, userCode)
	if err != nil {
		return err
	}
	state.Status = "approved"
	state.APIKey = apiKey

	b, err := json.Marshal(state)
	if err != nil {
		return err
	}
	pipe := d.rdb.Pipeline()
	pipe.Del(ctx, "indotunnel:device:user:"+userCode)
	pipe.Set(ctx, "indotunnel:device:dev:"+state.DeviceCode, b, ttl)
	_, err = pipe.Exec(ctx)
	return err
}

func (d *DeviceStore) GetByDeviceCode(ctx context.Context, deviceCode string) (api.DeviceCodeState, error) {
	val, err := d.rdb.Get(ctx, "indotunnel:device:dev:"+deviceCode).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return api.DeviceCodeState{}, store.ErrNotFound
		}
		return api.DeviceCodeState{}, err
	}
	var s api.DeviceCodeState
	err = json.Unmarshal([]byte(val), &s)
	return s, err
}

func (d *DeviceStore) ConsumeDeviceCode(ctx context.Context, deviceCode string) error {
	return d.rdb.Del(ctx, "indotunnel:device:dev:"+deviceCode).Err()
}

// Command server runs the IndoTunnel control API, public edge, and tunnel
// listener in one process.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/hashicorp/yamux"
	"github.com/redis/go-redis/v9"

	"indotunnel/internal/api"
	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/db"
	"indotunnel/internal/events"
	"indotunnel/internal/gateway"
	"indotunnel/internal/limits"
	"indotunnel/internal/redisclient"
	"indotunnel/internal/reqlog"
	"indotunnel/internal/store"
	"indotunnel/internal/tunnel"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(log)

	if err := run(log); err != nil {
		log.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool, "migrations"); err != nil {
		return err
	}
	st := store.New(pool)

	rdb, err := redisclient.New(cfg.RedisURL)
	if err != nil {
		return err
	}
	defer rdb.Close()
	checker := limits.New(rdb)
	locker := redisclient.NewLocker(rdb)

	logger := reqlog.NewWithUsage(st, checker, st, 1024)
	defer func() {
		cctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = logger.Close(cctx)
	}()

	registry := tunnel.NewRegistry()
	bus := events.New()

	apiSrv := api.New(api.Deps{
		Store:        st,
		Limits:       checker,
		Lock:         locker,
		Registry:     registry,
		Cfg:          cfg,
		Ready:        []api.Pinger{redisPinger{rdb}},
		SessionStore: st,
		RateLimiter:  checker,
		Bus:          bus,
	})

	gw := gateway.New(cfg, registry, checker, logger)
	gw.Bus = bus

	apiLn, err := net.Listen("tcp", cfg.APIAddr)
	if err != nil {
		return err
	}
	edgeLn, err := net.Listen("tcp", cfg.EdgeAddr)
	if err != nil {
		return err
	}
	tunnelLn, err := net.Listen("tcp", cfg.TunnelAddr)
	if err != nil {
		return err
	}

	apiHTTP := &http.Server{Handler: apiSrv.Handler()}
	edgeHTTP := &http.Server{Handler: gw}

	publicURL := func(sub string) string {
		return cfg.PublicScheme + "://" + sub + "." + cfg.PublicHostSuffix
	}

	tunnelSrv := &tunnel.Server{
		EdgeNode:  "local-1",
		Log:       log,
		PublicURL: publicURL,
		Auth: func(hs tunnel.Handshake) (tunnel.SessionMeta, error) {
			if len(hs.APIKey) < 12 {
				return tunnel.SessionMeta{}, errors.New("malformed api key")
			}
			user, err := st.UserByAPIKey(ctx, hs.APIKey[:12], auth.HashKey(hs.APIKey))
			if err != nil {
				return tunnel.SessionMeta{}, err
			}
			t, err := st.TunnelByID(ctx, hs.TunnelID)
			if err != nil {
				return tunnel.SessionMeta{}, err
			}
			if t.UserID != user.ID {
				return tunnel.SessionMeta{}, errors.New("tunnel does not belong to user")
			}
			return tunnel.SessionMeta{
				UserID:                user.ID.String(),
				UserUUID:              user.ID,
				TunnelUUID:            t.ID,
				TunnelID:              t.TunnelID,
				Subdomain:             t.Subdomain,
				DailyRequestLimit:     user.Plan.DailyRequestLimit,
				MonthlyBandwidthLimit: user.Plan.MonthlyBandwidthLimitBytes,
			}, nil
		},
		OnConnect: func(meta tunnel.SessionMeta, connID string, s *yamux.Session) {
			registry.Register(meta.Subdomain, tunnel.NewSessionSized(
				connID, meta.UserUUID, meta.TunnelUUID, meta.Subdomain,
				meta.DailyRequestLimit, meta.MonthlyBandwidthLimit, cfg.MaxStreamsPerTunnel, s))
			if err := st.MarkTunnelConnected(ctx, meta.TunnelID); err != nil {
				log.Warn("mark connected", "err", err)
			}
			if err := st.CreateSession(ctx, uuid.New(), meta.TunnelUUID, meta.UserUUID,
				connID, "local-1", "", ""); err != nil {
				log.Warn("create session", "err", err)
			}
			bus.Publish(events.Event{Type: "tunnel.status", UserID: meta.UserUUID,
				Payload: map[string]string{"status": "online", "tunnel_id": meta.TunnelID}})
		},
		OnDisconnect: func(meta tunnel.SessionMeta, connID string) {
			registry.Remove(meta.Subdomain, connID)
			if err := st.CloseSession(ctx, connID); err != nil {
				log.Warn("close session", "err", err)
			}
			if err := st.SetTunnelStatus(ctx, meta.TunnelID, "offline"); err != nil {
				log.Warn("set offline", "err", err)
			}
			bus.Publish(events.Event{Type: "tunnel.status", UserID: meta.UserUUID,
				Payload: map[string]string{"status": "offline", "tunnel_id": meta.TunnelID}})
		},
	}

	errCh := make(chan error, 3)
	go func() { errCh <- apiHTTP.Serve(apiLn) }()
	go func() { errCh <- edgeHTTP.Serve(edgeLn) }()
	go func() { errCh <- tunnelSrv.Serve(ctx, tunnelLn) }()

	// Retention job: delete request metadata older than the configured window.
	go retentionLoop(ctx, st, cfg.RequestLogRetentionDays, log)

	log.Info("server started", "api", cfg.APIAddr, "edge", cfg.EdgeAddr, "tunnel", cfg.TunnelAddr)

	select {
	case <-ctx.Done():
		log.Info("shutting down")
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = apiHTTP.Shutdown(shutdownCtx)
	_ = edgeHTTP.Shutdown(shutdownCtx)
	return nil
}

// redisPinger adapts *redis.Client to api.Pinger.
type redisPinger struct{ c *redis.Client }

func (p redisPinger) Ping(ctx context.Context) error { return p.c.Ping(ctx).Err() }

// retentionLoop deletes request metadata older than days, once at startup and
// then hourly, until ctx is cancelled.
func retentionLoop(ctx context.Context, st *store.Store, days int, log *slog.Logger) {
	if days <= 0 {
		return
	}
	age := time.Duration(days) * 24 * time.Hour
	tick := func() {
		n, err := st.DeleteOldRequestLogs(ctx, age)
		if err != nil {
			log.Warn("retention cleanup failed", "err", err)
			return
		}
		if n > 0 {
			log.Info("retention cleanup", "deleted", n)
		}
	}
	tick()
	t := time.NewTicker(time.Hour)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			tick()
		}
	}
}

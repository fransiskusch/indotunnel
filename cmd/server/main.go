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

	"indotunnel/internal/api"
	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/db"
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

	logger := reqlog.New(st, checker, 1024)
	defer func() {
		cctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = logger.Close(cctx)
	}()

	registry := tunnel.NewRegistry()

	apiSrv := api.New(api.Deps{
		Store:    st,
		Limits:   checker,
		Lock:     locker,
		Registry: registry,
		Cfg:      cfg,
	})

	gw := gateway.New(cfg, registry, checker, logger)

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
				UserID:            user.ID.String(),
				UserUUID:          user.ID,
				TunnelUUID:        t.ID,
				TunnelID:          t.TunnelID,
				Subdomain:         t.Subdomain,
				DailyRequestLimit: user.Plan.DailyRequestLimit,
			}, nil
		},
		OnConnect: func(meta tunnel.SessionMeta, connID string, s *yamux.Session) {
			registry.Register(meta.Subdomain, tunnel.NewSession(
				connID, meta.UserUUID, meta.TunnelUUID, meta.Subdomain, meta.DailyRequestLimit, s))
			if err := st.MarkTunnelConnected(ctx, meta.TunnelID); err != nil {
				log.Warn("mark connected", "err", err)
			}
			if err := st.CreateSession(ctx, uuid.New(), meta.TunnelUUID, meta.UserUUID,
				connID, "local-1", "", ""); err != nil {
				log.Warn("create session", "err", err)
			}
		},
		OnDisconnect: func(meta tunnel.SessionMeta, connID string) {
			registry.Remove(meta.Subdomain, connID)
			if err := st.CloseSession(ctx, connID); err != nil {
				log.Warn("close session", "err", err)
			}
			if err := st.SetTunnelStatus(ctx, meta.TunnelID, "offline"); err != nil {
				log.Warn("set offline", "err", err)
			}
		},
	}

	errCh := make(chan error, 3)
	go func() { errCh <- apiHTTP.Serve(apiLn) }()
	go func() { errCh <- edgeHTTP.Serve(edgeLn) }()
	go func() { errCh <- tunnelSrv.Serve(ctx, tunnelLn) }()

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

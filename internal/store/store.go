package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a lookup matches no row.
var ErrNotFound = errors.New("store: not found")

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// Plan mirrors the plans table.
type Plan struct {
	ID                         uuid.UUID
	Code                       string
	Name                       string
	MaxActiveTunnels           int
	DailyRequestLimit          int64
	MonthlyBandwidthLimitBytes int64
	CustomSubdomainEnabled     bool
	CustomDomainEnabled        bool
}

// User mirrors the users table joined with its plan.
type User struct {
	ID     uuid.UUID
	PlanID uuid.UUID
	Email  string
	Name   string
	Status string
	Plan   Plan
}

// Tunnel mirrors the tunnels table.
type Tunnel struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	TunnelID        string
	Subdomain       string
	LocalHost       string
	LocalPort       int
	Protocol        string
	Status          string
	Region          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	LastConnectedAt *time.Time
}

// RequestLog mirrors the request_logs table.
type RequestLog struct {
	ID            uuid.UUID
	TunnelID      uuid.UUID
	UserID        uuid.UUID
	RequestID     string
	Method        string
	Path          string
	Host          string
	StatusCode    int
	RequestBytes  int64
	ResponseBytes int64
	DurationMS    int
	ClientIPHash  string
	StartedAt     time.Time
}

// UserByAPIKey resolves an active api key (matched on prefix + hash) to its user.
func (s *Store) UserByAPIKey(ctx context.Context, prefix, hash string) (User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT u.id, u.plan_id, u.email, COALESCE(u.name,''), u.status,
		       p.id, p.code, p.name, p.max_active_tunnels, p.daily_request_limit,
		       p.monthly_bandwidth_limit_bytes, p.custom_subdomain_enabled, p.custom_domain_enabled
		FROM api_keys k
		JOIN users u ON u.id = k.user_id
		JOIN plans p ON p.id = u.plan_id
		WHERE k.key_prefix=$1 AND k.secret_hash=$2 AND k.status='active'`,
		prefix, hash)
	return scanUser(row)
}

// UserByID loads a user and its plan.
func (s *Store) UserByID(ctx context.Context, id uuid.UUID) (User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT u.id, u.plan_id, u.email, COALESCE(u.name,''), u.status,
		       p.id, p.code, p.name, p.max_active_tunnels, p.daily_request_limit,
		       p.monthly_bandwidth_limit_bytes, p.custom_subdomain_enabled, p.custom_domain_enabled
		FROM users u JOIN plans p ON p.id = u.plan_id WHERE u.id=$1`, id)
	return scanUser(row)
}

func scanUser(row pgx.Row) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.PlanID, &u.Email, &u.Name, &u.Status,
		&u.Plan.ID, &u.Plan.Code, &u.Plan.Name, &u.Plan.MaxActiveTunnels,
		&u.Plan.DailyRequestLimit, &u.Plan.MonthlyBandwidthLimitBytes,
		&u.Plan.CustomSubdomainEnabled, &u.Plan.CustomDomainEnabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

// PlanByCode loads a plan by its code.
func (s *Store) PlanByCode(ctx context.Context, code string) (Plan, error) {
	var p Plan
	err := s.pool.QueryRow(ctx, `
		SELECT id, code, name, max_active_tunnels, daily_request_limit,
		       monthly_bandwidth_limit_bytes, custom_subdomain_enabled, custom_domain_enabled
		FROM plans WHERE code=$1`, code).Scan(
		&p.ID, &p.Code, &p.Name, &p.MaxActiveTunnels, &p.DailyRequestLimit,
		&p.MonthlyBandwidthLimitBytes, &p.CustomSubdomainEnabled, &p.CustomDomainEnabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, ErrNotFound
	}
	return p, err
}

// CountActiveTunnels counts tunnels in pending or online state for a user.
func (s *Store) CountActiveTunnels(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM tunnels WHERE user_id=$1 AND status IN ('pending','online')`,
		userID).Scan(&n)
	return n, err
}

// SubdomainExists reports whether a subdomain is already taken.
func (s *Store) SubdomainExists(ctx context.Context, sub string) (bool, error) {
	var ok bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM tunnels WHERE subdomain=$1)`, sub).Scan(&ok)
	return ok, err
}

// CreateTunnel inserts a tunnel row.
func (s *Store) CreateTunnel(ctx context.Context, t Tunnel) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO tunnels (id, user_id, tunnel_id, subdomain, local_host, local_port,
		                     protocol, status, region)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,''))`,
		t.ID, t.UserID, t.TunnelID, t.Subdomain, t.LocalHost, t.LocalPort,
		t.Protocol, t.Status, t.Region)
	return err
}

// TunnelByID loads a tunnel by its public tunnel_id string.
func (s *Store) TunnelByID(ctx context.Context, tunnelID string) (Tunnel, error) {
	return scanTunnel(s.pool.QueryRow(ctx, tunnelSelect+` WHERE tunnel_id=$1`, tunnelID))
}

// TunnelsByUser lists a user's tunnels, newest first.
func (s *Store) TunnelsByUser(ctx context.Context, userID uuid.UUID) ([]Tunnel, error) {
	rows, err := s.pool.Query(ctx, tunnelSelect+` WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Tunnel
	for rows.Next() {
		t, err := scanTunnel(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

const tunnelSelect = `SELECT id, user_id, tunnel_id, subdomain, local_host, local_port,
	protocol, status, COALESCE(region,''), created_at, updated_at, last_connected_at
	FROM tunnels`

func scanTunnel(row pgx.Row) (Tunnel, error) {
	var t Tunnel
	err := row.Scan(&t.ID, &t.UserID, &t.TunnelID, &t.Subdomain, &t.LocalHost,
		&t.LocalPort, &t.Protocol, &t.Status, &t.Region, &t.CreatedAt, &t.UpdatedAt,
		&t.LastConnectedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Tunnel{}, ErrNotFound
	}
	return t, err
}

// SetTunnelStatus updates a tunnel's status and touches updated_at.
func (s *Store) SetTunnelStatus(ctx context.Context, tunnelID, status string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tunnels SET status=$2, updated_at=now() WHERE tunnel_id=$1`, tunnelID, status)
	return err
}

// MarkTunnelConnected sets status=online and last_connected_at=now().
func (s *Store) MarkTunnelConnected(ctx context.Context, tunnelID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tunnels SET status='online', last_connected_at=now(), updated_at=now()
		 WHERE tunnel_id=$1`, tunnelID)
	return err
}

// CreateSession inserts a tunnel_sessions row.
func (s *Store) CreateSession(ctx context.Context, id uuid.UUID, tunnelID, userID uuid.UUID,
	connectionID, edgeNode, clientVersion, clientIP string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO tunnel_sessions (id, tunnel_id, user_id, connection_id, edge_node,
		                             client_version, client_ip, status)
		VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''),'connected')`,
		id, tunnelID, userID, connectionID, edgeNode, clientVersion, clientIP)
	return err
}

// CloseSession marks the session with connectionID as disconnected.
func (s *Store) CloseSession(ctx context.Context, connectionID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE tunnel_sessions SET status='disconnected', disconnected_at=now()
		WHERE connection_id=$1 AND status='connected'`, connectionID)
	return err
}

// InsertRequestLogs batch-inserts request metadata.
func (s *Store) InsertRequestLogs(ctx context.Context, logs []RequestLog) error {
	if len(logs) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for _, l := range logs {
		batch.Queue(`
			INSERT INTO request_logs (id, tunnel_id, user_id, request_id, method, path,
			                          host, status_code, request_bytes, response_bytes,
			                          duration_ms, client_ip_hash, started_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
			l.ID, l.TunnelID, l.UserID, l.RequestID, l.Method, l.Path, l.Host,
			l.StatusCode, l.RequestBytes, l.ResponseBytes, l.DurationMS,
			l.ClientIPHash, l.StartedAt)
	}
	return s.pool.SendBatch(ctx, batch).Close()
}

// UpsertUsageDaily adds counts/bytes into usage_daily for a user and date.
func (s *Store) UpsertUsageDaily(ctx context.Context, userID uuid.UUID, date string,
	requests, bytesIn, bytesOut int64) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO usage_daily (id, user_id, usage_date, request_count, bytes_in, bytes_out)
		VALUES (gen_random_uuid(), $1, $2::date, $3, $4, $5)
		ON CONFLICT (user_id, usage_date) DO UPDATE SET
			request_count = usage_daily.request_count + EXCLUDED.request_count,
			bytes_in      = usage_daily.bytes_in + EXCLUDED.bytes_in,
			bytes_out     = usage_daily.bytes_out + EXCLUDED.bytes_out,
			updated_at    = now()`,
		userID, date, requests, bytesIn, bytesOut)
	return err
}

// RequestsByTunnel lists request metadata for a tunnel, newest first.
func (s *Store) RequestsByTunnel(ctx context.Context, tunnelID uuid.UUID, limit int) ([]RequestLog, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, tunnel_id, user_id, request_id, method, path, host, COALESCE(status_code,0),
		       request_bytes, response_bytes, COALESCE(duration_ms,0), COALESCE(client_ip_hash,''), started_at
		FROM request_logs WHERE tunnel_id=$1 ORDER BY started_at DESC LIMIT $2`, tunnelID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RequestLog
	for rows.Next() {
		var l RequestLog
		if err := rows.Scan(&l.ID, &l.TunnelID, &l.UserID, &l.RequestID, &l.Method,
			&l.Path, &l.Host, &l.StatusCode, &l.RequestBytes, &l.ResponseBytes,
			&l.DurationMS, &l.ClientIPHash, &l.StartedAt); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// RequestByID loads a single request log row.
func (s *Store) RequestByID(ctx context.Context, requestID string) (RequestLog, error) {
	var l RequestLog
	err := s.pool.QueryRow(ctx, `
		SELECT id, tunnel_id, user_id, request_id, method, path, host, COALESCE(status_code,0),
		       request_bytes, response_bytes, COALESCE(duration_ms,0), COALESCE(client_ip_hash,''), started_at
		FROM request_logs WHERE request_id=$1`, requestID).Scan(
		&l.ID, &l.TunnelID, &l.UserID, &l.RequestID, &l.Method, &l.Path, &l.Host,
		&l.StatusCode, &l.RequestBytes, &l.ResponseBytes, &l.DurationMS,
		&l.ClientIPHash, &l.StartedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return RequestLog{}, ErrNotFound
	}
	return l, err
}

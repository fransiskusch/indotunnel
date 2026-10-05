package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Session is a persisted login session. Only the token hash is stored.
type Session struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	UserAgent string
	IPHash    string
	CreatedAt time.Time
	ExpiresAt time.Time
	RevokedAt *time.Time
}

// CreateUserWithPassword inserts a user with a password hash and plan.
func (s *Store) CreateUserWithPassword(ctx context.Context, email, name, passwordHash string, planID uuid.UUID) (User, error) {
	id := uuid.New()
	_, err := s.pool.Exec(ctx, `
		INSERT INTO users (id, plan_id, email, name, password_hash)
		VALUES ($1,$2,$3,NULLIF($4,''),$5)`, id, planID, email, name, passwordHash)
	if err != nil {
		if isUniqueViolation(err) {
			return User{}, ErrEmailTaken
		}
		return User{}, err
	}
	return s.UserByID(ctx, id)
}

// UserByEmail loads a user (with plan) by email.
func (s *Store) UserByEmail(ctx context.Context, email string) (User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT u.id, u.plan_id, u.email, COALESCE(u.name,''), u.status, u.password_hash,
		       p.id, p.code, p.name, p.max_active_tunnels, p.daily_request_limit,
		       p.monthly_bandwidth_limit_bytes, p.custom_subdomain_enabled, p.custom_domain_enabled
		FROM users u JOIN plans p ON p.id = u.plan_id WHERE u.email=$1`, email)
	return scanUser(row)
}

// UpdatePasswordHash sets a user's password hash.
func (s *Store) UpdatePasswordHash(ctx context.Context, userID uuid.UUID, hash string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1`, userID, hash)
	return err
}

// CreateUserSession inserts a session row.
func (s *Store) CreateUserSession(ctx context.Context, sess Session) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO sessions (id, user_id, token_hash, user_agent, ip_hash, expires_at)
		VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),$6)`,
		sess.ID, sess.UserID, sess.TokenHash, sess.UserAgent, sess.IPHash, sess.ExpiresAt)
	return err
}

// SessionByTokenHash loads a session by its token hash.
func (s *Store) SessionByTokenHash(ctx context.Context, tokenHash string) (Session, error) {
	var sess Session
	err := s.pool.QueryRow(ctx, `
		SELECT id, user_id, token_hash, COALESCE(user_agent,''), COALESCE(ip_hash,''),
		       created_at, expires_at, revoked_at
		FROM sessions WHERE token_hash=$1`, tokenHash).Scan(
		&sess.ID, &sess.UserID, &sess.TokenHash, &sess.UserAgent, &sess.IPHash,
		&sess.CreatedAt, &sess.ExpiresAt, &sess.RevokedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	return sess, err
}

// RevokeSession marks a session revoked by its token hash.
func (s *Store) RevokeSession(ctx context.Context, tokenHash string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL`, tokenHash)
	return err
}

// DeleteExpiredSessions removes sessions that expired or were revoked more than
// olderThan ago.
func (s *Store) DeleteExpiredSessions(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().Add(-olderThan)
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM sessions
		WHERE expires_at < now()
		  AND (revoked_at IS NULL OR revoked_at < $1)`, cutoff)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

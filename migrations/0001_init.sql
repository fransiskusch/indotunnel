CREATE TABLE plans (
    id UUID PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    max_active_tunnels INTEGER NOT NULL,
    daily_request_limit BIGINT NOT NULL,
    monthly_bandwidth_limit_bytes BIGINT NOT NULL,
    custom_subdomain_enabled BOOLEAN NOT NULL DEFAULT false,
    custom_domain_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES plans(id),
    email VARCHAR(320) NOT NULL UNIQUE,
    name VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

CREATE TABLE tunnels (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tunnel_id VARCHAR(64) NOT NULL UNIQUE,
    subdomain VARCHAR(63) NOT NULL UNIQUE,
    local_host VARCHAR(255) NOT NULL DEFAULT '127.0.0.1',
    local_port INTEGER NOT NULL,
    protocol VARCHAR(20) NOT NULL DEFAULT 'http',
    status VARCHAR(20) NOT NULL DEFAULT 'offline',
    region VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_connected_at TIMESTAMPTZ
);

CREATE INDEX idx_tunnels_user_id ON tunnels(user_id);
CREATE INDEX idx_tunnels_status ON tunnels(status);

CREATE TABLE tunnel_sessions (
    id UUID PRIMARY KEY,
    tunnel_id UUID NOT NULL REFERENCES tunnels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id VARCHAR(100) NOT NULL UNIQUE,
    edge_node VARCHAR(100) NOT NULL,
    client_version VARCHAR(40),
    client_ip VARCHAR(64),
    status VARCHAR(20) NOT NULL DEFAULT 'connected',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    disconnected_at TIMESTAMPTZ,
    bytes_in BIGINT NOT NULL DEFAULT 0,
    bytes_out BIGINT NOT NULL DEFAULT 0,
    request_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_tunnel_sessions_tunnel_id ON tunnel_sessions(tunnel_id);
CREATE INDEX idx_tunnel_sessions_status ON tunnel_sessions(status);

CREATE TABLE request_logs (
    id UUID PRIMARY KEY,
    tunnel_id UUID NOT NULL REFERENCES tunnels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL UNIQUE,
    method VARCHAR(16) NOT NULL,
    path TEXT NOT NULL,
    host VARCHAR(255) NOT NULL,
    status_code INTEGER,
    request_bytes BIGINT NOT NULL DEFAULT 0,
    response_bytes BIGINT NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    client_ip_hash VARCHAR(128),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_logs_tunnel_started_at
    ON request_logs(tunnel_id, started_at DESC);
CREATE INDEX idx_request_logs_user_started_at
    ON request_logs(user_id, started_at DESC);

CREATE TABLE usage_daily (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    request_count BIGINT NOT NULL DEFAULT 0,
    bytes_in BIGINT NOT NULL DEFAULT 0,
    bytes_out BIGINT NOT NULL DEFAULT 0,
    peak_connections INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, usage_date)
);

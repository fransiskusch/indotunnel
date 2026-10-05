# ERD

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ api_keys : owns
    users ||--o{ tunnels : creates
    users ||--o{ tunnel_sessions : opens
    users ||--o{ usage_daily : accumulates
    plans ||--o{ users : assigned_to
    tunnels ||--o{ tunnel_sessions : has
    tunnels ||--o{ request_logs : receives
    users ||--o{ request_logs : owns

    users {
        uuid id PK
        uuid plan_id FK
        varchar email UK
        varchar name
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    plans {
        uuid id PK
        varchar code UK
        varchar name
        integer max_active_tunnels
        bigint daily_request_limit
        bigint monthly_bandwidth_limit_bytes
        boolean custom_subdomain_enabled
        boolean custom_domain_enabled
        timestamptz created_at
    }

    api_keys {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar key_prefix
        varchar secret_hash
        varchar status
        timestamptz last_used_at
        timestamptz expires_at
        timestamptz created_at
    }

    tunnels {
        uuid id PK
        uuid user_id FK
        varchar tunnel_id UK
        varchar subdomain UK
        varchar local_host
        integer local_port
        varchar protocol
        varchar status
        varchar region
        timestamptz created_at
        timestamptz updated_at
        timestamptz last_connected_at
    }

    tunnel_sessions {
        uuid id PK
        uuid tunnel_id FK
        uuid user_id FK
        varchar connection_id UK
        varchar edge_node
        varchar client_version
        varchar client_ip
        varchar status
        timestamptz connected_at
        timestamptz disconnected_at
        bigint bytes_in
        bigint bytes_out
        bigint request_count
    }

    request_logs {
        uuid id PK
        uuid tunnel_id FK
        uuid user_id FK
        varchar request_id UK
        varchar method
        varchar path
        varchar host
        integer status_code
        bigint request_bytes
        bigint response_bytes
        integer duration_ms
        varchar client_ip_hash
        timestamptz started_at
    }

    usage_daily {
        uuid id PK
        uuid user_id FK
        date usage_date
        bigint request_count
        bigint bytes_in
        bigint bytes_out
        integer peak_connections
        timestamptz created_at
        timestamptz updated_at
    }
```

## 2. Relation Notes

- `users -> tunnels`: a user may own many historical tunnels but Free is restricted to one active tunnel.
- `tunnels -> tunnel_sessions`: one tunnel may have many sessions over its lifetime because agents reconnect.
- `tunnels -> request_logs`: all traffic metadata is associated with the tunnel.
- `usage_daily`: pre-aggregated usage for dashboard and billing.
- `api_keys`: store only a hash of the secret, never the raw key.

## 3. Identity vs Network

User identity comes from account/authentication.

Network identity (`client_ip`) is used for:

- abuse prevention
- suspicious activity detection
- operational diagnostics

Do not use public IP as the database primary identity of a developer.

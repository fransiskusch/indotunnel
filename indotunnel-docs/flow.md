# Tunnel Flow

## 1. Complete Tunnel Lifecycle

```mermaid
sequenceDiagram
    participant CLI as Developer CLI
    participant API as Go Control API
    participant DB as PostgreSQL
    participant Redis as Redis
    participant GW as Tunnel Gateway
    participant APP as localhost:3000

    CLI->>API: Authenticate / create tunnel
    API->>DB: Validate user + plan
    API->>Redis: Check active tunnel limit
    API->>DB: Create/update tunnel
    API-->>CLI: tunnel_id + public hostname + transport config

    CLI->>GW: Open persistent outbound tunnel
    GW->>Redis: Register active connection
    GW->>DB: Create session
    GW-->>CLI: Tunnel READY

    Note over CLI,GW: Persistent connection stays open

    GW->>CLI: Forward incoming request
    CLI->>APP: HTTP request to localhost
    APP-->>CLI: HTTP response
    CLI-->>GW: Forward response
    GW-->>Client: Public response

    CLI->>GW: Heartbeat
    GW-->>CLI: Heartbeat ACK

    CLI->>GW: Disconnect
    GW->>Redis: Remove active connection
    GW->>DB: Close session
```

## 2. CLI Startup

```text
indotunnel 3000
      |
      +-- parse target
      |
      +-- load credential
      |
      +-- POST /v1/tunnels
      |
      +-- receive tunnel_id/subdomain
      |
      +-- open tunnel transport
      |
      +-- register connection
      |
      +-- print public URL
      |
      +-- heartbeat loop
      |
      +-- request forwarding loop
```

## 3. Reconnect

When connection breaks:

```text
CONNECTED
   |
   X network lost
   |
DISCONNECTED
   |
backoff 1s
   |
retry
   |
backoff 2s
   |
retry
   |
backoff 4s
   |
CONNECTED
```

Suggested maximum backoff: 30 seconds with jitter.

## 4. Shutdown

On `Ctrl+C`:

1. stop accepting new local work
2. send graceful close
3. close transport
4. server marks session disconnected
5. public hostname returns a tunnel-offline response

## 5. Offline Public Response

Suggested:

```http
HTTP/1.1 502 Bad Gateway
Content-Type: application/json
```

```json
{
  "error": "tunnel_offline",
  "message": "The local developer tunnel is currently offline."
}
```

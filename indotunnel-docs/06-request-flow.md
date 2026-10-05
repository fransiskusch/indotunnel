# Public Request Flow

## 1. Request Lifecycle

```mermaid
sequenceDiagram
    participant C as Browser/Webhook
    participant E as Edge
    participant G as Gateway
    participant R as Redis
    participant A as Agent
    participant L as Local App
    participant DB as PostgreSQL

    C->>E: HTTPS request to subdomain
    E->>G: Proxy request
    G->>R: Resolve active tunnel
    G->>R: Increment daily request counter
    G->>R: Check limits
    alt Limit exceeded
        G-->>C: 429 Too Many Requests
    else Allowed
        G->>A: Send logical stream/request
        A->>L: Request localhost
        L-->>A: Response
        A-->>G: Response
        G->>R: Increment bandwidth counters
        G->>DB: Persist request metadata
        G-->>C: Response
    end
```

## 2. Required Request Metadata

At minimum:

- request ID
- tunnel ID
- user ID
- timestamp
- method
- path
- host
- status code
- request size
- response size
- latency
- hashed client IP

## 3. Body Storage

MVP should not persist request/response bodies by default.

For future inspector/replay:

- explicit opt-in body capture
- size cap
- content-type allowlist
- retention limit
- masking of sensitive headers

## 4. WebSocket

For WebSocket:

```text
Browser
  |
  | Upgrade
  v
Gateway
  |
  | logical tunnel stream
  v
Agent
  |
  v
localhost WebSocket server
```

The tunnel must preserve upgrade semantics and bidirectional frames.

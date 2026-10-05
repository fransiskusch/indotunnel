# API Specification

Base URL:

```text
https://api.indotunnel.id
```

## 1. Authentication

CLI uses a short-lived session/access token obtained from device authentication.

Dashboard uses secure web session cookies.

## 2. Create Tunnel

```http
POST /v1/tunnels
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "local_host": "127.0.0.1",
  "local_port": 3000,
  "protocol": "http"
}
```

Response:

```json
{
  "tunnel_id": "t_8F2A91",
  "subdomain": "a8f2x",
  "public_url": "https://a8f2x.indotunnel.id",
  "status": "pending"
}
```

## 3. Connect Tunnel

Transport handshake may be HTTP/2, WebSocket, or QUIC depending on implementation.

Conceptual handshake:

```http
POST /v1/tunnels/t_8F2A91/connect
Authorization: Bearer <agent-token>
X-Client-Version: 0.1.0
X-Connection-ID: conn-8291
```

The actual data channel should be a persistent bidirectional transport.

## 4. Get Tunnel

```http
GET /v1/tunnels/:tunnel_id
```

## 5. Stop Tunnel

```http
POST /v1/tunnels/:tunnel_id/stop
```

## 6. Dashboard Usage

```http
GET /v1/usage/today
GET /v1/usage/month
```

## 7. Request Logs

```http
GET /v1/tunnels/:tunnel_id/requests
GET /v1/tunnels/:tunnel_id/requests/:request_id
```

## 8. Error Format

```json
{
  "error": {
    "code": "ACTIVE_TUNNEL_LIMIT_REACHED",
    "message": "Free plan allows one active tunnel.",
    "details": {}
  }
}
```

## 9. HTTP Statuses

| Status | Meaning |
|---:|---|
| 200 | OK |
| 201 | Created |
| 202 | Accepted / pending |
| 400 | Invalid request |
| 401 | Unauthenticated |
| 403 | Forbidden / plan restriction |
| 404 | Not found |
| 409 | Conflict / active tunnel exists |
| 429 | Rate limit |
| 502 | Tunnel offline / local service unavailable |
| 503 | Service temporarily unavailable |

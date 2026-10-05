# Redis Design

Redis is used for ephemeral state and high-frequency counters.

## 1. Active Tunnel

Key:

```text
indotunnel:tunnel:{tunnel_id}:active
```

Value:

```json
{
  "connection_id": "conn-8291",
  "edge_node": "edge-01",
  "status": "connected",
  "last_seen": "2026-10-05T10:00:00+07:00"
}
```

TTL is refreshed by heartbeat.

## 2. Daily Request Counter

```text
indotunnel:usage:{user_id}:requests:{YYYY-MM-DD}
```

Value:

```text
1283
```

Use `INCR` and expiry aligned to Asia/Jakarta day boundary.

## 3. Monthly Bandwidth Counter

```text
indotunnel:usage:{user_id}:bandwidth:{YYYY-MM}
```

Store bytes.

## 4. IP Abuse Counter

```text
indotunnel:abuse:ip:{ip}:accounts:{YYYY-MM-DD}
```

Used for account creation throttling or suspicious activity detection.

## 5. Active Tunnel Lock

```text
indotunnel:lock:user:{user_id}:active_tunnel
```

Use a short-lived distributed lock to prevent races when two CLI processes start simultaneously.

## 6. Routing Lookup

```text
indotunnel:route:{subdomain}
```

Value may point to:

```text
connection_id
edge_node
```

## 7. Source of Truth

Redis is not the long-term historical source of truth. PostgreSQL stores durable metadata and usage aggregates.

# Observability

## 1. Metrics

Track at minimum:

### Business

- registered users
- daily active users
- active tunnels
- request volume
- bandwidth

### Infrastructure

- CPU
- memory
- disk
- network in/out
- active tunnel connections
- active streams
- request latency
- 4xx rate
- 5xx rate
- Redis latency
- PostgreSQL latency

### Tunnel health

- reconnect count
- tunnel uptime
- heartbeat failures
- agent versions
- error counts by protocol

## 2. Logs

Structured JSON logs are preferred.

Every request should have a correlation ID:

```text
request_id=req_123
```

Avoid raw secrets and bodies.

## 3. Alerts

Useful alerts:

- gateway 5xx spike
- active tunnels suddenly drop
- Redis unavailable
- PostgreSQL unavailable
- network saturation
- abnormal bandwidth spike

## 4. Admin Dashboard

Later show:

```text
Active tunnels     84
Requests/min       231
Bandwidth today    19.2 GB
Gateway CPU        42%
Error rate         0.8%
```

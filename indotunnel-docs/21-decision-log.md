# Decision Log

## D-001 — Free-first launch

Decision: launch without payment initially.

Reason: collect real usage, bandwidth, retention, and demand data before locking pricing.

## D-002 — Account-based tunnel limit

Decision: Free = 1 active tunnel/account.

Reason: fairer than 1 tunnel/public-IP and works better behind NAT.

## D-003 — IP as abuse signal

Decision: IP is used for anti-abuse, not user identity.

Reason: shared networks and carrier NAT.

## D-004 — Redis for counters

Decision: high-frequency usage counters live in Redis.

Reason: avoid hitting PostgreSQL for every request.

## D-005 — PostgreSQL for durable history

Decision: PostgreSQL is source of truth for persistent metadata.

Reason: dashboard/history/billing require durable storage.

## D-006 — WebSocket for first transport

Decision: start with WebSocket; keep transport abstraction.

Reason: implementation and debugging simplicity for MVP.

## D-007 — No body storage by default

Decision: request metadata is stored; request/response bodies are not persisted by default.

Reason: privacy, storage cost, and security.

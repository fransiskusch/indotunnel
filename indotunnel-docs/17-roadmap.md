# Roadmap

## Phase 0 — Design

- finalize domain/brand
- finalize protocol
- finalize schema
- finalize limits
- establish abuse policy

## Phase 1 — Core Tunnel

Target outcome:

```bash
npx indotunnel 3000
```

and public HTTPS URL.

Scope:

- Go agent
- Go gateway
- PostgreSQL
- Redis
- wildcard DNS
- TLS
- one active tunnel/account
- HTTP forwarding
- WebSocket support
- heartbeat/reconnect

## Phase 2 — Dashboard

- login
- tunnel status
- usage
- request metadata
- request detail
- realtime state

## Phase 3 — Developer Features

- webhook inspector
- request search
- cURL copy
- webhook replay
- password protection
- custom subdomain

## Phase 4 — Monetization

- plans
- payment provider
- invoices/receipts
- quotas
- custom domains
- team/workspaces

## Phase 5 — Scale

- multiple edge nodes
- edge regions
- internal stream relay
- distributed gateway
- better abuse detection
- automated capacity management

## Suggested MVP Exit Criteria

A developer who has never seen the product can:

1. install or invoke the CLI
2. expose a local app
3. open the URL from another network
4. see requests in dashboard
5. reconnect after network interruption
6. understand when the Free quota has been reached

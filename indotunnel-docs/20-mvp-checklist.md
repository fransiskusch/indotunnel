# MVP Checklist

## Product

- [ ] Domain registered
- [ ] Brand/name finalized
- [ ] Free limits finalized
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Acceptable Use Policy
- [ ] Abuse contact

## CLI / Agent

- [ ] `npx indotunnel 3000`
- [ ] Auth
- [ ] Tunnel creation
- [ ] Persistent transport
- [ ] HTTP forwarding
- [ ] WebSocket
- [ ] Heartbeat
- [ ] Reconnect
- [ ] Graceful shutdown
- [ ] Usage output

## Gateway

- [ ] Wildcard hostname routing
- [ ] Tunnel lookup
- [ ] Stream handling
- [ ] Timeouts
- [ ] Request size limits
- [ ] Concurrent stream limit
- [ ] 429 on quota
- [ ] 502 on offline tunnel

## Backend

- [ ] PostgreSQL migrations
- [ ] Redis
- [ ] user auth
- [ ] tunnel API
- [ ] usage API
- [ ] request log API
- [ ] admin suspend capability

## Dashboard

- [ ] Login
- [ ] Active tunnel card
- [ ] Public URL copy
- [ ] Requests table
- [ ] Request detail
- [ ] Daily quota
- [ ] Monthly bandwidth
- [ ] Tunnel disconnect state
- [ ] Realtime updates

## Infrastructure

- [ ] VPS
- [ ] Docker
- [ ] NGINX
- [ ] wildcard DNS
- [ ] TLS
- [ ] PostgreSQL backup
- [ ] monitoring
- [ ] log rotation
- [ ] firewall

## Testing

- [ ] Same-network test
- [ ] Different-network test
- [ ] Mobile network test
- [ ] Webhook test
- [ ] WebSocket test
- [ ] Reconnect test
- [ ] quota test
- [ ] bandwidth test
- [ ] gateway restart test
- [ ] Redis restart test

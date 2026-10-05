# Admin Operations

## 1. User Management

Admin should be able to:

- search user
- view plan
- view active tunnel
- view daily/monthly usage
- suspend user
- revoke tokens

## 2. Tunnel Management

Admin can:

- see active tunnel
- terminate tunnel
- inspect connection metadata
- see edge node
- see agent version

## 3. Abuse Workflow

```text
signal
  |
  v
investigate metadata
  |
  +---- benign --> monitor
  |
  +---- abusive --> suspend / terminate
  |
  v
record action in audit log
```

## 4. Audit Events

Recommended event types:

```text
USER_SUSPENDED
USER_UNSUSPENDED
TOKEN_REVOKED
TUNNEL_TERMINATED
SUBDOMAIN_BLOCKED
ABUSE_REVIEWED
```

An audit log table can be added in a later migration.

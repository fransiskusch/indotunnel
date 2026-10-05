# End-to-End Example

Suppose a developer has:

```text
Next.js -> localhost:3000
```

They run:

```bash
npx indotunnel 3000
```

## Step 1 — Authentication

CLI authenticates using a device/session token.

## Step 2 — Allocation

API validates:

```text
user exists
plan = free
active tunnel = 0
```

Then creates:

```text
subdomain = a8f2x
tunnel_id = t_8F2A91
```

## Step 3 — Connection

Agent opens an outbound encrypted transport to the gateway.

## Step 4 — Public Access

Browser opens:

```text
https://a8f2x.indotunnel.id
```

DNS sends traffic to the public edge.

## Step 5 — Route

Gateway sees:

```text
Host: a8f2x.indotunnel.id
```

and resolves:

```text
a8f2x -> t_8F2A91 -> conn-8291
```

## Step 6 — Limit Check

Redis increments:

```text
indotunnel:usage:{user}:requests:2026-10-05
```

If below 5,000, traffic continues.

## Step 7 — Forward

Gateway streams the request through the existing tunnel to the agent.

Agent sends it to:

```text
http://127.0.0.1:3000
```

## Step 8 — Response

The response streams back:

```text
local app
 -> agent
 -> gateway
 -> edge
 -> browser
```

## Step 9 — Logging

Gateway records metadata such as:

```text
POST /api/webhook
status=200
duration=142ms
request_bytes=1200
response_bytes=3400
```

## Step 10 — Dashboard

Dashboard shows the new request and updated quota.

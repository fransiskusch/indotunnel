# Security and Abuse Prevention

A localhost tunnel is an abuse-sensitive service because it intentionally makes private development services public.

## 1. Threat Model

Potential abuse:

- phishing pages
- malware distribution
- scanning/proxying
- credential harvesting
- spam callbacks
- bandwidth abuse
- open proxy behavior
- tunneling unrelated services

## 2. Mandatory MVP Controls

### Authentication

- CLI must authenticate.
- Agent token must be revocable.
- Store secret hash, not raw secret.
- Use short-lived access tokens where practical.

### HTTPS

Public traffic is HTTPS by default.

### Limits

- 1 active tunnel/account for Free.
- 5.000 requests/day.
- 10 GB/month.
- bounded concurrent streams.
- request/stream timeout.

### IP abuse controls

Track IP for:

- signup velocity
- tunnel creation bursts
- suspicious traffic patterns
- operational diagnostics

Do not permanently treat an IP as a person.

## 3. Header Handling

Strip or normalize hop-by-hop headers before forwarding.

Pay attention to:

```text
Connection
Keep-Alive
Proxy-Authenticate
Proxy-Authorization
TE
Trailer
Transfer-Encoding
Upgrade
```

For `X-Forwarded-*`, define one canonical policy.

## 4. Origin Safety

The agent should connect only to the configured local target. It should not become a general-purpose open TCP proxy.

MVP target examples:

```text
127.0.0.1:3000
localhost:8000
```

Avoid arbitrary remote upstream destinations.

## 5. Sensitive Data

Do not store raw:

- Authorization header
- cookies
- API keys
- passwords
- webhook secrets
- request bodies

unless a future inspector feature explicitly captures them with user consent and retention controls.

Mask common secrets in dashboard output.

## 6. Encryption

- TLS for public endpoints.
- TLS for control API.
- TLS for agent transport in production.
- Optional per-agent identity token.

## 7. Abuse Operations

Provide admin capabilities to:

- suspend user
- revoke all tokens
- terminate tunnel
- block subdomain
- block suspicious IP range temporarily
- inspect aggregated traffic metadata

## 8. Legal / Policy Layer

Before public launch, create:

- Terms of Service
- Privacy Policy
- Acceptable Use Policy
- Abuse reporting contact

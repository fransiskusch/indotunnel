# Product Requirements

## 1. Product Overview

**Working name:** IndoTunnel

**Positioning:**

> Expose your localhost to the internet in seconds — built for Indonesian developers.

Core command:

```bash
npx indotunnel 3000
```

The developer runs an agent on their machine. The agent establishes an outbound persistent connection to IndoTunnel. A public hostname is mapped to that tunnel. Incoming public requests are forwarded through the existing outbound tunnel to the developer's local service.

## 2. Primary Users

- Web developer
- Backend developer
- Mobile developer yang membutuhkan local backend
- QA / tester
- Developer yang perlu testing webhook
- Agency / freelancer untuk demo temporary

## 3. Main Use Cases

### 3.1 Localhost sharing

Developer dapat membagikan local app ke client atau device lain.

### 3.2 Webhook testing

Public URL dapat dipakai oleh payment gateway, GitHub, messaging platform, dan provider lain untuk callback ke local service.

### 3.3 Mobile development

Device fisik dapat mengakses backend yang berjalan di laptop developer tanpa port forwarding manual.

### 3.4 Temporary demo

Developer dapat membuat URL sementara tanpa deployment.

## 4. Product Principles

- Default setup seminimal mungkin.
- TLS otomatis.
- Tidak membutuhkan public IP pada laptop.
- Tidak membutuhkan inbound port forwarding.
- Fail closed ketika tunnel tidak tersedia.
- Limit dan abuse protection aktif sejak MVP.
- Jangan menganggap IP publik sebagai identitas user.

## 5. Functional Requirements

### Account

- Register/login.
- Google/GitHub OAuth dapat ditambahkan.
- Session management.
- API key/device token untuk CLI.

### Tunnel

- Create tunnel.
- One active tunnel per Free account.
- Random subdomain.
- Connect/disconnect state.
- Heartbeat.
- Stop tunnel.
- Automatic cleanup ketika agent disconnect.

### Traffic

- HTTP forwarding.
- HTTPS public endpoint.
- WebSocket forwarding.
- Request logging.
- Status code.
- Latency.
- Request/response size.

### Dashboard

- Active tunnel.
- Public URL.
- Local target.
- Today's requests.
- Monthly bandwidth.
- Active connections.
- Request history.
- Request detail.

### Limits

- 5.000 requests/day/user.
- 10 GB bandwidth/month/user.
- 1 active tunnel/account Free.
- Basic IP abuse protection.

## 6. Non-Functional Requirements

- Agent harus ringan.
- Tunnel reconnect otomatis.
- Tidak menyimpan body request secara permanen secara default.
- Request logs memiliki retention terbatas.
- Dashboard tidak boleh mengganggu data path tunnel.
- Redis tidak boleh menjadi source of truth untuk data historis.
- PostgreSQL menjadi source of truth untuk persistent data.

## 7. Future Features

- Custom subdomain.
- Custom domain.
- Team/workspace.
- Access control.
- Password/basic auth.
- IP allowlist.
- Webhook replay.
- Request search.
- cURL export.
- Mock endpoint.
- Regional edges.
- Paid plans.

# IndoTunnel Documentation

> Public localhost tunnel service untuk developer Indonesia.

IndoTunnel adalah platform yang memungkinkan developer mengekspos service lokal ke internet melalui outbound tunnel tanpa membuka inbound port pada laptop/developer network.

Contoh penggunaan:

```bash
npx indotunnel 3000
```

Output:

```text
🚀 Tunnel started

Local:   http://localhost:3000
Public:  https://a8f2x.indotunnel.id

Press Ctrl+C to stop
```

## Tujuan MVP

MVP fokus pada tiga hal:

1. `localhost` dapat diakses dari internet melalui URL HTTPS.
2. Satu akun Free memiliki maksimal 1 active tunnel.
3. Penggunaan dikontrol melalui daily request limit dan monthly bandwidth limit.

## Free Tier MVP

| Limit | Free |
|---|---:|
| Active tunnel | 1 / account |
| Request | 5.000 / hari |
| Bandwidth | 10 GB / bulan |
| HTTPS | Ya |
| HTTP | Ya |
| WebSocket | Ya |
| Random public URL | Ya |
| Dashboard | Ya |
| Request inspector | Ya |
| Webhook replay | Ya |
| Custom subdomain | Tidak |
| Custom domain | Tidak |
| Team | Tidak |

> IP digunakan untuk abuse protection, bukan sebagai identitas utama user. Pendekatan `1 IP = 1 user` dapat bermasalah pada kantor, kampus, coworking, dan jaringan NAT.

## Suggested Stack

- Tunnel Agent: Go
- Tunnel Server: Go
- Edge/Gateway: NGINX pada fase awal, atau HAProxy/Go Gateway saat scale meningkat
- Dashboard: Next.js + TypeScript + shadcn/ui
- Database: PostgreSQL
- Fast state / counters: Redis
- Containerization: Docker
- Reverse proxy / TLS: NGINX + Let's Encrypt atau managed DNS/TLS
- Package distribution: GitHub Releases + npm wrapper (`npx indotunnel`)

## Dokumentasi

- [01 Product Requirements](./01-product-requirements.md)
- [02 Architecture](./02-architecture.md)
- [03 ERD](./erd.md)
- [04 Database Schema](./04-database-schema.md)
- [05 Tunnel Flow](./flow.md)
- [06 Request Flow](./06-request-flow.md)
- [07 CLI Specification](./07-cli-specification.md)
- [08 API Specification](./08-api-specification.md)
- [09 Tunnel Protocol](./09-tunnel-protocol.md)
- [10 Redis Design](./10-redis-design.md)
- [11 Limits & Rate Limiting](./11-limits-and-rate-limiting.md)
- [12 Security & Abuse Prevention](./12-security.md)
- [13 Dashboard](./13-dashboard.md)
- [14 Infrastructure & Deployment](./14-infrastructure.md)
- [15 Observability](./15-observability.md)
- [16 Testing Strategy](./16-testing-strategy.md)
- [17 Roadmap](./17-roadmap.md)
- [18 Business Model](./18-business-model.md)
- [19 Folder Structure](./19-folder-structure.md)
- [20 MVP Checklist](./20-mvp-checklist.md)
- [21 Decision Log](./21-decision-log.md)
- [22 Glossary](./22-glossary.md)
- [23 End-to-End Flow](./23-end-to-end-flow.md)
- [24 Admin Operations](./24-admin-operations.md)
- [25 Product Metrics](./25-product-metrics.md)
- [26 Landing Page Specification](./26-landing-page.md)

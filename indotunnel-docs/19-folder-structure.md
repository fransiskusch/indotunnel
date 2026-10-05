# Suggested Repository Structure

A monorepo is recommended initially.

```text
indotunnel/
├── apps/
│   └── dashboard/
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
│
├── services/
│   ├── api/
│   │   ├── cmd/
│   │   ├── internal/
│   │   └── migrations/
│   │
│   └── gateway/
│       ├── cmd/
│       ├── internal/
│       └── transport/
│
├── packages/
│   └── sdk/               # optional future SDK
│
├── agent/
│   ├── cmd/
│   ├── internal/
│   ├── transport/
│   └── forwarding/
│
├── deploy/
│   ├── docker/
│   ├── nginx/
│   └── compose/
│
├── docs/
│
├── scripts/
│
└── README.md
```

## Alternative

For a very small MVP, combine API and gateway in one Go service to reduce operational complexity. Split them when data-plane traffic requires independent scaling.

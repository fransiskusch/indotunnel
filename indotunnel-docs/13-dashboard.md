# Dashboard Specification

## 1. Navigation

```text
Dashboard
Tunnels
Requests
Usage
Settings
```

Admin-only later:

```text
Users
Active Tunnels
Abuse
Infrastructure
```

## 2. Dashboard Home

```text
┌────────────────────────────────────────────────┐
│ IndoTunnel                         Frans ▼    │
├────────────────────────────────────────────────┤
│                                                │
│ Active Tunnel                                  │
│                                                │
│ 🟢 Connected                                   │
│ localhost:3000                                 │
│ https://a8f2x.indotunnel.id                    │
│                                                │
│ [Copy URL] [Stop]                              │
│                                                │
├───────────────────────┬────────────────────────┤
│ Requests Today        │ Bandwidth This Month  │
│ 1,283 / 5,000         │ 248 MB / 10 GB        │
│ ███████░░░             │ ██░░░░░░░░░            │
├───────────────────────┴────────────────────────┤
│ Current Connections: 3                         │
│ Avg Latency: 128 ms                            │
└────────────────────────────────────────────────┘
```

## 3. Tunnel Page

Show:

- status
- public URL
- local target
- region
- agent version
- connected since
- current stream count
- request count
- bytes transferred

## 4. Request Page

Table:

| Time | Method | Path | Status | Duration | Size |
|---|---|---|---:|---:|---:|
| 12:12:31 | POST | /api/webhook | 200 | 142 ms | 1.2 KB |
| 12:12:29 | GET | /api/users | 200 | 81 ms | 4.8 KB |

## 5. Request Detail

Tabs:

```text
Overview
Headers
Query
Body (only if captured)
Response
```

Actions:

```text
Copy cURL
Replay (future / explicit capture)
```

## 6. Usage Page

Show:

```text
Today
Requests: 1,283 / 5,000

This month
Bandwidth: 248 MB / 10 GB

Last 7 days
Requests graph
Bandwidth graph
```

## 7. Real-time Updates

Dashboard can consume Server-Sent Events or WebSocket from the API for:

- tunnel connected/disconnected
- request count
- active connections
- latest requests

Do not stream every raw request body to the dashboard.

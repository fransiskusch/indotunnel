# indotunnel

Expose your localhost to the internet. Get a public URL for any local dev
server in one command — no SSH, no port forwarding, no DNS.

```bash
npx indotunnel 3000
```

```
IndoTunnel
────────────────────────────────
Status:   Connected
Local:    http://127.0.0.1:3000
Public:   https://a8f2x.indotunnel.id
Region:   jakarta
Plan:     Free

Press Ctrl+C to stop
```

## Install

```bash
npm install -g indotunnel   # or: npx indotunnel 3000
```

The npm package downloads the native binary for your platform from GitHub
Releases on first install or run. No Go toolchain required.

## Usage

```bash
indotunnel 3000                 # forward localhost:3000
indotunnel 127.0.0.1:8080       # explicit host
indotunnel login <api-key>      # save your API key
indotunnel --help
indotunnel --version
```

Get an API key from your dashboard, then `indotunnel login <api-key>`.

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `INDOTUNNEL_TOKEN` | API key (overrides the saved one) | — |
| `INDOTUNNEL_API` | Control API base URL | `http://localhost:8081` |
| `INDOTUNNEL_TUNNEL` | Tunnel server address | `localhost:7000` |

## Supported platforms

`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `windows-x64`.

On anything else, install from source:

```bash
go install github.com/fransiskusch/indotunnel/cmd/agent@latest
```

## License

MIT

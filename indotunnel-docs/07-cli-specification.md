# CLI Specification

## 1. Install

Preferred UX:

```bash
npx indotunnel 3000
```

Optional native binaries:

```bash
indotunnel 3000
```

## 2. Basic Commands

### Start tunnel

```bash
indotunnel 3000
```

### Explicit host

```bash
indotunnel 127.0.0.1:3000
```

### Help

```bash
indotunnel --help
```

### Version

```bash
indotunnel --version
```

### Login/device authentication

```bash
indotunnel login
```

## 3. Future Flags

```bash
indotunnel 3000 --name my-project
indotunnel 3000 --hostname my-project
indotunnel 8000 --proto http
indotunnel 3000 --inspect
indotunnel 3000 --config ./indotunnel.yml
```

Custom hostname should only be enabled when the user's plan supports it.

## 4. CLI Output

### Connected

```text
IndoTunnel
────────────────────────────────
Status:   Connected
Local:    http://localhost:3000
Public:   https://a8f2x.indotunnel.id
Region:   jakarta
Plan:     Free

Requests today:  1,283 / 5,000
Bandwidth month: 248 MB / 10 GB

Press Ctrl+C to stop
```

### Limit reached

```text
✖ Daily request limit reached.
  Used: 5,000 / 5,000
  Reset: 00:00 Asia/Jakarta
```

## 5. Credential Storage

Recommended native locations:

- Linux/macOS: user config directory with `0600` permissions.
- Windows: `%APPDATA%\\IndoTunnel`.

Do not print secrets to logs.

# Testing Strategy

## 1. Unit Tests

### Agent

- CLI parsing
- config loading
- auth token handling
- reconnect backoff
- stream multiplexing
- localhost forwarding

### Gateway

- hostname routing
- limit enforcement
- header normalization
- stream lifecycle
- timeout handling

## 2. Integration Tests

Test:

```text
Browser -> NGINX -> Gateway -> Agent -> local HTTP server
```

Also:

```text
Webhook -> public URL -> local webhook endpoint
```

## 3. WebSocket Test

Local service:

```text
localhost:3001
```

Public endpoint:

```text
wss://xxx.indotunnel.id
```

Verify bidirectional frames.

## 4. Failure Tests

Simulate:

- Wi-Fi disconnect
- laptop sleep
- process crash
- gateway restart
- Redis restart
- local app unavailable
- slow local app
- client disconnect during upload

## 5. Limit Tests

Verify exactly:

- 4,999 request -> allowed
- 5,000th request -> allowed or blocked according to chosen inclusive convention
- next request -> 429
- monthly bandwidth threshold
- second active tunnel -> rejected

Define the convention once and test it consistently.

## 6. Load Testing

Measure:

- requests/sec
- concurrent tunnels
- concurrent streams/tunnel
- bandwidth throughput
- gateway memory per connection

Do not extrapolate capacity only from CPU. Persistent connections and bandwidth are important resource dimensions.

# Tunnel Protocol

## 1. MVP Recommendation

Start with a simple persistent **WebSocket transport** for the first implementation.

Why:

- easy to implement in Go
- easy to inspect in browser/devtools
- supports bidirectional communication
- supports ping/pong
- good enough for an MVP

Keep the protocol abstract so the transport can later be replaced by HTTP/2 or QUIC.

## 2. Logical Message Envelope

Every message should contain a small envelope:

```json
{
  "type": "request_headers",
  "request_id": "req_123",
  "stream_id": "stream_1",
  "payload": {}
}
```

Suggested message types:

```text
hello
hello_ack
auth
request_headers
request_body
request_end
response_headers
response_body
response_end
websocket_open
websocket_frame
ping
pong
error
close
```

## 3. Request Example

```text
Gateway
  |
  | request_headers
  | request_body
  | request_end
  v
Agent
  |
  v
localhost
```

Response:

```text
localhost
  |
  v
Agent
  |
  | response_headers
  | response_body
  | response_end
  v
Gateway
```

## 4. Backpressure

Agent and Gateway must not buffer unlimited body data.

Use streaming with bounded buffers.

Recommended principles:

- bounded memory per stream
- max concurrent streams per tunnel
- cancel stream on client disconnect
- timeout idle streams

## 5. Heartbeat

Use transport ping/pong plus application-level presence if needed.

Suggested default:

- heartbeat every 15-30 seconds
- declare dead after several missed intervals

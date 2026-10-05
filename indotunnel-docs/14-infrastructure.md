# Infrastructure and Deployment

## 1. MVP Infrastructure

Start with a single VPS.

Suggested baseline:

```text
4 vCPU
8 GB RAM
80-160 GB SSD
Linux
```

Actual bandwidth depends on provider and usage.

## 2. Services

```text
Docker
├── nginx
├── indotunnel-api
├── redis
└── postgres
```

For higher traffic, move PostgreSQL off the gateway box first if possible.

## 3. Domains

Example:

```text
indotunnel.id
api.indotunnel.id
dashboard.indotunnel.id
*.indotunnel.id
```

## 4. Wildcard DNS

```text
*.indotunnel.id -> Edge IP
```

The gateway determines the tunnel from the hostname.

## 5. TLS

Use a wildcard certificate for public subdomains or equivalent TLS termination strategy.

## 6. NGINX Concept

```nginx
server {
    listen 443 ssl http2;
    server_name *.indotunnel.id;

    location / {
        proxy_pass http://indotunnel-gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Exact NGINX settings must be tested for WebSocket, streaming, buffering, timeout, and header behavior.

## 7. Deployment

Suggested flow:

```text
git push
   |
   v
CI build
   |
   v
Docker image
   |
   v
registry
   |
   v
VPS pull
   |
   v
docker compose up -d
```

## 8. Backup

PostgreSQL:

- daily backup
- keep multiple restore points
- test restore periodically

Redis can generally be treated as disposable for ephemeral state, provided durable aggregates exist in PostgreSQL.

## 9. Multi-node Later

```text
             DNS / LB
                |
        +-------+-------+
        |               |
     Edge-01         Edge-02
        |               |
        +-------+-------+
                |
              Redis
                |
            PostgreSQL
```

When multi-node data plane is introduced, routing must locate the agent connection on the correct edge node or implement an internal stream relay.

#!/usr/bin/env bash
# Creates the Free plan, a dev user, and one API key; prints the key once.
set -euo pipefail
cd "$(dirname "$0")/.."
export DATABASE_URL="${DATABASE_URL:-postgres://indotunnel:indotunnel@localhost:55432/indotunnel?sslmode=disable}"
exec go run ./cmd/seed

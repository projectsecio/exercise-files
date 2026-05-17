#!/usr/bin/env bash
# Prefer Docker Compose V2 (`docker compose`). Legacy apt `docker-compose` 1.29.x
# often breaks with: Not supported URL scheme http+docker
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${ROOT}/docker/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  exec docker compose -f "$COMPOSE_FILE" "$@"
fi

if command -v docker-compose >/dev/null 2>&1; then
  if docker-compose version 2>&1 | grep -q '1.29'; then
    echo "Error: system docker-compose 1.29.x is incompatible with current Python urllib3." >&2
    echo "Install Compose V2, then re-run:" >&2
    echo "  sudo apt update && sudo apt install -y docker-compose-plugin" >&2
    echo "  docker compose version" >&2
    echo "  npm run docker:up" >&2
    exit 1
  fi
  exec docker-compose -f "$COMPOSE_FILE" "$@"
fi

echo "Error: Docker Compose V2 not found. Install docker-compose-plugin (see docker setup guide)." >&2
exit 1

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

# Preflight: fail fast with WSL/Desktop guidance when the daemon is unreachable.
if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not reachable (docker info failed)." >&2
  if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "" >&2
    echo "WSL + Docker Desktop: apt docker.io often conflicts with Desktop." >&2
    echo "  1. Start Docker Desktop on Windows." >&2
    echo "  2. Settings → Resources → WSL integration → enable this distro." >&2
    echo "  3. Stop native Docker in WSL (then restart Docker Desktop):" >&2
    echo "       sudo systemctl stop docker" >&2
    echo "       sudo systemctl disable docker" >&2
    echo "  4. Verify: docker version  (must show Client AND Server)" >&2
    echo "" >&2
    echo "Or run the lab from PowerShell (where Docker Desktop works):" >&2
    echo "  docker compose -f docker/docker-compose.yml up --build" >&2
  fi
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

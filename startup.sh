#!/usr/bin/env bash
# =============================================================================
# Dyno Annotation Platform — Frontend Startup Script
# =============================================================================
# Usage:
#   ./startup.sh            → start with Docker (recommended)
#   ./startup.sh --local    → start locally with npm run dev (hot-reload)
#   ./startup.sh --build    → build production bundle + start
# =============================================================================
# Prerequisites:
#   Backend must be running first. See ../dyno-annotation-platform-backend-main/startup.sh
# =============================================================================

set -e

MODE="${1:-}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { echo -e "\033[0;34m[startup]\033[0m $*"; }
ok()   { echo -e "\033[0;32m[  OK  ]\033[0m $*"; }
fail() { echo -e "\033[0;31m[ FAIL ]\033[0m $*"; exit 1; }

BACKEND_URL="${NEXT_PUBLIC_API_URL:-http://localhost:5000}"

# ── Check backend is reachable ─────────────────────────────────────────────────
check_backend() {
  if command -v curl >/dev/null 2>&1; then
    curl -sf "$BACKEND_URL/" >/dev/null 2>&1 && return 0
  fi
  return 0   # skip check if curl not available
}

# ── Mode: local (hot-reload dev server) ──────────────────────────────────────
if [ "$MODE" = "--local" ]; then
  log "Starting frontend in dev mode..."
  cd "$PROJECT_ROOT"
  npm install
  NEXT_PUBLIC_API_URL="$BACKEND_URL" npm run dev
  exit 0
fi

# ── Mode: build (production Next.js build) ───────────────────────────────────
if [ "$MODE" = "--build" ]; then
  log "Building production frontend..."
  cd "$PROJECT_ROOT"
  npm install
  NODE_OPTIONS="--max-old-space-size=2048" NEXT_PUBLIC_API_URL="$BACKEND_URL" npm run build
  ok "Build complete. Starting production server..."
  NEXT_PUBLIC_API_URL="$BACKEND_URL" npm start
  exit 0
fi

# ── Mode: Docker (default) ────────────────────────────────────────────────────
log "Starting frontend with Docker Compose..."

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker info >/dev/null 2>&1       || fail "Docker daemon is not running. Start Docker Desktop first."

cd "$PROJECT_ROOT"

docker compose build \
  --build-arg NEXT_PUBLIC_API_URL="$BACKEND_URL" \
  --no-cache

docker compose up -d

log "Waiting for frontend to start..."
sleep 10

if curl -sf http://localhost:3000/ >/dev/null 2>&1; then
  ok "Frontend is running!"
else
  log "Container started (may still be warming up)..."
  docker compose logs --tail=10 frontend
fi

echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  $BACKEND_URL"
echo ""
echo "  Logs:     docker compose logs -f frontend"
echo "  Stop:     docker compose down"

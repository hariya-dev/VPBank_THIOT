#!/bin/bash
# ============================================================
# IoT Monitoring — Deployment Script
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║      IoT Monitoring — Deployment                 ║"
echo "╚══════════════════════════════════════════════════╝"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Step 1: Pre-flight checks ──
step "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || fail "Docker not found"
command -v docker compose >/dev/null 2>&1 || fail "Docker Compose not found"
echo "  Docker: $(docker --version | cut -d' ' -f3)"

# ── Step 2: Copy env if not exists ──
if [ ! -f .env ]; then
    warn ".env file not found, copying from .env.example"
    cp .env.example .env
    warn "Please edit .env with your production values!"
fi

# ── Step 3: Build and start ──
step "Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

step "Starting services..."
docker compose -f docker-compose.prod.yml up -d

# ── Step 4: Wait for healthy ──
step "Waiting for services to become healthy..."
for i in $(seq 1 30); do
    if docker compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# ── Step 5: Status ──
step "Service status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                            ║"
echo "║                                                  ║"
echo "║  Dashboard:  http://localhost:${DASHBOARD_PORT:-80}              ║"
echo "║  API Docs:   http://localhost:${DASHBOARD_PORT:-80}/api         ║"
echo "║  Health:     http://localhost:${DASHBOARD_PORT:-80}/health      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
warn "IMPORTANT: Run deploy/create-database.sql on your SQL Server first!"
warn "Then run deploy/sql-optimization.sql for performance indexes."

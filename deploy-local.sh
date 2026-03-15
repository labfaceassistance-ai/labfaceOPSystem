#!/bin/bash
set -e

echo "======================================"
echo "LabFace Local Development (WSL/Linux)"
echo "======================================"

# Try docker compose (v2) first, then docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

PROJECT_NAME="labface-local"

echo "Step 1: Starting Services (Local Mode)..."
# --build is optional here, but we keep it to ensure images exist.
# -d: Detached mode
$DOCKER_COMPOSE_CMD -p $PROJECT_NAME -f docker-compose.local.yml up -d

echo ""
echo "✅ Local Environment Started!"
echo "Main App: http://localhost:8080"
echo "API Docs: http://localhost:8080/api/docs (if backend supports it)"
echo "MinIO Console: http://localhost:9001"
echo ""
echo "Monitor logs with: $DOCKER_COMPOSE_CMD -p $PROJECT_NAME -f docker-compose.local.yml logs -f"

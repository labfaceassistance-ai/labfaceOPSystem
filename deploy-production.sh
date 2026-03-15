#!/bin/bash
set -e

echo "======================================"
echo "LabFace Production Deployment (WSL/Linux)"
echo "======================================"

# Ensure .env.prod exists
if [ ! -f .env.prod ]; then
    echo "Error: .env.prod not found!"
    exit 1
fi

# Try docker compose (v2) first, then docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi


# Define a fresh project name to avoid state corruption from previous 'labface' deployments
PROJECT_NAME="labface-prod-stable"

echo "Step 1: Updating Services (Hot Reload)..."

# Check if the AI base image exists (just a warning now)
if ! docker image inspect labface-ai-base:latest > /dev/null 2>&1; then
    echo "⚠️  WARNING: AI base image 'labface-ai-base:latest' not found!"
    echo "    This deployment might fail or be very slow."
    echo "    Run 'bash setup-ai-base.sh' first if this is a fresh install."
fi

# Standard Docker Compose Up
# --build: Rebuilds ONLY modified layers (fast because base is cached)
# -d: Detached mode
# --remove-orphans: Cleans up old containers without deleting data
$DOCKER_COMPOSE_CMD -p $PROJECT_NAME -f docker-compose.production.yml --env-file .env.prod up -d --build --remove-orphans

# Step 2: Cleaning up (Safe Storage Recovery)...
# Pruning is disabled by default to keep builds FAST. 
# Enable these only if you are running out of disk space (100GB+).
# docker image prune -a -f --filter "label=com.docker.compose.project=$PROJECT_NAME" >/dev/null 2>&1 || true
# docker builder prune -a -f >/dev/null 2>&1 || true
# docker volume prune -f >/dev/null 2>&1 || true


echo ""
echo "✅ Deployment Updated & Cleaned!"
echo "Monitor logs with: $DOCKER_COMPOSE_CMD -f docker-compose.production.yml logs -f"
echo "Visit: https://labface.site"

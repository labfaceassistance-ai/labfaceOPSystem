#!/bin/bash

# LabFace Fast Local Deployment Script
# Optimized for WSL 2 -> Mobile testing

PROJECT_NAME="labface-prod"
export BUILD_ID=${BUILD_ID:-"local-$(date +%s)"}
DC="docker compose"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO] $1${NC}"; }
success() { echo -e "${GREEN}[SUCCESS] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }

# 1. Stop the tunnel if it's running (optional, keeps things clean)
info "Stopping tunnel to save resources..."
$DC -p "$PROJECT_NAME" stop tunnel 2>/dev/null || true

# 2. Build only what changed (Parallel)
info "Building core services (Nginx, Frontend, Backend)..."
$DC -p "$PROJECT_NAME" build --parallel nginx frontend backend ai-service

# 3. Start services
info "Starting core services..."
$DC -p "$PROJECT_NAME" up -d nginx frontend backend ai-service mariadb minio

# 4. Reload Nginx (Mandatory for WSL IP resolution)
info "Refreshing Nginx upstream connections..."
docker exec labface-prod-nginx-1 nginx -s reload 2>/dev/null || true

# 5. Show connection info
IP_ADDR=$(ipconfig.exe | grep -A 5 "Wi-Fi" | grep "IPv4" | head -n 1 | awk '{print $NF}' | tr -d '\r')
if [ -z "$IP_ADDR" ]; then
    IP_ADDR="[YOUR-LAPTOP-IP]"
fi

echo ""
echo "=============================================="
success "Local Deployment Complete!"
echo "----------------------------------------------"
echo "Laptop: http://localhost:8090"
echo "Mobile: http://$IP_ADDR:8090"
echo "=============================================="
echo "Note: If mobile fails, run the netsh command in Admin PowerShell."

#!/bin/bash
# =============================================================================
# LabFace — Production Deployment Script
# =============================================================================
# This single script handles EVERYTHING for a fresh or existing deployment:
#   1. Docker Engine installation (if not present)
#   2. AI Service base image build (one-time, cached for future deploys)
#   3. Docker volume creation (persistent data)
#   4. Full application deployment
#
# USAGE (inside Ubuntu WSL terminal, from the project root):
#   bash deploy.sh
#
# REQUIREMENTS:
#   - Ubuntu 22.04+ (WSL2 or native Linux)
#   - A configured .env file in the project root (copy from .env.example)
#   - Internet access (only needed the very first time)
# =============================================================================

set -e  # Exit immediately on any error

# ── Color helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "=============================================="
echo "  LabFace — Production Deployment"
echo "=============================================="
echo ""

# ── STEP 1: Docker Engine ──────────────────────────────────────────────────────
info "Step 1: Checking Docker Engine..."

if ! command -v docker &>/dev/null; then
    warn "Docker not found. Installing Docker Engine (Ubuntu/Debian)..."

    sudo apt-get update -qq
    sudo apt-get install -y -qq ca-certificates curl gnupg

    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    sudo usermod -aG docker "$USER"
    success "Docker installed."
    warn "NOTE: You may need to log out and back in for group permissions to apply."
    warn "      If the next steps fail with permission errors, run: newgrp docker"
else
    success "Docker already installed: $(docker --version)"
fi

# Ensure Docker daemon is running
if ! docker info &>/dev/null; then
    info "Starting Docker daemon..."
    sudo service docker start
    sleep 3
    docker info &>/dev/null || error "Docker daemon failed to start. Try: sudo service docker start"
fi
success "Docker daemon is running."

# Detect docker compose command (v2 plugin vs legacy v1)
if docker compose version &>/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
else
    error "docker compose not found. Please re-run this script to reinstall Docker."
fi

# ── STEP 2: Environment File ───────────────────────────────────────────────────
info "Step 2: Checking environment configuration..."

if [ ! -f .env ]; then
    error ".env file not found!\n\n  Please create a .env file in the project root.\n  Copy .env.example as a starting point:\n    cp .env.example .env\n  Then fill in your values (DB passwords, RTSP URLs, Cloudflare token, etc.)"
fi
success ".env found."

# ── STEP 2b: AI Model Weights ─────────────────────────────────────────────────
info "Step 2b: Checking for AI model weights..."

if [ ! -f "ai-service/models/weights/GFPGANv1.4.pth" ]; then
    warn "AI model weights missing! This will cause slow startup (5-10 min download)."
    echo "  You can pre-download them now to ensure instant-on deployment."
    read -p "  Download models now? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bash ai-service/fetch_models.sh
    fi
else
    success "AI model weights found (pre-downloaded)."
fi

# ── STEP 2c: Service Worker Versioning ─────────────────────────────────────────
info "Step 2c: Bumping Service Worker version..."

BUILD_ID=$(date +%Y%m%d-%H%M%S)
export BUILD_ID=$BUILD_ID
SW_FILE="frontend/public/sw.js"
VERSION_FILE="frontend/utils/version.ts"

if [ -f "$SW_FILE" ]; then
    # Use sed to replace the CACHE_NAME version with a timestamp-based version
    # Matches patterns like labface-v1, labface-v2, etc.
    sed -i "s/const CACHE_NAME = 'labface-v[0-9]\.[^']*'/const CACHE_NAME = 'labface-v2\.$BUILD_ID'/g" "$SW_FILE"
    
    # Also update the frontend version file for cache busting
    if [ -f "$VERSION_FILE" ]; then
        echo "export const BUILD_ID = '$BUILD_ID';" > "$VERSION_FILE"
        success "Service Worker and Frontend bumped to version: v1.$BUILD_ID"
    else
        warn "Version file not found at $VERSION_FILE. Skipping frontend bump."
    fi

    # Write a static version.txt that the browser polls every 60s
    # This is the zero-cost auto-cache mechanism — no backend needed
    echo "$BUILD_ID" > "frontend/public/version.txt"
    success "Wrote version.txt for browser auto-cache polling: $BUILD_ID"
else
    warn "Service Worker file not found at $SW_FILE. Skipping version bump."
fi

# ── STEP 3: Docker Volumes (Persistent Data) ──────────────────────────────────
info "Step 3: Ensuring persistent data volumes exist..."

for VOLUME in labface_mariadb_data labface_minio_data; do
    if ! docker volume inspect "$VOLUME" &>/dev/null; then
        docker volume create "$VOLUME"
        success "Created volume: $VOLUME"
    else
        success "Volume already exists: $VOLUME"
    fi
done

# ── STEP 3b: Remove stale containers from old deployments ─────────────────────
# Old containers (e.g. from a previous project name without "-prod-") hold
# Aria/InnoDB file locks on the shared MariaDB volume, preventing the new
# container from ever acquiring them. Stop and remove them first.
info "Step 3b: Cleaning up stale containers from old deployments..."

STALE=$(docker ps -aq --filter name=labface --filter status=running | xargs -I{} docker inspect {} \
    --format '{{.Name}} {{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null \
    | grep -v "labface-prod" | awk '{print $1}' | tr -d '/')

if [ -n "$STALE" ]; then
    for CONTAINER in $STALE; do
        warn "Stopping stale container: $CONTAINER"
        docker stop "$CONTAINER" &>/dev/null && docker rm "$CONTAINER" &>/dev/null || true
    done
    success "Stale containers removed."
else
    success "No stale containers found."
fi

# ── STEP 4: AI Service Base Image (One-Time, Cached) ──────────────────────────
info "Step 4: Checking AI Service base image..."

if ! docker image inspect labface-ai-base:latest &>/dev/null; then
    warn "AI base image not found. Building it now (this runs ONCE and takes 10-20 min)..."
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  The AI base image pre-installs all Python dependencies  │"
    echo "  │  (PyTorch, InsightFace, OpenCV, etc.) so that future     │"
    echo "  │  deploys are fast. This only runs on a fresh machine.    │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""

    # Step 4a: Download Python wheels (offline-safe builds)
    info "Step 4a: Downloading Python package wheels..."

    mkdir -p ai-service/packages

    if [ -z "$(ls -A ai-service/packages 2>/dev/null)" ]; then
        info "Downloading packages via temporary Docker container..."
        docker run --rm \
            -v "$(pwd)/ai-service:/app" \
            -w /app \
            python:3.10-slim bash -c "
                set -e
                apt-get update -qq && apt-get install -y -qq --no-install-recommends \
                    build-essential python3-dev libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev git
                pip install --upgrade pip setuptools wheel -q
                echo 'Downloading base packages...'
                pip download --dest packages --prefer-binary --retries 10 --timeout 120 -q \
                    cython 'numpy<2'
                echo 'Downloading PyTorch (large file, may take several minutes)...'
                pip download --dest packages --prefer-binary --retries 20 --timeout 1200 -q \
                    torch==2.1.0 torchvision==0.16.0
                echo 'Downloading remaining AI dependencies...'
                grep -v '^torch' requirements.txt > /tmp/requirements_light.txt
                pip download --dest packages --prefer-binary --retries 20 --timeout 1200 -q \
                    -r /tmp/requirements_light.txt
                chmod -R 777 packages
                echo 'Download complete.'
            "
        success "AI packages downloaded to ai-service/packages/"
    else
        success "Using cached packages in ai-service/packages/"
    fi

    # Step 4b: Build the base image
    info "Step 4b: Building labface-ai-base Docker image..."
    DOCKER_BUILDKIT=1 docker build \
        -f ai-service/ai-base.Dockerfile \
        -t labface-ai-base:latest \
        ai-service/
    success "AI base image built: labface-ai-base:latest"
else
    success "AI base image already exists. Skipping rebuild."
    echo "  (To force a rebuild after requirements.txt changes, run:"
    echo "   docker rmi labface-ai-base:latest && bash deploy.sh)"
fi

# ── STEP 5: Deploy All Services ────────────────────────────────────────────────
info "Step 5: Deploying all services..."
echo ""

PROJECT_NAME="labface-prod"

$DC \
    -p "$PROJECT_NAME" \
    -f docker-compose.yml \
    --env-file .env \
    up -d --build --remove-orphans

# ── STEP 6: Status ─────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
success "LabFace deployed successfully!"
echo "=============================================="
echo ""
echo "  Running containers:"
docker ps --filter "name=${PROJECT_NAME}" --format "  • {{.Names}} ({{.Status}})"
echo ""
echo "  Access the application:"
echo "    Local:      http://localhost:8090"
echo "    Production: https://labface.site"
echo ""
echo "  Useful commands:"
echo "    View logs:       $DC -p $PROJECT_NAME logs -f"
echo "    Stop all:        $DC -p $PROJECT_NAME down"
echo "    Restart service: $DC -p $PROJECT_NAME restart backend"
echo ""

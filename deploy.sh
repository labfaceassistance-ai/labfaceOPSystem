#!/bin/bash
# =============================================================================
# LabFace — Production Deployment Script
# =============================================================================
# Optimized for:
#   - Speed: Selective builds, stable BUILD_ID, and parallel execution.
#   - Storage: Automatic aggressive pruning of old images and build cache.
# =============================================================================

set -e  # Exit immediately on any error

# Parse arguments
FAST=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -f|--fast) FAST=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Enable BuildKit and disable slow/bulky metadata
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILD_CHECKS=0

# ── Color helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "=============================================="
echo "  LabFace — Production Deployment"
echo "=============================================="
echo ""

# ── STEP 1: Docker Engine ──────────────────────────────────────────────────────
info "Step 1: Checking Docker Engine..."

if [ "$FAST" = "true" ]; then
    info "Skipping Docker Engine check (FAST mode)."
elif ! command -v docker &>/dev/null; then
    warn "Docker not found. Installing Docker Engine..."
    sudo apt-get update -qq && sudo apt-get install -y -qq ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq && sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    success "Docker installed."
else
    success "Docker already installed."
fi

# Ensure Docker daemon is running
if ! docker info &>/dev/null; then
    info "Starting Docker daemon..."
    sudo service docker start
    sleep 3
fi
success "Docker daemon is running."

# Detect docker compose command
if docker compose version &>/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

# ── STEP 2: BUILD_ID & Versioning (Stable Hash) ───────────────────────────────
info "Step 2: Generating stable BUILD_ID..."

if command -v git &>/dev/null && git rev-parse --is-inside-work-tree &>/dev/null; then
    # Base ID from the latest commit
    COMMIT_ID=$(git rev-parse --short HEAD)
    # Check for uncommitted changes to force a unique ID when "dirty"
    if [ -n "$(git status --porcelain)" ]; then
        # Create a hash of the actual changes (staged and unstaged)
        DIRTY_HASH=$( (git diff; git diff --cached) | cksum | awk '{print $1}')
        NEW_BUILD_ID="${COMMIT_ID}-dirty-${DIRTY_HASH}"
    else
        NEW_BUILD_ID=$COMMIT_ID
    fi
else
    # Fallback for environments without Git: hash the directory structure
    NEW_BUILD_ID=$(find frontend backend ai-service -maxdepth 2 -not -path '*/.*' | cksum | awk '{print $1}')
fi

BUILD_ID=$NEW_BUILD_ID
export BUILD_ID=$BUILD_ID
SW_FILE="frontend/public/sw.js"
VERSION_FILE="frontend/utils/version.ts"
VERSION_TXT="frontend/public/version.txt"

if [ ! -f "$VERSION_TXT" ] || [ "$(cat $VERSION_TXT)" != "$BUILD_ID" ]; then
    info "Code changes detected. Updating version files to: $BUILD_ID"
    [ -f "$SW_FILE" ] && sed -i "s/const CACHE_NAME =.*/const CACHE_NAME = 'labface-v2.$BUILD_ID';/g" "$SW_FILE"
    [ -f "$VERSION_FILE" ] && echo "export const BUILD_ID = '$BUILD_ID';" > "$VERSION_FILE"
    echo "$BUILD_ID" > "$VERSION_TXT"
    success "Version bumped."
else
    info "Code unchanged. Skipping version bump to preserve Docker cache."
fi

# ── STEP 3: AI Base Image Check (CRITICAL) ───────────────────────────────────
info "Step 3: Checking AI Service base image..."
if ! docker image inspect labface-ai-base:latest &>/dev/null; then
    warn "AI base image missing! Rebuilding..."
    docker build -f ai-service/ai-base.Dockerfile -t labface-ai-base:latest ai-service/
    success "AI base image restored."
else
    success "AI base image found."
fi

# ── STEP 4: Analyzing changes for Smart Build ──────────────────────────────────
info "Step 4: Analyzing changes for Smart Build..."

SERVICES_TO_BUILD=""
for DIR in frontend backend ai-service nginx; do
    # Use -prune to COMPLETELY skip entering node_modules and other large folders.
    # This makes the scan instant instead of minutes.
    if [ ! -f "$DIR/.last_build" ] || [ -n "$(find "$DIR" \
        -path "$DIR/node_modules" -prune -o \
        -path "$DIR/.next" -prune -o \
        -path "$DIR/.venv" -prune -o \
        -path "$DIR/.*" -prune -o \
        -type f -newer "$DIR/.last_build" -print | head -n 1)" ]; then
        SERVICES_TO_BUILD="$SERVICES_TO_BUILD $DIR"
    fi
done

if [ -z "$SERVICES_TO_BUILD" ]; then
    info "No code changes detected. Skipping builds."
    BUILD_SKIP=true
else
    info "Services to build: $SERVICES_TO_BUILD"
    BUILD_SKIP=false
fi

# ── STEP 5: Reclaiming storage ───────────────────────────────────────────────
info "Step 5: Reclaiming storage..."
docker image prune -f &>/dev/null || true
docker builder prune -f --filter "until=24h" &>/dev/null || true
success "Storage cleaned."

# ── STEP 6: Deploy ─────────────────────────────────────────────────────────────
info "Step 6: Deploying services..."

PROJECT_NAME="labface-prod"

if [ "$BUILD_SKIP" = "false" ]; then
    info "Step 6a: Building changed services..."
    $DC -p "$PROJECT_NAME" -f docker-compose.yml --env-file .env \
        build --provenance=false --sbom=false $SERVICES_TO_BUILD
    
    # CRITICAL: If frontend is rebuilt, we MUST purge the named volumes
    # so that Docker re-copies the fresh assets from the new image.
    if [[ $SERVICES_TO_BUILD == *"frontend"* ]]; then
        info "Frontend changed. Purging stale volumes to prevent 404s..."
        $DC -p "$PROJECT_NAME" down frontend nginx 2>/dev/null || true
        docker volume rm "${PROJECT_NAME}_frontend-static" "${PROJECT_NAME}_frontend-public" 2>/dev/null || true
        success "Stale volumes purged."
    fi
    
    for DIR in $SERVICES_TO_BUILD; do touch "$DIR/.last_build"; done
fi

info "Step 6b: Starting containers..."
$DC -p "$PROJECT_NAME" -f docker-compose.yml --env-file .env up -d --remove-orphans

if [ "$BUILD_SKIP" = "false" ]; then
    info "Step 6c: Purging Nginx cache and reloading..."
    # Clear Nginx disk cache to ensure stale HTML is not served
    docker exec labface-prod-nginx-1 rm -rf /var/cache/nginx/* || true
    docker exec labface-prod-nginx-1 nginx -s reload || true
fi

echo ""
echo "=============================================="
success "LabFace deployed successfully!"
echo "=============================================="
echo ""
docker ps --filter "name=${PROJECT_NAME}" --format "  • {{.Names}} ({{.Status}})"
echo ""

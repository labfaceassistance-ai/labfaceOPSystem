#!/bin/bash
# =============================================================================
# LabFace — AI Model Downloader
# =============================================================================
# This script pre-downloads heavy model weights (approx 500MB) to the host.
# This prevents the AI Service from stalling during deployment.
# =============================================================================

# Colors
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }

MODEL_DIR="ai-service/models/weights"
mkdir -p "$MODEL_DIR"

# 1. GFPGAN v1.4 Main Weight
if [ ! -f "$MODEL_DIR/GFPGANv1.4.pth" ]; then
    info "Downloading GFPGAN v1.4 (Main Brain)..."
    curl -L "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth" -o "$MODEL_DIR/GFPGANv1.4.pth"
else
    success "GFPGAN v1.4 already exists."
fi

# 2. Face Detection Weight (Facexlib)
if [ ! -f "$MODEL_DIR/detection_Resnet50_Final.pth" ]; then
    info "Downloading Face Detection model..."
    curl -L "https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth" -o "$MODEL_DIR/detection_Resnet50_Final.pth"
else
    success "Detection model already exists."
fi

# 3. Parsing Weight (Facexlib)
if [ ! -f "$MODEL_DIR/parsing_parsenet.pth" ]; then
    info "Downloading Face Parsing model..."
    curl -L "https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth" -o "$MODEL_DIR/parsing_parsenet.pth"
else
    success "Parsing model already exists."
fi

echo ""
success "All models are ready in $MODEL_DIR"

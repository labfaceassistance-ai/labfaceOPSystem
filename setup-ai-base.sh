#!/bin/bash
set -e

echo "========================================"
echo "Building AI Service Base Image (One-Time)"
echo "========================================"

cd ai-service

echo "Step 1: Downloading dependencies..."
# Check if packages directory has content, if not (or if forced), run download
if [ -z "$(ls -A packages 2>/dev/null)" ]; then
    echo "Packages not found locally. Downloading..."
    cd ..
    bash download-wheels.sh
    cd ai-service
else
    echo "Packages found in ./packages. Using cached files."
fi

echo "Step 2: Building labface-ai-base:latest..."
echo "Building from local packages..."
DOCKER_BUILDKIT=1 docker build -f ai-base.Dockerfile -t labface-ai-base:latest .

echo ""
echo "✅ Base image built successfully!"
echo "This image contains all AI dependencies and will be reused across deployments."
echo ""
echo "To rebuild this base image (only needed when requirements.txt changes):"
echo "  bash setup-ai-base.sh"

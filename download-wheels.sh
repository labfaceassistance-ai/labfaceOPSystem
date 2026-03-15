#!/bin/bash
set -e

echo "========================================"
echo "Downloading AI Service Dependencies"
echo "========================================"

mkdir -p ai-service/packages

echo "Starting download container..."
echo "This will download all Python packages to ./ai-service/packages"
echo "Cleaning up old packages first..."
rm -rf ai-service/packages/*
echo "Once downloaded, these files will be used for offline builds."

# Use the same python version as the target
# We mount the current directory to /app so we can access requirements.txt and save to packages/
# We install build dependencies inside this temporary container just in case some packages need to build wheels

docker run --rm -v "$(pwd)/ai-service:/app" -w /app python:3.10-slim bash -c "
    set -e
    echo 'Updating apt...'
    apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        python3-dev \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libxcb1 \
        git

    echo 'Upgrading pip...'
    pip install --upgrade pip setuptools wheel

    echo 'Downloading packages...'
    # Download packages to ./packages directory
    # We use --prefer-binary to get pre-built wheels when possible
    pip download \
        --dest packages \
        --prefer-binary \
        --retries 10 \
        --timeout 120 \
        cython 'numpy<2'
        
    # Separate the really big packages (Torch) to download first with max retries
    echo 'Downloading PyTorch (Large file - may take time)...'
    pip download \
        --dest packages \
        --prefer-binary \
        --retries 20 \
        --timeout 1200 \
        torch==2.1.0 torchvision==0.16.0

    echo 'Downloading other dependencies...'
    # Download everything else (filtering out torch since we got it)
    grep -v "torch" requirements.txt > requirements_light.txt
    pip download \
        --dest packages \
        --prefer-binary \
        --retries 20 \
        --timeout 1200 \
        -r requirements_light.txt

    
    echo 'Download complete!'
    # Fix ownership of downloaded files (docker runs as root)
    chmod -R 777 packages
"

echo ""
echo "✅ All dependencies downloaded to ./ai-service/packages"
echo "You can now run 'bash setup-ai-base.sh' to build the base image offline."

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*

# Set model cache directories
ENV INSIGHTFACE_HOME=/app/models/insightface
ENV TORCH_HOME=/app/models/torch
ENV GFPGAN_CACHE=/app/models/gfpgan
ENV PIP_CACHE_DIR=/app/.cache/pip

# Copy only requirements first for better caching
COPY requirements.txt .

# Install all Python dependencies
# We use a bind mount for /packages to avoid permanently copying 7GB of wheels into the image layers.
# This significantly reduces the final image size.
RUN --mount=type=bind,source=packages,target=/packages \
    --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel --no-index --find-links=/packages && \
    pip install cython "numpy<2" --no-index --find-links=/packages && \
    pip install torch torchvision --no-index --find-links=/packages && \
    pip install --no-index --find-links=/packages -r requirements.txt

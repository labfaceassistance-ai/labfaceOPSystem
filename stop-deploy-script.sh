#!/bin/bash
echo "🛑 Stopping Deployment Script..."

# Use pkill to find and kill the specific script process (and its children)
# -f matches the full command line
pkill -f "deploy-production.sh"

# Also try to kill the current docker compose build process if it was spawned by the script
# This prevents a "zombie" build from continuing in the background
pkill -f "docker compose.*build"

echo "✅ Deployment stopped."

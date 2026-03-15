#!/bin/bash
set -e

echo "Updating apt..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

echo "Adding Docker Key..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "Adding Docker Repo..."
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Installing Docker Engine..."
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "Starting Docker..."
sudo service docker start

echo "Adding user to docker group..."
sudo usermod -aG docker $USER

echo "✅ Done! Please LOG OUT and LOG BACK IN (or close/open terminal) for permissions to work."

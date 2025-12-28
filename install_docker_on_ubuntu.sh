#!/bin/bash

set -e

if grep -qi "ubuntu" /etc/os-release; then
    echo "Confirmed we're running on Ubuntu. Proceeding..."
else
    echo "Ubuntu was not detected. See https://docs.docker.com/engine/install/ for docker installation instructions on other distributions."
    exit 1
fi


export DEBIAN_FRONTEND=noninteractive

echo "****************** Removing existing packages (if any)..."
apt-get remove -y docker docker-engine docker.io containerd runc || true
echo "****************** Updating package list..."
apt-get update
echo "****************** Installing prerequisites..."
apt-get install -y ca-certificates curl gnupg
echo "****************** Adding Docker repo to package source list..."
mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --yes --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
echo "****************** Updating package list (again)..."
apt-get update
echo "****************** Installing Docker..."
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
echo '****************** Running Docker "Hello World" test...if you see a "Hello From Docker!" message, the test was successful...'
docker run hello-world
echo "****************** Script complete, exiting."

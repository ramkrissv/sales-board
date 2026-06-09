#!/bin/bash
set -e

# Galent AI EC2 Deployment Script
# Usage: ./scripts/deploy-ec2.sh <EC2_HOST>

EC2_HOST=${1:-"your-ec2-host"}
EC2_USER="ubuntu"
APP_DIR="/home/ubuntu/galent-ai"

echo "🚀 Deploying Galent AI to EC2..."

# 1. Build Docker image locally
echo "📦 Building Docker image..."
docker build -t galent-ai:latest .

# 2. Save and transfer image
echo "📤 Transferring image to EC2..."
docker save galent-ai:latest | gzip | ssh ${EC2_USER}@${EC2_HOST} "gunzip | docker load"

# 3. Transfer docker-compose
echo "📄 Transferring compose file..."
scp docker-compose.yml ${EC2_USER}@${EC2_HOST}:${APP_DIR}/

# 4. Start services on EC2
echo "🔄 Starting services..."
ssh ${EC2_USER}@${EC2_HOST} "cd ${APP_DIR} && docker compose down && docker compose up -d"

echo "✅ Deployment complete! App running at http://${EC2_HOST}:3000"

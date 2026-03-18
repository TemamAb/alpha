#!/bin/bash
#
# Alpha-Orion One-Click Deployment Script
# Deploys the official dashboard to Google Cloud Run with a single command
#
# Usage: ./deploy-gcp-run.sh
#
# Prerequisites:
#   1. Google Cloud SDK installed
#   2. Docker installed
#   3. GCP project configured
#

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-alpha-orion}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="alpha-orion-dashboard"
IMAGE_NAME="alpha-orion-frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          Alpha-Orion One-Click GCP Cloud Run Deploy          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/5]${NC} Checking prerequisites..."

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ Error: gcloud CLI not found${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Error: Docker not found${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Get current project or use default
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}✗ Error: No GCP project configured${NC}"
        echo "Run: gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
else
    PROJECT_ID=$CURRENT_PROJECT
fi

echo -e "${GREEN}✓${NC} GCP Project: ${PROJECT_ID}"
echo -e "${GREEN}✓${NC} Region: ${REGION}"

# Step 2: Authenticate
echo -e "${YELLOW}[2/5]${NC} Authenticating with GCP..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Authentication complete"

# Step 3: Build Docker image
echo -e "${YELLOW}[3/5]${NC} Building Docker image..."

# Create a temporary tag
FULL_IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${IMAGE_NAME}:latest"

# Build using the frontend Dockerfile (which we fixed)
docker build -t "$IMAGE_NAME:latest" . -f docker/frontend.Dockerfile

# Tag for Artifact Registry
docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE_NAME"

echo -e "${GREEN}✓${NC} Image built: $IMAGE_NAME:latest"

# Step 4: Push to Artifact Registry
echo -e "${YELLOW}[4/5]${NC} Pushing to Artifact Registry..."

# Ensure repository exists
gcloud artifacts repositories create ${SERVICE_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --description="Alpha-Orion Dashboard" \
    2>/dev/null || true

# Push image
docker push "$FULL_IMAGE_NAME"

echo -e "${GREEN}✓${NC} Image pushed to registry"

# Step 5: Deploy to Cloud Run
echo -e "${YELLOW}[5/5]${NC} Deploying to Cloud Run..."

# Deploy the service
gcloud run deploy ${SERVICE_NAME} \
    --image "$FULL_IMAGE_NAME" \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 256Mi \
    --cpu 1 \
    --port 80 \
    --timeout 60s \
    --max-instances 10 \
    --min-instances 0 \
    --concurrency 80

# Get the URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

# Results
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 Dashboard URL:${NC} ${SERVICE_URL}"
echo -e "${BLUE}📊 Direct Link:${NC} ${SERVICE_URL}/official-dashboard.html"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Visit the dashboard URL above"
echo "  2. Configure your API endpoints in the dashboard"
echo "  3. Add your wallet addresses"
echo ""
echo -e "${BLUE}Management:${NC}"
echo "  View logs:    gcloud run services logs read ${SERVICE_NAME} --region ${REGION}"
echo "  Update:       ./deploy-gcp-run.sh"
echo "  Delete:       gcloud run services delete ${SERVICE_NAME} --region ${REGION}"
echo ""

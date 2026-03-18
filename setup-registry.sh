#!/bin/bash

# Setup Google Artifact Registry for Alpha-Orion

PROJECT_ID="alpha-orion"
REGION_US="us-central1"
REGION_EU="europe-west1"
REPO_NAME="alpha-orion-repo"

echo "Setting up Artifact Registry repositories..."

# Create US repository
gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION_US \
  --project=$PROJECT_ID \
  --description="Docker repository for Alpha-Orion services (US)"

# Create EU repository
gcloud artifacts repositories create ${REPO_NAME}-eu \
  --repository-format=docker \
  --location=$REGION_EU \
  --project=$PROJECT_ID \
  --description="Docker repository for Alpha-Orion services (EU)"

echo "Artifact Registry setup complete!"

# Build and push initial images (assuming services exist)
SERVICES=("scanner" "orchestrator" "executor" "backend" "frontend")

for service in "${SERVICES[@]}"; do
  if [ -d "./${service}" ]; then
    echo "Building and pushing ${service}..."
    docker build -t ${REGION_US}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${service}:latest ./${service}/
    docker push ${REGION_US}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${service}:latest
  else
    echo "Directory ./${service} not found, skipping..."
  fi
done

echo "Initial images built and pushed!"

#!/bin/bash
set -e

echo "🚀 ALPHA-ORION: ACTIVATING PROFIT MODE..."

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is required. Please install Google Cloud SDK."
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project)
echo "🔐 Fetching secrets for project: $PROJECT_ID"

export PIMLICO_API_KEY=$(gcloud secrets versions access latest --secret="pimlico-api-key")
export ONE_INCH_API_KEY=$(gcloud secrets versions access latest --secret="one-inch-api-key")
export PROFIT_WALLET_ADDRESS=$(gcloud secrets versions access latest --secret="profit-destination-wallet")
export GCP_PROJECT_ID=$PROJECT_ID
export AUTO_WITHDRAWAL_THRESHOLD_USD=1000

cd backend-services/services/user-api-service
npm install
npm start
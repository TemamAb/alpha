#!/bin/bash
set -e
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SECRETS_FILE=".env.secrets"

echo "Ì∫Ä Starting Alpha-Orion Production Deployment..."
echo "Project: $PROJECT_ID"

echo "Ì¥å Enabling APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com containerregistry.googleapis.com > /dev/null

echo "Ì¥ê Configuring Secrets..."
REQUIRED_SECRETS=("DATABASE_URL" "REDIS_URL" "JWT_SECRET_KEY" "PIMLICO_API_KEY" "ONE_INCH_API_KEY" "GEMINI_API_KEY" "ETHEREUM_RPC_URL" "PROFIT_WALLET_ADDRESS")

get_secret_value() {
    local secret_name=$1
    local value=""
    if [ -f "$SECRETS_FILE" ]; then value=$(grep "^${secret_name}=" "$SECRETS_FILE" | cut -d'=' -f2-); fi
    if [ -z "$value" ]; then
        echo -n "   Enter value for $secret_name: "
        read -s value
        echo ""
    fi
    if [ -z "$value" ]; then echo "‚ùå Error: $secret_name cannot be empty."; exit 1; fi
    echo "$value"
}

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! gcloud secrets describe "$secret" &>/dev/null; then
        echo "   ‚ö†Ô∏è  Secret $secret missing in GCP."
        VAL=$(get_secret_value "$secret")
        echo -n "$VAL" | gcloud secrets create "$secret" --data-file=-
    else
        echo "   ‚úÖ Secret $secret exists."
    fi
done

echo "Ì¥ë Granting permissions..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CLOUDBUILD_SA" --role="roles/secretmanager.secretAccessor" > /dev/null
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CLOUDBUILD_SA" --role="roles/run.admin" > /dev/null
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CLOUDBUILD_SA" --role="roles/iam.serviceAccountUser" > /dev/null

echo "ÌøóÔ∏è  Phase 1: Deploying Backend Services..."
gcloud builds submit --config cloudbuild-backend.yaml .

echo "Ì¥ó Capturing User API URL..."
API_URL=$(gcloud run services describe user-api-service --platform managed --region $REGION --format 'value(status.url)')
echo "   API URL detected: $API_URL"

echo "ÌøóÔ∏è  Phase 2: Deploying Frontend Dashboard..."
gcloud builds submit --config cloudbuild-frontend.yaml --substitutions=_API_URL="$API_URL" .

FRONTEND_URL=$(gcloud run services describe frontend-dashboard --platform managed --region $REGION --format 'value(status.url)')
echo ""
echo "‚úÖ PRODUCTION DEPLOYMENT SUCCESSFUL!"
echo "Ì≥ä DASHBOARD:   $FRONTEND_URL/official-dashboard.html"
echo "Ì¥ó API BACKEND: $API_URL"

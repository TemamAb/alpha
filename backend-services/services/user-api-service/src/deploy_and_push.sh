#!/bin/bash
set -e

echo "🚀 Starting Alpha-Orion Deployment & Push Sequence"

# Ensure we are executing from the service root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" == */src ]]; then
    cd "$SCRIPT_DIR/.."
else
    cd "$SCRIPT_DIR"
fi

# Ensure package.json exists in root for Cloud Run Buildpacks
if [ ! -f "package.json" ] && [ -f "src/package.json" ]; then
    echo "🔧 Copying package.json to service root for build compatibility..."
    cp src/package.json .
fi

# 1. Initialize Git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git branch -M main
else
    echo "📦 Git repository already initialized."
fi

# 2. Configure Remote
REMOTE_URL="https://github.com/TemamAb/alpha-orion.git"
if git remote | grep -q "origin"; then
    git remote set-url origin $REMOTE_URL
else
    git remote add origin $REMOTE_URL
fi

# 3. Commit and Push
echo "💾 Committing changes..."
git add .
git commit -m "feat: deployment readiness transformation - secrets integration and CI/CD" || echo "Nothing to commit"

echo "⬆️ Pushing to GitHub ($REMOTE_URL)..."
git push -u origin main

# 4. Pre-flight Checks
echo "🔍 Checking configuration..."

if ! command -v gcloud &> /dev/null; then
    # Try to auto-fix PATH for MINGW64/Windows standard installs
    if [ -d "/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin" ]; then
        echo "🔄 Detected Google Cloud SDK in Program Files (x86). Adding to PATH..."
        export PATH=$PATH:"/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin"
    elif [ -d "/c/Program Files/Google/Cloud SDK/google-cloud-sdk/bin" ]; then
        echo "🔄 Detected Google Cloud SDK in Program Files. Adding to PATH..."
        export PATH=$PATH:"/c/Program Files/Google/Cloud SDK/google-cloud-sdk/bin"
    fi
fi

if ! command -v gcloud &> /dev/null; then
    echo "⚠️  'gcloud' CLI not found. Skipping secret validation and direct deployment."
    echo "✅ Code pushed to GitHub. CI/CD should handle deployment."
    exit 0
fi

REQUIRED_SECRETS=("profit-destination-wallet" "pimlico-api-key" "one-inch-api-key" "infura-api-key" "polygon-rpc-url" "ethereum-rpc-url")

for SECRET in "${REQUIRED_SECRETS[@]}"; do
    if ! gcloud secrets describe "$SECRET" &>/dev/null; then
        echo "❌ CRITICAL ERROR: Secret '$SECRET' not found in GCP!"
        echo "   The service will fail to start without this secret."
        echo "   Please create it using: printf 'YOUR_SECRET_VALUE' | gcloud secrets create $SECRET --data-file=-"
        exit 1
    else
        echo "✅ Secret '$SECRET' found."
    fi
done

echo "☁️ Deploying to Google Cloud Run..."
gcloud run deploy user-api-service --source . --region us-central1 --allow-unauthenticated --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$(gcloud config get-value project),MIN_PROFIT_THRESHOLD_USD=500,AUTO_WITHDRAWAL_THRESHOLD_USD=1000"

# 5. Validation
echo "---------------------------------------------------"
echo "🔍 Retrieving Service URL for Validation..."

# Get the URL of the deployed user-api-service
SERVICE_URL=$(gcloud run services describe user-api-service --region us-central1 --format 'value(status.url)')

echo "✅ Service deployed at: $SERVICE_URL"
echo "🧪 Running Mission Validation Check..."

# Hit the validation endpoint
curl -s "$SERVICE_URL/mission/status"

echo ""
echo "✅ Deployment sequence complete!"
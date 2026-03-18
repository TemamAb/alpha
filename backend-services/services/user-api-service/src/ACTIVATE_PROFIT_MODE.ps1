Write-Host "🚀 ALPHA-ORION: ACTIVATING PROFIT MODE..." -ForegroundColor Green

# Check gcloud availability
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "❌ gcloud CLI is required. Please install Google Cloud SDK."
    exit 1
}

$PROJECT_ID = gcloud config get-value project
Write-Host "🔐 Fetching secrets for project: $PROJECT_ID" -ForegroundColor Cyan

# Fetch secrets from GCP Secret Manager
$env:PIMLICO_API_KEY = gcloud secrets versions access latest --secret="pimlico-api-key"
$env:PRIVATE_KEY = gcloud secrets versions access latest --secret="execution-wallet-private-key"
$env:ONE_INCH_API_KEY = gcloud secrets versions access latest --secret="one-inch-api-key"
$env:PROFIT_WALLET_ADDRESS = gcloud secrets versions access latest --secret="profit-destination-wallet"
$env:GCP_PROJECT_ID = $PROJECT_ID
$env:AUTO_WITHDRAWAL_THRESHOLD_USD = "1000"

Write-Host "✅ Secrets loaded. Starting User API Service..." -ForegroundColor Green

# Start Service
Set-Location "$PSScriptRoot/.."
npm install
npm start
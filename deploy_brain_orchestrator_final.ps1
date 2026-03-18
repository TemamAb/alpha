# deploy_brain_orchestrator_final.ps1
# Combines the code fix from v7 (benchmarking_tracker) with the environment variable fix.
# This is the consolidated deployment script for Brain Orchestrator.

$ErrorActionPreference = "Stop"
Write-Host "Starting Brain Orchestrator Final Deployment (Code + Env Vars)..." -ForegroundColor Cyan

# Configuration
$ProjectID = "alpha-orion-485207"
$Region = "us-central1"
$ServiceName = "brain-orchestrator"
$ImageName = "gcr.io/$ProjectID/brain-orchestrator:v7"

# Environment Variables (Critical for startup)
# Sourced from fix_brain_orchestrator_env.ps1
$EnvVars = "PIMLICO_API_KEY=pim_UbfKR9ocMe5ibNUCGgB8fE," + `
           "EXECUTION_WALLET_ADDRESS=0x21e6d55cBd4721996a6B483079449cFc279A993a," + `
           "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/alpha_orion," + `
           "REDIS_URL=redis://localhost:6379," + `
           "JWT_SECRET=temporary-secret-key-for-startup," + `
           "ONE_INCH_API_KEY=placeholder_key," + `
           "INFURA_API_KEY=placeholder_key," + `
           "ETHERSCAN_API_KEY=placeholder_key," + `
           "FLASK_ENV=production"

# Ensure the environment is configured for the correct project
Write-Host "Configuring Project and APIs..." -ForegroundColor Yellow
gcloud config set project $ProjectID
gcloud services enable containerregistry.googleapis.com
gcloud auth configure-docker --quiet

# Navigate to service directory
$ServiceDir = Join-Path $PSScriptRoot "backend-services\services\brain-orchestrator"
if (Test-Path $ServiceDir) {
    Push-Location $ServiceDir
} else {
    Write-Error "Service directory not found: $ServiceDir"
    exit 1
}

Write-Host "1. Building Docker image v7 (includes benchmarking_tracker.py)..." -ForegroundColor Yellow
docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed"; exit 1 }

Write-Host "2. Pushing image to GCR..." -ForegroundColor Yellow
docker push $ImageName
if ($LASTEXITCODE -ne 0) { Write-Error "Docker push failed"; exit 1 }

Write-Host "3. Deploying to Cloud Run with Environment Variables..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
  --image $ImageName `
  --region $Region `
  --project $ProjectID `
  --platform managed `
  --allow-unauthenticated `
  --set-env-vars="$EnvVars"

Pop-Location
Write-Host "Deployment sequence initiated. Check Cloud Console for status." -ForegroundColor Green
# deploy_brain_orchestrator_v7.ps1
# Automates the fix for Brain Orchestrator container startup issue (v7 - Missing Module Fix)

$ErrorActionPreference = "Stop"
Write-Host "Starting Brain Orchestrator v7 Deployment (Missing Module Fix)..." -ForegroundColor Cyan

# Configuration
$ProjectID = "alpha-orion-485207"
$ImageName = "gcr.io/$ProjectID/brain-orchestrator:v7"
$Region = "us-central1"
$ServiceName = "brain-orchestrator"

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

Write-Host "3. Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
  --image $ImageName `
  --region $Region `
  --project $ProjectID `
  --platform managed `
  --allow-unauthenticated

Pop-Location
Write-Host "Deployment sequence initiated. Check Cloud Console for status." -ForegroundColor Green
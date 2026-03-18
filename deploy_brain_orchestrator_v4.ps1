# deploy_brain_orchestrator_v4.ps1
# Automates the fix for Brain Orchestrator container startup issue

$ErrorActionPreference = "Stop"
Write-Host "Starting Brain Orchestrator v4 Deployment Fix..." -ForegroundColor Cyan

# Configuration
$ProjectID = "alpha-orion"
$ImageName = "gcr.io/alpha-orion/brain-orchestrator:v4"
$Region = "us-central1"
$ServiceName = "brain-orchestrator"
$PimlicoKey = "pim_UbfKR9ocMe5ibNUCGgB8fE"
$WalletAddr = "0x21e6d55cBd4721996a6B483079449cFc279A993a"

# Navigate to service directory
$ServiceDir = Join-Path $PSScriptRoot "backend-services\services\brain-orchestrator"
if (Test-Path $ServiceDir) {
    Push-Location $ServiceDir
} else {
    Write-Error "Service directory not found: $ServiceDir"
    exit 1
}

Write-Host "1. Building Docker image v4 (includes Flask-CORS)..." -ForegroundColor Yellow
docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed"; exit 1 }

Write-Host "2. Pushing image to GCR..." -ForegroundColor Yellow
docker push $ImageName
if ($LASTEXITCODE -ne 0) { Write-Error "Docker push failed"; exit 1 }

Write-Host "3. Deploying to Cloud Run..." -ForegroundColor Yellow
$EnvVars = "PIMLICO_API_KEY=$PimlicoKey,EXECUTION_WALLET_ADDRESS=$WalletAddr"
gcloud run deploy $ServiceName `
  --image $ImageName `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --set-env-vars="$EnvVars"

Pop-Location
Write-Host "Deployment sequence initiated. Check Cloud Console for status." -ForegroundColor Green
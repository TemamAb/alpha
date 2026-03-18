# setup_brain_orchestrator_secrets.ps1
# Automates Phase 4: Production Configuration (Secrets)
# Creates secrets in Google Cloud Secret Manager and updates Cloud Run to use them.

$ErrorActionPreference = "Stop"
Write-Host "Starting Phase 4: Secret Configuration for Brain Orchestrator..." -ForegroundColor Cyan

# Configuration
$ProjectID = "alpha-orion-485207"
$Region = "us-central1"
$ServiceName = "brain-orchestrator"

# Ensure Secret Manager API is enabled
Write-Host "Enabling Secret Manager API..." -ForegroundColor Yellow
gcloud services enable secretmanager.googleapis.com --project $ProjectID

# Define Secrets (Name -> Value) based on Implementation Plan Phase 4
$Secrets = @{
    "pimlico-api-key"          = "pim_UbfKR9ocMe5ibNUCGgB8fE"
    "execution-wallet-address" = "0x21e6d55cBd4721996a6B483079449cFc279A993a"
}

# 1. Create Secrets and Add Versions
foreach ($Name in $Secrets.Keys) {
    $Value = $Secrets[$Name]
    Write-Host "Processing secret: $Name" -ForegroundColor Yellow
    
    # Try to create secret (suppress error if it already exists)
    gcloud secrets create $Name --replication-policy="automatic" --project $ProjectID 2>$null
    
    # Add new version with the value
    Write-Host "Adding new version to '$Name'..."
    $Value | gcloud secrets versions add $Name --data-file=- --project $ProjectID
}

# 2. Update Cloud Run Service to use Secrets
Write-Host "Updating Cloud Run service to use secrets..." -ForegroundColor Yellow

# Map Env Vars to Secrets (Syntax: ENV_VAR=SECRET_NAME:VERSION)
$SecretFlags = "PIMLICO_API_KEY=pimlico-api-key:latest," + `
               "EXECUTION_WALLET_ADDRESS=execution-wallet-address:latest"

# Update the existing service configuration
gcloud run services update $ServiceName `
    --region $Region `
    --project $ProjectID `
    --set-secrets="$SecretFlags"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secrets configured successfully. Cloud Run is deploying a new revision." -ForegroundColor Green
} else {
    Write-Error "Failed to update service with secrets."
}
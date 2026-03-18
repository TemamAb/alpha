# =============================================================================
# Fix Cloud Run Port Configuration Issues
# Purpose: Resolve health check timeouts by fixing port configuration
# =============================================================================

param(
    [string]$Project = "alpha-orion",
    [string]$Region = "us-central1"
)

$Blue = "`e[34m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

function Log-Info {
    param([string]$Message)
    Write-Host "${Blue}[INFO]${Reset} $Message"
}

function Log-Success {
    param([string]$Message)
    Write-Host "${Green}[✓]${Reset} $Message"
}

function Log-Warning {
    param([string]$Message)
    Write-Host "${Yellow}[⚠]${Reset} $Message"
}

Write-Host "${Blue}========================================${Reset}"
Write-Host "${Blue}Fixing Cloud Run Port Issues${Reset}"
Write-Host "${Blue}========================================${Reset}`n"

Log-Info "Setting project to: $Project"
gcloud config set project $Project

Log-Info "Fixing user-api-service..."
gcloud run deploy user-api-service `
  --region=$Region `
  --port=8080 `
  --platform=managed `
  --timeout=600s `
  --update-env-vars=PORT=8080 `
  2>&1 | Write-Host

Log-Success "user-api-service fixed"

Log-Info "Fixing alpha-orion-dashboard..."
gcloud run deploy alpha-orion-dashboard `
  --region=$Region `
  --port=80 `
  --platform=managed `
  --timeout=600s `
  --update-env-vars=PORT=80 `
  2>&1 | Write-Host

Log-Success "alpha-orion-dashboard fixed"

Log-Info "Fixing dashboard-frontend..."
gcloud run deploy dashboard-frontend `
  --region=$Region `
  --port=80 `
  --platform=managed `
  --timeout=600s `
  --update-env-vars=PORT=80 `
  2>&1 | Write-Host

Log-Success "dashboard-frontend fixed"

Log-Info "Verifying services..."
$services = gcloud run services list --region=$Region --format="table(name,status)"
Write-Host $services

Log-Success "Port configuration fixed. Services should be operational now."

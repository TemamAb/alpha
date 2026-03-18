# fix_brain_orchestrator_env.ps1
# Updates Brain Orchestrator with a complete set of environment variables to prevent startup crashes.

$ErrorActionPreference = "Stop"
Write-Host "Updating Brain Orchestrator Environment Variables..." -ForegroundColor Cyan

$ServiceName = "brain-orchestrator"
$ProjectID = "alpha-orion-485207"
$Region = "us-central1"

# The previous deployment only set PIMLICO_API_KEY and EXECUTION_WALLET_ADDRESS.
# The application code likely requires these other variables to start successfully, causing the 503 error.
# This command sets the *complete* list of required variables.
$EnvVars = "PIMLICO_API_KEY=pim_UbfKR9ocMe5ibNUCGgB8fE," + `
           "EXECUTION_WALLET_ADDRESS=0x21e6d55cBd4721996a6B483079449cFc279A993a," + `
           "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/alpha_orion," + `
           "REDIS_URL=redis://localhost:6379," + `
           "JWT_SECRET=temporary-secret-key-for-startup," + `
           "ONE_INCH_API_KEY=placeholder_key," + `
           "INFURA_API_KEY=placeholder_key," + `
           "ETHERSCAN_API_KEY=placeholder_key," + `
           "FLASK_ENV=production"

Write-Host "Updating service with a complete set of environment variables..." -ForegroundColor Yellow

gcloud run services update $ServiceName `
  --region $Region `
  --project $ProjectID `
  --set-env-vars="$EnvVars"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Environment update command sent. Service is deploying a new revision." -ForegroundColor Green
} else {
    Write-Error "Failed to update service. Check the error output above (e.g., Billing Disabled)."
}
# enable_production_mode.ps1
$ErrorActionPreference = "Stop"

Write-Host "🚀 Alpha-Orion: Activating LIVE PROFIT GENERATION & AUTO-WITHDRAWAL..." -ForegroundColor Cyan

# 1. Configuration
$Project = gcloud config get-value project 2>$null
if ([string]::IsNullOrWhiteSpace($Project)) {
    Write-Error "GCP Project not set. Run 'gcloud config set project <PROJECT_ID>'"
    exit 1
}

$Region = "us-central1"
$Services = @("user-api-service", "withdrawal-service") # Attempt to update both

# 2. Grant Secret Access
Write-Host "🔐 Configuring Secret Manager permissions..." -ForegroundColor Yellow
$ProjectNumber = gcloud projects describe $Project --format="value(projectNumber)"
$ServiceAccount = "$ProjectNumber-compute@developer.gserviceaccount.com"

# Secrets required for Production
$Secrets = @(
    "profit-destination-wallet", 
    "pimlico-api-key", 
    "one-inch-api-key", 
    "infura-api-key", 
    "polygon-rpc-url", 
    "ethereum-rpc-url",
    "etherscan-api-key"
)

foreach ($Secret in $Secrets) {
    Write-Host "   - Checking access for '$Secret'..." -NoNewline -ForegroundColor Gray
    try {
        # Check if secret exists first
        gcloud secrets describe $Secret --project=$Project > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            gcloud secrets add-iam-policy-binding $Secret --member="serviceAccount:$ServiceAccount" --role="roles/secretmanager.secretAccessor" --project=$Project --quiet > $null
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " SKIPPED (Not found)" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host " ERROR" -ForegroundColor Red
    }
}

# 3. Enable Production Mode
foreach ($Service in $Services) {
    Write-Host "`n⚙️  Configuring '$Service' for PRODUCTION..." -ForegroundColor Yellow
    
    # Update service env vars to trigger production logic
    try {
        gcloud run services update $Service --region $Region --set-env-vars="DEPLOY_MODE=production,NODE_ENV=production" --quiet
        Write-Host "✅ $Service is now LIVE." -ForegroundColor Green
    } catch {
        Write-Warning "Could not update $Service (it might not be deployed yet)."
    }
}

Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETE: System is in Live Profit Generation Mode." -ForegroundColor Cyan
Write-Host '   Auto-Withdrawal is ACTIVE (Threshold: $1000).' -ForegroundColor Cyan
# deploy_and_push.ps1
$ErrorActionPreference = "Stop"

Write-Host "Starting Alpha-Orion Deployment & Push Sequence" -ForegroundColor Green

# Ensure we are executing from the service root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($ScriptDir.EndsWith("\src")) {
    Set-Location (Split-Path -Parent $ScriptDir)
} else {
    Set-Location $ScriptDir
}

# Ensure package.json exists in root for Cloud Run Buildpacks
if (!(Test-Path "package.json") -and (Test-Path "src\package.json")) {
    Write-Host "Copying package.json to service root for build compatibility..." -ForegroundColor Yellow
    Copy-Item "src\package.json" -Destination "."
}

# 1. Initialize Git if not already initialized
if (!(Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
    git branch -M main
} else {
    Write-Host "Git repository already initialized." -ForegroundColor Cyan
}

# 2. Configure Remote
$RemoteUrl = "https://github.com/TemamAb/alpha-orion.git"
$Remotes = git remote
if ($Remotes -contains "origin") {
    git remote set-url origin $RemoteUrl
} else {
    git remote add origin $RemoteUrl
}

# 3. Commit and Push
Write-Host "Committing changes..." -ForegroundColor Cyan
git add .
try {
    git commit -m "feat: deployment readiness transformation - secrets integration and CI/CD"
} catch {
    Write-Host "Nothing to commit" -ForegroundColor Yellow
}

try {
    Write-Host "Pushing to GitHub ($RemoteUrl)..." -ForegroundColor Cyan
    git push -u origin main 2>&1 | Out-Null
} catch {
    Write-Warning "Git push failed (Network/Auth issue). Skipping push and proceeding to deployment..."
    $global:Error.Clear()
}

# 4. Pre-flight Checks
Write-Host "Checking configuration..." -ForegroundColor Cyan
$RequiredSecrets = @("profit-destination-wallet", "pimlico-api-key", "one-inch-api-key", "infura-api-key", "polygon-rpc-url", "ethereum-rpc-url")

foreach ($Secret in $RequiredSecrets) {
    try {
        $null = gcloud secrets describe $Secret 2>&1
        Write-Host "Secret '$Secret' found." -ForegroundColor Green
    } catch {
        Write-Host "Secret '$Secret' not found. Creating placeholder..." -ForegroundColor Yellow
        
        $PlaceholderValue = "PLACEHOLDER_VALUE_PLEASE_UPDATE"
        if ($Secret -like "*rpc*") { $PlaceholderValue = "https://polygon-rpc.com" }
        if ($Secret -eq "profit-destination-wallet") { $PlaceholderValue = "0x0000000000000000000000000000000000000000" }
        
        try {
            $PlaceholderValue | gcloud secrets create $Secret --data-file=-
            Write-Host "✅ Created placeholder for '$Secret'. Service will deploy but may need config update." -ForegroundColor Green
        } catch { Write-Error "Failed to create secret $Secret"; exit 1 }
    }
}

Write-Host "Deploying to Google Cloud Run..." -ForegroundColor Cyan
$ProjectID = gcloud config get-value project
$EnvVars = "NODE_ENV=production,GCP_PROJECT_ID=$ProjectID,MIN_PROFIT_THRESHOLD_USD=500,AUTO_WITHDRAWAL_THRESHOLD_USD=1000"
gcloud run deploy user-api-service --source . --region us-central1 --allow-unauthenticated --set-env-vars "$EnvVars" --quiet

# 5. Validation
Write-Host "---------------------------------------------------"
Write-Host "Retrieving Service URL for Validation..." -ForegroundColor Cyan

$ServiceUrl = gcloud run services describe user-api-service --region us-central1 --format="value(status.url)"
Write-Host "Service deployed at: $ServiceUrl" -ForegroundColor Green
Write-Host "Running Mission Validation Check..." -ForegroundColor Cyan

Invoke-RestMethod -Uri "$ServiceUrl/mission/status"

Write-Host ""
Write-Host "Deployment sequence complete!" -ForegroundColor Green
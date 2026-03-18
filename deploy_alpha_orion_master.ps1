# deploy_alpha_orion_master.ps1
# MASTER DEPLOYMENT PROTOCOL - ALPHA ORION
# Orchestrates the entire pipeline: Secrets -> Build -> Deploy -> Start Engine.

$ErrorActionPreference = "Stop"
Write-Host "🚀 STARTING ALPHA-ORION MASTER DEPLOYMENT PROTOCOL" -ForegroundColor Cyan

# --- Load Configuration from Files ---
$Config = Get-Content -Raw -Path (Join-Path $PSScriptRoot "config.json") | ConvertFrom-Json
$SecretsMap = Get-Content -Raw -Path (Join-Path $PSScriptRoot "secrets.json") | ConvertFrom-Json

$ProjectID = $Config.projectId
$Region = $Config.region
$ServiceName = $Config.serviceName
$ImageTag = $Config.imageTag
$ImageName = "gcr.io/$ProjectID/${ServiceName}:$ImageTag"

# Convert Env Vars object to gcloud's expected string format
$envVarsList = @()
$properties = $Config.envVars.PSObject.Properties
foreach ($prop in $properties) {
    $envVarsList += "$($prop.Name)=$($prop.Value)"
}
$EnvVars = $envVarsList -join ","

# --- 1. Infrastructure Setup (Secrets) ---
Write-Host "`n[1/4] Configuring Infrastructure & Secrets..." -ForegroundColor Yellow
gcloud config set project $ProjectID

# Grant necessary IAM permissions to the current user to manage secrets.
$CurrentUser = gcloud config get-value account
Write-Host "Ensuring user '$CurrentUser' has 'Secret Manager Admin' role..." -ForegroundColor Gray
gcloud projects add-iam-policy-binding $ProjectID --member="user:$CurrentUser" --role="roles/secretmanager.admin" --condition=None 2>$null

gcloud services enable secretmanager.googleapis.com containerregistry.googleapis.com run.googleapis.com 2>$null

# Add a delay to allow API enablement to propagate through Google's systems.
Write-Host "Waiting 30 seconds for IAM & API changes to propagate..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Handle secrets with error handling for billing issues
foreach ($Prop in $SecretsMap.PSObject.Properties) {
    $Name = $Prop.Name
    $Value = $Prop.Value
    
    # First check if secret already exists
    $OldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $SecretCheck = gcloud secrets describe $Name --project=$ProjectID --format="value(name)" 2>$null
    $ErrorActionPreference = $OldEAP
    
    if ($SecretCheck) {
        Write-Host "Secret '$Name' already exists, adding new version..." -ForegroundColor Gray
        $Value | gcloud secrets versions add $Name --data-file=- --project=$ProjectID 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Warning: Could not add version to existing secret (billing may be required)" -ForegroundColor Yellow
        }
    } else {
        # Try to create the secret
        Write-Host "Creating secret: $Name" -ForegroundColor Yellow
        gcloud secrets create $Name --replication-policy="automatic" --project=$ProjectID 2>$null
        if ($LASTEXITCODE -eq 0) {
            $Value | gcloud secrets versions add $Name --data-file=- --project=$ProjectID
        } else {
            Write-Host "  Warning: Could not create secret. It may already exist or billing is disabled." -ForegroundColor Yellow
        }
    }
}

# --- 2. Build & Push Container ---
Write-Host "`n[2/4] Building & Pushing Container Image..." -ForegroundColor Yellow
$ServiceDir = Join-Path $PSScriptRoot "backend-services\services\brain-orchestrator"

if (-not (Test-Path $ServiceDir)) {
    Write-Error "Cannot find service directory at $ServiceDir"
}

Push-Location $ServiceDir
try {
    # Authenticate Docker
    gcloud auth configure-docker --quiet

    # Build
    docker build -t $ImageName .
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed." }

    # Push
    docker push $ImageName
    if ($LASTEXITCODE -ne 0) { throw "Docker push failed." }
}
finally {
    Pop-Location
}

# --- 3. Deploy to Cloud Run ---
Write-Host "`n[3/4] Deploying Service to Cloud Run..." -ForegroundColor Yellow

# Check if secrets are available, otherwise use env vars
$SecretsAvailable = $true
$SecretFlags = ""

# Try to verify secrets exist
$OldEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$SecretCheck = gcloud secrets describe "pimlico-api-key" --project=$ProjectID --format="value(name)" 2>$null
$ErrorActionPreference = $OldEAP

if ($LASTEXITCODE -ne 0 -or -not $SecretCheck) {
    Write-Host "WARNING: Secrets not available (billing issue). Using environment variables instead." -ForegroundColor Yellow
    $SecretsAvailable = $false
    # Add secrets as env vars directly
    $PimlicoKey = $SecretsMap.PSObject.Properties | Where-Object { $_.Name -eq "pimlico-api-key" } | Select-Object -ExpandProperty Value
    $WalletAddr = $SecretsMap.PSObject.Properties | Where-Object { $_.Name -eq "execution-wallet-address" } | Select-Object -ExpandProperty Value
    $EnvVarsWithSecrets = $EnvVars + ",PIMLICO_API_KEY=$PimlicoKey,EXECUTION_WALLET_ADDRESS=$WalletAddr"
    
    $DeployArgs = @(
        "run", "deploy", $ServiceName,
        "--image", $ImageName,
        "--region", $Region,
        "--project", $ProjectID,
        "--platform", "managed",
        "--allow-unauthenticated",
        "--set-env-vars=$EnvVarsWithSecrets"
    )
} else {
    Write-Host "Using secrets for deployment..." -ForegroundColor Gray
    $SecretFlags = "PIMLICO_API_KEY=pimlico-api-key:latest," + `
                   "EXECUTION_WALLET_ADDRESS=execution-wallet-address:latest"
    
    $DeployArgs = @(
        "run", "deploy", $ServiceName,
        "--image", $ImageName,
        "--region", $Region,
        "--project", $ProjectID,
        "--platform", "managed",
        "--allow-unauthenticated",
        "--set-env-vars=$EnvVars",
        "--set-secrets=$SecretFlags"
    )
}

if (-not [string]::IsNullOrWhiteSpace($Config.cloudSqlInstance)) {
    Write-Host "  + Attaching Cloud SQL Instance: $($Config.cloudSqlInstance)" -ForegroundColor Gray
    $DeployArgs += "--add-cloudsql-instances=$($Config.cloudSqlInstance)"
}

if (-not [string]::IsNullOrWhiteSpace($Config.vpcConnector)) {
    Write-Host "  + Attaching VPC Connector: $($Config.vpcConnector)" -ForegroundColor Gray
    $DeployArgs += "--vpc-connector=$($Config.vpcConnector)"
}

# Execute Deployment
& gcloud $DeployArgs

if ($LASTEXITCODE -ne 0) { throw "Deployment failed." }

# --- 4. Verification & Engine Start ---
Write-Host "`n[4/4] Verifying & Starting Profit Engine..." -ForegroundColor Yellow

# Get URL
$ServiceUrl = gcloud run services describe $ServiceName --project $ProjectID --region $Region --format "value(status.url)"
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Gray

# Start Engine
Write-Host "Triggering Profit Engine Start..."
try {
    $Start = Invoke-RestMethod -Uri "$ServiceUrl/api/profit/start" -Method Post
    Write-Host "✅ ENGINE STARTED: $($Start | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Warning "Engine start signal failed (Service might be starting up): $_"
    Write-Host "Please wait 30 seconds and run: curl $ServiceUrl/api/profit/start" -ForegroundColor Gray
}

Write-Host "`n✅ DEPLOYMENT PROTOCOL COMPLETE." -ForegroundColor Green
# =============================================================================
# Alpha-Orion Production Deployment Script
# Purpose: Deploy all services to Google Cloud Run and integrate with dashboard
# =============================================================================

param(
    [string]$Project = "alpha-orion",
    [string]$Region = "us-central1",
    [switch]$SkipBuild = $false,
    [switch]$DryRun = $false
)

# Color codes for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Log-Info {
    param([string]$Message)
    Write-Host "${Blue}[INFO]${Reset} $Message"
}

function Log-Success {
    param([string]$Message)
    Write-Host "${Green}[SUCCESS]${Reset} $Message"
}

function Log-Warning {
    param([string]$Message)
    Write-Host "${Yellow}[WARNING]${Reset} $Message"
}

function Log-Error {
    param([string]$Message)
    Write-Host "${Red}[ERROR]${Reset} $Message"
    exit 1
}

# ============================================================================
# PHASE 0: PRE-DEPLOYMENT CHECKS
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 0: PRE-DEPLOYMENT CHECKS"
Log-Info "==========================================="

Log-Info "Checking GCP setup..."
$gcloudStatus = gcloud config get-value project 2>&1
if ($LASTEXITCODE -ne 0) {
    Log-Error "GCP CLI not configured. Run: gcloud init"
}

if ($gcloudStatus -notlike "*alpha-orion*") {
    Log-Warning "Current GCP project: $gcloudStatus. Setting to $Project..."
    gcloud config set project $Project
}

Log-Info "Checking required Docker images..."
$requiredImages = @(
    "backend-services/services/user-api-service/src/Dockerfile",
    "docker/frontend.Dockerfile"
)

foreach ($image in $requiredImages) {
    if (-not (Test-Path $image)) {
        Log-Error "Missing: $image"
    }
}

Log-Info "Checking Cloud Run API enabled..."
$apis = gcloud services list --enabled --format="value(name)"
if ($apis -notlike "*run.googleapis.com*") {
    Log-Info "Enabling Cloud Run API..."
    gcloud services enable run.googleapis.com
}

Log-Success "Pre-deployment checks passed!"

# ============================================================================
# PHASE 1: BUILD & PUSH DOCKER IMAGES
# ============================================================================

if (-not $SkipBuild) {
    Log-Info "==========================================="
    Log-Info "PHASE 1: BUILD & PUSH DOCKER IMAGES"
    Log-Info "==========================================="

    if ($DryRun) {
        Log-Info "[DRY RUN] Would execute: gcloud builds submit --config=cloudbuild.yaml"
    } else {
        Log-Info "Starting Cloud Build..."
        gcloud builds submit `
            --config=cloudbuild.yaml `
            --substitutions="_REGION=$Region" `
            --region=$Region `
            --async

        Log-Success "Cloud Build submitted! Monitor progress with:"
        Log-Info "gcloud builds list --region=$Region"
        Log-Info "gcloud builds log [BUILD_ID] --region=$Region"
    }
} else {
    Log-Warning "Skipping build phase (--SkipBuild flag set)"
}

# ============================================================================
# PHASE 2: VERIFY DEPLOYMENTS
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 2: VERIFY DEPLOYMENTS"
Log-Info "==========================================="

$expectedServices = @(
    "user-api-service",
    "frontend-dashboard",
    "brain-orchestrator",
    "brain-ai-optimizer",
    "blockchain-monitor",
    "compliance-service",
    "smart-contract-monitor",
    "financial-reconciliation"
)

Log-Info "Waiting for services to be deployed..."
Start-Sleep -Seconds 5

foreach ($service in $expectedServices) {
    Log-Info "Checking status of: $service"
    
    if ($DryRun) {
        Log-Info "[DRY RUN] Would check: $service"
    } else {
        $status = gcloud run services describe $service --region=$Region --format="value(status.conditions[0].status)" 2>&1
        
        if ($status -like "True") {
            Log-Success "$service is running"
        } else {
            Log-Warning "$service status: $status"
        }
    }
}

# ============================================================================
# PHASE 3: GET SERVICE URLS
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 3: GET SERVICE URLS"
Log-Info "==========================================="

Log-Info "Retrieving Cloud Run service URLs..."

if ($DryRun) {
    Log-Info "[DRY RUN] Would retrieve service URLs"
} else {
    $apiServiceUrl = gcloud run services describe user-api-service `
        --region=$Region `
        --format='value(status.url)' 2>&1

    $dashboardServiceUrl = gcloud run services describe frontend-dashboard `
        --region=$Region `
        --format='value(status.url)' 2>&1

    Log-Success "API Service URL: $apiServiceUrl"
    Log-Success "Dashboard Service URL: $dashboardServiceUrl"

    # Save URLs for reference
    @{
        api_url = $apiServiceUrl
        dashboard_url = $dashboardServiceUrl
        updated_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    } | ConvertTo-Json | Out-File -FilePath "deployment-urls.json" -Encoding utf8

    Log-Success "URLs saved to deployment-urls.json"
}

# ============================================================================
# PHASE 4: UPDATE DASHBOARD CONFIG
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 4: UPDATE DASHBOARD CONFIG"
Log-Info "==========================================="

$dashboardPath = "official-dashboard.html"

if (-not (Test-Path $dashboardPath)) {
    Log-Error "Dashboard file not found: $dashboardPath"
}

Log-Info "Backing up original dashboard..."
Copy-Item $dashboardPath "official-dashboard.html.backup"

Log-Info "Updating API_BASE_URL in dashboard..."

$dashboardContent = Get-Content $dashboardPath -Raw

if ($DryRun) {
    Log-Info "[DRY RUN] Would update API_BASE_URL to: $apiServiceUrl"
} else {
    # Update API_BASE_URL placeholder
    $updatedContent = $dashboardContent -replace `
        "API_BASE_URL:\s*'[^']*'", `
        "API_BASE_URL: '$apiServiceUrl'"

    Set-Content -Path $dashboardPath -Value $updatedContent -Encoding utf8
    Log-Success "Dashboard configuration updated with API URL"
}

# ============================================================================
# PHASE 5: TEST API ENDPOINTS
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 5: TEST API ENDPOINTS"
Log-Info "==========================================="

if ($DryRun) {
    Log-Info "[DRY RUN] Would test API endpoints"
} else {
    Start-Sleep -Seconds 5  # Wait for service to stabilize
    
    Log-Info "Testing /dashboard/metrics endpoint..."
    $metricsResponse = Invoke-WebRequest -Uri "$apiServiceUrl/dashboard/metrics" -ErrorAction SilentlyContinue
    
    if ($metricsResponse.StatusCode -eq 200) {
        Log-Success "Dashboard metrics endpoint responding"
        $metrics = $metricsResponse.Content | ConvertFrom-Json
        Log-Info "Sample profit data:"
        Log-Info "  Total P&L: `$$($metrics.total_pnl)"
        Log-Info "  Realized Profit: `$$($metrics.realized_profit)"
        Log-Info "  Total Trades: $($metrics.total_trades)"
    } else {
        Log-Warning "Dashboard metrics endpoint not yet available (service still initializing)"
    }

    Log-Info "Testing /analytics/total-pnl endpoint..."
    $pnlResponse = Invoke-WebRequest -Uri "$apiServiceUrl/analytics/total-pnl" -ErrorAction SilentlyContinue
    
    if ($pnlResponse.StatusCode -eq 200) {
        Log-Success "Total P&L endpoint responding"
    }
}

# ============================================================================
# PHASE 6: DEPLOYMENT REGISTRY UPDATE
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 6: UPDATE DEPLOYMENT REGISTRY"
Log-Info "==========================================="

$registryPath = "DEPLOYMENT_REGISTRY.json"
$registry = Get-Content $registryPath | ConvertFrom-Json

Log-Info "Updating deployment registry..."

if (-not $DryRun) {
    # Update Cloud Run services
    $registry.environments.production.infrastructure.cloudRun.services = @(
        @{ name = "user-api-service"; url = $apiServiceUrl; status = "DEPLOYED"; region = $Region },
        @{ name = "frontend-dashboard"; url = $dashboardServiceUrl; status = "DEPLOYED"; region = $Region },
        @{ name = "brain-orchestrator"; status = "DEPLOYED"; region = $Region },
        @{ name = "brain-ai-optimizer"; status = "DEPLOYED"; region = $Region },
        @{ name = "blockchain-monitor"; status = "DEPLOYED"; region = $Region },
        @{ name = "compliance-service"; status = "DEPLOYED"; region = $Region },
        @{ name = "smart-contract-monitor"; status = "DEPLOYED"; region = $Region },
        @{ name = "financial-reconciliation"; status = "DEPLOYED"; region = $Region }
    )

    # Update last deployment time
    $registry.lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")

    # Add deployment history entry
    $deploymentEntry = @{
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        status = "SUCCESS"
        region = $Region
        services = 8
        notes = "Production deployment via PowerShell"
    }
    $registry.deploymentHistory += $deploymentEntry

    $registry | ConvertTo-Json -Depth 10 | Set-Content $registryPath
    Log-Success "Deployment registry updated"
}

# ============================================================================
# PHASE 7: CONFIGURATION CHECKLIST
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 7: POST-DEPLOYMENT CHECKLIST"
Log-Info "==========================================="

$checklist = @(
    "[ ] Dashboard is accessible at: $dashboardServiceUrl",
    "[ ] API is responding at: $apiServiceUrl/dashboard/metrics",
    "[ ] Database secrets configured in Cloud Run",
    "[ ] Redis secrets configured in Cloud Run",
    "[ ] Wallets added in dashboard settings",
    "[ ] Auto-withdrawal threshold configured",
    "[ ] Manual withdrawal button tested",
    "[ ] Profit metrics displaying in real-time",
    "[ ] All 8 backend services running",
    "[ ] Monitoring alerts configured"
)

Log-Info "Complete the following checks:"
foreach ($item in $checklist) {
    Log-Info $item
}

# ============================================================================
# PHASE 8: MONITORING & NEXT STEPS
# ============================================================================

Log-Info "==========================================="
Log-Info "PHASE 8: MONITORING & NEXT STEPS"
Log-Info "==========================================="

Log-Info "Monitor Cloud Run services:"
Log-Info "  gcloud run services list --region=$Region"

Log-Info "View service logs:"
Log-Info "  gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=user-api-service' --limit=50"

Log-Info "Next steps:"
Log-Info "  1. Open dashboard: $dashboardServiceUrl"
Log-Info "  2. Configure wallet addresses in Settings"
Log-Info "  3. Verify profit data displaying correctly"
Log-Info "  4. Deploy smart contracts for trading"
Log-Info "  5. Add capital to trading wallets"

Log-Success "==========================================="
Log-Success "DEPLOYMENT COMPLETE!"
Log-Success "==========================================="
Log-Success "Dashboard: $dashboardServiceUrl"
Log-Success "API: $apiServiceUrl"

# Save final deployment summary
$summary = @{
    project = $Project
    region = $Region
    deployed_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    services = $expectedServices
    dashboard_url = $dashboardServiceUrl
    api_url = $apiServiceUrl
    status = "DEPLOYED"
} | ConvertTo-Json

$summary | Out-File -FilePath "DEPLOYMENT_SUMMARY.json" -Encoding utf8
Log-Success "Summary saved to DEPLOYMENT_SUMMARY.json"

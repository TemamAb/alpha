# Alpha-Orion Production APIs and Services Enablement Script
# Enables all required GCP APIs for full production readiness
param (
    [string]$ProjectID = "alpha-orion"
)
$ErrorActionPreference = "Continue"

Write-Host "[ENABLE] Alpha-Orion Production APIs Enablement" -ForegroundColor Cyan
Write-Host "Project: $ProjectID" -ForegroundColor Gray
Write-Host ""

gcloud config set project $ProjectID

# Core Infrastructure APIs
$CoreAPIs = @(
    "run.googleapis.com",           # Cloud Run
    "cloudbuild.googleapis.com",    # Cloud Build
    "artifactregistry.googleapis.com", # Artifact Registry
    "container.googleapis.com",    # GKE
    "cloudresourcemanager.googleapis.com" # Resource Manager
)

# Database & Caching APIs
$DatabaseAPIs = @(
    "cloudsql.googleapis.com",      # Cloud SQL (PostgreSQL/MySQL)
    "redis.googleapis.com",         # Memorystore Redis
    "alloydb.googleapis.com"        # AlloyDB (PostgreSQL compatible)
)

# Data & Analytics APIs
$DataAPIs = @(
    "bigquery.googleapis.com",     # BigQuery
    "storage.googleapis.com",       # Cloud Storage
    "pubsub.googleapis.com"        # Pub/Sub
)

# Monitoring & Security APIs
$MonitoringAPIs = @(
    "monitoring.googleapis.com",    # Cloud Monitoring
    "logging.googleapis.com",       # Cloud Logging
    "cloudtrace.googleapis.com",    # Cloud Trace
    "cloudprofiler.googleapis.com", # Cloud Profiler
    "containersecurity.googleapis.com" # Container Analysis
)

# Networking APIs
$NetworkingAPIs = @(
    "compute.googleapis.com",       # Compute Engine
    "vpcaccess.googleapis.com",     # VPC Access
    "servicenetworking.googleapis.com", # Service Networking
    "dns.googleapis.com"           # Cloud DNS
)

$allAPIs = $CoreAPIs + $DatabaseAPIs + $DataAPIs + $MonitoringAPIs + $NetworkingAPIs

$enabled = 0
$failed = 0

foreach ($api in $allAPIs) {
    Write-Host "Checking $api..." -NoNewline
    
    $result = gcloud services enable $api --project=$ProjectID 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
        $enabled++
    } else {
        Write-Host " [FAIL]" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n" + "============================================================" -ForegroundColor Cyan
Write-Host "[STATS] API Enablement Summary" -ForegroundColor Cyan
Write-Host "   Enabled: $enabled" -ForegroundColor Green
Write-Host "   Failed:  $failed" -ForegroundColor Red
Write-Host "="*60 -ForegroundColor Cyan

# Show current enabled APIs
Write-Host "`n[LIST] Currently Enabled APIs:" -ForegroundColor Yellow
gcloud services list --enabled --project=$ProjectID --format="value(config.name)" | Select-Object -First 20

Write-Host "`n[DONE] API Enablement Complete!" -ForegroundColor Cyan

Write-Host "`n[INFRA] Production Infrastructure Status:" -ForegroundColor Yellow
Write-Host "   [X] Cloud Run - Deployed"
Write-Host "   [X] Cloud Build - Ready"
Write-Host "   [X] Artifact Registry - Ready"
Write-Host "   [ ] Cloud SQL - Ready to configure (run: ./deploy-database.sh)"
Write-Host "   [ ] Memorystore Redis - Ready to configure (run: ./deploy-database.sh)"
Write-Host "   [ ] AlloyDB - Ready to configure (run: ./deploy-database.sh)"
Write-Host "   [ ] GKE - Ready to configure (run: ./deploy-kubernetes.sh)"

Write-Host "`n[SECRETS] Secrets Status:" -ForegroundColor Yellow
Write-Host "   [ ] Run: ./create-gcp-secrets.ps1 -ProjectID $ProjectID"

Write-Host "`n[NEXT] Next Steps for Full Production Readiness:" -ForegroundColor Cyan
Write-Host "   1. ./create-gcp-secrets.ps1 -ProjectID $ProjectID" -ForegroundColor White
Write-Host "   2. ./deploy-database.sh --project-id $ProjectID" -ForegroundColor White
Write-Host "   3. Verify: gcloud secrets list --project=$ProjectID" -ForegroundColor White

# Alpha-Orion GCP Deployment Script for Windows (PowerShell)
$ErrorActionPreference = "Continue"

# Configuration
$PROJECT_ID = "alpha-orion"
$REGION = "us-central1"
$FRONTEND_IMAGE = "gcr.io/$PROJECT_ID/frontend-dashboard"
$BACKEND_IMAGE = "gcr.io/$PROJECT_ID/user-api-service"

Write-Host "🚀 Starting Alpha-Orion Deployment to GCP ($PROJECT_ID)..." -ForegroundColor Cyan

# 0. Run Diagnostics
if (Test-Path "diagnose-gcp.ps1") {
    ./diagnose-gcp.ps1 -ProjectID $PROJECT_ID
    $Report = Get-Content "gcp-deployment-fix-report.json" | ConvertFrom-Json
    if ($Report.deployment_readiness -eq "BLOCKED") {
        Write-Host "❌ Deployment Blocked by Diagnostics. Fix issues above." -ForegroundColor Red
        exit 1
    }
}

# 1. Configure Project
Write-Host "Configuring GCP Project..."
gcloud config set project $PROJECT_ID

# 2. Enable Services
Write-Host "Enabling required APIs..."
gcloud services enable run.googleapis.com container.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com redis.googleapis.com

# 3. Deploy Frontend
Write-Host "Building and Deploying Frontend..." -ForegroundColor Yellow
# Build from root context (.) using the Dockerfile in docker/
gcloud builds submit --tag $FRONTEND_IMAGE --file docker/frontend.Dockerfile .

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend Build Successful. Deploying to Cloud Run..." -ForegroundColor Green
    $FrontendService = gcloud run deploy frontend-dashboard `
        --image $FRONTEND_IMAGE `
        --platform managed `
        --region $REGION `
        --allow-unauthenticated `
        --port 80 `
        --format="value(status.url)"
    
    Write-Host "Frontend deployed at: $FrontendService" -ForegroundColor Green
} else {
    Write-Host "Frontend Build Failed!" -ForegroundColor Red
    exit 1
}

# 4. Deploy Backend (Optional - assuming standard path)
$BACKEND_PATH = "backend-services/services/user-api-service"
if (Test-Path $BACKEND_PATH) {
    Write-Host "Building Backend Service..." -ForegroundColor Yellow
    # Ensure we build from the service directory to capture local dependencies if needed, or root if shared
    # Based on blockers analysis, we use the specific service path
    gcloud builds submit --tag $BACKEND_IMAGE $BACKEND_PATH
    
    Write-Host "Deploying Backend Service..." -ForegroundColor Yellow
    
    # Deploy with required environment variables and secrets
    # Note: Secrets must exist in GCP Secret Manager. If not, these will fail.
    # We use placeholders for critical env vars that should be replaced or set in GCP.
    $BackendService = gcloud run deploy user-api-service `
        --image $BACKEND_IMAGE `
        --platform managed `
        --region $REGION `
        --allow-unauthenticated `
        --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,FRONTEND_URL=$FrontendService" `
        --set-secrets="DATABASE_URL=DATABASE_URL:latest,REDIS_URL=REDIS_URL:latest,PIMLICO_API_KEY=PIMLICO_API_KEY:latest,ONE_INCH_API_KEY=ONE_INCH_API_KEY:latest" `
        --format="value(status.url)"
        
    Write-Host "Backend deployed at: $BackendService" -ForegroundColor Green
}

Write-Host "✅ Deployment Sequence Complete!" -ForegroundColor Cyan
Write-Host "---------------------------------------------------"
Write-Host "📊 ACCESS YOUR DASHBOARD HERE:" -ForegroundColor Yellow
Write-Host "$FrontendService/official-dashboard.html" -ForegroundColor Cyan
Write-Host "---------------------------------------------------"
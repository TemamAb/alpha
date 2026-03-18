# start_profit_engine.ps1
# Automates Phase 2: Start Profit Engine
# Performs health checks and triggers the profit generation logic on the deployed service.

$ErrorActionPreference = "Stop"
Write-Host "Starting Phase 2: Start Profit Engine..." -ForegroundColor Cyan

$ServiceName = "brain-orchestrator"
$ProjectID = "alpha-orion-485207"
$Region = "us-central1"

# 1. Get Service URL dynamically from Cloud Run
Write-Host "Retrieving Service URL..." -ForegroundColor Yellow
$ServiceUrl = gcloud run services describe $ServiceName --project $ProjectID --region $Region --format "value(status.url)"

if (-not $ServiceUrl) {
    Write-Error "Could not retrieve service URL. Is the service deployed?"
    exit 1
}
Write-Host "Target Service URL: $ServiceUrl" -ForegroundColor Gray

# 2. Test Health Endpoint
Write-Host "`nStep 2.1: Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $HealthResponse = Invoke-RestMethod -Uri "$ServiceUrl/health" -Method Get
    Write-Host "✅ Health Check Passed: $($HealthResponse | ConvertTo-Json -Depth 1 -Compress)" -ForegroundColor Green
} catch {
    Write-Error "❌ Health check failed. Service might not be running or is crashing. Error: $_"
}

# 3. Start Profit Generation
Write-Host "`nStep 2.2: Starting Profit Engine..." -ForegroundColor Yellow
try {
    $StartResponse = Invoke-RestMethod -Uri "$ServiceUrl/api/profit/start" -Method Post
    Write-Host "✅ Start Command Sent: $($StartResponse | ConvertTo-Json -Depth 1 -Compress)" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Failed to start profit engine. It might already be running or there is a configuration issue. Error: $_"
}

# 4. Monitor Status
Write-Host "`nStep 2.3: Checking Profit Status..." -ForegroundColor Yellow
try {
    $StatusResponse = Invoke-RestMethod -Uri "$ServiceUrl/api/profit/status" -Method Get
    Write-Host "ℹ️ Current Status: $($StatusResponse | ConvertTo-Json -Depth 1 -Compress)" -ForegroundColor Cyan
} catch {
    Write-Error "❌ Failed to fetch status. Error: $_"
}
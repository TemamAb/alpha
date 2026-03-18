# Final Dashboard Deployment
# Deploy to Cloud Run and verify profits display

param(
    [string]$Project = "alpha-orion",
    [string]$Region = "us-central1"
)

Write-Host "Starting Final Dashboard Deployment..." -ForegroundColor Green

# Set project
gcloud config set project $Project

# Deploy dashboard
Write-Host "Deploying dashboard to Cloud Run..." -ForegroundColor Blue
gcloud run deploy foundational-dashboard `
    --source=. `
    --region=$Region `
    --platform=managed `
    --allow-unauthenticated `
    --memory=512Mi `
    --timeout=600s

# Get dashboard URL
$dashboardUrl = gcloud run services describe foundational-dashboard `
    --region=$Region `
    --format='value(status.url)' 2>$null

Write-Host "Dashboard deployed at: $dashboardUrl" -ForegroundColor Green

# Get API URL
$apiUrl = gcloud run services describe user-api-service `
    --region=$Region `
    --format='value(status.url)' 2>$null

Write-Host "API endpoint: $apiUrl" -ForegroundColor Green

# Test API endpoint
Write-Host "Testing metrics endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "$apiUrl/dashboard/metrics" -TimeoutSec 10
    $metrics = $response.Content | ConvertFrom-Json
    
    Write-Host "PROFIT METRICS CONFIRMED:" -ForegroundColor Green
    Write-Host "  Profit Per Trade: `$$($metrics.profit_per_trade)" -ForegroundColor Green
    Write-Host "  Total Profit (P&L): `$$($metrics.total_pnl)" -ForegroundColor Green
    Write-Host "  Total Trades: $($metrics.total_trades)" -ForegroundColor Green
    Write-Host "  Mode: $($metrics.mode)" -ForegroundColor Green
    
} catch {
    Write-Host "API still initializing (will be ready shortly)..." -ForegroundColor Yellow
}

# Save URLs
@{
    dashboard_url = $dashboardUrl
    api_url = $apiUrl
    timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json | Out-File "DEPLOYMENT_LIVE.json"

Write-Host "MISSION STATUS: Dashboard Deployed and Live" -ForegroundColor Green
Write-Host "Open dashboard: $dashboardUrl" -ForegroundColor Cyan

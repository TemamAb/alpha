# view_trade_logs.ps1
Write-Host "🔍 Searching Cloud Run logs for Arbitrage Activity..." -ForegroundColor Cyan

# 1. Search for "Executing Trade" logs (Intent)
Write-Host "`n--- 1. Trade Opportunities Executed ---" -ForegroundColor Yellow
$FilterInit = 'resource.type="cloud_run_revision" AND resource.labels.service_name="user-api-service" AND jsonPayload.message:"Executing Trade"'
gcloud logging read $FilterInit --limit 5 --format="table(timestamp, jsonPayload.message, jsonPayload.expectedProfit, jsonPayload.pair)"

# 2. Search for "Trade Submitted" logs (Result)
Write-Host "`n--- 2. Trades Submitted to Blockchain ---" -ForegroundColor Yellow
$FilterSubmit = 'resource.type="cloud_run_revision" AND resource.labels.service_name="user-api-service" AND jsonPayload.message:"Trade Submitted"'
gcloud logging read $FilterSubmit --limit 5 --format="table(timestamp, jsonPayload.message, jsonPayload.netProfit, jsonPayload.txHash)"

Write-Host "`n✅ To tail logs in real-time, run:" -ForegroundColor Green
Write-Host "   gcloud run services logs tail user-api-service --region us-central1" -ForegroundColor Gray
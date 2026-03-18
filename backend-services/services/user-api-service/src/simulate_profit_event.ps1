# simulate_profit_event.ps1
$ErrorActionPreference = "Stop"

Write-Host "🚀 Triggering Simulated High-Profit Market Event..." -ForegroundColor Cyan

# 1. Target Local API
$ServiceUrl = "http://localhost:8080"

Write-Host "Target: $ServiceUrl" -ForegroundColor Gray

# 2. Trigger Simulation
$Payload = @{
    amount = 1500
} | ConvertTo-Json

try {
    Write-Host "💉 Injecting $1500 profit event..." -ForegroundColor Yellow
    $Response = Invoke-RestMethod -Uri "$ServiceUrl/simulate/market-event" -Method Post -Body $Payload -ContentType "application/json"
    
    Write-Host "✅ Simulation Triggered!" -ForegroundColor Green
    Write-Host "   New Realized P&L: `$$($Response.newRealizedProfit)"
    Write-Host ""
    Write-Host "⏳ Watching for Auto-Withdrawal trigger (Threshold: $1000)..." -ForegroundColor Yellow
    
    # 3. Poll for withdrawal execution
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 2
        try {
            $PnL = Invoke-RestMethod -Uri "$ServiceUrl/analytics/total-pnl"
            $Realized = $PnL.realizedProfit
            
            Write-Host "   Current Realized Profit: `$$Realized" -ForegroundColor Gray
            
            if ($Realized -lt 1000) {
                Write-Host ""
                Write-Host "🎉 SUCCESS: Auto-Withdrawal Executed! Profit dropped below threshold." -ForegroundColor Green
                exit 0
            }
        } catch { Write-Host "." -NoNewline }
    }
    
    Write-Host "⚠️  Timeout waiting for withdrawal. Check Cloud Run logs." -ForegroundColor Red
} catch {
    Write-Error "Failed to trigger simulation. Did you redeploy after updating index.js? Error: $_"
}
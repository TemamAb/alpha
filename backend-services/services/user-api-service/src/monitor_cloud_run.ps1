# monitor_cloud_run.ps1
$ErrorActionPreference = "Stop"

Write-Host "Retrieving Cloud Run Service URL..." -ForegroundColor Cyan

$Project = gcloud config get-value project 2>$null
Write-Host "Target Project: $Project" -ForegroundColor Gray

try {
    $ServiceUrl = gcloud run services describe user-api-service --region us-central1 --format="value(status.url)" 2>$null
    if ([string]::IsNullOrWhiteSpace($ServiceUrl)) { throw "URL is empty" }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: Service 'user-api-service' not found in project '$Project'." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Did you run 'deploy_and_push.ps1' successfully?"
    Write-Host "2. Are you in the correct GCP project? (Current: $Project)"
    Write-Host "3. Available services in us-central1:"
    Write-Host ""
    gcloud run services list --region us-central1
    exit 1
}

Write-Host "Monitoring Service at: $ServiceUrl" -ForegroundColor Green
Start-Sleep -Seconds 2

while ($true) {
    try {
        $mode = Invoke-RestMethod -Uri "$ServiceUrl/mode/current" -ErrorAction SilentlyContinue
        $pnl = Invoke-RestMethod -Uri "$ServiceUrl/analytics/total-pnl" -ErrorAction SilentlyContinue
        $opps = Invoke-RestMethod -Uri "$ServiceUrl/opportunities" -ErrorAction SilentlyContinue
        $mission = Invoke-RestMethod -Uri "$ServiceUrl/mission/status" -ErrorAction SilentlyContinue
        
        Clear-Host
        Write-Host "===============================================================================" -ForegroundColor Cyan
        Write-Host "                    ALPHA-ORION CLOUD MONITOR"
        Write-Host "==============================================================================="
        Write-Host ""
        Write-Host "URL: $ServiceUrl" -ForegroundColor Gray
        Write-Host "Time: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
        Write-Host ""
        
        if ($mission) {
            Write-Host "MISSION: $($mission.mission) [$($mission.status)]" -ForegroundColor Green
            Write-Host ""
        }

        if ($mode) {
            Write-Host "STATUS" -ForegroundColor Yellow
            Write-Host "   Mode:             $($mode.mode)"
            Write-Host "   Network:          $($mode.network)"
            Write-Host "   Active Opps:      $($mode.realOpportunitiesFound)"
            Write-Host "   Session Duration: $($mode.sessionDuration)s"
        }

        if ($pnl) {
            Write-Host ""
            Write-Host "PROFIT & LOSS" -ForegroundColor Green
            Write-Host "   Total P&L:        `$$($pnl.totalPnL)"
            Write-Host "   Realized:         `$$($pnl.realizedProfit)"
            Write-Host "   Unrealized:       `$$($pnl.unrealizedProfit)"
            Write-Host "   Trades:           $($pnl.totalTrades) ($($pnl.confirmedTrades) confirmed)"
        }

        if ($opps -and $opps.count -gt 0) {
            Write-Host ""
            Write-Host "ACTIVE OPPORTUNITIES ($($opps.count))" -ForegroundColor Magenta
            foreach ($opp in $opps.opportunities) {
                Write-Host "   * $($opp.assets -join '/') -> Est. Profit: `$$([math]::Round($opp.potentialProfit, 2))"
            }
        } else {
             Write-Host ""
             Write-Host "SCANNING..." -ForegroundColor Gray
        }

        Write-Host ""
        Write-Host "-------------------------------------------------------------------------------"
        Write-Host "Press Ctrl+C to stop"
    } catch {
        Write-Host "Connection Error: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 5
}
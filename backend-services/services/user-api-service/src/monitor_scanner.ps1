# monitor_scanner.ps1
$ErrorActionPreference = "Stop"
Write-Host "📡 Alpha-Orion: Monitoring Real-Time Scanner" -ForegroundColor Cyan
Write-Host "   Target: http://localhost:8080/opportunities" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop monitoring (System keeps running)" -ForegroundColor Gray
Write-Host ""

while ($true) {
    try {
        $Response = Invoke-RestMethod -Uri "http://localhost:8080/opportunities" -ErrorAction Stop
        $Time = Get-Date -Format "HH:mm:ss"
        
        # Check if opportunities exist
        if ($Response -is [array] -and $Response.Count -gt 0) {
            Write-Host "[$Time] 🎯 $($Response.Count) Opportunities Found!" -ForegroundColor Green
            foreach ($Opp in $Response) {
                # Print details safely
                $Info = "Found"
                if ($Opp.pair) { $Info = "Pair: $($Opp.pair)" }
                if ($Opp.expectedProfit) { $Info += " | Profit: $($Opp.expectedProfit)" }
                Write-Host "        - $Info" -ForegroundColor Green
            }
        } else {
            Write-Host "[$Time] ⏳ Scanning markets... (No arbitrage found > threshold)" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "[$Time] ❌ Cannot connect to API (Is AUTO_DEPLOY.bat running?)" -ForegroundColor Red
    }
    Start-Sleep -Seconds 10
}
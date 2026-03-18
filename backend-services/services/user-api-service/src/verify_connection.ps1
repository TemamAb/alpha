$ErrorActionPreference = "Stop"
Write-Host "🔍 Verifying Alpha-Orion Connection and Profit Status..." -ForegroundColor Cyan

$Findings = @()
$AllGood = $true

# 1. Check API
Write-Host "1. Checking Production API (Port 8080)..." -NoNewline
try {
    $Health = Invoke-RestMethod -Uri "http://localhost:8080/health" -ErrorAction Stop
    if ($Health.status -eq "ok") {
        Write-Host " ✅ UP (Mode: $($Health.mode))" -ForegroundColor Green
        $Findings += "API: Online (Production)"
    } else {
        Write-Host " ⚠️  UP but status is '$($Health.status)'" -ForegroundColor Yellow
        $Findings += "API: Warning (Status: $($Health.status))"
    }
} catch {
    Write-Host " ❌ DOWN (Connection failed)" -ForegroundColor Red
    Write-Host "    👉 Ensure Terminal 1 is running 'npm start'" -ForegroundColor Gray
    $Findings += "API: Offline"
    $AllGood = $false
}

# 2. Check Profit Generation
Write-Host "2. Checking Profit Generation..." -NoNewline
try {
    $PnL = Invoke-RestMethod -Uri "http://localhost:8080/analytics/total-pnl" -ErrorAction Stop
    Write-Host " ✅ ACTIVE" -ForegroundColor Green
    Write-Host "    💰 Total PnL: $($PnL.totalPnL)" -ForegroundColor Cyan
    Write-Host "    ✅ Realized:  $($PnL.realizedProfit)" -ForegroundColor Gray
    Write-Host "    📊 Trades:    $($PnL.totalTrades)" -ForegroundColor Gray
    $Findings += "Profit: Active (PnL: $($PnL.totalPnL))"
} catch {
    Write-Host " ⚠️  Waiting for API..." -ForegroundColor Yellow
    $Findings += "Profit: Unavailable"
}

# 3. Check Dashboard
Write-Host "3. Checking Dashboard Server..." -NoNewline
$DashPort = 9090
$PortFile = "$PSScriptRoot\..\..\..\..\dashboard_port.txt"
if (Test-Path $PortFile) {
    $RawPort = Get-Content $PortFile | Select-Object -First 1
    if (-not [string]::IsNullOrWhiteSpace($RawPort)) {
        $DashPort = $RawPort.Trim()
    }
}

try {
    $Response = Invoke-WebRequest -Uri "http://localhost:$DashPort" -Method Get -ErrorAction Stop
    if ($Response.StatusCode -eq 200) {
        if ($Response.Content -match "Alpha-Orion LIVE PROFIT") {
            Write-Host " ✅ UP (Port $DashPort) - Content Verified" -ForegroundColor Green
            $Findings += "Dashboard: Online (Port $DashPort)"
        } else {
            Write-Host " ⚠️  UP (Port $DashPort) - Content Mismatch" -ForegroundColor Yellow
            $Findings += "Dashboard: Online but content mismatch"
        }
    } else {
        Write-Host " ⚠️  Returned $($Response.StatusCode)" -ForegroundColor Yellow
        $Findings += "Dashboard: Error ($($Response.StatusCode))"
        $AllGood = $false
    }
} catch {
    Write-Host " ❌ DOWN (Connection failed on port $DashPort)" -ForegroundColor Red
    Write-Host "    👉 Ensure Terminal 2 is running" -ForegroundColor Gray
    $Findings += "Dashboard: Offline"
    $AllGood = $false
}

Write-Host ""
Write-Host "📋 FINDINGS:" -ForegroundColor Cyan
foreach ($F in $Findings) {
    Write-Host "   - $F"
}

if ($AllGood) {
    Write-Host ""
    Write-Host "🚀 Opening Dashboard in Browser..." -ForegroundColor Green
    Start-Process "http://localhost:$DashPort"
}

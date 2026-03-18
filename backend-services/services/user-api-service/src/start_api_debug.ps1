# start_api_debug.ps1
# Runs the API in the foreground to capture startup errors
$ErrorActionPreference = "Stop"
Write-Host "🐞 Alpha-Orion API Debugger" -ForegroundColor Cyan

# 1. Check Config
$EnvPath = "$PSScriptRoot\..\.env"
$NeedsFix = $false

if (Test-Path $EnvPath) {
    $Content = Get-Content $EnvPath
    foreach ($Line in $Content) {
        if ($Line -match "PLACEHOLDER" -or $Line -match "0x0000000000000000000000000000000000000000") {
            $NeedsFix = $true
            Write-Host "⚠️  Invalid config found: $Line" -ForegroundColor Yellow
        }
    }
} else {
    $NeedsFix = $true
    Write-Host "⚠️  .env file missing!" -ForegroundColor Yellow
}

if ($NeedsFix) {
    Write-Host "🛑 Configuration errors detected. Launching fix script..." -ForegroundColor Red
    & "$PSScriptRoot\fix_all_secrets.ps1"
}

# 2. Kill Port 8080
Write-Host "🧹 Clearing Port 8080..." -ForegroundColor Gray
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# 3. Start API
Write-Host "🚀 Starting API in DEBUG MODE (Press Ctrl+C to stop)..." -ForegroundColor Green
Write-Host "   Watch for errors below:" -ForegroundColor Gray
Write-Host "---------------------------------------------------"

Set-Location "$PSScriptRoot\.."
npm start
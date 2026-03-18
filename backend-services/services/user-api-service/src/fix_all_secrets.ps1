# fix_all_secrets.ps1
# Scans .env for placeholders and prompts user to fix them
$ErrorActionPreference = "Stop"

Write-Host "🔧 Alpha-Orion: Scanning Configuration..." -ForegroundColor Cyan

$EnvPath = "$PSScriptRoot\..\.env"
if (-not (Test-Path $EnvPath)) {
    Write-Error ".env file not found at $EnvPath"
    exit 1
}

# Read current env
$EnvContent = [ordered]@{}
Get-Content $EnvPath | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.*)$") {
        $Key = $Matches[1].Trim()
        $Val = $Matches[2].Trim()
        $EnvContent[$Key] = $Val
    }
}

$UpdatesMade = $false

# Define critical keys to check
$Checks = @{
    "ONE_INCH_API_KEY" = "Enter 1inch API Key (Free at portal.1inch.dev)"
    "INFURA_API_KEY"   = "Enter Infura API Key (Free at infura.io)"
    "PIMLICO_API_KEY"  = "Enter Pimlico API Key (Free at pimlico.io)"
    "WALLET_ADDRESS"   = "Enter Wallet Address (0x...)"
}

foreach ($Key in $Checks.Keys) {
    $CurrentVal = $EnvContent[$Key]
    
    # Check if missing, empty, or placeholder
    $IsInvalid = ([string]::IsNullOrWhiteSpace($CurrentVal) -or $CurrentVal -match "PLACEHOLDER" -or $CurrentVal -eq "0x0000000000000000000000000000000000000000")
    
    if ($IsInvalid -or ($Key -eq "INFURA_API_KEY" -and $CurrentVal.Length -gt 36)) {
        Write-Host "⚠️  Issue found with $Key" -ForegroundColor Yellow
        Write-Host "   Current: '$CurrentVal' (Invalid or Placeholder)" -ForegroundColor Gray
        
        $NewVal = Read-Host "   👉 $($Checks[$Key])"
        
        if (-not [string]::IsNullOrWhiteSpace($NewVal)) {
            $EnvContent[$Key] = $NewVal
            $UpdatesMade = $true
            Write-Host "   ✅ Updated." -ForegroundColor Green
        } else {
            Write-Warning "   Skipped (Value remains invalid)"
        }
        Write-Host ""
    }
}

if ($UpdatesMade) {
    $Output = @()
    foreach ($Key in $EnvContent.Keys) {
        $Output += "$Key=$($EnvContent[$Key])"
    }
    $Output | Out-File -FilePath $EnvPath -Encoding utf8
    Write-Host "💾 Configuration saved to .env" -ForegroundColor Green
    Write-Host "♻️  You must restart AUTO_DEPLOY.bat for changes to take effect." -ForegroundColor Cyan
} else {
    Write-Host "✅ Configuration looks good. No changes needed." -ForegroundColor Green
}
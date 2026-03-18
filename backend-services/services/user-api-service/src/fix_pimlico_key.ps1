# fix_pimlico_key.ps1
$ErrorActionPreference = "Stop"
Write-Host "🔧 Fixing Pimlico API Key..." -ForegroundColor Cyan

# Get Key
$Key = Read-Host "Enter your Pimlico API Key (Get free at pimlico.io)"
if ([string]::IsNullOrWhiteSpace($Key)) { Write-Error "Key cannot be empty."; exit 1 }

# Update GCP
Write-Host "1. Updating Google Cloud Secret..." -NoNewline
try {
    $Key | gcloud secrets versions add pimlico-api-key --data-file=- --quiet
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " ERROR (Check gcloud login)" -ForegroundColor Red
}

# Update Local .env
Write-Host "2. Updating local .env file..." -NoNewline
$EnvPath = "$PSScriptRoot\..\.env"
if (Test-Path $EnvPath) {
    $Content = Get-Content $EnvPath
    $NewContent = @()
    $Found = $false
    foreach ($Line in $Content) {
        if ($Line -match "^PIMLICO_API_KEY=") {
            $NewContent += "PIMLICO_API_KEY=$Key"
            $Found = $true
        } else {
            $NewContent += $Line
        }
    }
    if (-not $Found) { $NewContent += "PIMLICO_API_KEY=$Key" }
    
    $NewContent | Set-Content $EnvPath
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Warning " .env not found!"
}

Write-Host "`n✅ Key Fixed. Please restart AUTO_DEPLOY.bat" -ForegroundColor Cyan
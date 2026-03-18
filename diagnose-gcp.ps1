# Alpha-Orion GCP Diagnostics (PowerShell)
param (
    [string]$ProjectID = "alpha-orion"
)

$ErrorActionPreference = "Continue"
$ReportFile = "gcp-deployment-fix-report.json"
$Issues = @()

Write-Host "🔍 Running GCP Diagnostics for project: $ProjectID" -ForegroundColor Cyan
Write-Host "------------------------------------------------"

# 1. Check Auth
$Auth = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $Auth) {
    Write-Host "❌ Not authenticated with gcloud." -ForegroundColor Red
    $Issues += "Not authenticated"
} else {
    Write-Host "✅ Authenticated as $Auth" -ForegroundColor Green
}

# 2. Check Project
$CurrProj = gcloud config get-value project 2>$null
if ($CurrProj -ne $ProjectID) {
    Write-Host "⚠️  Current project is $CurrProj. Switching..." -ForegroundColor Yellow
    gcloud config set project $ProjectID
} else {
    Write-Host "✅ Project configured correctly." -ForegroundColor Green
}

# 3. Check APIs
Write-Host "⏳ Checking APIs..."
$RequiredApis = @("run.googleapis.com", "cloudbuild.googleapis.com", "secretmanager.googleapis.com", "sqladmin.googleapis.com", "redis.googleapis.com")
$EnabledApis = gcloud services list --enabled --project=$ProjectID --format="value(config.name)" 2>$null

foreach ($Api in $RequiredApis) {
    if ($EnabledApis -notcontains $Api) {
        Write-Host "❌ Missing API: $Api" -ForegroundColor Red
        $Issues += "Missing API: $Api"
    }
}

# 4. Check Secrets
Write-Host "⏳ Checking Secrets..."
$RequiredSecrets = @("DATABASE_URL", "REDIS_URL", "PIMLICO_API_KEY", "ONE_INCH_API_KEY")
$ExistingSecrets = gcloud secrets list --project=$ProjectID --format="value(name)" 2>$null

foreach ($Secret in $RequiredSecrets) {
    $Found = $false
    if ($ExistingSecrets) {
        foreach ($Ex in $ExistingSecrets) {
            if ($Ex -match "/$Secret$") { $Found = $true; break }
        }
    }
    
    if (-not $Found) {
        Write-Host "⚠️  Missing Secret: $Secret" -ForegroundColor Yellow
        $Issues += "Missing Secret: $Secret"
    }
}

# 5. Check Files
if (-not (Test-Path "official-dashboard.html")) {
    Write-Host "❌ Missing official-dashboard.html" -ForegroundColor Red
    $Issues += "Missing official-dashboard.html"
}

# Generate Report
$Readiness = "READY"
if ($Issues.Count -gt 0) {
    if ($Issues -match "Missing Secret") { $Readiness = "CAUTION" } else { $Readiness = "BLOCKED" }
}

$Report = @{ deployment_readiness = $Readiness; issues = $Issues } | ConvertTo-Json
Set-Content -Path $ReportFile -Value $Report

Write-Host "`n📄 Report saved to $ReportFile" -ForegroundColor Gray
Write-Host "📊 Status: $Readiness" -ForegroundColor ($Readiness -eq "READY" ? "Green" : ($Readiness -eq "CAUTION" ? "Yellow" : "Red"))
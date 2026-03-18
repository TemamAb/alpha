# =============================================================================
# Test Dashboard Integration with Live API
# Purpose: Verify dashboard can fetch and display profit metrics
# =============================================================================

param(
    [string]$ApiUrl = "",
    [string]$DashboardPath = "./official-dashboard.html",
    [switch]$ListServices = $false
)

# Color codes
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Test-Endpoint {
    param(
        [string]$Endpoint,
        [string]$Description
    )
    
    try {
        Write-Host "${Blue}Testing${Reset}: $Description"
        $response = Invoke-WebRequest -Uri "$ApiUrl$Endpoint" -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "${Green}✓ PASS${Reset}: $Endpoint"
            $data = $response.Content | ConvertFrom-Json
            Write-Host "Response: $(($data | ConvertTo-Json -Depth 2) | Select-Object -First 10)"
            return $true
        }
    } catch {
        Write-Host "${Red}✗ FAIL${Reset}: $Description"
        Write-Host "Error: $($_.Exception.Message)"
        return $false
    }
}

function Get-CloudRunServices {
    Write-Host "`n${Blue}Getting Cloud Run Services...${Reset}`n"
    
    try {
        $services = gcloud run services list --region=us-central1 --format="table(name,status,url)" 2>&1
        Write-Host $services
        
        # Extract API service URL
        $apiService = gcloud run services describe user-api-service --region=us-central1 --format='value(status.url)' 2>&1
        if ($apiService -and $apiService -notlike "*ERROR*") {
            Write-Host "${Green}✓ API Service URL:${Reset} $apiService"
            return $apiService
        }
    } catch {
        Write-Host "${Red}Error listing services:${Reset} $($_.Exception.Message)"
    }
    return $null
}

function Test-DashboardFile {
    param([string]$Path)
    
    Write-Host "`n${Blue}Testing Dashboard File...${Reset}`n"
    
    if (-not (Test-Path $Path)) {
        Write-Host "${Red}✗ Dashboard file not found:${Reset} $Path"
        return $false
    }
    
    Write-Host "${Green}✓ Dashboard file exists${Reset}: $Path"
    
    # Check for auto-withdrawal elements
    $content = Get-Content $Path -Raw
    
    $checks = @{
        "auto-withdrawal-toggle" = "Auto-withdrawal toggle checkbox"
        "withdrawal-threshold" = "Withdrawal threshold input"
        "toggleAutoWithdrawal" = "toggleAutoWithdrawal function"
        "executeManualWithdrawal" = "executeManualWithdrawal function"
        "initializeAutoWithdrawal" = "initializeAutoWithdrawal function"
        "updateWithdrawalThreshold" = "updateWithdrawalThreshold function"
    }
    
    $allFound = $true
    foreach ($check in $checks.GetEnumerator()) {
        if ($content -match $check.Key) {
            Write-Host "${Green}✓${Reset} Found: $($check.Value)"
        } else {
            Write-Host "${Red}✗${Reset} Missing: $($check.Value)"
            $allFound = $false
        }
    }
    
    return $allFound
}

function Test-ApiConnectivity {
    param([string]$Url)
    
    if (-not $Url) {
        Write-Host "${Red}No API URL provided${Reset}"
        return $false
    }
    
    Write-Host "`n${Blue}Testing API Connectivity...${Reset}`n"
    
    # Test main endpoints
    $endpoints = @{
        "/dashboard/metrics" = "Dashboard metrics (profit data)"
        "/analytics/total-pnl" = "Total P&L analytics"
        "/trades/executed" = "Executed trades list"
        "/mode/current" = "Current operating mode"
        "/pimlico/status" = "Pimlico gasless status"
    }
    
    $passedTests = 0
    $totalTests = $endpoints.Count
    
    foreach ($endpoint in $endpoints.GetEnumerator()) {
        if (Test-Endpoint -Endpoint $endpoint.Key -Description $endpoint.Value) {
            $passedTests++
        }
        Write-Host ""
    }
    
    Write-Host "${Blue}Test Results:${Reset} $passedTests / $totalTests passed"
    return ($passedTests -gt 0)
}

function Display-IntegrationStatus {
    param(
        [bool]$DashboardOk,
        [bool]$ApiOk,
        [string]$ApiUrl
    )
    
    Write-Host "`n$('='*60)"
    Write-Host "INTEGRATION STATUS"
    Write-Host "$('='*60)`n"
    
    Write-Host "Dashboard File: $(if ($DashboardOk) { "${Green}✓ OK${Reset}" } else { "${Red}✗ MISSING${Reset}" })"
    Write-Host "API Connectivity: $(if ($ApiOk) { "${Green}✓ OK${Reset}" } else { "${Red}✗ OFFLINE${Reset}" })"
    
    if ($ApiUrl) {
        Write-Host "API URL: $ApiUrl"
    }
    
    Write-Host ""
    
    if ($DashboardOk -and $ApiOk) {
        Write-Host "${Green}✅ INTEGRATION READY!${Reset}`n"
        Write-Host "Next steps:"
        Write-Host "1. Open dashboard in browser"
        Write-Host "2. Configure wallet addresses"
        Write-Host "3. Watch profit metrics update in real-time"
        return $true
    } else {
        Write-Host "${Yellow}⚠️  INTEGRATION INCOMPLETE${Reset}`n"
        if (-not $DashboardOk) {
            Write-Host "- Dashboard file needs to be deployed"
        }
        if (-not $ApiOk) {
            Write-Host "- API service needs to be deployed to Cloud Run"
        }
        return $false
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "`n$('='*60)"
Write-Host "ALPHA-ORION DASHBOARD INTEGRATION TEST"
Write-Host "$('='*60)`n"

# If no API URL provided, try to get from Cloud Run
if (-not $ApiUrl) {
    Write-Host "Attempting to get API URL from Cloud Run...\n"
    $ApiUrl = Get-CloudRunServices
    
    if (-not $ApiUrl) {
        Write-Host "`n${Yellow}Could not determine API URL.${Reset}"
        Write-Host "Please provide API URL with: -ApiUrl 'https://your-api-url'"
        Write-Host "`nAlternatively, list services with: -ListServices`n"
        
        if ($ListServices) {
            Get-CloudRunServices
        }
        exit 1
    }
}

Write-Host "Using API URL: $ApiUrl`n"

# Run tests
$dashboardOk = Test-DashboardFile -Path $DashboardPath
Write-Host ""
$apiOk = Test-ApiConnectivity -Url $ApiUrl
Write-Host ""

# Display status
$success = Display-IntegrationStatus -DashboardOk $dashboardOk -ApiOk $apiOk -ApiUrl $ApiUrl

# Summary
Write-Host "`n$('='*60)"
Write-Host "TEST SUMMARY"
Write-Host "$('='*60)"
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Dashboard: $DashboardPath"
Write-Host "API: $ApiUrl"
Write-Host "Status: $(if ($success) { 'PASS' } else { 'FAIL' })"
Write-Host "$('='*60)`n"

exit $(if ($success) { 0 } else { 1 })

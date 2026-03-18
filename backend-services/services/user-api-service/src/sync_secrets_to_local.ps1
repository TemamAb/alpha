# sync_secrets_to_local.ps1
# DEEP DIVE FIX: Consolidates Root .env, GCP Secrets, and Local Config
$ErrorActionPreference = "Stop"

Write-Host "️  DEEP DIVE: Analyzing and Fixing Configuration..." -ForegroundColor Cyan

$ServiceEnvPath = "$PSScriptRoot\..\.env"
$RootEnvPath = "$PSScriptRoot\..\..\..\..\.env"

# 1. Initialize Configuration Dictionary
$Config = [ordered]@{}

# Defaults
$Config["PORT"] = "8080"
$Config["NODE_ENV"] = "production"
$Config["DEPLOY_MODE"] = "production"

# 2. Helper to clean values
function Clean-Value ($val) {
    if ([string]::IsNullOrWhiteSpace($val)) { return $null }
    if ($val -match "PLACEHOLDER") { return $null }
    if ($val -eq "0x0000000000000000000000000000000000000000") { return $null }
    return $val.Trim()
}

# 3. Load Existing Service .env (to keep manual edits if valid)
if (Test-Path $ServiceEnvPath) {
    Write-Host "   📂 Reading Service .env..." -NoNewline
    Get-Content $ServiceEnvPath | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.*)$") {
            $Key = $Matches[1].Trim()
            $Val = Clean-Value $Matches[2]
            if ($Val) { $Config[$Key] = $Val }
        }
    }
    Write-Host " OK" -ForegroundColor Green
}

# 4. Load Root .env (The "Missing Mapping" Fix)
if (Test-Path $RootEnvPath) {
    Write-Host "   📂 Reading Root .env (Mapping keys)..." -NoNewline
    $RootKeys = @{}
    Get-Content $RootEnvPath | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.*)$") {
            $RootKeys[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }

    # MAP: Root Keys -> Service Keys
    $Mappings = @{
        "ETH_RPC_URL"       = "ETHEREUM_RPC_URL"
        "POLYGON_RPC_URL"   = "POLYGON_RPC_URL"
        "INFURA_API_KEY"    = "INFURA_API_KEY"
        "ETHERSCAN_API-KEY" = "ETHERSCAN_API_KEY" # Fix typo
        "ETHERSCAN_API_KEY" = "ETHERSCAN_API_KEY"
    }

    foreach ($RootKey in $Mappings.Keys) {
        $ServiceKey = $Mappings[$RootKey]
        if ($RootKeys.ContainsKey($RootKey)) {
            $Val = Clean-Value $RootKeys[$RootKey]
            # Only update if we don't have a valid value yet
            if ($Val -and -not $Config.ContainsKey($ServiceKey)) {
                $Config[$ServiceKey] = $Val
                Write-Host "`n      + Mapped $RootKey -> $ServiceKey" -ForegroundColor Gray
            }
        }
    }
    Write-Host " OK" -ForegroundColor Green
}

# 5. Load GCP Secrets (The Cloud Source)
$Project = gcloud config get-value project 2>$null
if (-not [string]::IsNullOrWhiteSpace($Project)) {
    Write-Host "   ☁️  Checking Google Cloud Secrets..." -NoNewline
    $GcpMappings = @{
        "profit-destination-wallet" = "WALLET_ADDRESS"
        "pimlico-api-key"           = "PIMLICO_API_KEY"
        "one-inch-api-key"          = "ONE_INCH_API_KEY"
        "infura-api-key"            = "INFURA_API_KEY"
        "polygon-rpc-url"           = "POLYGON_RPC_URL"
        "ethereum-rpc-url"          = "ETHEREUM_RPC_URL"
        "etherscan-api-key"         = "ETHERSCAN_API_KEY"
    }

    foreach ($Secret in $GcpMappings.Keys) {
        $EnvVar = $GcpMappings[$Secret]
        # Only fetch if we don't have it
        if (-not $Config.ContainsKey($EnvVar)) {
            try {
                $Val = gcloud secrets versions access latest --secret=$Secret --project=$Project --quiet 2>$null
                $Val = Clean-Value $Val
                if ($Val) {
                    $Config[$EnvVar] = $Val
                    Write-Host "`n      + Fetched $Secret" -ForegroundColor Gray
                }
            }
            catch {}
        }
    }
}

# 6. Final Validation & Prompt
$Critical = @("WALLET_ADDRESS", "PIMLICO_API_KEY", "ONE_INCH_API_KEY", "INFURA_API_KEY")
foreach ($Key in $Critical) {
    if (-not $Config.ContainsKey($Key)) {
        Write-Host "   ⚠️  MISSING: $Key" -ForegroundColor Yellow
        $Input = Read-Host "      Enter value for $Key"
        if (-not [string]::IsNullOrWhiteSpace($Input)) {
            $Config[$Key] = $Input.Trim()
        }
    }
}

# 7. Write Final .env
$Output = @()
foreach ($Key in $Config.Keys) {
    $Output += "$Key=$($Config[$Key])"
}
$Output | Out-File -FilePath $ServiceEnvPath -Encoding utf8
Write-Host "✅ FIXED: .env file regenerated at $ServiceEnvPath" -ForegroundColor Green
Write-Host "👉 You can now run AUTO_DEPLOY.bat" -ForegroundColor Cyan
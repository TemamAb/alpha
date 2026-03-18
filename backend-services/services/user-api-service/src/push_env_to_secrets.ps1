# push_env_to_secrets.ps1
# Pushes local .env values to Google Cloud Secret Manager and runs debug
$ErrorActionPreference = "Stop"
Write-Host "🚀 Pushing local .env to Google Cloud Secret Manager..." -ForegroundColor Cyan

$EnvPath = "$PSScriptRoot\..\.env"
if (-not (Test-Path $EnvPath)) {
    Write-Error ".env file not found at $EnvPath"
    exit 1
}

# Read .env
$EnvContent = @{}
Get-Content $EnvPath | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.*)$") {
        $Key = $Matches[1].Trim()
        $Val = $Matches[2].Trim()
        $EnvContent[$Key] = $Val
    }
}

# Mapping: Env Var Name -> GCP Secret Name
$Mappings = @{
    "WALLET_ADDRESS"    = "profit-destination-wallet"
    "PIMLICO_API_KEY"   = "pimlico-api-key"
    "ONE_INCH_API_KEY"  = "one-inch-api-key"
    "INFURA_API_KEY"    = "infura-api-key"
    "POLYGON_RPC_URL"   = "polygon-rpc-url"
    "ETHEREUM_RPC_URL"  = "ethereum-rpc-url"
    "ETH_RPC_URL"       = "ethereum-rpc-url"
    "ETHERSCAN_API_KEY" = "etherscan-api-key"
    "GEMINI_API_KEY"    = "gemini-api-key"
    "JWT_SECRET"        = "jwt-secret"
}

foreach ($EnvKey in $Mappings.Keys) {
    $SecretName = $Mappings[$EnvKey]
    
    if ($EnvContent.ContainsKey($EnvKey)) {
        $Value = $EnvContent[$EnvKey]
        
        # Validation: Don't upload placeholders or empty strings
        if ([string]::IsNullOrWhiteSpace($Value) -or $Value -match "PLACEHOLDER" -or $Value -eq "0x0000000000000000000000000000000000000000") {
            Write-Host "⚠️  Skipping $EnvKey (Invalid/Placeholder in .env)" -ForegroundColor Yellow
        } else {
            Write-Host "📤 Uploading $EnvKey -> $SecretName..." -NoNewline
            try {
                # Check if secret exists, create if not
                $Exists = gcloud secrets describe $SecretName --format="value(name)" 2>$null
                if (-not $Exists) {
                    gcloud secrets create $SecretName --replication-policy="automatic" --quiet
                }
                
                $Value | gcloud secrets versions add $SecretName --data-file=- --quiet
                Write-Host " OK" -ForegroundColor Green
            } catch {
                Write-Host " ERROR" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  $EnvKey not found in local .env" -ForegroundColor DarkGray
    }
}

Write-Host "`n✅ Upload Complete." -ForegroundColor Cyan
Write-Host "🚀 Starting Debugger to verify configuration..." -ForegroundColor Cyan
& "$PSScriptRoot\start_api_debug.ps1"
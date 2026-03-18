# setup_secrets.ps1
$ErrorActionPreference = "Stop"

Write-Host "🔐 Alpha-Orion Secret Configuration" -ForegroundColor Cyan
Write-Host "This script updates your GCP secrets with real values." -ForegroundColor Gray
Write-Host ""

$Secrets = @{
    "profit-destination-wallet" = "Enter your Wallet Address (0x...)"
    "pimlico-api-key"           = "Enter Pimlico API Key (Free at pimlico.io)"
    "one-inch-api-key"          = "Enter 1inch API Key (Free at portal.1inch.dev)"
    "infura-api-key"            = "Enter Infura API Key (Free at infura.io)"
    "polygon-rpc-url"           = "Enter Polygon RPC URL (default: https://polygon-rpc.com)"
    "ethereum-rpc-url"          = "Enter Ethereum RPC URL"
    "etherscan-api-key"         = "Enter Etherscan API Key (Free at etherscan.io)"
}

foreach ($Key in $Secrets.Keys) {
    $Prompt = $Secrets[$Key]
    $CurrentValue = ""
    
    Write-Host "------------------------------------------------"
    $InputVal = Read-Host "$Prompt [Press Enter to keep current]"
    
    if (-not [string]::IsNullOrWhiteSpace($InputVal)) {
        Write-Host "Updating '$Key'..." -ForegroundColor Yellow
        # Create a new version of the secret
        $InputVal | gcloud secrets versions add $Key --data-file=-
        Write-Host "✅ Updated." -ForegroundColor Green
    } else {
        Write-Host "Skipping '$Key'." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✅ Configuration Complete." -ForegroundColor Green
Write-Host "👉 Run 'sync_secrets_to_local.ps1' to update your local environment." -ForegroundColor Cyan
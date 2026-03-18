# Complete GCP Secrets Configuration Script
# Creates all required production secrets in GCP Secret Manager
param (
    [string]$ProjectID = "alpha-orion",
    [string]$Environment = "production"
)
$ErrorActionPreference = "Continue"

Write-Host "🔐 Configuring Complete GCP Secrets for $ProjectID..." -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Gray

gcloud config set project $ProjectID

# Enable required APIs
Write-Host "`n📡 Enabling required GCP APIs..." -ForegroundColor Yellow
gcloud services enable secretmanager.googleapis.com cloudsql.googleapis.com --project=$ProjectID

# Define all production secrets with values from .env.production
$Secrets = @{
    # Database - AlloyDB/Cloud SQL connection string
    "DATABASE_URL" = "postgresql://prod_user:CHANGE_ME@alloydb-host.internal:5432/alpha_orion"
    
    # Redis/Memorystore connection string
    "REDIS_URL" = "redis://:CHANGE_ME@redis-prod.internal:6379/0"
    
    # API Keys
    "PIMLICO_API_KEY" = "pim_UbfKR9ocMe5ibNUCGgB8fE"
    "ONE_INCH_API_KEY" = "CHANGE_ME"
    "ETHERSCAN_API_KEY" = "CHANGE_ME"
    "INFURA_API_KEY" = "mK2nj6ZSi1mZ2THJMUHcF"
    
    # Blockchain RPC URLs
    "ETHEREUM_RPC_URL" = "https://eth-mainnet.g.alchemy.com/v2/9v_Ducm70QxIb75p3_wPS"
    "POLYGON_RPC_URL" = "https://polygon-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF"
    "ARBITRUM_RPC_URL" = "https://arb1.arbitrum.io/rpc"
    "OPTIMISM_RPC_URL" = "https://mainnet.optimism.io"
    "BASE_RPC_URL" = "https://mainnet.base.org"
    
    # Wallet Configuration
    "PRIVATE_KEY" = "CHANGE_ME"
    "EXECUTION_WALLET_ADDRESS" = "0x21e6d55cBd4721996a6B483079449cFc279A993a"
    "FEE_RECIPIENT_ADDRESS" = "CHANGE_ME"
    
    # JWT & Security
    "JWT_SECRET" = "61be481104ac06a35ed85b60294ae1e58e998a4484213af7d02385ded663dc2c"
    "ENCRYPTION_KEY" = "afafe315290b51bf1483222f53bdf5640765474351aef6696e9bf544a1bd069e"
    
    # GCP Configuration
    "GCP_PROJECT_ID" = "alpha-orion"
    "GCP_REGION" = "us-central1"
    
    # Monitoring
    "SLACK_WEBHOOK_URL" = "CHANGE_ME"
    "SENTRY_DSN" = "CHANGE_ME"
    
    # DEX Routers
    "UNISWAP_ROUTER_V3" = "0x68b3465833fb72B5a828cCEd3294e3e6962E3786"
    "UNISWAP_ROUTER_V2" = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    "SUSHISWAP_ROUTER" = "0xd9e1cE17f2641f24aE5D51AEe6325DAA6F3Dcf45"
    
    # Token Addresses
    "USDC_ADDRESS" = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    "WETH_ADDRESS" = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    
    # Flash Loan Configuration
    "FLASH_LOAN_PROVIDER" = "0x87870Bca3F3f6335e32cdC0d59b7b238621C8292"
    
    # Risk Management
    "MAX_SLIPPAGE_PERCENT" = "0.5"
    "MAX_POSITION_SIZE_USD" = "50000"
    "MIN_PROFIT_THRESHOLD_USD" = "500"
}

$created = 0
$updated = 0
$skipped = 0

foreach ($Key in $Secrets.Keys) {
    Write-Host "`nProcessing $Key..." -NoNewline
    
    # Check if secret exists
    $exists = gcloud secrets describe $Key --project=$ProjectID 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        # Create new secret
        Write-Host " Creating..." -ForegroundColor Yellow
        $Secrets[$Key] | gcloud secrets create $Key --data-file=- --project=$ProjectID 2>$null
        if ($LASTEXITCODE -eq 0) {
            $created++
            Write-Host " Created ✓" -ForegroundColor Green
        } else {
            Write-Host " Failed ✗" -ForegroundColor Red
        }
    } else {
        # Add new version to existing secret
        Write-Host " Adding version..." -ForegroundColor Yellow
        $Secrets[$Key] | gcloud secrets versions add $Key --data-file=- --project=$ProjectID 2>$null
        if ($LASTEXITCODE -eq 0) {
            $updated++
            Write-Host " Updated ✓" -ForegroundColor Green
        } else {
            $skipped++
            Write-Host " Skipped ⏩" -ForegroundColor Gray
        }
    }
}

Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "✅ Secrets Configuration Complete!" -ForegroundColor Cyan
Write-Host "   Created: $created" -ForegroundColor Green
Write-Host "   Updated: $updated" -ForegroundColor Yellow
Write-Host "   Skipped: $skipped" -ForegroundColor Gray
Write-Host "="*50 -ForegroundColor Cyan

Write-Host "`n⚠️  IMPORTANT: Update these secrets with real values in GCP Secret Manager:" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL (use actual AlloyDB/Cloud SQL connection string)" -ForegroundColor Yellow
Write-Host "   - REDIS_URL (use actual Memorystore connection string)" -ForegroundColor Yellow
Write-Host "   - PRIVATE_KEY (your actual wallet private key)" -ForegroundColor Yellow
Write-Host "   - FEE_RECIPIENT_ADDRESS (your profit destination wallet)" -ForegroundColor Yellow
Write-Host "   - ONE_INCH_API_KEY (get from 1inch aggregator)" -ForegroundColor Yellow
Write-Host "   - ETHERSCAN_API_KEY (get from Etherscan)" -ForegroundColor Yellow

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Update secret values in GCP Console > Secret Manager" -ForegroundColor White
Write-Host "   2. Run: gcloud secrets list --project=$ProjectID" -ForegroundColor White
Write-Host "   3. Deploy database: ./deploy-database.sh --project-id $ProjectID" -ForegroundColor White

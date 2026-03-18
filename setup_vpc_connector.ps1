# setup_vpc_connector.ps1
# Creates a Serverless VPC Access Connector for Redis connectivity.

$ErrorActionPreference = "Stop"
Write-Host "🚀 STARTING VPC CONNECTOR SETUP" -ForegroundColor Cyan

# Load Config
$ConfigPath = Join-Path $PSScriptRoot "config.json"
$Config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
$ProjectID = $Config.projectId
$Region = $Config.region
$ConnectorName = "orion-vpc-conn"

gcloud config set project $ProjectID

# 1. Enable VPC Access API
Write-Host "`n[1/3] Enabling VPC Access API..." -ForegroundColor Yellow
gcloud services enable vpcaccess.googleapis.com

# 2. Create Connector
Write-Host "`n[2/3] Checking/Creating VPC Connector '$ConnectorName'..." -ForegroundColor Yellow
$ConnectorCheck = gcloud compute networks vpc-access connectors list --region=$Region --filter="name:$ConnectorName" --format="value(name)"

if ($ConnectorCheck) {
    Write-Host "Connector '$ConnectorName' already exists." -ForegroundColor Gray
} else {
    Write-Host "Creating VPC Connector (this takes 2-3 minutes)..." -ForegroundColor Magenta
    # Using a /28 range for the connector. Ensure this doesn't overlap with existing subnets.
    gcloud compute networks vpc-access connectors create $ConnectorName `
        --region $Region `
        --range "10.8.0.0/28" `
        --network default
}

# 3. Update Config
Write-Host "`n[3/3] Updating config.json..." -ForegroundColor Yellow
# Re-read config in case it changed
$Config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json

if ($Config.vpcConnector -ne $ConnectorName) {
    $Config.vpcConnector = $ConnectorName
    $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host "Updated 'vpcConnector' in config.json to '$ConnectorName'." -ForegroundColor Green
} else {
    Write-Host "config.json already up to date." -ForegroundColor Gray
}

Write-Host "`n✅ VPC SETUP COMPLETE." -ForegroundColor Green
Write-Host "You can now run 'deploy_alpha_orion_master.ps1' to deploy with Redis connectivity." -ForegroundColor Cyan
#!/bin/bash
# Alpha-Orion Complete Deployment Script
# Deploys smart contracts and backend services

set -e

echo "🚀 Alpha-Orion Complete Deployment"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Deploy Smart Contracts
echo "📦 Step 1: Deploying Smart Contracts"
echo "--------------------------------------"

cd alpha-orion/alpha-orion/smart-contracts

if [ ! -d "node_modules" ]; then
    print_warning "Installing npm dependencies..."
    npm install
else
    print_status "Dependencies already installed"
fi

print_status "Compiling contracts..."
npx hardhat compile

print_status "Deploying to Ethereum mainnet..."
npx hardhat run scripts/deploy.js --network mainnet

CONTRACT_ADDRESS=$(cat deployments/mainnet.json 2>/dev/null | grep -o '"contractAddress": "[^"]*"' | cut -d'"' -f4)

if [ -z "$CONTRACT_ADDRESS" ]; then
    print_warning "Could not extract contract address. Please check deployment output."
    CONTRACT_ADDRESS="<DEPLOYMENT_PENDING>"
fi

print_status "FlashLoanArbitrage deployed at: $CONTRACT_ADDRESS"
echo ""

# Step 2: Update Environment Variables
echo "📝 Step 2: Updating Environment Variables"
echo "-------------------------------------------"

cd ../../..

# Update .env.production with contract address
if [ "$CONTRACT_ADDRESS" != "<DEPLOYMENT_PENDING>" ]; then
    sed -i "s/ARBITRAGE_CONTRACT_ADDRESS=/ARBITRAGE_CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" .env.production
    print_status "Updated ARBITRAGE_CONTRACT_ADDRESS in .env.production"
fi

print_status "Environment variables updated"
echo ""

# Step 3: Build Backend Services
echo "🔨 Step 3: Building Backend Services"
echo "--------------------------------------"

cd backend-services/services/brain-orchestrator/src

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt -q

print_status "Backend services built"
echo ""

# Step 4: Deploy to Cloud Run (optional)
echo "☁️  Step 4: Cloud Deployment (Optional)"
echo "----------------------------------------"
echo "To deploy to Google Cloud Run, run:"
echo "  cd alpha-orion"
echo "  ./deploy-to-cloud.sh"
echo ""
echo "Or to run locally:"
echo "  cd backend-services/services/brain-orchestrator/src"
echo "  python main.py"
echo ""

# Summary
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📋 Deployment Summary:"
echo "   - Smart Contract: $CONTRACT_ADDRESS"
echo "   - Network: Ethereum Mainnet"
echo "   - Pimlico Gasless: Enabled (if API key configured)"
echo "   - Backend: Ready to deploy"
echo ""
echo "🌐 Endpoints available after starting backend:"
echo "   - Health: http://localhost:8080/health"
echo "   - Blockchain Status: http://localhost:8080/blockchain/status"
echo "   - P&L Analytics: http://localhost:8080/analytics/total-pnl"
echo ""

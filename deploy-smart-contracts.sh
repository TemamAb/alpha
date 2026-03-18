#!/bin/bash
# Alpha-Orion Smart Contract Deployment Script
# Deploys FlashLoanArbitrage contract to Ethereum mainnet

set -e

echo "🚀 Alpha-Orion Smart Contract Deployment"
echo "=========================================="

# Check for required environment variables
if [ -z "$ETHEREUM_RPC_URL" ]; then
    echo "⚠️  ETHEREUM_RPC_URL not set, using default Alchemy endpoint"
    export ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/demo"
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️  PRIVATE_KEY not set, using environment variable or .env file"
fi

if [ -z "$PIMLICO_API_KEY" ]; then
    echo "⚠️  PIMLICO_API_KEY not set - gasless mode will be disabled"
fi

# Navigate to smart contracts directory
cd alpha-orion/alpha-orion/smart-contracts

echo "📦 Installing dependencies..."
npm install

echo "🔨 Compiling contracts..."
npx hardhat compile

echo "📝 Deployment configuration:"
echo "   - Network: ethereum mainnet"
echo "   - RPC: ${ETHEREUM_RPC_URL:0:50}..."
echo "   - Paymaster: ${PIMLICO_PAYMASTER_ADDRESS:-not configured}"
echo "   - Fee Recipient: ${FEE_RECIPIENT_ADDRESS:-not configured}"

echo "🚀 Deploying FlashLoanArbitrage contract..."
npx hardhat run scripts/deploy.js --network mainnet

echo ""
echo "✅ Smart contract deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "   1. Wait for deployment confirmation"
echo "   2. Copy contract address to .env.production"
echo "   3. Update ARBITRAGE_CONTRACT_ADDRESS"
echo "   4. Deploy backend services"

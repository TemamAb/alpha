#!/bin/bash
# AlphaMark - GitHub Push Script
# Run this script to initialize git and push to GitHub

set -e

echo "🚀 AlphaMark - Initializing Git Repository..."

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Configure git user (update with your details)
echo "👤 Configuring git user..."
git config user.name "AlphaMark Team"
git config user.email "team@alphamark.io"

# Add all files
echo "📝 Adding files to staging..."
git add -A

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "feat: AlphaMark v1.0.0 - Flash Loan Arbitrage System

Features:
- Multi-hop arbitrage across DEXes
- Aave V3 flash loan integration
- Real-time monitoring dashboard
- Cross-chain support (Ethereum, Polygon, BSC, Arbitrum, Optimism)
- MEV protection
- Gas optimization
- Risk management
- Paper trading mode

Security:
- Fixed critical bugs in smart contracts
- Improved slippage protection
- Enhanced error handling

Infrastructure:
- Docker containerization
- Fly.io deployment config
- CI/CD pipeline
- Comprehensive documentation"

# Add remote (update with your repository URL)
echo "🔗 Adding remote repository..."
git remote add origin https://github.com/TemamAb/alphamark.git

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://github.com/TemamAb/alphamark"
echo "2. Configure repository settings"
echo "3. Add secrets in GitHub Actions secrets"
echo "4. Deploy to Fly.io with: flyctl deploy"

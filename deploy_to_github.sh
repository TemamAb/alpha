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
git commit -m "fix: Resolve critical profit generation blockers

- Corrected corrupted DAI token address in contracts.json
- Added missing factory_address to Ethereum/Polygon/BSC config
- Fixed OpenAI API key syntax in server-dashboard.js
- Restored scanner process graph pathfinding" || echo "⚠️ No changes to commit or commit failed. Proceeding..."

# Add remote (update with your repository URL)
echo "🔗 Adding remote repository..."
# Check if remote exists, update URL if needed
git remote set-url origin https://github.com/TemamAb/alpha.git 2>/dev/null || git remote add origin https://github.com/TemamAb/alpha.git

# Pull remote changes before pushing to resolve divergence
echo "🔄 Syncing with remote repository..."
git pull --rebase origin main || echo "⚠️ Remote branch 'main' not found. Assuming new repository..."

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo ""
echo "🔐 DEPLOYMENT COMMIT HASH (Save for Audit Logs):"
git rev-parse HEAD
echo ""
echo "📋 Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New' -> 'Blueprint'"
echo "3. Select the 'alpha' repository"
echo "4. Confirm the 'render.yaml' plan and click 'Apply'"
echo "5. Manually add your PRIVATE_KEY and OPENAI_API_KEY in the Render UI under 'Environment'"
echo ""
echo "🚀 The dashboard will auto-start the engine in LIVE mode upon connection."
echo ""
echo "⚠️ The app runs in LIVE TRADING MODE by default!"

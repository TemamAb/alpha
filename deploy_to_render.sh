#!/bin/bash
# AlphaMark - Deploy to Render via GitHub
# Simplified deployment script for production push

set -e

echo "🚀 AlphaMark - Deploying to Render via GitHub..."

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Configure git user
echo "👤 Configuring git user..."
git config user.name "AlphaMark Team"
git config user.email "team@alphamark.io"

# Resolve nested git issues (flatten flashloan_app)
echo "🧹 Cleaning nested git metadata in flashloan_app..."
find flashloan_app -name ".git" -type d -prune -exec rm -rf {} + || true

# Add all files
echo "📝 Adding files to staging..."
git add -A

# Create commit with timestamp
echo "💾 Creating deployment commit..."
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
git commit -m "prod: deploy production-ready arbitrage engine - following 90b13f4 - $TIMESTAMP" || echo "⚠️ No changes to commit. Proceeding..."

# Add remote (update with your repository URL)
echo "🔗 Configuring remote repository..."
git remote set-url origin https://github.com/TemamAb/alpha.git || git remote add origin https://github.com/TemamAb/alpha.git

# Pull remote changes before pushing to resolve divergence
echo "🔄 Syncing with remote repository..."
git pull --rebase origin main --quiet || echo "⚠️ Remote branch 'main' not found or branch is empty. Proceeding..."

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo ""
echo "🔐 DEPLOYMENT COMMIT HASH:"
git rev-parse HEAD
echo ""
echo "📋 Next steps for Render deployment:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New' -> 'Blueprint'"
echo "3. Select the 'alpha' repository"
echo "4. Confirm the 'render.yaml' plan and click 'Apply'"
echo "5. Your secrets are already configured in Render's secret management"
echo ""
echo "🚀 The dashboard will auto-start the engine in LIVE mode upon connection."
echo ""
echo "⚠️ The app runs in LIVE TRADING MODE by default!"

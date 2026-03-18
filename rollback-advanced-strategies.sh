#!/bin/bash
set -e

echo "🔄 Starting Advanced Strategies Rollback..."

# Check if we're in the alpha-orion directory
if [ ! -f "ADVANCED_STRATEGIES_DEPLOYMENT_PLAN.md" ]; then
    echo "❌ Error: Please run this script from the alpha-orion directory"
    exit 1
fi

echo "🛑 Stopping Brain AI Optimization Orchestrator service..."

# Find and kill the service process
SERVICE_PID=$(ps aux | grep "python3 main.py" | grep -v grep | awk '{print $2}')
if [ ! -z "$SERVICE_PID" ]; then
    echo "Killing service process (PID: $SERVICE_PID)..."
    kill $SERVICE_PID
    sleep 5
    if ps -p $SERVICE_PID > /dev/null; then
        echo "Force killing service process..."
        kill -9 $SERVICE_PID
    fi
    echo "✅ Service stopped"
else
    echo "⚠️  No running service found"
fi

echo "🧹 Cleaning up advanced strategy modules..."

# Remove the advanced strategy files (optional - comment out if you want to keep them)
# rm -f backend-services/services/brain-ai-optimization-orchestrator/src/options_arbitrage_scanner.py
# rm -f backend-services/services/brain-ai-optimization-orchestrator/src/perpetuals_arbitrage_scanner.py
# rm -f backend-services/services/brain-ai-optimization-orchestrator/src/gamma_scalping_manager.py
# rm -f backend-services/services/brain-ai-optimization-orchestrator/src/delta_neutral_manager.py
# rm -f backend-services/services/brain-ai-optimization-orchestrator/src/advanced_risk_engine.py

echo "🔄 Reverting main.py to basic configuration..."

# Create backup of current main.py
cp backend-services/services/brain-ai-optimization-orchestrator/src/main.py \
   backend-services/services/brain-ai-optimization-orchestrator/src/main.py.advanced_backup

# Remove advanced strategy imports and routes from main.py
cd backend-services/services/brain-ai-optimization-orchestrator/src

# Use sed to remove the advanced strategy sections
sed -i '/# Import new advanced strategy modules/,/# Initialize advanced strategy scanners/d' main.py
sed -i '/# Initialize advanced strategy scanners/,/risk_engine = AdvancedRiskEngine()/d' main.py
sed -i '/# ============ ADVANCED STRATEGY ROUTES ============/,/if __name__ == '\''__main__'\'':/d' main.py

cd ../../../../..

echo "📦 Reverting requirements.txt to basic dependencies..."

cd backend-services/services/brain-ai-optimization-orchestrator/src

# Remove advanced dependencies from requirements.txt
sed -i '/numpy>=1.21.0/d' requirements.txt
sed -i '/scipy>=1.7.0/d' requirements.txt
sed -i '/pandas>=1.3.0/d' requirements.txt
sed -i '/scikit-learn>=1.0.0/d' requirements.txt
sed -i '/web3>=6.0.0/d' requirements.txt
sed -i '/requests>=2.25.0/d' requirements.txt
sed -i '/tensorflow>=2.8.0/d' requirements.txt
sed -i '/joblib>=1.1.0/d' requirements.txt

cd ../../../../..

echo "🧹 Removing environment variables file..."
rm -f backend-services/services/brain-ai-optimization-orchestrator/.env

echo ""
echo "✅ Advanced Strategies Rollback Complete!"
echo ""
echo "📋 System has been reverted to basic arbitrage functionality."
echo "   - Advanced strategy modules are preserved but not active"
echo "   - Backup of main.py saved as main.py.advanced_backup"
echo "   - To redeploy advanced strategies, run: ./deploy-advanced-strategies.sh"
echo ""
echo "⚠️  Remember to close any open positions on Opyn, dYdX, or GMX manually!"
echo "   This rollback only affects the local deployment."

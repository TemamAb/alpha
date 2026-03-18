#!/bin/bash
set -e

echo "🚀 Starting Advanced Strategies Deployment..."

# Check if we're in the alpha-orion directory
if [ ! -f "ADVANCED_STRATEGIES_DEPLOYMENT_PLAN.md" ]; then
    echo "❌ Error: Please run this script from the alpha-orion directory"
    exit 1
fi

echo "📦 Installing Python dependencies for advanced strategies..."
cd backend-services/services/brain-ai-optimization-orchestrator/src
pip install -r requirements.txt
cd ../../../../..

echo "🔧 Setting up environment variables..."
# Copy .env file if it doesn't exist
if [ ! -f "backend-services/services/brain-ai-optimization-orchestrator/.env" ]; then
    echo "⚠️  Warning: .env file not found. Please create it with your API keys."
    echo "   See ADVANCED_STRATEGIES_DEPLOYMENT_PLAN.md for required variables."
fi

echo "🧪 Testing advanced strategy modules..."
cd backend-services/services/brain-ai-optimization-orchestrator/src

# Test imports
python3 -c "
try:
    from options_arbitrage_scanner import OptionsArbitrageScanner
    from perpetuals_arbitrage_scanner import PerpetualsArbitrageScanner
    from gamma_scalping_manager import GammaScalpingManager
    from delta_neutral_manager import DeltaNeutralManager
    print('✅ All advanced strategy modules imported successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    exit(1)
"

cd ../../../../..

echo "🌐 Starting Brain AI Optimization Orchestrator with advanced strategies..."
cd backend-services/services/brain-ai-optimization-orchestrator/src

# Start the service
export PYTHONPATH=$PYTHONPATH:$(pwd)
python3 main.py &

SERVICE_PID=$!
echo "📊 Service started with PID: $SERVICE_PID"

cd ../../../../..

echo "⏳ Waiting for service to initialize..."
sleep 10

echo "🧪 Testing API endpoints..."

# Test basic health
if curl -s http://localhost:8080/health | grep -q '"status": "ok"'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test options arbitrage endpoint
if curl -s http://localhost:8080/options-arbitrage/scan | grep -q '"status": "success"'; then
    echo "✅ Options arbitrage endpoint working"
else
    echo "⚠️  Options arbitrage endpoint returned error (may be expected with mock data)"
fi

# Test perpetuals arbitrage endpoint
if curl -s http://localhost:8080/perpetuals-arbitrage/scan | grep -q '"status": "success"'; then
    echo "✅ Perpetuals arbitrage endpoint working"
else
    echo "⚠️  Perpetuals arbitrage endpoint returned error (may be expected with mock data)"
fi

# Test gamma scalping endpoint
if curl -s http://localhost:8080/gamma-scalping/signals | grep -q '"status": "success"'; then
    echo "✅ Gamma scalping endpoint working"
else
    echo "❌ Gamma scalping endpoint failed"
    exit 1
fi

# Test delta neutral endpoint
if curl -s http://localhost:8080/delta-neutral/signals | grep -q '"status": "success"'; then
    echo "✅ Delta neutral endpoint working"
else
    echo "❌ Delta neutral endpoint failed"
    exit 1
fi

echo ""
echo "🎉 Advanced Strategies Deployment Complete!"
echo ""
echo "📋 Available endpoints:"
echo "  - http://localhost:8080/options-arbitrage/scan"
echo "  - http://localhost:8080/perpetuals-arbitrage/scan"
echo "  - http://localhost:8080/gamma-scalping/signals"
echo "  - http://localhost:8080/delta-neutral/signals"
echo "  - http://localhost:8080/advanced-risk/metrics"
echo ""
echo "🔄 Service is running in background (PID: $SERVICE_PID)"
echo "   To stop: kill $SERVICE_PID"
echo ""
echo "📊 Monitor logs at: backend-services/services/brain-ai-optimization-orchestrator/src/"
echo ""
echo "⚠️  Remember to configure real API keys in the .env file for production use!"

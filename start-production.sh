#!/bin/bash

# ============================================
# Alpha-Orion Production Startup Script
# ============================================

set -e

echo "🚀 Alpha-Orion Production Mode Startup"
echo "======================================="

# Check environment
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found"
    echo "Please run: cp .env.production .env.local"
    echo "Then configure with your production values"
    exit 1
fi

# Load environment
export $(cat .env.local | grep -v '#' | xargs)

# Verify critical configuration
echo ""
echo "🔍 Verifying Configuration..."

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not configured"
    exit 1
fi

# Set default RPC if not configured (Polygon zkEVM)
RPC_URL=${POLYGON_ZKEVM_RPC_URL:-"https://zkevm-rpc.com"}
echo "ℹ️  Using RPC URL: $RPC_URL"

if [ "$DEPLOY_MODE" != "production" ]; then
    echo "❌ DEPLOY_MODE not set to 'production'"
    exit 1
fi

echo "✅ Private Key: Configured"
echo "✅ RPC Endpoint: Configured (or using default)"
echo "✅ Deploy Mode: $DEPLOY_MODE"

# Test RPC connection
echo ""
echo "🌐 Testing Blockchain Connection..."
RESPONSE=$(curl -s --max-time 10 -X POST "$RPC_URL" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')

if echo "$RESPONSE" | grep -q "result"; then
    echo "✅ RPC connection successful"
else
    echo "❌ Failed to connect to RPC endpoint"
    echo "   Response: $RESPONSE"
    exit 1
fi

# Create necessary directories
mkdir -p logs data

# Start services in background
echo ""
echo "🔧 Starting Backend Services..."

# Terminal 1: User API Service
echo "[1/2] Starting User API Service (port 8080)..."
cd backend-services/services/user-api-service
npm install > /dev/null 2>&1 || true
PORT=8080 DEPLOY_MODE=production npm start > ../../../logs/user-api.log 2>&1 &
USER_API_PID=$!
cd ../../..
echo "✅ User API Service started (PID: $USER_API_PID)"

sleep 2

# Terminal 3: Frontend
echo "[2/2] Starting Frontend (port 3000)..."
cd frontend
npm install > /dev/null 2>&1 || true
REACT_APP_API_URL=http://localhost:8080 npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Health check
echo ""
echo "🏥 Checking Service Health..."

# Check User API
if curl -s http://localhost:8080/health | grep -q "ok"; then
    echo "✅ User API Service: HEALTHY"
else
    echo "❌ User API Service: FAILED"
    kill $USER_API_PID 2>/dev/null || true
    exit 1
fi

# Get current mode
echo ""
echo "📊 Current Status:"
curl -s http://localhost:8080/mode/current | jq .

# Save PIDs for stopping
echo ""
echo "💾 Saving process information..."
cat > .pids << EOF
USER_API_PID=$USER_API_PID
FRONTEND_PID=$FRONTEND_PID
EOF

echo ""
echo "🎉 Production Mode Started Successfully!"
echo "======================================="
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 API: http://localhost:8080"
echo ""
echo "🔐 PRODUCTION MODE - REAL MONEY AT RISK"
echo "⚠️  Monitor: tail -f logs/*.log"
echo ""
echo "To stop: ./stop-production.sh"
echo ""

# Keep script running and monitor logs
echo "📋 Monitoring services..."
tail -f logs/*.log &
wait

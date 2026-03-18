#!/bin/bash

# ============================================
# Alpha-Orion Production Shutdown Script
# ============================================

echo "🛑 Stopping Alpha-Orion Production Services..."

if [ -f ".pids" ]; then
    source .pids
    
    echo "Stopping User API Service (PID: $USER_API_PID)..."
    kill $USER_API_PID 2>/dev/null || true
    sleep 1
    
    echo "Stopping Withdrawal Service (PID: $WITHDRAWAL_PID)..."
    kill $WITHDRAWAL_PID 2>/dev/null || true
    sleep 1
    
    echo "Stopping Frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
    sleep 1
    
    rm .pids
    echo "✅ All services stopped"
else
    echo "❌ .pids file not found. Killing by port..."
    
    # Kill processes by port
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:3008 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo "✅ Services killed"
fi

echo ""
echo "👋 Production services stopped"
echo ""

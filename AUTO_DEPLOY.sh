#!/bin/bash

# ================================================================
# Alpha-Orion Auto-Deploy on Free Port (macOS/Linux)
# ================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🚀 ALPHA-ORION AUTO-DEPLOY (Free Port Detection) 🚀        ║"
echo "║                                                                ║"
echo "║     System will auto-detect free port and deploy               ║"
echo "║     Mode: PRODUCTION - NO SIMULATION, NO MOCKS                 ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📁 Working Directory: $(pwd)"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed"
    echo ""
    echo "Install from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check Python
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "✅ Python found: $(python3 --version)"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    echo "✅ Python found: $(python --version)"
else
    echo "❌ ERROR: Python is not installed"
    echo ""
    echo "Install from: https://www.python.org/"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Install npm dependencies if needed
if [ ! -d "backend-services/services/user-api-service/node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    echo ""
    cd backend-services/services/user-api-service
    npm install
    cd "$SCRIPT_DIR"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════════"
echo "🚀 AUTO-DEPLOYING ALPHA-ORION"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Launch Terminal 1: Production API Service
echo "📡 Starting Production API Service (Port 8080)..."
echo ""

cd "$SCRIPT_DIR/backend-services/services/user-api-service"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use open command
    open -a Terminal "$(pwd)" <<'EOF'
npm start
EOF
else
    # Linux - use gnome-terminal or xterm
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$(pwd)' && npm start; bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd '$(pwd)' && npm start" &
    else
        # Fallback: run in background
        npm start &
    fi
fi

sleep 3
echo ""

# Launch Terminal 2: Dashboard Server (with auto-port detection)
echo "🎨 Starting Dashboard Server (Auto-Detecting Free Port)..."
echo ""

cd "$SCRIPT_DIR"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open -a Terminal <<EOF
cd "$SCRIPT_DIR"
$PYTHON_CMD serve-live-dashboard.py
EOF
else
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$SCRIPT_DIR' && $PYTHON_CMD serve-live-dashboard.py; bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd '$SCRIPT_DIR' && $PYTHON_CMD serve-live-dashboard.py" &
    else
        # Fallback
        $PYTHON_CMD serve-live-dashboard.py &
    fi
fi

sleep 5
echo ""

# Open Dashboard in Default Browser
echo "🌐 Opening Dashboard in browser..."
echo ""

sleep 2

# Check if port file was created
if [ -f "dashboard_port.txt" ]; then
    DETECTED_PORT=$(cat dashboard_port.txt)
    echo "✅ Dashboard detected on port: $DETECTED_PORT"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "http://localhost:$DETECTED_PORT"
    else
        if command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:$DETECTED_PORT" &
        elif command -v firefox &> /dev/null; then
            firefox "http://localhost:$DETECTED_PORT" &
        elif command -v chromium &> /dev/null; then
            chromium "http://localhost:$DETECTED_PORT" &
        elif command -v google-chrome &> /dev/null; then
            google-chrome "http://localhost:$DETECTED_PORT" &
        fi
    fi
else
    echo "⏳ Dashboard starting up, trying default port 9090..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "http://localhost:9090"
    else
        if command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:9090" &
        elif command -v firefox &> /dev/null; then
            firefox "http://localhost:9090" &
        elif command -v chromium &> /dev/null; then
            chromium "http://localhost:9090" &
        elif command -v google-chrome &> /dev/null; then
            google-chrome "http://localhost:9090" &
        fi
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ SYSTEM DEPLOYED - AUTO-DETECTED PORT"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Production Service:"
echo "   • Terminal 1: API Server (Port 8080)"
echo "   • Real Pimlico Integration"
echo "   • Live Profit Generation"
echo ""
echo "🎨 Dashboard Server:"
echo "   • Terminal 2: Web Dashboard"
echo "   • Auto-Detected Free Port"
echo "   • Browser: Opening now..."
echo ""
echo "📈 Features Active:"
echo "   • Profit Generation: LIVE"
echo "   • Real-Time Monitoring: ON"
echo "   • Auto-Withdrawal: \$1,000 threshold"
echo "   • Manual Withdrawal: Available"
echo "   • BOOM Celebration: Ready"
echo ""
echo "📝 Files:"
echo "   • Dashboard: LIVE_PROFIT_DASHBOARD.html"
echo "   • Server: serve-live-dashboard.py"
echo "   • Port Info: dashboard_port.txt"
echo ""
echo "💡 Next Steps:"
echo "   1. Wait for Terminal 1 to show: 'PRODUCTION API RUNNING'"
echo "   2. Wait for Terminal 2 to show: 'READY'"
echo "   3. Dashboard should open automatically"
echo "   4. Set up auto-withdrawal with your wallet address"
echo "   5. Watch for 🚀 PROFIT DROPPED every 30 seconds"
echo ""
echo "⏸️  To stop: Close terminal windows or press Ctrl+C"
echo ""
echo "📚 For details, see:"
echo "   • START_AND_WATCH_PROFITS.md"
echo "   • REAL_TIME_PROFIT_DROPS.md"
echo "   • WITHDRAWAL_SYSTEM_GUIDE.md"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Keep script running
wait

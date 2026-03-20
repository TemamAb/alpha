#!/bin/bash
# AlphaMark Production Launch Script
# Starts both dashboard server and arbitrage bot

echo "=========================================="
echo "  AlphaMark Production Launcher"
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python is not installed${NC}"
    exit 1
fi

# Install Node dependencies if needed
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
cd monitoring_dashboard
npm install
cd ..

# Check Python dependencies
echo -e "${YELLOW}Checking Python dependencies...${NC}"
pip3 install web3 python-dotenv requests eth-account --quiet 2>/dev/null || true

echo ""
echo -e "${GREEN}Starting AlphaMark System...${NC}"
echo ""

# Start dashboard server in background
echo -e "${YELLOW}[1/2] Starting Dashboard Server on port 3000...${NC}"
node monitoring_dashboard/server-dashboard.js &
DASHBOARD_PID=$!
echo -e "${GREEN}Dashboard started (PID: $DASHBOARD_PID)${NC}"

# Wait for dashboard to start
sleep 2

# Start arbitrage bot
echo -e "${YELLOW}[2/2] Starting Arbitrage Bot...${NC}"
python3 execution_bot/scripts/bot.py &
BOT_PID=$!
echo -e "${GREEN}Bot started (PID: $BOT_PID)${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}AlphaMark is now RUNNING${NC}"
echo "=========================================="
echo ""
echo "Dashboard:   http://localhost:3000"
echo "Bot PID:     $BOT_PID"
echo "Dashboard PID: $DASHBOARD_PID"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "echo -e '${YELLOW}Stopping AlphaMark...${NC}'; kill $DASHBOARD_PID $BOT_PID 2>/dev/null; exit 0" INT TERM

# Keep script running
wait

#!/bin/bash
export PAPER_TRADING_MODE=false
echo "[1/3] Logic Verification..."
python3 verify_profit_generation.py

echo "[2/3] Docker up..."
docker compose up -d
echo "[3/3] Bot LIVE (real tx)..."
python execution_bot/scripts/bot.py
echo "Live @ localhost:8080"
echo "Real profits! Ctrl+C stop."

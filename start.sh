#!/bin/bash

echo "🚀 Starting AlphaMark Production Container..."

# 1. Start the Dashboard Server in the background
echo "📊 Launching Dashboard..."
npm start &

# 2. Wait briefly for server to initialize
sleep 5

# 3. Start the Arbitrage Bot (Foreground Process)
echo "🤖 Launching Execution Bot..."
python3 flashloan_app/execution_bot/scripts/bot.py
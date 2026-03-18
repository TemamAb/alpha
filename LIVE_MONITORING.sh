#!/bin/bash

# Alpha-Orion Live Profit Monitoring Dashboard
# Real-time profit generation tracking

API_URL="http://localhost:8080"
REFRESH_INTERVAL=5
LAST_PNL=0
LOG_FILE="alpha-orion-profit-log.txt"

clear

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                                ║"
echo "║              🚀 ALPHA-ORION LIVE PROFIT MONITORING DASHBOARD 🚀                ║"
echo "║                                                                                ║"
echo "║                   PIMLICO GASLESS + POLYGON ZKEVM + REAL PROFIT                ║"
echo "║                                                                                ║"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"
echo ""

show_dashboard() {
  local mode_data="$1"
  local opp_data="$2"
  local pnl_data="$3"
  local trades_data="$4"
  
  clear
  
  echo "╔════════════════════════════════════════════════════════════════════════════════╗"
  echo "║                    ALPHA-ORION LIVE PROFIT DASHBOARD                          ║"
  echo "║                        $(date '+%H:%M:%S')                                              ║"
  echo "╚════════════════════════════════════════════════════════════════════════════════╝"
  echo ""
  
  if [ ! -z "$mode_data" ]; then
    echo "📊 SYSTEM STATUS"
    echo "──────────────────────────────────────────────────────────────────────────────────"
    echo "  Mode:              $(echo $mode_data | jq -r '.mode')"
    echo "  Status:            $(echo $mode_data | jq -r '.status')"
    echo "  Network:           $(echo $mode_data | jq -r '.network')"
    echo "  Bundler:           $(echo $mode_data | jq -r '.bundler')"
    echo "  Session Duration:  $(echo $mode_data | jq -r '.sessionDuration')s"
    echo ""
  fi
  
  if [ ! -z "$pnl_data" ]; then
    local total_pnl=$(echo $pnl_data | jq -r '.totalPnL')
    echo "💰 PROFIT & LOSS TRACKING"
    echo "──────────────────────────────────────────────────────────────────────────────────"
    echo "  Total P&L:         \$$total_pnl"
    echo "  Realized Profit:   \$$(echo $pnl_data | jq -r '.realizedProfit')"
    echo "  Unrealized Profit: \$$(echo $pnl_data | jq -r '.unrealizedProfit')"
    echo "  Gas Saved:         $(echo $pnl_data | jq -r '.gasSavings')"
    echo ""
    
    if (( $(echo "$total_pnl > $LAST_PNL" | bc -l) )); then
      echo "   ✅ PROFIT INCREASE DETECTED: +$((total_pnl - LAST_PNL))"
    fi
  fi
  
  if [ ! -z "$trades_data" ]; then
    local confirmed=$(echo $trades_data | jq -r '.confirmed')
    echo "⚡ TRADE EXECUTION"
    echo "──────────────────────────────────────────────────────────────────────────────────"
    echo "  Total Trades:      $(echo $trades_data | jq -r '.count')"
    echo "  Confirmed:         $confirmed"
    echo "  Pending:           $(echo $trades_data | jq -r '.pending')"
    echo ""
    
    if [ "$confirmed" -gt 0 ]; then
      echo "   ✅ LAST 5 EXECUTED TRADES:"
      echo $trades_data | jq -r '.trades | .[-5:] | .[] | "      Trade #\(.number) | \(.pair) | Profit: $\(.profit)"'
    fi
    echo ""
  fi
  
  if [ ! -z "$opp_data" ]; then
    local opp_count=$(echo $opp_data | jq -r '.count')
    echo "🔍 OPPORTUNITY DETECTION"
    echo "──────────────────────────────────────────────────────────────────────────────────"
    echo "  Active Opportunities: $opp_count"
    
    if [ "$opp_count" -gt 0 ]; then
      echo "   Found opportunities:"
      echo $opp_data | jq -r '.opportunities | .[0:3] | .[] | "      → \(.pair): $\(.grossProfit)"'
    fi
    echo ""
  fi
  
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo "  🎯 AUTO-WITHDRAWAL: Triggered at \$1000 threshold (Every 10 seconds)"
  echo "  📈 Updating every $REFRESH_INTERVAL seconds | Press Ctrl+C to stop"
  echo "════════════════════════════════════════════════════════════════════════════════"
}

echo "⏳ Connecting to Alpha-Orion service at $API_URL..."
echo "   (Make sure to run: npm start in the service directory)"
echo ""

sleep 2

while true; do
  mode_data=$(curl -s "$API_URL/mode/current" 2>/dev/null)
  opp_data=$(curl -s "$API_URL/opportunities" 2>/dev/null)
  pnl_data=$(curl -s "$API_URL/analytics/total-pnl" 2>/dev/null)
  trades_data=$(curl -s "$API_URL/trades/executed" 2>/dev/null)
  
  if [ ! -z "$mode_data" ] && [ ! -z "$pnl_data" ]; then
    show_dashboard "$mode_data" "$opp_data" "$pnl_data" "$trades_data"
    
    # Track profit changes
    current_pnl=$(echo $pnl_data | jq -r '.totalPnL')
    if (( $(echo "$current_pnl > $LAST_PNL" | bc -l) )); then
      echo ""
      echo "🎉 PROFIT GENERATED!"
      echo "   Previous: \$$LAST_PNL"
      echo "   Current:  \$$current_pnl"
      echo "   Increase: +$((current_pnl - LAST_PNL))"
      echo ""
      
      # Log to file
      timestamp=$(date '+%Y-%m-%d %H:%M:%S')
      echo "$timestamp | Profit: +$((current_pnl - LAST_PNL)) | Total: \$$current_pnl" >> "$LOG_FILE"
    fi
    
    LAST_PNL=$current_pnl
  else
    echo "⏳ Waiting for service to start..."
    echo "   Command: npm start (in backend-services/services/user-api-service)"
  fi
  
  sleep $REFRESH_INTERVAL
done

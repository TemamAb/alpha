#!/bin/bash

echo "🔍 Retrieving Cloud Run Service URL..."

if ! command -v gcloud &> /dev/null; then
    # Try to auto-fix PATH for MINGW64/Windows standard installs
    if [ -d "/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin" ]; then
        echo "🔄 Detected Google Cloud SDK in Program Files (x86). Adding to PATH..."
        export PATH=$PATH:"/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin"
    elif [ -d "/c/Program Files/Google/Cloud SDK/google-cloud-sdk/bin" ]; then
        echo "🔄 Detected Google Cloud SDK in Program Files. Adding to PATH..."
        export PATH=$PATH:"/c/Program Files/Google/Cloud SDK/google-cloud-sdk/bin"
    fi
fi

if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: 'gcloud' CLI not found."
    echo "    👉 Install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

SERVICE_URL=$(gcloud run services describe user-api-service --region us-central1 --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo "❌ Failed to retrieve service URL. Ensure 'user-api-service' is deployed."
    exit 1
fi

echo "✅ Monitoring Service at: $SERVICE_URL"
sleep 2

while true; do
    clear
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    ☁️  ALPHA-ORION CLOUD MONITOR                              ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📍 URL: $SERVICE_URL"
    echo "⏰ Time: $(date '+%H:%M:%S')"
    echo ""

    # Fetch data
    MODE_JSON=$(curl -s "$SERVICE_URL/mode/current")
    PNL_JSON=$(curl -s "$SERVICE_URL/analytics/total-pnl")
    MISSION_JSON=$(curl -s "$SERVICE_URL/mission/status")

    if command -v jq &> /dev/null; then
        echo "🎯 MISSION: $(echo $MISSION_JSON | jq -r .mission) [$(echo $MISSION_JSON | jq -r .status)]"
        echo ""
        echo "📊 STATUS"
        echo "   Mode:             $(echo $MODE_JSON | jq -r .mode)"
        echo "   Network:          $(echo $MODE_JSON | jq -r .network)"
        echo "   Active Opps:      $(echo $MODE_JSON | jq -r .realOpportunitiesFound)"
        echo ""
        echo "💰 PROFIT & LOSS"
        echo "   Total P&L:        \$$(echo $PNL_JSON | jq -r .totalPnL)"
        echo "   Realized:         \$$(echo $PNL_JSON | jq -r .realizedProfit)"
        echo "   Unrealized:       \$$(echo $PNL_JSON | jq -r .unrealizedProfit)"
        echo "   Trades:           $(echo $PNL_JSON | jq -r .totalTrades)"
    else
        echo "⚠️  'jq' not installed. Displaying raw data:"
        echo ""
        echo "MODE: $MODE_JSON"
        echo ""
        echo "PNL: $PNL_JSON"
    fi

    echo ""
    echo "-------------------------------------------------------------------------------"
    echo "Press Ctrl+C to stop"
    
    sleep 5
done
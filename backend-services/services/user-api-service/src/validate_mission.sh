#!/bin/bash
set -e

echo "🚀 Starting Continuous Mission Validation"
echo "-----------------------------------------"

SERVICE_URL=$(gcloud run services describe user-api-service --region us-central1 --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo "❌ Could not find deployed service URL. Ensure 'user-api-service' is deployed."
    exit 1
fi

echo "🎯 Target: $SERVICE_URL"
echo "Monitoring /mission/status every 10 seconds..."
echo "Press Ctrl+C to stop."
echo ""

while true; do
    TIMESTAMP=$(date +"%H:%M:%S")
    RESPONSE=$(curl -s "$SERVICE_URL/mission/status")
    echo "[$TIMESTAMP] Status:"
    echo "$RESPONSE"
    sleep 10
done
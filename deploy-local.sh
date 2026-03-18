#!/bin/bash

echo "🚀 Alpha-Orion Local Deployment Strategist"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Detect available ports
echo "🔍 Detecting available ports..."
python detect-ports.py

# Start core services
echo "🏗️  Building and starting core services..."
docker-compose -f docker-compose-simple.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose -f docker-compose-simple.yml ps

# Test API endpoints
echo "🧪 Testing API endpoints..."
echo "Services API:"
curl -s http://localhost:3001/services | head -c 200
echo -e "\n\nOptimize API:"
curl -s http://localhost:3001/optimize

echo -e "\n\n🎯 Local Deployment Complete!"
echo "=========================================="
echo "🌐 Frontend: http://localhost:3000 (when built)"
echo "🔌 API Gateway: http://localhost:3001"
echo "🗄️  Database: localhost:3007"
echo "⚡ Cache: localhost:3008"
echo ""
echo "💡 Next Steps:"
echo "   1. Build frontend: cd frontend && npm install && npm run build"
echo "   2. Access dashboard to start trading!"
echo "   3. Monitor logs: docker-compose -f docker-compose-simple.yml logs -f"
echo ""
echo "💰 Ready to generate profits on localhost! 📈"
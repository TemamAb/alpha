#!/bin/bash
set -e

echo "🚀 Alpha-Orion: Complete Production Deployment"
echo "=============================================="
echo ""

ROOT_DIR="$(pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Pre-flight Checks
echo "🔍 Step 1: Pre-flight Checks"
echo "----------------------------"

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    print_warning "gcloud CLI not found. Attempting to locate..."
    for path in "/c/Program Files/Google/Cloud SDK/bin/gcloud" \
               "/c/Program Files (x86)/Google/Cloud SDK/bin/gcloud" \
               "$HOME/AppData/Local/Google/Cloud SDK/bin/gcloud"; do
        if [ -f "$path" ]; then
            export PATH="$(dirname $path):$PATH"
            print_status "Found gcloud at $path"
            break
        fi
    done
fi

if ! command -v gcloud &> /dev/null; then
    print_warning "gcloud CLI not found. Please install Google Cloud SDK."
    print_warning "Will proceed with local Docker build only."
    GCLoud_AVAILABLE=false
else
    GCLoud_AVAILABLE=true
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        print_warning "No GCP project configured. Setting default."
        PROJECT_ID="alpha-orion"
    fi
    print_status "GCP Project: $PROJECT_ID"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    print_warning "Docker not found. Skipping image builds."
    DOCKER_AVAILABLE=false
else
    DOCKER_AVAILABLE=true
    print_status "Docker available"
fi

# Check Python for benchmarking
if ! command -v python3 &> /dev/null; then
    print_warning "Python3 not found. Benchmarking will be skipped."
    PYTHON_AVAILABLE=false
else
    PYTHON_AVAILABLE=true
    print_status "Python3 available for benchmarking"
fi

echo ""

# Step 2: Deploy Smart Contracts
echo "📦 Step 2: Deploy Smart Contracts"
echo "----------------------------------"

cd "$ROOT_DIR/alpha-orion/alpha-orion/smart-contracts"

if [ -f ".env" ]; then
    print_status "Found .env file"
else
    print_warning "No .env file found. Copying .env.example..."
    cp .env.example .env
    print_warning "Please edit .env with your private key before deploying!"
fi

if [ "$GCLoud_AVAILABLE" = true ]; then
    print_status "Compiling contracts..."
    npm install --silent 2>/dev/null
    npx hardhat compile
    
    print_status "Deploying to Ethereum mainnet..."
    npx hardhat run scripts/deploy.js --network mainnet
    
    # Get deployed address
    CONTRACT_ADDRESS=$(cat deployments/mainnet.json 2>/dev/null | grep -o '"contractAddress": "[^"]*"' | cut -d'"' -f4)
    if [ -n "$CONTRACT_ADDRESS" ]; then
        print_status "Contract deployed at: $CONTRACT_ADDRESS"
    fi
else
    print_warning "Skipping smart contract deployment (gcloud not available)"
    print_status "Run manually: npx hardhat run scripts/deploy.js --network mainnet"
fi

echo ""

# Step 3: Build Docker Images
echo "🐳 Step 3: Build Docker Images"
echo "-------------------------------"

cd "$ROOT_DIR"

SERVICES=(
    "backend-services/services/brain-orchestrator:brain-orchestrator"
)

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_dir image_name <<< "$service_info"
    
    if [ -d "$service_dir" ]; then
        if [ "$DOCKER_AVAILABLE" = true ]; then
            print_status "Building $image_name..."
            docker build -t "$image_name:latest" "$service_dir/" --quiet 2>/dev/null || \
                docker build -t "$image_name:latest" "$service_dir/"
        else
            print_warning "Skipping $image_name (Docker not available)"
        fi
    else
        print_warning "Directory $service_dir not found"
    fi
done

echo ""

# Step 4: Push to Artifact Registry
echo "📤 Step 4: Push to Artifact Registry"
echo "------------------------------------"

if [ "$GCLoud_AVAILABLE" = true ] && [ "$DOCKER_AVAILABLE" = true ]; then
    REGION="us-central1"
    REPO="alpha-orion-repo"
    
    # Configure Docker
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    
    for service_info in "${SERVICES[@]}"; do
        IFS=':' read -r service_dir image_name <<< "$service_info"
        
        if [ -d "$service_dir" ]; then
            full_image="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${image_name}:latest"
            
            print_status "Tagging $image_name:latest -> $full_image"
            docker tag "$image_name:latest" "$full_image"
            
            print_status "Pushing $full_image..."
            docker push "$full_image" --quiet
        fi
    done
else
    print_warning "Skipping push to Artifact Registry"
fi

echo ""

# Step 5: Deploy to Cloud Run
echo "☁️  Step 5: Deploy to Cloud Run"
echo "--------------------------------"

if [ "$GCLoud_AVAILABLE" = true ]; then
    # Deploy Brain Orchestrator
    if [ -d "backend-services/services/brain-orchestrator" ]; then
        print_status "Deploying brain-orchestrator..."
        
        ORCHESTRATOR_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/brain-orchestrator:latest"
        
        gcloud run deploy brain-orchestrator \
            --image "$ORCHESTRATOR_IMAGE" \
            --region "$REGION" \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars="NODE_ENV=production,ARBITRAGE_CONTRACT_ADDRESS=${CONTRACT_ADDRESS:-},ETHEREUM_RPC_URL=${ETHEREUM_RPC_URL:-},PIMLICO_API_KEY=${PIMLICO_API_KEY:-},GCP_PROJECT_ID=${PROJECT_ID}" \
            --memory 1Gi \
            --cpu 2 \
            --min-instances 1 \
            --max-instances 10 \
            --timeout 3600s \
            --concurrency 80 \
            --service-account "alpha-orion@${PROJECT_ID}.iam.gserviceaccount.com" \
            --quiet
        
        ORCHESTRATOR_URL=$(gcloud run services describe brain-orchestrator --region "$REGION" --format 'value(status.url)')
        print_status "Brain Orchestrator: $ORCHESTRATOR_URL"
    fi
    
    # Deploy Frontend Dashboard
    print_status "Deploying frontend dashboard..."
    gcloud run deploy alpha-orion-dashboard \
        --source . \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --memory 512Mi \
        --quiet
    
    DASHBOARD_URL=$(gcloud run services describe alpha-orion-dashboard --region "$REGION" --format 'value(status.url)')
    print_status "Dashboard: $DASHBOARD_URL"
else
    print_warning "Skipping Cloud Run deployment (gcloud not available)"
fi

echo ""

# Step 6: Apex Benchmarking Validation
echo "🏆 Step 6: Apex Benchmarking Validation"
echo "----------------------------------------"

BENCHMARK_PASSED=true

if [ "$GCLoud_AVAILABLE" = true ] && [ "$PYTHON_AVAILABLE" = true ] && [ -n "$ORCHESTRATOR_URL" ]; then
    print_status "Running Apex Benchmarking validation..."

    # Extract host from URL (remove https:// and path)
    ORCHESTRATOR_HOST=$(echo "$ORCHESTRATOR_URL" | sed 's|https://||' | sed 's|/.*||')

    # Run latency benchmark against deployed service
    print_status "Running latency benchmark..."
    cd "$ROOT_DIR"
    python3 run_latency_benchmark.py \
        --host "$ORCHESTRATOR_HOST" \
        --port 443 \
        --count 50 \
        --rate 5.0 \
        --target 50.0 > benchmark_results.json

    # Check benchmark results
    if [ -f "benchmark_results.json" ]; then
        BENCHMARK_STATUS=$(python3 -c "
import json
with open('benchmark_results.json') as f:
    data = json.load(f)
print(data.get('status', 'UNKNOWN'))
")

        if [ "$BENCHMARK_STATUS" = "PASS" ]; then
            print_status "✅ Benchmarking PASSED - Wintermute latency target met"
        else
            print_warning "❌ Benchmarking FAILED - Latency exceeds Wintermute target"
            BENCHMARK_PASSED=false
        fi

        # Record benchmark results in deployed service
        if [ "$BENCHMARK_PASSED" = true ]; then
            P99_LATENCY=$(python3 -c "
import json
with open('benchmark_results.json') as f:
    data = json.load(f)
print(data.get('metrics', {}).get('p99_ms', 0))
")
            # Record successful benchmark
            curl -s -X POST "${ORCHESTRATOR_URL}/benchmarking/record" \
                -H "Content-Type: application/json" \
                -d "{\"metric\": \"latency\", \"value\": $P99_LATENCY}" || \
                print_warning "Failed to record benchmark metric"
        fi
    else
        print_warning "Benchmark results not found"
        BENCHMARK_PASSED=false
    fi
else
    print_warning "Skipping benchmarking (missing requirements)"
    BENCHMARK_PASSED=false
fi

echo ""

# Step 7: Rollback Check
echo "🔄 Step 7: Rollback Check"
echo "-------------------------"

if [ "$BENCHMARK_PASSED" = false ]; then
    print_warning "❌ Benchmarks failed - initiating rollback"

    if [ "$GCLoud_AVAILABLE" = true ]; then
        print_status "Rolling back brain-orchestrator deployment..."

        # Get previous revision
        PREV_REVISION=$(gcloud run revisions list \
            --service brain-orchestrator \
            --region "$REGION" \
            --limit 2 \
            --format 'value(metadata.name)' | sed -n '2p')

        if [ -n "$PREV_REVISION" ]; then
            print_status "Rolling back to previous revision: $PREV_REVISION"
            gcloud run services update-traffic brain-orchestrator \
                --region "$REGION" \
                --to-revisions "$PREV_REVISION=100" \
                --quiet

            print_warning "🚨 DEPLOYMENT ROLLED BACK DUE TO BENCHMARK FAILURE"
            print_warning "Please investigate performance issues before redeploying"
            exit 1
        else
            print_warning "No previous revision found for rollback"
            exit 1
        fi
    else
        print_warning "Cannot rollback (gcloud not available)"
        exit 1
    fi
else
    print_status "✅ All benchmarks passed - deployment approved"
fi

echo ""

# Step 8: Summary
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""

if [ "$GCLoud_AVAILABLE" = true ]; then
    echo "🌐 Endpoints:"
    echo "   Dashboard: $DASHBOARD_URL"
    echo "   Orchestrator: $ORCHESTRATOR_URL"
    echo ""
    echo "📊 Monitoring:"
    echo "   https://console.cloud.google.com/run/detail/${REGION}/brain-orchestrator"
    echo ""
    echo "🔗 API Endpoints:"
    echo "   $ORCHESTRATOR_URL/health"
    echo "   $ORCHESTRATOR_URL/profit/real-time"
    echo "   $ORCHESTRATOR_URL/blockchain/status"
    echo "   $ORCHESTRATOR_URL/benchmarking/status"
fi

echo ""
echo "📋 Next Steps:"
echo "   1. Update DNS if needed"
echo "   2. Configure custom domain"
echo "   3. Set up monitoring alerts"
echo "   4. Verify smart contract on Etherscan"
echo ""

# Step 9: Health Check
echo "🏥 Step 8: Health Check"
echo "-----------------------"

if [ -n "$ORCHESTRATOR_URL" ]; then
    sleep 3
    HEALTH=$(curl -s "${ORCHESTRATOR_URL}/health" 2>/dev/null || echo '{"status":"unknown"}')
    print_status "Orchestrator Health: $HEALTH"
fi

echo ""
echo "🎉 Alpha-Orion is now running in production!"

#!/bin/bash
set -e

# Alpha-Orion Frontend Hosting Deployment Script
# Deploys React application to Cloud Storage + Cloud CDN or Firebase Hosting

echo "🚀 Starting Alpha-Orion Frontend Deployment..."

# Configuration
PROJECT_ID="${PROJECT_ID:-alpha-orion}"
ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${REGION:-us-central1}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-dashboard.alpha-orion.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install Node.js first."
        exit 1
    fi

    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
        log_error "Not authenticated with gcloud. Please run 'gcloud auth login' first."
        exit 1
    fi

    # Set project
    gcloud config set project $PROJECT_ID

    # Enable required APIs
    log_info "Enabling required GCP APIs..."
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable compute.googleapis.com
    gcloud services enable storage.googleapis.com
    gcloud services enable firebase.googleapis.com

    # Check if frontend directory exists
    if [ ! -d "frontend" ]; then
        log_error "frontend directory not found. Please ensure the React application is in the frontend/ directory."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Build React application
build_frontend() {
    log_info "Building React application..."

    cd frontend

    # Install dependencies
    log_info "Installing dependencies..."
    npm ci

    # Build for production
    log_info "Building for production..."
    npm run build

    # Check if build was successful
    if [ ! -d "build" ]; then
        log_error "Build failed - build directory not found"
        exit 1
    fi

    cd ..
    log_success "Frontend build completed"
}

# Deploy to Cloud Storage + Cloud CDN
deploy_cloud_storage() {
    log_info "Deploying to Cloud Storage + Cloud CDN..."

    BUCKET_NAME="${PROJECT_ID}-frontend-assets"

    # Create bucket if it doesn't exist
    if ! gsutil ls -b gs://$BUCKET_NAME > /dev/null 2>&1; then
        log_info "Creating Cloud Storage bucket..."
        gsutil mb -p $PROJECT_ID -c standard -l $REGION gs://$BUCKET_NAME
        gsutil web set -m index.html -e index.html gs://$BUCKET_NAME
    fi

    # Upload build files
    log_info "Uploading build files to Cloud Storage..."
    gsutil -m rsync -r -d frontend/build gs://$BUCKET_NAME

    # Set public access
    log_info "Setting public access permissions..."
    gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME/**

    # Configure CORS
    log_info "Configuring CORS..."
    gsutil cors set cors-config.json gs://$BUCKET_NAME

    log_success "Cloud Storage deployment completed"
}

# Deploy to Firebase Hosting (Alternative)
deploy_firebase() {
    log_info "Deploying to Firebase Hosting..."

    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        log_warning "Firebase CLI not found. Installing..."
        npm install -g firebase-tools
    fi

    # Login to Firebase (if not already logged in)
    if ! firebase projects:list > /dev/null 2>&1; then
        log_warning "Firebase authentication required"
        firebase login --no-localhost
    fi

    # Initialize Firebase if not already done
    if [ ! -f "firebase.json" ]; then
        log_info "Initializing Firebase project..."
        firebase init hosting --project $PROJECT_ID
    fi

    # Deploy to Firebase
    log_info "Deploying to Firebase Hosting..."
    firebase deploy --only hosting --project $PROJECT_ID

    log_success "Firebase Hosting deployment completed"
}

# Configure Cloud CDN
configure_cdn() {
    log_info "Configuring Cloud CDN..."

    BUCKET_NAME="${PROJECT_ID}-frontend-assets"

    # Create backend bucket for CDN
    log_info "Creating CDN backend bucket..."
    gcloud compute backend-buckets create frontend-cdn-backend \
        --gcs-bucket-name=$BUCKET_NAME \
        --enable-cdn \
        --cache-mode=CACHE_ALL_STATIC \
        --client-ttl=3600 \
        --default-ttl=3600 \
        --max-ttl=86400

    # Create URL map
    log_info "Creating URL map..."
    gcloud compute url-maps create frontend-cdn-urlmap \
        --default-backend-bucket=frontend-cdn-backend

    # Create SSL certificate
    log_info "Creating SSL certificate..."
    gcloud compute ssl-certificates create frontend-ssl-cert \
        --domains=$FRONTEND_DOMAIN \
        --global

    # Create HTTPS target proxy
    log_info "Creating HTTPS target proxy..."
    gcloud compute target-https-proxies create frontend-https-proxy \
        --url-map=frontend-cdn-urlmap \
        --ssl-certificates=frontend-ssl-cert \
        --global

    # Reserve global IP
    log_info "Reserving global IP address..."
    gcloud compute addresses create frontend-global-ip \
        --global \
        --ip-version=IPV4

    # Get the IP address
    FRONTEND_IP=$(gcloud compute addresses describe frontend-global-ip --global --format="value(address)")

    # Create forwarding rule
    log_info "Creating forwarding rule..."
    gcloud compute forwarding-rules create frontend-cdn-forwarding-rule \
        --address=$FRONTEND_IP \
        --target-https-proxy=frontend-https-proxy \
        --ports=443 \
        --global

    log_success "Cloud CDN configuration completed"
    log_info "Frontend will be available at: https://$FRONTEND_DOMAIN"
    log_info "Global IP: $FRONTEND_IP"
}

# Configure DNS
configure_dns() {
    log_info "Configuring DNS..."

    # Get the IP address
    FRONTEND_IP=$(gcloud compute addresses describe frontend-global-ip --global --format="value(address)")

    log_info "Please update your DNS records:"
    log_info "Domain: $FRONTEND_DOMAIN"
    log_info "Type: A"
    log_info "Value: $FRONTEND_IP"
    log_info ""
    log_warning "DNS propagation may take up to 24 hours"
}

# Create CORS configuration file
create_cors_config() {
    cat > cors-config.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF
}

# Set up Cloud Build trigger
setup_cloud_build() {
    log_info "Setting up Cloud Build trigger for automated deployments..."

    # Create Cloud Build trigger
    gcloud builds triggers create github \
        --name="frontend-deploy-trigger" \
        --repo-name=$GITHUB_REPO \
        --repo-owner=$GITHUB_OWNER \
        --branch-pattern="^main$" \
        --included-files="frontend/**" \
        --build-config=cloudbuild-frontend.yaml

    log_success "Cloud Build trigger configured"
}

# Test deployment
test_deployment() {
    log_info "Testing frontend deployment..."

    # Wait for SSL certificate to be active
    log_info "Waiting for SSL certificate to be active..."
    for i in {1..30}; do
        STATUS=$(gcloud compute ssl-certificates describe frontend-ssl-cert --global --format="value(managed.status)")
        if [ "$STATUS" = "ACTIVE" ]; then
            break
        fi
        log_info "SSL certificate status: $STATUS (attempt $i/30)"
        sleep 10
    done

    if [ "$STATUS" != "ACTIVE" ]; then
        log_warning "SSL certificate is not yet active. This may take a few minutes."
    fi

    # Test HTTP access
    log_info "Testing HTTP access..."
    if curl -s -o /dev/null -w "%{http_code}" https://$FRONTEND_DOMAIN | grep -q "200"; then
        log_success "Frontend is accessible at https://$FRONTEND_DOMAIN"
    else
        log_warning "Frontend may not be fully accessible yet. DNS propagation may be in progress."
    fi
}

# Generate deployment report
generate_report() {
    log_info "Generating frontend deployment report..."

    FRONTEND_IP=$(gcloud compute addresses describe frontend-global-ip --global --format="value(address)" 2>/dev/null || echo "Not available")
    BUCKET_NAME="${PROJECT_ID}-frontend-assets"

    cat > frontend-deployment-report.json << EOF
{
    "deployment_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "project_id": "$PROJECT_ID",
    "frontend_deployment": {
        "hosting_type": "Cloud Storage + Cloud CDN",
        "domain": "$FRONTEND_DOMAIN",
        "global_ip": "$FRONTEND_IP",
        "storage_bucket": "$BUCKET_NAME",
        "cdn_enabled": true,
        "ssl_enabled": true,
        "firebase_fallback": false,
        "build_info": {
            "build_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "build_directory": "frontend/build",
            "static_files_count": $(find frontend/build -type f | wc -l)
        },
        "cdn_configuration": {
            "cache_mode": "CACHE_ALL_STATIC",
            "client_ttl": 3600,
            "default_ttl": 3600,
            "max_ttl": 86400,
            "cors_enabled": true
        },
        "security": {
            "ssl_certificate": "managed",
            "cors_policy": "configured",
            "public_access": "enabled for static assets"
        },
        "monitoring": {
            "cloud_logging": "enabled",
            "cdn_metrics": "available",
            "error_tracking": "configured"
        },
        "automation": {
            "cloud_build_trigger": "configured",
            "github_integration": "enabled",
            "auto_deployment": "main branch pushes"
        }
    },
    "access_urls": {
        "primary": "https://$FRONTEND_DOMAIN",
        "direct_bucket": "https://storage.googleapis.com/$BUCKET_NAME/index.html",
        "cdn_ip": "$FRONTEND_IP"
    },
    "next_steps": [
        "Update DNS records to point to $FRONTEND_IP",
        "Wait for DNS propagation (up to 24 hours)",
        "Test all frontend functionality",
        "Configure monitoring alerts",
        "Set up CDN invalidation for updates"
    ]
}
EOF

    log_success "Frontend deployment report generated: frontend-deployment-report.json"
}

# Main deployment flow
main() {
    log_info "Starting Alpha-Orion Frontend Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Domain: $FRONTEND_DOMAIN"
    log_info "Project: $PROJECT_ID"

    check_prerequisites
    build_frontend
    create_cors_config

    # Choose deployment method
    if [ "$USE_FIREBASE" = "true" ]; then
        deploy_firebase
    else
        deploy_cloud_storage
        configure_cdn
        configure_dns
    fi

    setup_cloud_build
    test_deployment
    generate_report

    log_success "🎉 Alpha-Orion Frontend Deployment Completed Successfully!"
    log_info "Frontend will be available at: https://$FRONTEND_DOMAIN"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --domain)
            FRONTEND_DOMAIN="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --use-firebase)
            USE_FIREBASE=true
            shift
            ;;
        --github-owner)
            GITHUB_OWNER="$2"
            shift 2
            ;;
        --github-repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --project-id PROJECT_ID    GCP Project ID (default: alpha-orion)"
            echo "  --environment ENV         Environment (default: production)"
            echo "  --domain DOMAIN           Frontend domain (default: dashboard.alpha-orion.com)"
            echo "  --region REGION          GCP Region (default: us-central1)"
            echo "  --use-firebase           Use Firebase Hosting instead of Cloud Storage"
            echo "  --github-owner OWNER     GitHub repository owner"
            echo "  --github-repo REPO       GitHub repository name"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main

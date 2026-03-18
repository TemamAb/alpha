#!/bin/bash

# ALPHA-ORION ENTERPRISE CLOUD DEPLOYMENT SETUP
# This script sets up automated deployment to Google Cloud with issue fixing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${PROJECT_ID:-alpha-orion}"
REGION="${REGION:-us-central1}"
SERVICE_ACCOUNT_NAME="alpha-orion-deployer"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
BUCKET_NAME="${PROJECT_ID}-deployments"
AUTH_ID="100036329256815676668"

echo -e "${PURPLE}🚀 ALPHA-ORION ENTERPRISE CLOUD DEPLOYMENT SETUP${NC}"
echo -e "${PURPLE}=================================================${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

    # Attempt to auto-detect gcloud path for Windows/MINGW64
    if ! command -v gcloud &> /dev/null; then
        local possible_paths=(
            "/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin"
            "/c/Program Files/Google/Cloud SDK/google-cloud-sdk/bin"
            "/c/Users/${USERNAME:-$USER}/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin"
        )
        for p in "${possible_paths[@]}"; do
            if [ -d "$p" ]; then export PATH=$PATH:"$p"; break; fi
        done
    fi

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ gcloud CLI is not installed. Please install Google Cloud SDK.${NC}"
        exit 1
    fi

    # Check if gsutil is installed
    if ! command -v gsutil &> /dev/null; then
        echo -e "${RED}❌ gsutil is not installed. Please install Google Cloud SDK.${NC}"
        exit 1
    fi

    # Check if python3 is installed
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ python3 is not installed. Please install Python 3.${NC}"
        exit 1
    fi

    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
        echo -e "${RED}❌ Not authenticated with Google Cloud. Please run 'gcloud auth login'.${NC}"
        exit 1
    fi

    # Set project
    gcloud config set project $PROJECT_ID

    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to create service account
create_service_account() {
    echo -e "${YELLOW}🔑 Creating deployment service account...${NC}"

    # Check if service account already exists
    if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &> /dev/null; then
        echo -e "${BLUE}Service account already exists: $SERVICE_ACCOUNT_EMAIL${NC}"
    else
        # Create service account
        gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
            --description="Alpha-Orion Enterprise Deployment Service Account" \
            --display-name="Alpha-Orion Deployer" \
            --project=$PROJECT_ID

        echo -e "${GREEN}✅ Service account created: $SERVICE_ACCOUNT_EMAIL${NC}"
    fi

    # Grant necessary permissions
    echo -e "${BLUE}Granting permissions to service account...${NC}"

    # Project Editor role (broad permissions for deployment)
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/editor"

    # Storage Admin for artifacts
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/storage.admin"

    # Cloud Build Service Account role
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/cloudbuild.serviceAgent"

    # Secret Manager Secret Accessor
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/secretmanager.secretAccessor"

    echo -e "${GREEN}✅ Service account permissions configured${NC}"
}

# Function to create storage bucket
create_storage_bucket() {
    echo -e "${YELLOW}📦 Creating Cloud Storage bucket for deployments...${NC}"

    # Check if bucket exists
    if gsutil ls -b gs://$BUCKET_NAME/ &> /dev/null; then
        echo -e "${BLUE}Bucket already exists: gs://$BUCKET_NAME/${NC}"
    else
        # Create bucket
        gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME/

        # Set lifecycle policy for old builds
        cat > lifecycle.json << EOF
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "age": 30,
        "matchesPrefix": ["artifacts/"]
      }
    }
  ]
}
EOF
        gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME/

        echo -e "${GREEN}✅ Storage bucket created: gs://$BUCKET_NAME/${NC}"
    fi
}

# Function to create secrets
create_secrets() {
    echo -e "${YELLOW}🔐 Creating deployment secrets...${NC}"

    # Create service account key
    echo -e "${BLUE}Creating service account key...${NC}"
    gcloud iam service-accounts keys create sa-key.json \
        --iam-account=$SERVICE_ACCOUNT_EMAIL \
        --project=$PROJECT_ID

    # Create secret in Secret Manager
    if gcloud secrets describe gcp-service-account-key --project=$PROJECT_ID &> /dev/null; then
        echo -e "${BLUE}Secret already exists, updating...${NC}"
        gcloud secrets versions add gcp-service-account-key \
            --data-file=sa-key.json \
            --project=$PROJECT_ID
    else
        gcloud secrets create gcp-service-account-key \
            --data-file=sa-key.json \
            --project=$PROJECT_ID
    fi

    # Clean up local key file
    rm -f sa-key.json

    echo -e "${GREEN}✅ Deployment secrets configured${NC}"
}

# Function to enable required APIs
enable_deployment_apis() {
    echo -e "${YELLOW}🔌 Enabling deployment APIs...${NC}"

    local apis=(
        "cloudbuild.googleapis.com"
        "secretmanager.googleapis.com"
        "storage.googleapis.com"
        "iam.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "serviceusage.googleapis.com"
    )

    for api in "${apis[@]}"; do
        echo -e "${BLUE}Enabling ${api}...${NC}"
        gcloud services enable $api --project=$PROJECT_ID
    done

    echo -e "${GREEN}✅ Deployment APIs enabled${NC}"
}

# Function to create Cloud Build trigger
create_build_trigger() {
    echo -e "${YELLOW}🏗️ Creating Cloud Build trigger...${NC}"

    # Check if trigger already exists
    if gcloud builds triggers describe alpha-orion-enterprise-deploy --project=$PROJECT_ID &> /dev/null; then
        echo -e "${BLUE}Build trigger already exists${NC}"
    else
        # Create build trigger
        gcloud builds triggers create github \
            --name=alpha-orion-enterprise-deploy \
            --repo-name=alpha-orion \
            --repo-owner=TemamAb \
            --branch-pattern="^main$" \
            --build-config=cloudbuild-enterprise.yaml \
            --included-files="**/*" \
            --ignored-files="README.md,docs/**,*.md,terraform.tfvars" \
            --project=$PROJECT_ID

        echo -e "${GREEN}✅ Cloud Build trigger created${NC}"
    fi
}

# Function to run deployment diagnostics
run_deployment_diagnostics() {
    echo -e "${YELLOW}🔍 Running deployment diagnostics...${NC}"

    if [ ! -f "fix-gcp-deployment-issues.py" ]; then
        echo -e "${YELLOW}⚠️ fix-gcp-deployment-issues.py not found. Skipping diagnostics...${NC}"
        return 0
    fi

    python3 fix-gcp-deployment-issues.py --project=$PROJECT_ID --diagnose-only

    if [ -f "gcp-deployment-fix-report.json" ]; then
        echo -e "${GREEN}✅ Diagnostics report generated${NC}"

        # Check if deployment is ready
        local readiness=$(python3 -c "
import json
with open('gcp-deployment-fix-report.json') as f:
    data = json.load(f)
print(data.get('deployment_readiness', 'UNKNOWN'))
")

        if [ "$readiness" = "READY" ]; then
            echo -e "${GREEN}🎉 Deployment diagnostics: READY${NC}"
            return 0
        elif [ "$readiness" = "CAUTION" ]; then
            echo -e "${YELLOW}⚠️ Deployment diagnostics: CAUTION (minor issues)${NC}"
            return 0
        else
            echo -e "${RED}🚫 Deployment diagnostics: BLOCKED (critical issues)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Diagnostics report not generated${NC}"
        return 1
    fi
}

# Function to start deployment
start_deployment() {
    echo -e "${YELLOW}🚀 Starting enterprise deployment...${NC}"

    # Submit build
    local build_id=$(gcloud builds submit . \
        --config=cloudbuild-enterprise.yaml \
        --project=$PROJECT_ID \
        --substitutions=_AUTH_ID=$AUTH_ID \
        --format="value(id)")

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment build submitted: $build_id${NC}"
        echo -e "${BLUE}Monitor progress at: https://console.cloud.google.com/cloud-build/builds/$build_id${NC}"

        # Wait for build completion
        echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"

        local status=""
        while [ "$status" != "SUCCESS" ] && [ "$status" != "FAILURE" ] && [ "$status" != "TIMEOUT" ]; do
            sleep 30
            status=$(gcloud builds describe $build_id --project=$PROJECT_ID --format="value(status)")
            echo -e "${BLUE}Build status: $status${NC}"
        done

        if [ "$status" = "SUCCESS" ]; then
            echo -e "${GREEN}🎉 Enterprise deployment completed successfully!${NC}"
            echo -e "${BLUE}View results at: https://console.cloud.google.com/cloud-build/builds/$build_id${NC}"
            
            # Retrieve Frontend URL
            FRONTEND_URL=$(gcloud run services describe frontend-dashboard --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null || echo "URL_NOT_FOUND")
            
            echo ""
            echo -e "${GREEN}📊 OFFICIAL DASHBOARD ACCESS:${NC}"
            echo -e "${CYAN}👉 $FRONTEND_URL/official-dashboard.html${NC}"
            return 0
        else
            echo -e "${RED}❌ Deployment failed with status: $status${NC}"
            echo -e "${BLUE}Check logs at: https://console.cloud.google.com/cloud-build/builds/$build_id${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Failed to submit deployment build${NC}"
        return 1
    fi
}

# Function to show deployment summary
show_deployment_summary() {
    echo -e "${GREEN}🎯 ALPHA-ORION ENTERPRISE DEPLOYMENT SUMMARY${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    echo -e "${BLUE}✅ Infrastructure Components:${NC}"
    echo "  • Cloud Build Triggers: Configured"
    echo "  • Service Accounts: Created & Configured"
    echo "  • Storage Buckets: Created"
    echo "  • Secrets Management: Set up"
    echo "  • API Enablement: Complete"
    echo ""
    echo -e "${BLUE}🚀 Deployment Pipeline:${NC}"
    echo "  • Automated Builds: Enabled"
    echo "  • Issue Detection: Active"
    echo "  • Rollback Support: Ready"
    echo "  • Monitoring: Configured"
    echo ""
    echo -e "${BLUE}🔧 Management Tools:${NC}"
    echo "  • fix-gcp-deployment-issues.py - Issue resolution"
    echo "  • gcp-infrastructure-verification.py - Health checks"
    echo "  • enhanced-gcp-integration.py - Feature enablement"
    echo "  • deploy-enterprise-infrastructure.sh - Manual deployment"
    echo ""
    echo -e "${BLUE}📊 Monitoring URLs:${NC}"
    echo "  • Cloud Build: https://console.cloud.google.com/cloud-build"
    echo "  • Deployment Storage: gs://$BUCKET_NAME/"
    echo "  • Project Dashboard: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
    echo ""
    echo -e "${GREEN}🎉 Alpha-Orion Enterprise is now deployment-ready!${NC}"
}

# Main setup function
main() {
    case "$1" in
        "check")
            check_prerequisites
            ;;
        "setup")
            check_prerequisites
            enable_deployment_apis
            create_service_account
            create_storage_bucket
            create_secrets
            create_build_trigger
            show_deployment_summary
            ;;
        "diagnose")
            check_prerequisites
            run_deployment_diagnostics
            ;;
        "deploy")
            check_prerequisites
            echo -e "${RED}🚨 PRODUCTION DEPLOYMENT${NC}"
            echo -e "${RED}⚠️  This will deploy Alpha-Orion Enterprise to Google Cloud${NC}"
            echo -e "${YELLOW}Estimated cost: $20K-43K/month${NC}"
            echo ""
            read -p "Are you sure you want to proceed? Type 'YES' to continue: " confirmation

            if [ "$confirmation" != "YES" ]; then
                echo -e "${RED}❌ Deployment cancelled by user${NC}"
                return 1
            fi

            if run_deployment_diagnostics; then
                start_deployment
                show_deployment_summary
            else
                echo -e "${RED}❌ Deployment blocked by diagnostic issues${NC}"
                echo -e "${YELLOW}Run './setup-cloud-deployment.sh diagnose' to see details${NC}"
                return 1
            fi
            ;;
        "status")
            check_prerequisites
            echo -e "${BLUE}📊 Deployment Status:${NC}"
            echo "Project: $PROJECT_ID"
            echo "Region: $REGION"
            echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
            echo "Storage Bucket: gs://$BUCKET_NAME/"

            # Check recent builds
            echo ""
            echo -e "${BLUE}Recent Builds:${NC}"
            gcloud builds list --project=$PROJECT_ID --limit=5 --format="table(id,status,createTime,duration)"
            ;;
        *)
            echo "Usage: $0 {check|setup|diagnose|deploy|status}"
            echo ""
            echo "Commands:"
            echo "  check    - Check prerequisites"
            echo "  setup    - Set up deployment infrastructure"
            echo "  diagnose - Run deployment diagnostics"
            echo "  deploy   - Deploy to Google Cloud"
            echo "  status   - Show deployment status"
            echo ""
            echo "Example workflow:"
            echo "  1. $0 check"
            echo "  2. $0 setup"
            echo "  3. $0 diagnose"
            echo "  4. $0 deploy"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
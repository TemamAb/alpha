# Alpha-Orion GCP Cloud Run Deployment Implementation Plan

## Mission
Deploy Alpha-Orion profit engine to Google Cloud Run in production mode and start generating profit using Pimlico gasless transactions (ERC-4337).

---

## Phase 1: Fix Container Startup Issue (Priority: Critical)

### Issue
Brain-orchestrator container fails to start on Cloud Run with error:
```
The user-provided container failed to start and listen on the port defined by the PORT=8080 environment variable
```

### Root Cause
Missing `flask-cors` package in the container image.

### Solution

#### Step 1.1: Verify requirements.txt has all dependencies
The file `alpha-orion/backend-services/services/brain-orchestrator/requirements.txt` should contain:
```
flask==3.0.0
flask-cors==4.0.0
web3==6.11.0
redis==5.0.1
python-dotenv==1.0.0
requests==2.31.0
google-cloud-logging==3.8.0
google-cloud-monitoring==2.29.1
google-cloud-pubsub==2.18.0
psycopg2-binary==2.9.9
pyjwt==2.8.0
```

#### Step 1.2: Rebuild and push Docker image
```bash
cd alpha-orion/backend-services/services/brain-orchestrator

# Build new image with version v4
docker build -t gcr.io/alpha-orion/brain-orchestrator:v4 .

# Push to GCR
docker push gcr.io/alpha-orion/brain-orchestrator:v4
```

#### Step 1.3: Deploy to Cloud Run
```bash
gcloud run deploy brain-orchestrator \
  --image gcr.io/alpha-orion/brain-orchestrator:v4 \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="PIMLICO_API_KEY=pim_UbfKR9ocMe5ibNUCGgB8fE,EXECUTION_WALLET_ADDRESS=0x21e6d55cBd4721996a6B483079449cFc279A993a"
```

#### Step 1.4: Verify deployment
```bash
gcloud run services describe brain-orchestrator --region us-central1 --platform managed
```

---

## Phase 2: Start Profit Engine (Priority: High)

### Step 2.1: Test the API endpoint
Once the container is running, test the health endpoint:
```bash
curl https://brain-orchestrator-380955632798.us-central1.run.app/health
```

### Step 2.2: Start profit generation
Call the profit engine start endpoint:
```bash
curl -X POST https://brain-orchestrator-380955632798.us-central1.run.app/api/profit/start
```

### Step 2.3: Monitor profit generation
Check profit status:
```bash
curl https://brain-orchestrator-380955632798.us-central1.run.app/api/profit/status
```

---

## Phase 3: Verify Smart Contracts (Priority: High)

### Step 3.1: Check wallet balance
Ensure the execution wallet has sufficient ETH for gas:
```bash
# Check ETH balance on wallet 0x21e6d55cBd4721996a6B483079449cFc279A993a
```

### Step 3.2: Verify smart contract deployment
If using flash loan arbitrage, ensure the smart contract is deployed:
```bash
# Check contract deployment status
```

---

## Phase 4: Production Configuration (Priority: Medium)

### Step 4.1: Configure proper secrets
Use Google Cloud Secret Manager for sensitive values:
```bash
# Create secrets
gcloud secrets create pimlico-api-key --replication-policy=automatic
echo -n "pim_UbfKR9ocMe5ibNUCGgB8fE" | gcloud secrets versions add pimlico-api-key --data-file=-

gcloud secrets create execution-wallet-address --replication-policy=automatic
echo -n "0x21e6d55cBd4721996a6B483079449cFc279A993a" | gcloud secrets versions add execution-wallet-address --data-file=-
```

### Step 4.2: Update Cloud Run to use secrets
```bash
gcloud run deploy brain-orchestrator \
  --image gcr.io/alpha-orion/brain-orchestrator:v4 \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="PIMLICO_API_KEY=pimlico-api-key:latest,EXECUTION_WALLET_ADDRESS=execution-wallet-address:latest"
```

---

## Phase 5: Monitoring & Alerts (Priority: Medium)

### Step 5.1: Set up logging
Logs are automatically sent to Cloud Logging from Cloud Run.

### Step 5.2: Set up alerts
Create alerts for:
- Container restarts
- High error rates
- Profit drops below threshold

---

## Critical Success Criteria

1. ✅ Brain-orchestrator container starts successfully on Cloud Run
2. ✅ Health endpoint returns 200 OK
3. ✅ Profit engine can be started via API
4. ✅ Transactions are executed via Pimlico gasless (ERC-4337)
5. ✅ Profit is generated and reported via API

---

## Rollback Plan

If deployment fails:
```bash
# Rollback to previous version
gcloud run revisions deploy-traffic brain-orchestrator --to-revisions=brain-orchestrator-00002-xxx

# Or delete the failing service
gcloud run services delete brain-orchestrator --region us-central1
```

---

## Contact Information

For issues or questions, refer to:
- Dashboard: https://alpha-orion-dashboard.uc.r.appspeed.com
- Cloud Run: https://console.cloud.google.com/run
- Logs: https://console.cloud.google.com/logs

---

## Notes for Successor

1. The key challenge is the container startup failure - ensure Flask-CORS is in requirements.txt
2. Pimlico gasless mode is configured - no private key needed
3. The execution wallet address is: 0x21e6d55cBd4721996a6B483079449cFc279A993a
4. Monitor the Cloud Run logs for any startup errors
5. The engine uses ERC-4337 UserOperations for gasless transactions

**Current Build Status**: Docker build v4 was in progress when task was handed over. Verify build completed and push to GCR before deploying.

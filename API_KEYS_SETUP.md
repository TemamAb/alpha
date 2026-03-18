# Alpha-Orion API Keys Setup Guide

## Critical API Keys Required

### 1. **1inch API Key** (REQUIRED for arbitrage)
**Purpose**: DEX aggregation, price quotes, swap execution  
**Status**: ⚠ MISSING - Must be configured

#### How to Get:
1. Visit: https://portal.1inch.io/
2. Click "Sign Up" or "Login"
3. Create or select workspace
4. Create new application
5. Copy API Key
6. Set environment variable:
```bash
export ONE_INCH_API_KEY="your-api-key-here"
```

#### Where It's Used:
- `live-metrics-server.js` - 1inch quote/swap endpoints
- `backend-services/services/user-api-service/src/multi-chain-arbitrage-engine.js` - DEX routing
- GCP Secret Manager: `one-inch-api-key`

---

### 2. **Pimlico API Key** (For gasless transactions)
**Status**: ✅ CONFIGURED
```
pim_TDJjCjeAJdArjep3usKXTu
```
**Purpose**: ERC-4337 account abstraction, gasless transactions

#### Where It's Used:
- Backend: `pimlico-gasless.js`
- GCP Secret Manager: `pimlico-api-key`

---

### 3. **Infura API Key** (RPC provider)
**Status**: ⚠ PLACEHOLDER - `YOUR_INFURA_API_KEY_HERE`

#### How to Get:
1. Visit: https://infura.io/
2. Sign up / Login
3. Create new project
4. Copy Project ID (API Key)
5. Set environment variable:
```bash
export INFURA_API_KEY="your-infura-key"
```

#### Networks:
- Ethereum Mainnet: `https://mainnet.infura.io/v3/{KEY}`
- Arbitrum: `https://arbitrum-mainnet.infura.io/v3/{KEY}`
- Optimism: `https://optimism-mainnet.infura.io/v3/{KEY}`

---

### 4. **Etherscan API Key** (Block explorer)
**Status**: ⚠ PLACEHOLDER - `YOUR_ETHERSCAN_API_KEY_HERE`

#### How to Get:
1. Visit: https://etherscan.io/
2. Sign up / Login
3. Go to API Keys
4. Create new API key
5. Set environment variable:
```bash
export ETHERSCAN_API_KEY="your-etherscan-key"
```

#### Purpose:
- Contract verification
- Block explorer queries
- Transaction monitoring

---

### 5. **Profit Destination Wallet**
**Status**: ⚠ PLACEHOLDER - `0xYOUR_PROFIT_WALLET_ADDRESS_HERE`

#### How to Set:
```bash
export PROFIT_WALLET_ADDRESS="0x1234...abcd"
```

#### Purpose:
- Receive arbitrage profits
- Auto-withdrawal destination
- Dashboard balance tracking

---

## Environment Variables Summary

### Create `.env.production` file:
```bash
# 1inch DEX Aggregator (CRITICAL)
ONE_INCH_API_KEY=your-1inch-api-key-here

# Blockchain RPC Providers
INFURA_API_KEY=your-infura-key
RPC_URL_ETHEREUM=https://eth.llamarpc.com
RPC_URL_POLYGON=https://polygon-rpc.com
RPC_URL_OPTIMISM=https://mainnet.optimism.io

# Block Explorers
ETHERSCAN_API_KEY=your-etherscan-key

# Wallets & Addresses
PROFIT_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
DEPLOYER_PRIVATE_KEY=your-deployer-private-key

# Trading Backend
TRADING_BACKEND_URL=https://your-backend.com
TRADING_BACKEND_API_KEY=your-backend-api-key

# Pimlico (ERC-4337)
PIMLICO_API_KEY=pim_TDJjCjeAJdArjep3usKXTu

# Google Cloud
GCP_PROJECT_ID=alpha-orion
GCP_REGION=us-central1

# Database
DATABASE_URL=postgresql://user:password@host:5432/db
REDIS_URL=redis://host:6379

# Server
PORT=8000
NODE_ENV=production
```

---

## Cloud Deployment: GCP Secrets Manager

### Automatic Setup via Terraform:
```bash
cd terraform
terraform apply
```

### Manual Setup:
```bash
# Create secrets
gcloud secrets create one-inch-api-key --data-file=- <<< "your-api-key"
gcloud secrets create infura-api-key --data-file=- <<< "your-infura-key"
gcloud secrets create etherscan-api-key --data-file=- <<< "your-etherscan-key"
gcloud secrets create profit-wallet-address --data-file=- <<< "0x..."
gcloud secrets create deployer-private-key --data-file=- <<< "0x..."

# Grant Cloud Run service account access
gcloud secrets add-iam-policy-binding one-inch-api-key \
  --member=serviceAccount:PROJECT_ID-compute@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## Local Testing

### 1. Set Environment Variables
```bash
$env:ONE_INCH_API_KEY = "your-1inch-api-key"
$env:TRADING_BACKEND_URL = "http://localhost:5000"
$env:PORT = "8000"
```

### 2. Start Live Metrics Server
```bash
cd c:\Users\op\Desktop\alpha-alpha\alpha-orion
node live-metrics-server.js
```

### 3. Test 1inch Integration
```bash
# Test health
curl http://localhost:8000/health

# Test status (shows 1inch API configuration)
curl http://localhost:8000/status

# Test 1inch quote
curl "http://localhost:8000/1inch/quote/1?fromToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&amount=1000000000000000000"

# Test arbitrage simulation
curl -X POST http://localhost:8000/1inch/simulate \
  -H "Content-Type: application/json" \
  -d '{"chainId": 1, "token1": "0xeeee...", "token2": "0xa0b8...", "amount": "1000000000000000000"}'
```

---

## Priority Setup Order

1. **🔴 CRITICAL** - 1inch API Key
   - Without this, no arbitrage detection
   - Get from: https://portal.1inch.io/

2. **🟡 IMPORTANT** - Wallet Addresses
   - Set profit destination wallet
   - Get deployer private key

3. **🟢 OPTIONAL** - Additional RPC Keys
   - Defaults provided (Llamarpc, Polygon RPC, etc)
   - Use custom RPC if needed for better performance

---

## Verification Checklist

- [ ] ONE_INCH_API_KEY obtained from https://portal.1inch.io/
- [ ] Environment variables set in `.env.production`
- [ ] Live Metrics Server starts without errors
- [ ] `/status` endpoint shows `one_inch_api_configured: true`
- [ ] `/1inch/quote` endpoint returns valid data
- [ ] `/1inch/simulate` shows arbitrage opportunities
- [ ] GCP secrets configured for production
- [ ] Dashboard pointing to correct API_BASE_URL
- [ ] Profit wallet address configured
- [ ] All tests passing

---

## Troubleshooting

### 1inch API Returning 401
```
Cause: Missing or invalid API key
Fix: 
  1. Visit https://portal.1inch.io/
  2. Verify API key is active
  3. Check quota and rate limits
  4. Re-export ONE_INCH_API_KEY variable
```

### Live Metrics Server Won't Start
```
Cause: Port already in use or missing dependencies
Fix:
  1. npm install express cors axios
  2. Kill process on port 8000: lsof -ti :8000 | xargs kill
  3. Or use different port: PORT=9000 node live-metrics-server.js
```

### Dashboard Shows $0 Balance
```
Cause: Wallet address not added or RPC issue
Fix:
  1. Add real wallet in dashboard settings
  2. Verify wallet has balance on that chain
  3. Check RPC endpoint is working: curl RPC_URL
```

---

**Last Updated**: 2026-02-16  
**Status**: Production Ready with 1inch Integration

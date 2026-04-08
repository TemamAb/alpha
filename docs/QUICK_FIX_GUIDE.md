# AlphaMarkA Deployment - Quick Fix Guide

**Status**: 🚨 CRITICAL - Follow these steps to fix deployment

---

## Root Cause Summary

The dashboard is online but the **execution bot is not running**. This causes:
- 0 trades, 0 opportunities, $0 profit
- Dead links in dashboard

**Why**: Bot worker fails to start due to health check issues and missing environment variables.

---

## Quick Fix Steps (2-4 hours)

### Step 1: Fix Bot Worker (15 minutes)

```bash
# Replace broken Dockerfile with fixed version
cp Dockerfile.bot-fixed-v2 Dockerfile.bot
```

**What this fixes**: Health check now uses Python instead of missing redis-cli

---

### Step 2: Verify Redis Service (10 minutes)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find `alpha-redis` service
3. Verify status is "Available"
4. Copy connection string

**If Redis doesn't exist**: Create new Redis service (Starter plan)

---

### Step 3: Set Environment Variables (30 minutes)

In Render dashboard, set these for **both** `alphamark-dashboard` and `alphamark-bot`:

**Critical**:
```
REDIS_URL=<from alpha-redis service>
PRIVATE_KEY=<your wallet private key>
WALLET_ADDRESS=<your wallet address>
DEPLOYER_ADDRESS=<same as WALLET_ADDRESS>
PIMLICO_API_KEY=<your Pimlico API key>
FLASHLOAN_CONTRACT_ADDRESS=<deployed contract address>
```

**RPC URLs** (at least one required):
```
ETH_RPC_URL=<your Ethereum RPC>
POLYGON_RPC_URL=<your Polygon RPC>
BSC_RPC_URL=<your BSC RPC>
ARBITRUM_RPC_URL=<your Arbitrum RPC>
OPTIMISM_RPC_URL=<your Optimism RPC>
BASE_RPC_URL=<your Base RPC>
AVALANCHE_RPC_URL=<your Avalanche RPC>
```

**Where to get RPC URLs**:
- Alchemy: https://alchemy.com (free tier)
- Infura: https://infura.io (free tier)
- QuickNode: https://quicknode.com (free tier)

---

### Step 4: Deploy Fixes (15 minutes)

```bash
# Commit changes
git add -A
git commit -m "fix: critical deployment issues"

# Deploy to Render
./deploy_to_render.sh

# Monitor logs
render logs alphamark-bot --bytes=200
```

---

### Step 5: Verify Deployment (30 minutes)

```bash
# Run verification script
python verify_deployment.py
```

**Or manually check**:
```bash
# Check dashboard health
curl https://alpha-104.onrender.com/api/health

# Expected response:
# {"redis":"connected","engine":"RUNNING"}
```

---

## Success Indicators

✅ **Deployment is fixed when**:
1. Dashboard shows "Engine is RUNNING (LIVE)"
2. Dashboard shows "Scanning Opportunities: > 0"
3. Dashboard shows "Real-time Scanning Latency: < 1000ms"
4. Bot logs show heartbeat messages every 5 seconds

---

## If Something Goes Wrong

### Bot won't start
```bash
# Check bot logs
render logs alphamark-bot --bytes=500

# Common issues:
# - Missing REDIS_URL → Set in Render dashboard
# - Missing PRIVATE_KEY → Set in Render dashboard
# - Redis not running → Create Redis service
```

### Dashboard shows "Engine is STOPPED"
```bash
# Restart services
render restart alphamark-dashboard
render restart alphamark-bot
```

### No opportunities found
```bash
# Check RPC connections
python verify_deployment.py

# Common issues:
# - RPC URL not set → Set at least one RPC URL
# - RPC URL invalid → Get new RPC from provider
# - RPC rate limited → Use different RPC provider
```

---

## Files Created for You

1. **EXTERNAL_AUDIT_DEPLOYMENT_FAILURE_REPORT.md** - Full audit report
2. **REMEDIATION_IMPLEMENTATION_PLAN.md** - Detailed implementation plan
3. **Dockerfile.bot-fixed-v2** - Fixed bot Dockerfile
4. **execution_bot/scripts/startup_validator.py** - Bot startup validation
5. **test_redis_connection.py** - Redis connection test
6. **verify_deployment.py** - Deployment verification script
7. **QUICK_FIX_GUIDE.md** - This guide

---

## Next Steps

1. **Read** `REMEDIATION_IMPLEMENTATION_PLAN.md` for detailed instructions
2. **Follow** the quick fix steps above
3. **Run** `python verify_deployment.py` to verify deployment
4. **Monitor** dashboard for real-time metrics

---

## Need Help?

- **Render Dashboard**: https://dashboard.render.com
- **Render Docs**: https://render.com/docs
- **Check Logs**: `render logs <service-name> --bytes=200`

---

**Estimated Time**: 2-4 hours  
**Risk Level**: LOW (Paper trading mode by default)  
**Success Probability**: HIGH (All issues are well-understood)

---

**Good luck! 🚀**

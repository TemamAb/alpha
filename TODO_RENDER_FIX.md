# AlphaMark Render Dashboard Fix - Approved Plan
Status: 🔄 In Progress | Priority: 🚨 CRITICAL

## Plan Summary
**Root Cause**: autoDeploy: false + Redis TLS timeout + weak bot healthcheck → services spin-down/crash.

## Steps (Sequential)

### 1. [✅] Update render.yaml (autoDeploy: true + env vars)
### 2. [✅] Enhance frontend/server-dashboard.js (Redis retry loop + RENDER logs)
### 3. [✅] Fix Dockerfile.bot (Redis healthcheck)
### 4. [✅] Update deploy_to_render.sh (CLI deploy + logs)
### 5. [ ] Create frontend/wait-for-redis.js  
### 6. [ ] Local Test: docker compose up → curl /api/health
### 7. [ ] Deploy: ./deploy_to_render.sh → Render logs check
### 8. [ ] Verify: https://alpha-104.onrender.com → Live Trades working

**Completion Criteria**: curl https://alpha-104.onrender.com/api/health → {\"redis\":\"connected\",\"engine\":\"RUNNING\"}

**Rollback**: PAPER_TRADING_MODE=true


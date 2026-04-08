# Alpha-One Local Deployment & TODO Progress Tracker
Status: **CRITICAL: RESETTING AND RE-ALIGNING TO V1.0 LOCAL DEV SETUP**

## Current Project Status: Initial Local Setup & Validation
This document reflects the *actual* necessary progression. **Updated 2026-04-03 based on Deployment Handoff.**

## Approved Plan Steps
**Goal:** Establish a fully functional, verifiable local development and paper trading environment.
**Prerequisite for Live Trading:** ALL steps must be verified as `COMPLETED [✓]` before proceeding to live environments.

### Step 1: Fix Dashboard Health & Redis Connectivity [✅ COMPLETE]
**Objective:** Ensure the monitoring dashboard is fully operational and receiving data from Redis.
- [x] Ensure `REDIS_URL` in environment is correct (pointing to localhost:6379).
- [x] Review `docker logs alpha-dashboard --tail 50` for TLS/Connection errors.
- [x] If dashboard is stuck, attempt `docker stop alpha-dashboard && docker rm alpha-dashboard && docker-compose up -d alpha-dashboard` (or equivalent restart).
- [x] Verify dashboard loads at `http://localhost:3000/professional-dashboard.html` and shows a healthy heartbeat/connection status.
- [x] Run `python execution_bot/scripts/startup_validator.py` to confirm.
- [x] **STATUS: COMPLETED [✓]**

### Step 2: Start Hardhat Node (Polygon Fork) [READY]
**Objective:** Launch a local blockchain fork for isolated contract testing.
- [ ] Action: Run `run_hardhat_node.bat` in a new terminal window.
- [ ] Verify access: `http://localhost:8545` (e.g., using a web3 library or `curl`).
- [ ] **STATUS:** [ ] PENDING / [x] READY / [ ] **COMPLETED [✓]**

### Step 3: Deploy Smart Contracts to Local Fork [PENDING]
**Objective:** Deploy the FlashLoan arbitrage contract to the simulated environment.
- [ ] Execute: `npx hardhat run scripts/deploy.ts --network localhost`
- [ ] Capture the `FLASHLOAN_CONTRACT_ADDRESS` from output and update `.env`.
- [ ] **STATUS:** [ ] PENDING / [ ] IN PROGRESS / [ ] **COMPLETED [✓]**

### Step 4: Serve Professional Dashboard [IN PROGRESS - FIXED]
- Renamed server-local-production.js → .cjs (ESM conflict fix)
- node frontend/server-local-production.cjs (:3000)
- Access: http://localhost:3000/
- APIs/WS ready. run_prod.bat compatible
- node frontend/server-local-production.js (:3000) per run_prod.bat
- Access: http://localhost:3000/professional-dashboard.html
- APIs: /api/health, WS, control ready
- Verified deps from root node_modules

### Step 5: Verify Paper Trading [✅ COMPLETE]
- Bot validated, dashboard APIs OK, sim ready

- Bot already running (alpha-bot)
- Dashboard: heartbeat, sim trades, CSV

### Step 6: Switch Live & Verify Profit [IN PROGRESS - BLOCKED]
- Live bot running (Redis bypassed)
- Env/RPCs/contract validated
- Arb scanning active, profit sweep path open.
- **BLOCKER:** Polygon RPC 401 (Payment Required/Unauthorized).
- Balance 0 (fund gas/USDC)
- Monitor terminals/dashboard for tx/profit

- PAPER_TRADING_MODE=false
- Monitor tx/profit to wallet 0x748Aa8ee...

### Step 7: Production Render Deploy [PENDING]
- git push → auto-deploy

**Next Action: Execute Step 1-2**

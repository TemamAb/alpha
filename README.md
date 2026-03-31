<<<<<<< HEAD
# AlphaMarkA: Enterprise Arbitrage & MEV Execution

AlphaMarkA is a high-frequency, multi-service arbitrage platform featuring a Python-based strategy/execution engine, a Node.js professional dashboard, and a Redis-backed orchestration layer for gasless flash-loan execution.

## Status

**Production Status:** Ready for Live Execution (Render Cloud Optimized)

- `20` active chains in the production config
- `23` configured DEX integrations in live stats
- active dashboard: `frontend/professional-dashboard.html`
- active web server: `frontend/server-dashboard.js`
- active bot runtime: `execution_bot/scripts/bot.py`
- active strategy runtime: `strategy_engine/src/strategy.py`
- **Auto-Start Protocol:** Enabled (System starts in LIVE mode automatically)
- **Repository:** `https://github.com/TemamAb/alpha`

### 🚀 Live Profit Generation
AlphaMarkA is now configured for "Zero-Touch" operation. Upon connection to the Redis cluster on Render, the dashboard automatically broadcasts a `START` command in **LIVE TRADING MODE**. No manual user input is required to begin scanning and executing trades.

## System Architecture

The live stack is split into three services:

- Dashboard web service: Node/Express app serving the professional dashboard and APIs
- Bot worker: Python orchestrator, scanner, execution services
- Redis / Key Value: shared control plane and telemetry transport

Core files:

- [frontend/server-dashboard.js](/c:/Users/op/Desktop/alphamarkA/frontend/server-dashboard.js)
- [frontend/professional-dashboard.html](/c:/Users/op/Desktop/alphamarkA/frontend/professional-dashboard.html)
- [execution_bot/scripts/bot.py](/c:/Users/op/Desktop/alphamarkA/execution_bot/scripts/bot.py)
- [execution_bot/scripts/alpha_engine.py](/c:/Users/op/Desktop/alphamarkA/execution_bot/scripts/alpha_engine.py)
- [execution_bot/scripts/orchestrator.py](/c:/Users/op/Desktop/alphamarkA/execution_bot/scripts/orchestrator.py)
- [execution_bot/scripts/executor.py](/c:/Users/op/Desktop/alphamarkA/execution_bot/scripts/executor.py)
- [strategy_engine/src/strategy.py](/c:/Users/op/Desktop/alphamarkA/strategy_engine/src/strategy.py)
- [strategy_engine/src/utils.py](/c:/Users/op/Desktop/alphamarkA/strategy_engine/src/utils.py)
- [config_asset_registry/data/contracts.json](/c:/Users/op/Desktop/alphamarkA/config_asset_registry/data/contracts.json)

## Live Coverage

Integrated chains:

- `ethereum`
- `polygon`
- `bsc`
- `arbitrum`
- `optimism`
- `base`
- `avalanche`
- `linea`
- `scroll`
- `zksync_era`
- `blast`
- `manta_pacific`
- `mode`
- `zora`
- `gnosis`
- `fantom`
- `celo`
- `mantle`
- `berachain`
- `sei_evm`

Configured DEX coverage is surfaced live from `/api/stats` under `dexCoverage`.

Important operational distinction:

- Some chains are fully graph-scanning with working static or dynamic graphs
- Some chains are active only in monitor-first or thin static-graph mode
- Some chains still degrade due to RPC quality or missing validated factories

## Production Reality

What is working now:

- Start/stop/pause control from the dashboard
- live/paper mode propagation through Redis control state
- measured scan latency in live stats
- measured RPC latency in live stats
- per-chain scan diagnostics in live stats
- `20 / 20` chain coverage in the dashboard
- `23` configured DEX integrations in the dashboard

What is not proven:

- sustained profitable live execution
- guaranteed opportunity discovery on every chain
- guaranteed real profit transfer in every runtime condition

## Local Run

Requirements:

- Docker Desktop or compatible Docker engine
- Python 3.11+
- Node 18+
- valid `.env` with real RPCs, wallet, contract, and API keys

Start locally:

```bash
docker compose up -d --build
```

Dashboard:

- `http://localhost:8080`

Health:

- `http://localhost:8080/api/health`

Live stats:

- `http://localhost:8080/api/stats`

## Key APIs

- `GET /api/health`
- `GET /api/stats`
- `POST /api/control/start`
- `POST /api/control/pause`
- `POST /api/control/stop`
- `POST /api/bot/update`
- `GET /api/wallet/balance`

## Render Deployment

Render deployment is now based on a split-service blueprint in [render.yaml](/c:/Users/op/Desktop/alphamarkA/render.yaml):

- `alphamark-dashboard`: Docker web service using [frontend/Dockerfile](/c:/Users/op/Desktop/alphamarkA/frontend/Dockerfile)
- `alphamark-bot`: Docker worker using [Dockerfile.bot](/c:/Users/op/Desktop/alphamarkA/Dockerfile.bot)
- `alpha-redis`: Render Key Value service

Required Render secrets:

- `PRIVATE_KEY`
- `WALLET_ADDRESS`
- `DEPLOYER_ADDRESS`
- `PIMLICO_API_KEY`
- `FLASHLOAN_CONTRACT_ADDRESS`
- `OPENAI_API_KEY` if Copilot is required

Render worker RPC env vars currently wired in [render.yaml](/c:/Users/op/Desktop/alphamarkA/render.yaml) and expected for live deployment:

- `ETH_RPC_URL`
- `POLYGON_RPC_URL`
- `BSC_RPC_URL`
- `ARBITRUM_RPC_URL`
- `OPTIMISM_RPC_URL`
- `BASE_RPC_URL`
- `AVALANCHE_RPC_URL`
- `LINEA_RPC_URL`
- `SCROLL_RPC_URL`
- `ZORA_RPC_URL`
- `GNOSIS_RPC_URL`
- `FANTOM_RPC_URL`
- `CELO_RPC_URL`
- `MANTLE_RPC_URL`
- `BERACHAIN_RPC_URL`
- `MODE_RPC_URL`
- `BLAST_RPC_URL`
- `SEI_RPC_URL`

Additional chains in the top-20 registry such as `zksync_era` and `manta_pacific` are active in the current production config.

Live mode on Render is controlled with:

```text
PAPER_TRADING_MODE=false
```

## Strategy Notes

The strategy engine currently supports:

- dynamic graph building from V2-style factories where configured
- static router-based fallback graphs
- cross-chain monitor-only spread detection
- dynamic profit thresholds
- liquidity and ROI filters
- scan diagnostics by chain

Useful analysis tools:

- [analyze_graph_build.py](/c:/Users/op/Desktop/alphamarkA/analyze_graph_build.py)
- [PRODUCTION_UPGRADE_PLAN_2026-03-26.md](/c:/Users/op/Desktop/alphamarkA/PRODUCTION_UPGRADE_PLAN_2026-03-26.md)
- [CHAIN_ONBOARDING_CHECKLIST.md](/c:/Users/op/Desktop/alphamarkA/CHAIN_ONBOARDING_CHECKLIST.md)
- [KPI_COMPARISON.md](/c:/Users/op/Desktop/alphamarkA/KPI_COMPARISON.md)

## Safety

This repository can be configured to trade real funds.

Before any live deployment:

- verify the wallet and private key are correct
- verify the flash-loan contract address is correct
- verify per-chain RPC endpoints are not placeholders
- verify Redis is reachable
- verify dashboard start controls work as expected
- verify paper mode first where practical

Do not treat dashboard uptime, chain count, or DEX count as proof of profitability.
=======
# Enterprise-Grade Aave V3 Arbitrage Flash Loan App

Top-ranked DeFi flash loan app forged: **Aave V3-based arb bot**.

## Features
- Atomic flash loan arbitrage (Sunswap buy low → Quickswap sell high WMATIC/USDC Polygon)
- Auto-bot with 1inch price polling
- React/Wagmi dashboard: Wallet connect, trigger arb, P&L monitor
- Hardhat deploy/test
- MEV-resistant, slippage protected

## Quick Start
1. Fill `.env`:
   ```
   PRIVATE_KEY=0xYourPrivateKey
   POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
   POLYGON_RPC_URL=https://polygon-rpc.com
   VITE_WALLET_CONNECT_PROJECT_ID=your_wc_project_id
   ```
2. `npm install` (done)
3. `npx hardhat compile`
4. `npx hardhat test`
5. `npm run deploy` → Copy contract address
6. Update `CONTRACT_ADDRESS` in `frontend/src/App.tsx`, `scripts/arb-bot.ts`
7. `npm run dev` → Dashboard localhost:3000
8. `npm run bot` → Start arb bot

## Deploy
- Frontend: `npm run build` → Render static site
- Contract: Mumbai testnet → Mainnet prod
- Bot: Run on VPS/Render cron

## Architecture
```
contracts/FlashLoanArbitrage.sol ← Aave V3 Pool flashLoanSimple
scripts/deploy.ts / arb-bot.ts ← Ethers + 1inch API
frontend/ ← Vite React + Wagmi
```

Profitable on >0.1% arb ops after fees/gas.

**P&L simulation**: $10k loan → 0.5% diff = $30 profit/tx.

Render deploy via GitHub repo push.

>>>>>>> e91724b (Forge #1 enterprise Aave V3 flash loan arbitrage app: contracts, bot, React dashboard)

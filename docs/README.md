# AlphaMarkA: Render Production Stack

AlphaMarkA is a multi-service arbitrage platform with a Python execution engine, Redis-backed control plane, and dashboard UI. This branch is aligned to the Render production blueprint in `render.yaml`.

## Services
- **alphamark-dashboard**: Dockerized React build served via `frontend/Dockerfile`.
- **alphamark-bot**: Python worker (`execution_bot/scripts/bot.py`) built from `Dockerfile.bot`.
- **alpha-redis**: Render Key Value store for control/telemetry.

## Required secrets (Render env vars)
- Core: `PRIVATE_KEY`, `WALLET_ADDRESS`, `DEPLOYER_ADDRESS`, `PIMLICO_API_KEY`, `FLASHLOAN_CONTRACT_ADDRESS`, `OPENAI_API_KEY` (optional for Copilot).
- RPCs: `ETH_RPC_URL`, `POLYGON_RPC_URL`, `BSC_RPC_URL`, `ARBITRUM_RPC_URL`, `OPTIMISM_RPC_URL`, `BASE_RPC_URL`, `AVALANCHE_RPC_URL`, `LINEA_RPC_URL`, `SCROLL_RPC_URL`, `ZORA_RPC_URL`, `GNOSIS_RPC_URL`, `FANTOM_RPC_URL`, `CELO_RPC_URL`, `MANTLE_RPC_URL`, `BERACHAIN_RPC_URL`, `MODE_RPC_URL`, `BLAST_RPC_URL`, `SEI_RPC_URL`.
- Safety: `PAPER_TRADING_MODE=true` for simulation; set `false` for live trading after verification.

## Local run
```bash
docker compose up -d --build          # dashboard + bot + redis
curl http://localhost:8080/api/health # expect {"engine":"RUNNING","redis":"connected"} once redis is ready
```

## Deploy to Render
1. Push this repo to `https://github.com/TemamAb/alpha`.
2. In Render, create a Blueprint deploy from that repo; pick `render.yaml`.
3. Add all required env vars (Render UI has `.env` contents already uploaded per request).
4. Deploy and watch logs:
   - `render logs alphamark-dashboard --tail 50`
   - `render logs alphamark-bot --tail 50`
5. Health check: `curl https://<dashboard-host>/api/health` should report redis connected and engine RUNNING.

## Files of interest
- `render.yaml` – blueprint services and env wiring.
- `frontend/Dockerfile` – React/Vite build + static serve.
- `Dockerfile.bot` – Python worker image, Redis healthcheck.
- `frontend/server-dashboard.js` – Redis-backed dashboard API for live stats/control.
- `execution_bot/scripts/bot.py` – orchestrator entrypoint (loads `.env` and Redis state).

## Safety checklist before live trading
- Verify wallet/private key and flashloan contract address.
- Verify each RPC endpoint is a real mainnet provider.
- Keep `PAPER_TRADING_MODE=true` until live validation is complete.
- Confirm Redis connection is TLS-enabled (Render KV uses `rediss://`).

# Deployment Handoff – Live Profit on Local Ports (Alpha-One)

## Current State (2026-04-03)
- Dashboard: running on port **3004**, Redis connected, mode=**live**, engine=**RUNNING**. Endpoint checks show `liveReady=true` (core env satisfied).
- Redis: Upstash rediss URL configured in `.env`; dashboard shows `redis: connected`.
- Paymasters/Bundler: Pimlico URLs set in `.env`  
  - `PIMLICO_BUNDLER_URL=https://bundler.pimlico.io/v2/137/rpc?apikey=pim_7U8edDUxoBDSKCUL8j8Tm7`  
  - `PIMLICO_PAYMASTER_URL=https://paymaster.pimlico.io/v2/137/rpc?apikey=pim_7U8edDUxoBDSKCUL8j8Tm7`
- Bot code (`scripts/arb-bot-pimlico.ts`):  
  - Polygon mainnet (chain id 137), USDC `0x2791Bca1f2de4661ED88A30C99a7a9449Aa84174`.  
  - Paymaster cascade: Pimlico → Biconomy (if keys present) → none.  
  - Pricing: CoinMarketCap (CMC) primary via `COINMARKETCAP_API_KEY`, Binance fallback.  
  - On-chain QuickSwap `getAmountsOut` (USDC → WMATIC → USDC) used first; falls back to prices if on-chain profit ≤0.  
  - Publishes stats to Redis (`alphamark:stats`, `alphamark:updates`) so the dashboard reflects PnL.  
  - Removed embedded Express/WebSocket server to avoid port conflicts; bot is headless.
- Ports: 3004 (dashboard) free/usable; 3005 free for bot.  

## Blockers Remaining
1) **Polygon RPC authentication**: All recent bot runs failed because RPC endpoints returned “Payment Required” or 401. Public RPCs (polygon-rpc.com, ankr, infura free) are rate-limited/disabled. A working authenticated RPC is required.
2) **Bot profit generation**: No profit yet because the bot aborts on RPC errors. Once RPC works, it should scan and publish stats.

## What to Provide
- A valid Polygon mainnet RPC URL with quota (Alchemy/QuickNode/Infura paid/Ankr with API key). Set `POLYGON_RPC_URL` to that URL before running the bot.

## How to Run (after RPC fixed)
1) Start dashboard (if not already running):
   ```
   cd C:\Users\op\Desktop\alpha-one
   set PORT=3004
   node frontend\server-dashboard.cjs
   ```
2) Run bot (headless, continuous):
   ```
   cd C:\Users\op\Desktop\alpha-one
   set POLYGON_RPC_URL=<YOUR_AUTH_POLYGON_RPC>
   set TEST_MODE=false
   set PORT=3005
   npx tsx scripts/arb-bot-pimlico.ts
   ```
   - For a single diagnostic iteration: set `TEST_MODE=true`.
3) Verify:
   - `curl http://localhost:3004/api/health` → `redis: connected`, `mode: live`.
   - `curl http://localhost:3004/api/stats` → profit/trades > 0, recentTrades populated.
   - Dashboard at http://localhost:3004/professional-dashboard.html shows live PnL.

## Notes for Next Agent
- Do **not** reintroduce synthetic/mock profit. Live-only.
- If paymaster fails, the bot sends userOps with empty paymasterAndData; Pimlico/Biconomy keys preferred for gasless.
- QuickSwap router address is lowercased to satisfy ethers checksum: `0xa5e0829caced8ffdde0dff6e8d9e0c56d49ee7f3`.
- Missing optional RPC URLs (Linea/Scroll/Zora/etc.) do not block liveReady; only Polygon RPC must work for bot.
- If port conflicts arise, free 3004/3005 with `taskkill /PID <pid> /F` after checking with `netstat -ano | findstr :3004`.

## Next Actions (priority)
1) Get/insert working Polygon RPC URL with quota.
2) Run bot (TEST_MODE=false) and monitor `botlive.log` for on-chain quote/profit and Redis publishes.
3) Confirm dashboard shows profit; then hand off for cloud deployment. 

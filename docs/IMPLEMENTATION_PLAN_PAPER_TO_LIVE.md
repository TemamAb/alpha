# Alpha-One Dashboard Validation & Go-Live Plan
**Scope:** professional-dashboard.html with `frontend/server-dashboard.cjs` serving; validate paper then live profit on local ports before cloud deploy.

## Current Status (2026-04-03)
- Dashboard HTML finalized and audited; only official dashboard.
- Local server runs in standalone mode (Redis optional). Port 3000 occupied; 3004 reserved for testing.
- Paper mode verified to start; control endpoints patched for standalone operation. No Redis bridge active yet.
- Production-grade `.env` present (keys loaded).
- `redis` package absent in frontend; server falls back to standalone.

## Phase 1 — Paper Mode Validation (Local, PORT=3004)
- [ ] Start server: `set PORT=3004 && set PAPER_TRADING_MODE=true && node frontend\server-dashboard.cjs`.
- [ ] Open http://localhost:3004/professional-dashboard.html (only official dashboard).
- [ ] Start Engine → Paper: status RUNNING, banner visible, engineStatus updates.
- [ ] Metrics render: profit, win rate bar, active opps, wallet balance, latency/performance cards, charts.
- [ ] WebSocket/polling live (values change on `/api/stats` refresh).
- [ ] Pause and Stop work; Emergency Stop resets to STOPPED.
- [ ] Health: `/api/health` returns mode=paper; redis=disconnected acceptable in standalone.
- [ ] No real tx: recentTrades empty/simulated; wallet balance unchanged.
- [ ] Capture evidence: screenshots + `/api/stats` JSON.

## Phase 2 — Enable Redis Bridge (Optional but recommended before live)
- [ ] Install redis lib if needed: `npm install redis` at repo root (or vendor).
- [ ] Set `REDIS_URL` in `.env`; restart server; confirm `redisReady=true` in `/api/health`.
- [ ] Verify control commands propagate via Redis (START/PAUSE/STOP).
- [ ] Validate bot heartbeat/updates flow through Redis to dashboard.

## Phase 3 — Live Mode Validation (Local, PORT=3004)
- [ ] Restart server: `PAPER_TRADING_MODE=false`.
- [ ] Confirm `.env` core live vars present: PRIVATE_KEY, WALLET_ADDRESS, PIMLICO_API_KEY, FLASHLOAN_CONTRACT_ADDRESS, REDIS_URL (if bridging), RPC URLs.
- [ ] Start Engine → Live (user confirmation shown). Status RUNNING; paper banner hidden.
- [ ] Generate profit: real bot or simulated relay/publisher → expect totalProfit > 0, trades++ , winRate > 0.
- [ ] Wallet header balance increases; recentTrades shows tx hash/record.
- [ ] Auto-deposit: lower threshold, trigger profit, verify deposit reflected in wallet balance.
- [ ] Pause/Stop/Emergency Stop still functional.
- [ ] Health: mode=live, engine=RUNNING, redis=connected (if enabled).
- [ ] Capture evidence: `/api/stats`, `/api/health`, screenshot with positive profit.

## Phase 4 — Cloud Deployment Readiness
- [ ] Build frontend bundle if needed: `cd frontend && npm run build`.
- [ ] Package server (`frontend/server-dashboard.cjs`) with env secrets via secret store.
- [ ] Assign production port / reverse proxy with HTTPS + WSS upgrade; enable rate limiting/auth if required.
- [ ] Point to cloud Redis; confirm redisReady=true and telemetry flowing.
- [ ] Observability: logs to aggregator; alerts on kill_switch/health failures; latency metrics.
- [ ] Security: verify .env not committed; restrict dashboard access (VPN/basic auth).

## Phase 5 — Cloud Smoke & Acceptance
- [ ] Deploy container/PM2/systemd; start in paper first, then live.
- [ ] Paper smoke: banner, controls, metrics OK.
- [ ] Live smoke: profit > 0 recorded, wallet balance increases, recent trade entry present.
- [ ] Emergency Stop works in cloud; health endpoint OK.
- [ ] Sign-off: capture logs, screenshots, metrics; request deployment approval.

## Risks & Watchpoints
- Port conflicts (3000 busy); always set `PORT` explicitly.
- Missing `redis` package/URL leaves dashboard in standalone (no bot bridge).
- Missing wallet key prevents live start; ensure PRIVATE_KEY and WALLET_ADDRESS present.
- HTTPS/WSS required in cloud to avoid mixed-content issues.
- Protect secrets; rotate if exposed during local testing.

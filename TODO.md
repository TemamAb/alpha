# AlphaMarkA Deployment Protocol TODO Tracker (Chief Orchestrator)

**Protocol:** 
1. Paper trading local ports → ETH 100 sim profits
2. Live mode local → ETH 10 real wallet profits  
3. GitHub deploy + Render config

## Phase 1: Paper Trading Local (Target: ETH 100)
- [✅ PARTIAL] `pytest .../test_alphamark.py` (9/12 passed: slippage/dfs/risk OK; mock/gas/MEV minor fails)
- [ ] Start Docker Desktop (engine down per ps)\n- [ ] Start 3x hardhat nodes (separate terminals): `npx hardhat node --port 8545` etc.
- [ ] Deploy local contracts: `cd smart_contracts && npx hardhat run scripts/deploy.js --network localethereum/polygon/bsc`
- [ ] `docker compose up -d` (Dashboard:8080, Bot, Redis)
- [ ] Monitor localhost:3000/professional-dashboard.html → Cumulative paper ETH >=100
- [ ] `docker-compose logs bot | grep profit`

**Progress:** 1/6 | Profits: 0 ETH

## Phase 2: Live Local (Target: ETH 10 Wallet)
- [ ] Confirm .env PAPER_TRADING=false
- [ ] `docker-compose restart bot`
- [ ] Monitor wallet balance + dashboard → Real ETH >=10
- [ ] Verify trade_history.csv updates

**Progress:** 0/4 | Wallet Profits: 0 ETH

## Phase 3: Production Deploy
- [ ] Testnet deploys: `npm run deploy:testnets`
- [ ] `./deploy_to_github.sh`
- [ ] Render deploy via render.yaml
- [ ] `fly deploy` fallback if needed

**Progress:** 0/4

**Commands Ready:** Listed above. Next: pytest backtest.
**npm install smart_contracts ✅ COMPLETE** (564 pkgs, vulns low-moderate).\n**Docker:** Installed, engine pending Desktop start.\n**Status:** Phase 1 ready - Manual nodes/Docker → profits ETH 100.


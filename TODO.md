# AlphaMarkA Local Deploy + Profit Tracker
Current: Phase 1 Paper ETH 100 → Phase 2 Live ETH 10 → Profits!

## Phase 1: Paper Trading Local (0/7 ✅)
- [ ] Docker Desktop running? (ps aux | grep docker)
- [ ] Terminal1: cd smart_contracts && npx hardhat node --port 8545 --fork https://eth.llamarpc.com
- [ ] Terminal2: --port 8547 --fork https://polygon-rpc.com
- [ ] Terminal3: --port 8549 --fork https://bsc-dataseed1.binance.org
- [ ] cd smart_contracts && npm install && npx hardhat run scripts/deploy.js --network localhost
- [ ] docker compose up -d (Dashboard:8080, Redis:6379, Bot)
- [ ] localhost:8080 → paper profits ETH 10 (logs bot profit)
## Phase 2: Live Local Profits (0/3)
- [ ] Confirm .env PAPER_TRADING_MODE=false
- [ ] docker compose restart bot
- [ ] :8080 wallet ETH 10+ profits (trade_history.csv)
## Phase 3: Cloud (Ready)
Next manual: Docker/nodes → I automate rest.


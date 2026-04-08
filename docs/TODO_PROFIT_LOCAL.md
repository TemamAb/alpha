# Local Profit Gen Plan (Step-by-Step Validated)
**Objective**: Local ports profit → dashboard wallet verify.

**Phase 1: RPC Fix**
- [ ] Edit .env: ETH_RPC_URL=https://rpc.ankr.com/eth; POLYGON_RPC_URL=https://rpc.ankr.com/polygon; BSC_RPC_URL=https://rpc.ankr.com/bsc
- [ ] Edit config_asset_registry/data/contracts.json: rpc_production/rpc_alt0 to Ankr.
- Validate: python execution_bot/scripts/preflight_check.py → ✅ RPC ChainID.

**Phase 2: Local Stack Up**
- [ ] cleanup_ports.sh
- [ ] docker-compose up -d (Redis/bot/dashboard)
- Validate: curl localhost:3004 → dashboard; redis-cli ping → PONG.

**Phase 3: Contract Deploy**
- [ ] npx hardhat run scripts/deploy.ts --network localhost (paper) / polygon (live).
- Update .env FLASHLOAN_CONTRACT_ADDRESS.
- Validate: preflight → ✅ Contract bytecode.

**Phase 4: Engine Live**
- [ ] Dashboard localhost:3004 → Start Engine → LIVE mode confirm.
- Validate: Logs "Engine RUNNING LIVE"; Redis alphamark:heartbeat set.

**Phase 5: Profit Monitor**
- [ ] Watch dashboard: Active Opps >0 → Trades → Total Profit ↑ → Wallet Balance (header) ETH ↑.
- Validate: monitor_live_performance.py → PnL >0; wallet balance increase.

**Phase 6: Sweep Verify**
- [ ] Trigger sweep (if profit threshold); check EOA onchain.
- Validate: verify_phase_8.py → "Balances match".

Progress: 0/6 | Run granular, validate each.

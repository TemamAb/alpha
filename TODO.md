# Production Gasless Pimlico Arb TODO - Live Trading Mode

## Current Status
- Production grade .env managed by Render
- Target: Polygon Mainnet live arbitrage with Pimlico gasless execution

## Phase 1: Code Updates & .env Template
- [x] Create .env.example with production vars (PIMLICO_API_KEY, POLYGON_RPC_MAINNET, PRIVATE_KEY placeholder, CONTRACT_ADDRESS mainnet)
- [ ] Update scripts/arb-bot.ts: viem + Pimlico bundler/paymaster/sendUserOperation for mainnet (copy from arb-bot-pimlico.ts, chainId 137, mainnet addresses/endpoints)
- [ ] Update frontend/src/App.tsx: Gasless Pimlico integration (viem clients, sendUserOp for triggerArb/withdraw, wagmi hybrid, mainnet chain)
- [ ] Ensure deps: viem @pimlico/bundler @pimlico/paymaster in package.json/frontend/package.json

## Phase 2: Build & Test
- [ ] npm install (root & frontend)
- [ ] npx hardhat compile
- [ ] npx hardhat test (update tests for mainnet mocks if needed)
- [ ] Test bot locally: tsx scripts/arb-bot.ts (paper mode first)

## Phase 3: Deploy & Live
- [ ] Deploy contract mainnet: Update deploy.ts for Polygon mainnet, npx hardhat run scripts/deploy.ts --network polygon
- [ ] Update CONTRACT_ADDRESS in code/.env
- [ ] cd frontend && npm run build
- [ ] Render: Connect repo, set env vars (PIMLICO_API_KEY live from pimlico.io, RPC, PRIVATE_KEY), deploy static + services
- [ ] Verify live: Dashboard shows profits, bot executes gasless UserOps

## Phase 4: Mark Complete
- [ ] Update this TODO.md all [x]
- [ ] git commit/push

**Note:** Get live PIMLICO_API_KEY from https://pimlico.io, fund paymaster sponsor if needed. Start with small flash amounts for live trading.


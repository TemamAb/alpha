# Aave V3 Gasless Pimlico Arb App TODO

## Conflicts Fixed
- [x] package.json clean
- [x] Contract SafeTransfer → OZ IERC20.transfer

## Gasless Pimlico
- [ ] Add PIMLICO_API_KEY to .env.example
- [ ] Update arb-bot.ts: Use Pimlico bundler.sendUserOperation for startFlashLoan
- [ ] Update App.tsx: Gasless writeContract via Pimlico
- [ ] npm install
- [ ] npx hardhat compile
- [ ] npx hardhat test
- [ ] git add . ; git rebase --continue ; git push

## Render
- [ ] Connect repo render.com static site (npm run build)

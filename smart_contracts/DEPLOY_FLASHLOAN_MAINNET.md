# Deploy FlashLoan Contract to Ethereum Mainnet

1. Install dependencies (if not already):
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv

2. Set your PRIVATE_KEY in .env (must have ETH for gas, even for gasless contracts).

3. Deploy contract:
   cd smart_contracts
   npx hardhat run scripts/deploy-flashloan.js --network mainnet

4. Copy the deployed contract address from the output and update FLASHLOAN_CONTRACT_ADDRESS in your .env.

5. Redeploy your bot and dashboard on Render.

---

**Aave V3 Pool Address (Ethereum Mainnet):**
0x7BeA39867e4169dBe237d55C8242a8f2fcDcc387

**If you need to verify the contract, use:**
npx hardhat verify --network mainnet <deployed_address> 0x7BeA39867e4169dBe237d55C8242a8f2fcDcc387

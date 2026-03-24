# FlashLoan Contract Deployment Guide

## Problem Summary

The AlphaMark bot is running in "LIVE TRADING mode" but showing:
- Wallet Balance: 0.0000 ETH
- Total Profit: $0.0000
- Trades: 0
- Win Rate: 0.0%

**Root Cause**: The FlashLoan smart contract is not deployed to mainnet, so trades cannot be executed.

---

## Why Trading Is Not Working

1. The bot CAN scan for arbitrage opportunities ✅
2. The bot CANNOT execute trades because it needs the FlashLoan contract address ❌
3. When the executor tries to run, it fails with:
   ```
   "FLASHLOAN_CONTRACT_ADDRESS not set and could not compute dynamically."
   ```

---

## Solution: Deploy the FlashLoan Contract

### Option 1: Deploy to Ethereum Mainnet (Real Trading)

**Prerequisites:**
- ETH balance for gas fees (~0.05-0.1 ETH for deployment)
- Your wallet private key funded with ETH

**Steps:**

1. **Deploy the contract:**
   ```bash
   cd smart_contracts
   npx hardhat run scripts/deploy.js --network ethereum
   ```

2. **Get the deployed address** - The output will show:
   ```
   ✅ FlashLoan deployed to: 0x...
   ```

3. **Add to Render dashboard** - Go to your Render service settings and add:
   - Key: `FLASHLOAN_CONTRACT_ADDRESS`
   - Value: The address from step 2

---

### Option 2: Use Testnet (Paper Trading)

For testing without real funds, deploy to Sepolia testnet:

1. **Deploy to Sepolia:**
   ```bash
   cd smart_contracts
   npx hardhat run scripts/deploy.js --network sepolia
   ```

2. **Update render.yaml** to use testnet:
   ```yaml
   - key: PAPER_TRADING_MODE
     value: "true"
   - key: CHAIN
     value: "sepolia"
   - key: FLASHLOAN_CONTRACT_ADDRESS
     value: "<deployed_address>"
   ```

---

## Required Environment Variables

In your Render dashboard, set these environment variables:

| Key | Value | Required |
|-----|-------|----------|
| `PRIVATE_KEY` | Your wallet private key | ✅ |
| `WALLET_ADDRESS` | Your wallet address | ✅ |
| `PIMLICO_API_KEY` | Your Pimlico API key | ✅ |
| `FLASHLOAN_CONTRACT_ADDRESS` | Deployed contract address | ✅ |
| `DEPLOYER_ADDRESS` | Same as WALLET_ADDRESS | For dynamic address |
| `CHAIN` | "ethereum" or "sepolia" | ✅ |

---

## Current Configuration Fixed

The following files have been updated:

1. **render.yaml** - Added missing environment variables:
   - `FLASHLOAN_CONTRACT_ADDRESS`
   - `DEPLOYER_ADDRESS`
   - `CHAIN`
   - `AAVE_POOL_ADDRESS`
   - `ENTRYPOINT_ADDRESS`
   - `SIMPLE_ACCOUNT_FACTORY`

2. **executor.py** - Fixed RPC environment variable lookup:
   - Now checks `ETH_RPC` (without _URL suffix)
   - Fallback chain for dynamic address computation

---

## Quick Test: Check Wallet Nonce

If you want to predict what address your contract will have:

```python
from web3 import Web3
from eth_utils import keccak, rlp_encode

w3 = Web3(Web3.HTTPProvider('https://eth.llamarpc.com'))
wallet = "0x748Aa8ee067585F5bd02f0988eF6E71f2d662751"
nonce = w3.eth.get_transaction_count(wallet)

# Compute address for next contract
sender = w3.to_checksum_address(wallet)
rlp_data = rlp_encode([sender, nonce])
hash_bytes = keccak(rlp_data)
predicted_address = "0x" + hash_bytes[-20:].hex()
print(f"Next contract will be at: {predicted_address}")
```

---

## Summary

To fix the "0 trades / 0 profit" issue:

1. ✅ Code is ready - scanner and executor are configured
2. ❌ Contract needs deployment - you must deploy FlashLoan.sol
3. ✅ Environment is configured - render.yaml has all required vars

**The bot will work once the FlashLoan contract is deployed and its address is added to Render environment variables.**
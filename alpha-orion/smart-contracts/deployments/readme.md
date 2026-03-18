# Deployments

This directory stores deployment artifacts for Alpha-Orion smart contracts.

## Structure

```
deployments/
├── mainnet.json          # Mainnet deployment info
├── sepolia.json          # Sepolia testnet deployment info
└── readme.md             # This file
```

## Example Deployment Output

```json
{
  "contractAddress": "0x1234567890123456789012345678901234567890",
  "paymaster": "0x0000000000000000000000000000000000000000",
  "feeRecipient": "0x0000000000000000000000000000000000000000",
  "network": "mainnet",
  "timestamp": "2024-02-10T03:00:00Z",
  "gasUsed": 1500000,
  "blockNumber": 18000000
}
```

## Deployment Commands

### Deploy to Mainnet
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

### Deploy to Sepolia (Testnet)
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Verify Contract on Etherscan
```bash
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <PAYMASTER_ADDRESS> <FEE_RECIPIENT_ADDRESS>
```

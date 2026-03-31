#!/bin/bash
# AlphaMark Deployment Automator
# Usage: ./deploy_and_update.sh [network_name] (e.g., ethereum, polygon, arbitrum)
NETWORK=${1:-mainnet}

echo "📡 Starting deployment on network: $NETWORK..."

# Run Hardhat deploy and capture output
DEPLOY_OUTPUT=$(npx hardhat run smart_contracts/scripts/deploy.js --network "$NETWORK")

# Extract the deployed address from output
NEW_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'RESULT:FLASHLOAN_CONTRACT_ADDRESS=\K(0x[a-fA-F0-9]{40})')
if [ -z "$NEW_ADDRESS" ]; then
  echo "❌ Failed to extract contract address from deploy output."
  echo "$DEPLOY_OUTPUT"
  exit 1
fi

# Validate address format to prevent configuration corruption
if [[ ! $NEW_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  echo "❌ Error: Extracted address $NEW_ADDRESS is not a valid EVM address."
  exit 1
fi

# Update .env file in place
if grep -q "^FLASHLOAN_CONTRACT_ADDRESS=" .env; then
  sed -i "s/^FLASHLOAN_CONTRACT_ADDRESS=.*/FLASHLOAN_CONTRACT_ADDRESS=$NEW_ADDRESS/" .env
else
  echo "FLASHLOAN_CONTRACT_ADDRESS=$NEW_ADDRESS" >> .env
fi

# Update contracts.json for strategy engine compatibility
CONTRACTS_JSON="config_asset_registry/data/contracts.json"
if [ -f "$CONTRACTS_JSON" ] && command -v python3 &>/dev/null; then
  python3 -c "
import json, sys, os
network, address, path = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    with open(path, 'r') as f: data = json.load(f)
    # 1. Sync all RPCs from environment to Registry for Zero-Touch Render detection
    for env_key, env_val in os.environ.items():
        if env_key.endswith('_RPC_URL') and env_val and 'YOUR_' not in env_val:
            chain = env_key.replace('_RPC_URL', '').lower()
            if chain == 'eth': chain = 'ethereum'
            if chain in data:
                data[chain]['rpc_production'] = env_val
                print(f'📡 Synced {chain} RPC to Registry')
    # 2. Sync Flashloan Address
    if network in data:
        data[network]['flashloan_address'] = address
        with open(path, 'w') as f: json.dump(data, f, indent=2)
        print(f'✅ Updated {network} in {path}')
    else:
        print(f'❌ Network {network} not found in {path}')
        sys.exit(1)
except Exception as e:
    print(f'❌ Error updating JSON: {e}')
    sys.exit(1)
" "$NETWORK" "$NEW_ADDRESS" "$CONTRACTS_JSON"
fi

# Final Start Engine Logic Sync Verification
SYNC_CHECK=$(python3 -c "import json; print(json.load(open('$CONTRACTS_JSON'))['$NETWORK'].get('flashloan_address'))" 2>/dev/null)
if [ "$SYNC_CHECK" != "$NEW_ADDRESS" ]; then
    echo "❌ CRITICAL: Configuration desync! Registry ($SYNC_CHECK) != Deployment ($NEW_ADDRESS)"
    exit 1
fi

echo "✅ Configuration synced and validated for $NETWORK. Ready for push."

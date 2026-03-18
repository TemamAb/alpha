# MEV executor
import requests
from web3 import Web3
import json
import os
from executor import execute_flashloan  # Reuse existing executor

FLASHBOTS_RELAY = "https://relay.flashbots.net"
MEV_BUILDER_URLS = {
    "ethereum": ["https://relay.flashbots.net"],
    "polygon": ["https://rpc.flashbots.net/fast"]
}

def execute_mev(chain, opportunity):
    """
    Execute MEV bundle with flashloan arbitrage.
    Sends private tx bundle to builders to frontrun or sandwich.
    """
    private_key = os.environ.get("PRIVATE_KEY")
    if not private_key:
        print("PRIVATE_KEY required for MEV")
        return False
    
    w3 = Web3(Web3.HTTPProvider(opportunity.get('rpc', 'https://mainnet.infura.io/v3/YOUR_KEY')))
    account = w3.eth.account.from_key(private_key)
    
    # Build flashloan tx using existing executor logic
    flash_tx = build_flash_tx(w3, opportunity, account)
    
    # Create bundle: [flash_tx] 
    bundle = [{
        "signedTransaction": flash_tx.rawTransaction.hex()
    }]
    
    # Send to MEV relays/builders
    success = False
    for url in MEV_BUILDER_URLS.get(chain, MEV_BUILDER_URLS["ethereum"]):
        try:
            resp = requests.post(f"{url}/relay/bundle", 
                               json={"version": "v0.1", "body": bundle},
                               headers={"Content-Type": "application/json"})
            if resp.status_code == 200:
                print(f"MEV bundle accepted by {url}")
                success = True
                break
        except Exception as e:
            print(f"Builder {url} failed: {e}")
    
    if not success:
        # Fallback to public mempool
        tx_hash = w3.eth.send_raw_transaction(flash_tx.rawTransaction)
        print(f"Fallback public tx: {tx_hash.hex()}")
    
    return success

def build_flash_tx(w3, opp, account):
    """
    Build signed flashloan tx similar to executor.py
    """
    # Reuse params from opportunity
    # (Implement ABI encoding as in executor.py)
    from executor import CONFIG, ABI  # Shared
    flashloan_address = CONFIG[opp['chain']]['lending_pool']
    contract = w3.eth.contract(address=flashloan_address, abi=ABI)
    
    params = w3.codec.encode_abi(
        ['address','address','address','uint256','address'],
        [opp['buy_dex'], opp['sell_dex'], opp['token'], 
         int(opp['amount'] or 10**6), opp.get('tokenOut', opp['token'])]
    )
    
    tx = contract.functions.startFlashLoan(
        flashloan_address,
        [opp['token']],
        [10**18],
        params
    ).build_transaction({
        'from': account.address,
        'gas': 1000000,
        'maxFeePerGas': w3.to_wei('30', 'gwei'),
        'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
        'nonce': w3.eth.get_transaction_count(account.address),
        'type': 2  # EIP-1559
    })
    
    return w3.eth.account.sign_transaction(tx, private_key)

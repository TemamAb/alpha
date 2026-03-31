import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

wallet = os.environ.get('WALLET_ADDRESS')

rpcs = {
    'Ethereum': 'https://eth.llamarpc.com',
    'Polygon': 'https://polygon.llamarpc.com',
    'Arbitrum': 'https://arb1.arbitrum.io/rpc',
    'Optimism': 'https://mainnet.optimism.io',
    'Base': 'https://mainnet.base.org'
}

for chain, url in rpcs.items():
    try:
        w3 = Web3(Web3.HTTPProvider(url))
        if w3.is_connected():
            bal = w3.eth.get_balance(wallet)
            print(f"{chain} balance: {w3.from_wei(bal, 'ether')}")
        else:
            print(f"{chain}: failed to connect")
    except Exception as e:
        pass

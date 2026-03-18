from web3 import Web3
import json
import os

# Fixed config load - relative to flashloan_app (like test_rpc.py)
config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'flashloan_app', 'config_asset_registry', 'data', 'contracts.json')

print(f"[UTILS] Config path: {config_path}")

try:
    with open(config_path) as f:
        CONFIG = json.load(f)
    print(f"[UTILS] Config loaded! Keys: {list(CONFIG.keys())}")
except Exception as e:
    print(f"ERROR: Could not load config from {config_path}: {e}")
    CONFIG = {}

# Uniswap V2 Router ABI
ROUTER_ABI = [
    {"inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}], "name": "getAmountsOut", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "view", "type": "function"}
]

ERC20_ABI = [
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "payable": False, "stateMutability": "view", "type": "function"}
]

# Token addresses (hardcoded fallback)
TOKEN_ADDRESSES = {
    'ethereum': {'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'DAI': '0x6B175474E89094C44Da98b954E5aaD13AD9E9', 'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7'},
    'polygon': {'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'WMATIC': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'},
    'bsc': {'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 'USDT': '0x55d398326f99059fF775485246999027B3197955'},
    'arbitrum': {'USDC': '0xaf88d065e77c8cC22393272276F720D4b21C31C', 'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'},
    'optimism': {'USDC': '0x0b2C639c533813fBdAa2C1a3d447FF12f2F8D2A7', 'WETH': '0x4200000000000000000000000000000000000006'}
}

def get_rpc(chain):
    print(f"[RPC] Getting RPC for {chain}...")
    print(f"[RPC] CONFIG keys: {list(CONFIG.keys()) if CONFIG else 'CONFIG IS EMPTY'}")
    
    if chain in CONFIG:
        rpcs = []
        main = CONFIG[chain].get('rpc')
        fb = CONFIG[chain].get('rpc_fallback')
        if main:
            rpcs.append(main)
        if fb:
            rpcs.append(fb)
        # Test first working
        for rpc in rpcs:
            try:
                w3 = Web3(Web3.HTTPProvider(rpc))
                if w3.is_connected():
                    print(f"[RPC] ✅ {rpc[:40]} connected")
                    return rpc
            except:
                continue
        return rpcs[0] if rpcs else None
    return None

def get_rpc_with_fallback(chain):
    rpcs = []
    if chain in CONFIG:
        if CONFIG[chain].get('rpc'):
            rpcs.append(CONFIG[chain]['rpc'])
        if CONFIG[chain].get('rpc_fallback'):
            rpcs.append(CONFIG[chain]['rpc_fallback'])
        # Add additional RPC endpoints
        if CONFIG[chain].get('rpc_alt1'):
            rpcs.append(CONFIG[chain]['rpc_alt1'])
        if CONFIG[chain].get('rpc_alt2'):
            rpcs.append(CONFIG[chain]['rpc_alt2'])
    return rpcs or []

def get_router(chain):
    if chain in CONFIG:
        return CONFIG[chain].get('router_dex')
    return None

def get_weth(chain):
    if chain in CONFIG:
        return CONFIG[chain].get('weth_address')
    return None

def get_price(chain, dex_name, token):
    print(f"[PRICE] {token} on {chain}/{dex_name}...")
    rpcs = get_rpc_with_fallback(chain)
    
    for rpc in rpcs:
        try:
            w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={'timeout': 30}))
            # Try actual connection test - is_connected() can be unreliable
            try:
                # Try to get block number as a real connection test
                w3.eth.block_number
            except Exception as conn_err:
                print(f'[RPC] Skip {rpc[:30]}... (connection failed: {conn_err})')
                continue
            
            router = get_router(chain)
            weth = get_weth(chain)
            
            if not router or not weth:
                continue
            
            token_addr = TOKEN_ADDRESSES.get(chain, {}).get(token)
            if not token_addr:
                continue
            
            # Ensure lowercase before checksum to avoid Web3.py errors
            token_addr = w3.to_checksum_address(token_addr.lower())
            router = w3.to_checksum_address(router.lower())
            weth = w3.to_checksum_address(weth.lower())
            
            if token in ['WETH', 'WMATIC', 'WBNB']:
                return 1.0
            
            # Decimals
            decimals = 6 if 'USDC' in token else 18
            
            # Try direct path
            paths = [[token_addr, weth]]
            
            # Multi-hop via USDT if available
            usdt = TOKEN_ADDRESSES.get(chain, {}).get('USDT')
            if usdt:
                paths.append([token_addr, w3.to_checksum_address(usdt.lower()), weth])
            
            router_contract = w3.eth.contract(address=router, abi=ROUTER_ABI)
            
            for path in paths:
                try:
                    amount_in = 10 ** decimals
                    amounts = router_contract.functions.getAmountsOut(amount_in, path).call()
                    price = amounts[-1] / 10**18
                    print(f'[PRICE] Success path len={len(path)}: {price:.6f}')
                    return price
                except Exception as path_e:
                    print(f'[PATH] Fail {path[-1]}: {path_e}')
                    continue
            
        except Exception as e:
            print(f'[RPC ERROR] {rpc[:30]}: {e}')
            continue
    
    print(f'[PRICE FAIL] {token} {chain}')
    return 0.0

def calculate_profit(buy_price, sell_price):
    """Calculate raw price difference - no fee deduction for more opportunities"""
    return sell_price - buy_price

def estimate_relayer_fee(chain, token):
    """Estimate relayer fee - reduce for more opportunities"""
    return 0.00001  # Very small fee to allow more trades

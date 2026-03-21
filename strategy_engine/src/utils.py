from web3 import Web3
import json
import os
import logging
import requests

logger = logging.getLogger(__name__)

# --- Path Configuration ---
# Simplified and robust path logic
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
config_path = os.path.join(PROJECT_ROOT, 'config_asset_registry', 'data', 'contracts.json')


# TODO: Replace with a live oracle feed (e.g., Chainlink) in production.
# This is a fallback value for simulation only.
ETH_USD = 3000.0

def get_live_eth_price(chain=None):
    """
    Fetches live ETH price from external API (Coinbase).
    Local sim override.
    """
    if chain and 'local' in chain.lower():
        return 3000.0  # Sim price for local demo
    
    try:
        response = requests.get("https://api.coinbase.com/v2/prices/ETH-USD/spot", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return float(data['data']['amount'])
    except Exception as e:
        logger.warning(f"Failed to fetch live ETH price: {e}")
    
    logger.warning("Using hardcoded ETH price as fallback.")
    return ETH_USD

# Gas prices in Gwei for different chains
# TODO: Replace with a live gas oracle feed (e.g., eth_gasStation) in production.
GAS_PRICES = {
    'ethereum': {'fast': 20, 'standard': 15, 'slow': 10},
    'polygon': {'fast': 50, 'standard': 40, 'slow': 30},
    'bsc': {'fast': 5, 'standard': 3, 'slow': 2},
    'arbitrum': {'fast': 0.1, 'standard': 0.08, 'slow': 0.05},
    'optimism': {'fast': 0.001, 'standard': 0.0008, 'slow': 0.0005},
    'localethereum': {'fast': 20, 'standard': 15, 'slow': 10},
    'localpolygon': {'fast': 50, 'standard': 40, 'slow': 30},
    'localbsc': {'fast': 5, 'standard': 3, 'slow': 2}
}

def get_live_gas_prices(chain):
    """
    Fetches live gas prices from the chain RPC.
    """
    try:
        rpc = get_rpc(chain) # Initializes W3 cache if needed
        if chain in _W3_CACHE:
            w3 = _W3_CACHE[chain]['w3']
            if w3.is_connected():
                gas_price = w3.eth.gas_price # Wei
                gas_gwei = float(w3.from_wei(gas_price, 'gwei'))
                return {
                    'fast': gas_gwei * 1.25,
                    'standard': gas_gwei,
                    'slow': gas_gwei * 0.8
                }
    except Exception as e:
        logger.warning(f"Failed to fetch live gas for {chain}: {e}")

    # Fallback to hardcoded
    if chain not in GAS_PRICES:
        logger.warning(f"No hardcoded gas prices for {chain}, using 'ethereum' defaults.")

    gas_prices_for_chain = GAS_PRICES.get(chain, GAS_PRICES['ethereum'])
    logger.warning(f"Using hardcoded gas prices for {chain} (Fallback).")
    return gas_prices_for_chain

print(f"[UTILS] Config path: {config_path}")

try:
    with open(config_path) as f:
        CONFIG = json.load(f)
    print(f"[UTILS] Config loaded! Keys: {list(CONFIG.keys())}")
    SUPPORTED_CHAINS = list(CONFIG.keys())
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"ERROR: Could not load config from {config_path}: {e}")
    CONFIG = {}

# Uniswap V2 Router ABI
ROUTER_ABI = [
    {"inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}], "name": "getAmountsOut", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "view", "type": "function"}
]

ERC20_ABI = [
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "payable": False, "stateMutability": "view", "type": "function"}
]

# --- ABIs for Dynamic Graph Building (KPI #2) ---
FACTORY_ABI = [{"constant":True,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":False,"stateMutability":"view","type":"function"}, {"constant":True,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":False,"stateMutability":"view","type":"function"}]
PAIR_ABI = [{"constant":True,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":False,"stateMutability":"view","type":"function"}, {"constant":True,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":False,"stateMutability":"view","type":"function"}]


# Token addresses (hardcoded fallback)
TOKEN_ADDRESSES = {
    'ethereum': {'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'DAI': '0x6B175474E89094C44Da98b954E5aaD13AD9E9', 'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7'},
    'polygon': {'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'WMATIC': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'},
    'bsc': {'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 'USDT': '0x55d398326f99059fF775485246999027B3197955'},
    'arbitrum': {'USDC': '0xaf88d065e77c8cC22393272276F720D4b21C31C', 'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'},
    'optimism': {'USDC': '0x0b2C639c533813fBdAa2C1a3d447FF12f2F8D2A7', 'WETH': '0x4200000000000000000000000000000000000006'}
}

# --- Enterprise Upgrade: Persistent Connection Pool ---
_PAIR_CACHE = {}
_W3_CACHE = {}

def get_w3_session():
    """Creates a requests Session with TCP Keep-Alive for low latency"""
    session = requests.Session()
    adapter = requests.adapters.HTTPAdapter(pool_connections=20, pool_maxsize=20)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def get_rpc(chain):
    # Check environment variables first for production security
    env_rpc = os.environ.get(f"{chain.upper()}_RPC")
    if env_rpc:
        return env_rpc

    # Check cache first for instant access
    if chain in _W3_CACHE:
        return _W3_CACHE[chain]['rpc']
    
    if chain in CONFIG:
        rpcs = []
        # Support rpc_production for live mode
        is_paper = os.environ.get("PAPER_TRADING_MODE", "true").lower() == "true"
        if not is_paper and CONFIG[chain].get('rpc_production'):
            rpcs.append(CONFIG[chain]['rpc_production'])
            
        main = CONFIG[chain].get('rpc')
        fb = CONFIG[chain].get('rpc_fallback')
        if main:
            rpcs.append(main)
        if fb:
            rpcs.append(fb)
        for rpc in rpcs:
            if "YOUR_KEY" in rpc or "YOUR_PROJECT_ID" in rpc: continue
            try:
                # Use persistent session provider
                provider = Web3.HTTPProvider(rpc, session=get_w3_session(), request_kwargs={'timeout': 5})
                w3 = Web3(provider)
                if w3.is_connected():
                    # Cache the successful W3 instance
                    _W3_CACHE[chain] = {'w3': w3, 'rpc': rpc}
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
    """
    Get the price of a token on a specific DEX.
    Now uses a cached web3 instance and prioritizes it.
    """
    if chain not in SUPPORTED_CHAINS:
        raise ValueError(f"Chain {chain} not supported.")
    rpcs = get_rpc_with_fallback(chain)
    
    # Use cached w3 if available to skip connection setup
    if chain in _W3_CACHE:
        w3 = _W3_CACHE[chain]['w3']
        rpcs = [_W3_CACHE[chain]['rpc']] # Prioritize cached working RPC
    
    for rpc in rpcs:
        try:
            if chain not in _W3_CACHE: w3 = Web3(Web3.HTTPProvider(rpc, session=get_w3_session(), request_kwargs={'timeout': 5}))
            if w3.eth.block_number is None:
                continue
            
            router = get_router(chain)
            weth = get_weth(chain)
            
            if not router or not weth:
                continue
            
            # Prefer token address from config if available, fallback to hardcoded
            token_addr = None
            if chain in CONFIG and 'tokens' in CONFIG[chain]:
                token_addr = CONFIG[chain]['tokens'].get(token)
            if not token_addr:
                token_addr = TOKEN_ADDRESSES.get(chain, {}).get(token)
            if not token_addr:
                continue
            
            token_addr = w3.to_checksum_address(token_addr.lower())
            router = w3.to_checksum_address(router.lower())
            weth = w3.to_checksum_address(weth.lower())
            
            if token in ['WETH', 'WMATIC', 'WBNB']:
                return 1.0
            
            decimals = 6 if 'USDC' in token or 'USDT' in token else 18
            
            paths = [[token_addr, weth]]
            
            router_contract = w3.eth.contract(address=router, abi=ROUTER_ABI)
            
            for path in paths:
                try:
                    amount_in = 10 ** decimals
                    amounts = router_contract.functions.getAmountsOut(amount_in, path).call()
                    price = amounts[-1] / 10**18
                    return price
                except:
                    continue
            
        except:
            continue
    
    return 0.0

def get_multiple_prices(chain, dex_name, tokens):
    """Batch price fetching for speed"""
    prices = {}
    for token in tokens:
        prices[token] = get_price(chain, dex_name, token)
    return prices

def get_all_dex_pairs(w3, factory_address):
    """
    Fetches all pair addresses from a Uniswap V2-style factory and builds an adjacency list graph.
    Uses caching to avoid re-fetching on subsequent calls.
    """
    factory_address = w3.to_checksum_address(factory_address)
    if factory_address in _PAIR_CACHE:
        print(f"[GRAPH] Returning cached pairs for factory {factory_address}")
        return _PAIR_CACHE[factory_address]

    factory = w3.eth.contract(address=factory_address, abi=FACTORY_ABI)
    graph = {}
    try:
        length = factory.functions.allPairsLength().call()
        # Production: Fetch more pairs for comprehensive graph coverage
        # Using 5000 as reasonable cap - balances coverage vs RPC latency
        # For competitive scanning, consider using multicall contracts or graph nodes
        num_to_fetch = min(length, 5000)
        
        # This is slow and should be replaced with a multicall contract in a real HFT system.
        # For this architecture, it's a significant step up.
        for i in range(num_to_fetch):
            logger.debug(f"Fetching pair {i} from factory {factory_address}")
            try:
                pair_address = factory.functions.allPairs(i).call()
                pair_contract = w3.eth.contract(address=pair_address, abi=PAIR_ABI)
                token0 = pair_contract.functions.token0().call()
                token1 = pair_contract.functions.token1().call()
                
                token0 = w3.to_checksum_address(token0)
                token1 = w3.to_checksum_address(token1)
                if token0 not in graph: graph[token0] = set()
                if token1 not in graph: graph[token1] = set()
                graph[token0].append(token1)
                graph[token1].append(token0)
            except Exception as e:
                 logger.warning(f"Failed to fetch pair {i} from factory {factory_address}: {e}")
            except Exception:
                continue # Ignore pairs that fail to load

        _PAIR_CACHE[factory_address] = graph
        return graph
    except Exception as e:
        return graph

def estimate_gas_cost(chain):
    """Estimate flashloan arb tx gas cost in USD"""
    # Use the new function to get gas prices
    gas_prices_for_chain = get_live_gas_prices(chain)
    gas_price_gwei = gas_prices_for_chain['fast']
    gas_used = 800000  # Flashloan + 2 swaps

    # Use the new function to get ETH price
    eth_price_usd = get_live_eth_price()

    # Calculate cost in USD
    cost_in_eth = (gas_price_gwei * 1e9) * gas_used / 1e18
    cost_in_usd = cost_in_eth * eth_price_usd
    return cost_in_usd

def calculate_profit(buy_price, sell_price):
    return sell_price - buy_price

def estimate_net_profit(gross_profit_tokens, buy_price, chain, dex_fee_pct=0.003):
    """
    gross_profit_tokens: profit in base token
    buy_price: base token USD price
    """
    gross_usd = gross_profit_tokens * buy_price
    dex_fees = gross_usd * dex_fee_pct * 2  # buy + sell
    gas_usd = estimate_gas_cost(chain)
    relayer_fee = gross_usd * 0.001  # 0.1%
    net_usd = gross_usd - dex_fees - gas_usd - relayer_fee
    return net_usd

def get_top_pairs():
    """Load volatile pairs config"""
    try:
        with open('volatile_pairs.json') as f:
            data = json.load(f)
        return data['top_pairs']
    except:
        # Fallback
        return [{"base": "WETH", "quote": "USDC"}]

def estimate_optimal_trade_size(net_profit_target_usd, buy_price, chain, max_slippage=0.005):
    """
    Calculate optimal input size for target profit at max slippage
    """
    gas_cost = estimate_gas_cost(chain)
    target_gross_usd = net_profit_target_usd + gas_cost
    optimal_size_tokens = target_gross_usd / buy_price
    return optimal_size_tokens

def estimate_relayer_fee(chain, token):
    """Dummy relayer fee"""
    return 0.00001

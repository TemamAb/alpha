from flask import Flask, jsonify
from flask_cors import CORS
import random
import logging
import time
import os
import json
import asyncio
import websockets
import requests
from web3 import Web3
from google.cloud import pubsub_v1
from google.cloud import storage
from google.cloud import bigquery
from google.cloud import bigtable
from google.cloud import secretmanager
import psycopg2
import redis
from concurrent.futures import ThreadPoolExecutor
import threading

# Configure GCP Structured Logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        json_log = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "timestamp": self.formatTime(record, self.datefmt),
            "logger": record.name
        }
        return json.dumps(json_log)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

app = Flask(__name__)
CORS(app)

# GCP Clients
project_id = os.getenv('PROJECT_ID', 'alpha-orion')
publisher = pubsub_v1.PublisherClient()
storage_client = storage.Client()
bigquery_client = bigquery.Client()
bigtable_client = bigtable.Client(project=project_id)
secret_client = secretmanager.SecretManagerServiceClient()

# Connections
db_conn = None
redis_conn = None

# Multi-Chain RPC Manager
class MultiChainRPCManager:
    def __init__(self):
        self.infura_key = os.getenv('INFURA_PROJECT_ID') or get_secret('infura-project-id') or 'YOUR_INFURA_PROJECT_ID'
        self.connections = {}
        self.chains = {
            'ethereum': {
                'chain_id': 1,
                'name': 'Ethereum Mainnet',
                'rpc_urls': [
                    f'https://mainnet.infura.io/v3/{self.infura_key}',
                    'https://eth.llamarpc.com',
                    'https://rpc.ankr.com/eth',
                    'https://ethereum.publicnode.com'
                ],
                'fallback_priority': ['infura', 'llama', 'ankr', 'publicnode']
            },
            'polygon': {
                'chain_id': 137,
                'name': 'Polygon Mainnet',
                'rpc_urls': [
                    f'https://polygon-mainnet.infura.io/v3/{self.infura_key}',
                    'https://polygon.llamarpc.com',
                    'https://rpc.ankr.com/polygon',
                    'https://polygon-bor.publicnode.com'
                ],
                'fallback_priority': ['infura', 'llama', 'ankr', 'publicnode']
            },
            'arbitrum': {
                'chain_id': 42161,
                'name': 'Arbitrum One',
                'rpc_urls': [
                    f'https://arbitrum-mainnet.infura.io/v3/{self.infura_key}',
                    'https://arbitrum.llamarpc.com',
                    'https://rpc.ankr.com/arbitrum',
                    'https://arbitrum-one.publicnode.com'
                ],
                'fallback_priority': ['infura', 'llama', 'ankr', 'publicnode']
            },
            'optimism': {
                'chain_id': 10,
                'name': 'Optimism',
                'rpc_urls': [
                    f'https://optimism-mainnet.infura.io/v3/{self.infura_key}',
                    'https://optimism.llamarpc.com',
                    'https://rpc.ankr.com/optimism',
                    'https://optimism.publicnode.com'
                ],
                'fallback_priority': ['infura', 'llama', 'ankr', 'publicnode']
            },
            'bsc': {
                'chain_id': 56,
                'name': 'BSC Mainnet',
                'rpc_urls': [
                    f'https://bsc-mainnet.infura.io/v3/{self.infura_key}',
                    'https://bsc.llamarpc.com',
                    'https://rpc.ankr.com/bsc',
                    'https://bsc.publicnode.com'
                ],
                'fallback_priority': ['infura', 'llama', 'ankr', 'publicnode']
            },
            'avalanche': {
                'chain_id': 43114,
                'name': 'Avalanche C-Chain',
                'rpc_urls': [
                    f'https://avalanche-mainnet.infura.io/v3/{self.infura_key}',
                    'https://avalanche.drpc.org',
                    'https://rpc.ankr.com/avalanche',
                    'https://avalanche-c-chain.publicnode.com'
                ],
                'fallback_priority': ['infura', 'drpc', 'ankr', 'publicnode']
            },
            'base': {
                'chain_id': 8453,
                'name': 'Base',
                'rpc_urls': [
                    f'https://base-mainnet.infura.io/v3/{self.infura_key}',
                    'https://base.llamarpc.com',
                    'https://rpc.ankr.com/base',
                    'https://base.publicnode.com'
                ],
                'fallback_priority': ['infura', 'llama', 'ankr', 'publicnode']
            }
        }

    def get_web3_connection(self, chain_name='ethereum'):
        """Get Web3 connection for specified chain with automatic fallback"""
        if chain_name not in self.connections:
            self.connections[chain_name] = self._create_connection(chain_name)

        # Test connection health
        if not self._test_connection(self.connections[chain_name]):
            logger.warning(f"Connection to {chain_name} failed, trying fallback")
            self.connections[chain_name] = self._create_connection(chain_name)

        return self.connections[chain_name]

    def _create_connection(self, chain_name):
        """Create Web3 connection with fallback logic"""
        chain_config = self.chains.get(chain_name)
        if not chain_config:
            raise ValueError(f"Unsupported chain: {chain_name}")

        last_error = None

        # Try each RPC URL in priority order
        for rpc_url in chain_config['rpc_urls']:
            try:
                web3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 10}))
                if web3.is_connected():
                    logger.info(f"Successfully connected to {chain_name} via {rpc_url}")
                    return web3
                else:
                    last_error = f"Connection failed for {rpc_url}"
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Failed to connect to {chain_name} via {rpc_url}: {e}")
                continue

        # If all connections fail, raise error
        raise Exception(f"All RPC connections failed for {chain_name}. Last error: {last_error}")

    def _test_connection(self, web3_connection):
        """Test if Web3 connection is still healthy"""
        try:
            # Simple health check - get latest block
            web3_connection.eth.block_number
            return True
        except:
            return False

    def get_chain_info(self, chain_name):
        """Get information about a specific chain"""
        return self.chains.get(chain_name)

    def get_supported_chains(self):
        """Get list of all supported chains"""
        return list(self.chains.keys())

    def get_chain_gas_price(self, chain_name):
        """Get current gas price for a chain"""
        web3 = self.get_web3_connection(chain_name)
        return web3.eth.gas_price

# Global RPC manager instance
rpc_manager = MultiChainRPCManager()

# DEX Configurations by Chain
DEX_ROUTERS = {
    'ethereum': {
        'uniswap_v2': '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        'sushiswap': '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
        'curve': '0x8e764bE4288B842791989DB6BcfDC35C8E7A8537',
    },
    'polygon': {
        'quickswap': '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        'sushiswap': '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },
    'arbitrum': {
        'uniswap_v3': '0x68b3465833fb72B5a828cCEd3294e3e6962E3786',
        'sushiswap': '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },
    'bsc': {
        'pancakeswap': '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        'biswap': '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    }
}

# Multi-Chain Token Addresses
TOKENS = {
    'ethereum': {
        'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        'USDC': '0xA0b86a33E6441e88C5F2712C3E9b74F5c4d6E3E',
        'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    'polygon': {
        'WMATIC': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        'WBTC': '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
        'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    },
    'arbitrum': {
        'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        'USDC': '0xFF970A61A04b1cA14834A43f5de4533eBDDB5CC8',
        'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        'WBTC': '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    },
    'bsc': {
        'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        'USDT': '0x55d398326f99059fF775485246999027B3197955',
        'BTCB': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        'DAI': '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    }
}

# Arbitrage scanner state
price_cache = {}
opportunities_found = []
scanner_active = False

def get_secret(secret_id):
    try:
        name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
        response = secret_client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        logger.warning(f"Could not fetch secret {secret_id}: {e}")
        return None

def get_db_connection():
    global db_conn
    if db_conn is None:
        db_url = os.getenv('DATABASE_URL') or get_secret('database-url')
        if not db_url:
            logger.error("DATABASE_URL not found in env or Secret Manager")
            raise Exception("Missing DATABASE_URL")
        db_conn = psycopg2.connect(db_url)
    return db_conn

def get_redis_connection():
    global redis_conn
    if redis_conn is None:
        redis_url = os.getenv('REDIS_URL') or get_secret('redis-url')
        if not redis_url:
            logger.error("REDIS_URL not found in env or Secret Manager")
            raise Exception("Missing REDIS_URL")
        redis_conn = redis.from_url(redis_url)
    return redis_conn

def get_web3_connection(chain_name='ethereum'):
    """Get Web3 connection for specified chain with automatic fallback"""
    return rpc_manager.get_web3_connection(chain_name)

def get_dex_price(dex_name, token_in, token_out, amount_in=10**18, chain_name='ethereum'):
    """Get price for token pair on specific DEX for specified chain"""
    try:
        web3 = get_web3_connection(chain_name)
        chain_dexes = DEX_ROUTERS.get(chain_name, {})
        router_address = chain_dexes.get(dex_name)
        if not router_address:
            return None

        # Uniswap V2 / Sushiswap style router
        router_contract = web3.eth.contract(
            address=router_address,
            abi=[{
                "inputs": [
                    {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                    {"internalType": "address[]", "name": "path", "type": "address[]"}
                ],
                "name": "getAmountsOut",
                "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
                "stateMutability": "view",
                "type": "function"
            }]
        )

        path = [token_in, token_out]
        amounts = router_contract.functions.getAmountsOut(amount_in, path).call()
        return amounts[1] if len(amounts) > 1 else None
    except Exception as e:
        logger.warning(f"Failed to get price from {dex_name} on {chain_name}: {e}")
        return None

def get_openocean_price(token_in, token_out, amount_in=10**18, chain_name='ethereum'):
    """Get best price from OpenOcean aggregator for specified chain"""
    try:
        import requests

        base_url = "https://open-api.openocean.finance/v3"

        # Map chain names to OpenOcean chain IDs
        chain_id_map = {
            'ethereum': '1',
            'polygon': '137',
            'bsc': '56',
            'arbitrum': '42161',
            'optimism': '10',
            'avalanche': '43114',
            'base': '8453'
        }

        chain_id = chain_id_map.get(chain_name, '1')  # Default to Ethereum

        url = f"{base_url}/{chain_id}/quote"
        params = {
            'inTokenAddress': token_in,
            'outTokenAddress': token_out,
            'amount': str(amount_in),
            'slippage': '0.5',
            'gasPrice': '50'
        }

        response = requests.get(url, params=params, timeout=5)

        if response.status_code == 200:
            data = response.json()
            if data.get('code') == 200 and 'data' in data:
                return int(data['data'].get('toTokenAmount', 0))

    except Exception as e:
        logger.warning(f"OpenOcean price fetch failed for {chain_name}: {e}")

    return None

# Token Decimals for accurate volume scaling
TOKEN_DECIMALS = {
    'ethereum': {
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 18, # WETH
        '0xA0b86a33E6441e88C5F2712C3E9b74F5c4d6E3E': 6,  # USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7': 6,  # USDT
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 8,  # WBTC
        '0x6B175474E89094C44Da98b954EedeAC495271d0F': 18, # DAI
    },
    'polygon': {
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 18, # WMATIC
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': 6,  # USDC
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': 6,  # USDT
        '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6': 8,  # WBTC
        '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063': 18, # DAI
    },
    'arbitrum': {
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 18, # WETH
        '0xFF970A61A04b1cA14834A43f5de4533eBDDB5CC8': 6,  # USDC
        '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': 6,  # USDT
        '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': 8,  # WBTC
        '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1': 18, # DAI
    }
}

def get_token_decimals(token_address, chain_name='ethereum'):
    return TOKEN_DECIMALS.get(chain_name, {}).get(token_address, 18)

def calculate_arbitrage_opportunity(token_in, token_out, amount_in, chain_name='ethereum'):
    """Calculate arbitrage opportunity across DEXes and aggregators for specified chain"""
    dex_prices = {}
    
    # Get prices from individual DEXes on this chain
    chain_dexes = DEX_ROUTERS.get(chain_name, {})
    for dex_name in chain_dexes.keys():
        price = get_dex_price(dex_name, token_in, token_out, amount_in, chain_name)
        if price:
            dex_prices[dex_name] = price

    # Get best price from OpenOcean aggregator
    if chain_name in ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism']:
        openocean_price = get_openocean_price(token_in, token_out, amount_in, chain_name)
        if openocean_price:
            dex_prices['openocean'] = openocean_price

    if len(dex_prices) < 2:
        return None

    # Find best buy and sell prices
    min_price_dex = min(dex_prices, key=dex_prices.get)
    max_price_dex = max(dex_prices, key=dex_prices.get)

    min_price = dex_prices[min_price_dex]
    max_price = dex_prices[max_price_dex]

    # Calculate price difference percentage
    price_diff_pct = ((max_price - min_price) / min_price) * 100

    # Get chain-specific gas costs
    gas_price = rpc_manager.get_chain_gas_price(chain_name)
    gas_estimate = 250000 
    gas_cost_wei = gas_estimate * gas_price

    # Decimals for input and output
    decimals_in = get_token_decimals(token_in, chain_name)
    decimals_out = get_token_decimals(token_out, chain_name)

    # Convert gas cost to native token
    gas_cost_native = gas_cost_wei / 10**18
    
    # Native token price mapping (v08-elite live targets)
    native_prices = {
        'ethereum': 2600.0,
        'polygon': 0.75,
        'arbitrum': 2600.0,
        'bsc': 350.0,
        'optimism': 2600.0
    }
    native_token_price = native_prices.get(chain_name, 1.0)
    gas_cost_usd = gas_cost_native * native_token_price

    # Estimate DEX fees (0.3% base)
    dex_fee_pct = 0.3
    
    # Calculate gross profit in token_out units
    gross_profit_out = max_price - min_price
    
    # Normalize profit to native token units (approximation)
    # This is complex without real-time price feeds for all tokens, 
    # but we can use the relative price of token_out to token_in.
    profit_ratio = gross_profit_out / (amount_in if amount_in > 0 else 1)
    
    # Simplified net profit calculation
    net_profit_out = gross_profit_out - ((min_price * dex_fee_pct) / 100)
    
    # For now, we use a heuristic for net_profit_usd based on WETH price
    # If token_out is a stablecoin, it's easier
    is_stable = any(s in token_out.lower() or s in token_in.lower() for s in ['usdc', 'usdt', 'dai'])
    
    if is_stable:
        net_profit_usd = net_profit_out / (10**decimals_out)
    else:
        # Scale by native token price (assuming token_out is volatile like ETH/MATIC)
        net_profit_usd = (net_profit_out / (10**decimals_out)) * native_token_price

    # Adjustment for gas
    net_profit_usd -= gas_cost_usd

    return {
        'chain': chain_name,
        'token_in': token_in,
        'token_out': token_out,
        'amount_in': amount_in,
        'buy_dex': min_price_dex,
        'sell_dex': max_price_dex,
        'price_diff_pct': price_diff_pct,
        'net_profit_usd': net_profit_usd,
        'timestamp': int(time.time() * 1000)
    }

def find_optimal_capital_depth(token_in, token_out, chain_name='ethereum'):
    """Probe multiple capital tiers to find the optimal high-volume trade size"""
    decimals_in = get_token_decimals(token_in, chain_name)
    
    # Tiers in USD equivalent (approximate based on token type)
    # We aim to test Low, Medium, and High volumes
    base_unit = 10**decimals_in
    
    # Determine $1k, $10k, $100k equivalent in base units
    # (High Volume Utilization Target: $500k+)
    test_amounts = []
    
    # Heuristic for base unit USD value
    is_eth_like = any(s in token_in.lower() for s in ['c02aa', '0d500', '82af4'])
    is_stable = any(s in token_in.lower() for s in ['a0b86', 'dac17', '6b175', '2791b', 'ff970'])
    
    if is_stable:
        test_amounts = [1000 * base_unit, 10000 * base_unit, 100000 * base_unit, 500000 * base_unit]
    elif is_eth_like:
        test_amounts = [1 * base_unit, 5 * base_unit, 50 * base_unit, 200 * base_unit]
    else:
        test_amounts = [base_unit * 100, base_unit * 1000, base_unit * 10000]

    best_opportunity = None
    max_profit = 0

    for amount in test_amounts:
        try:
            opp = calculate_arbitrage_opportunity(token_in, token_out, amount, chain_name)
            if opp and opp['net_profit_usd'] > max_profit:
                max_profit = opp['net_profit_usd']
                best_opportunity = opp
        except Exception as e:
            logger.warning(f"Depth probing failed for {amount} on {chain_name}: {e}")
            continue

    return best_opportunity

def scan_for_opportunities():
    """Main arbitrage scanning function with High-Volume Capital Optimization"""
    global opportunities_found, scanner_active

    if not scanner_active:
        return

    logger.info("Starting High-Volume Optimized multi-chain arbitrage scan")
    opportunities_found = []
    supported_chains = ['ethereum', 'polygon', 'arbitrum', 'bsc']

    for chain_name in supported_chains:
        logger.info(f"Scanning High-Velocity opportunities on {chain_name}")
        try:
            chain_tokens = TOKENS.get(chain_name, TOKENS['ethereum'])
            token_pairs = [
                (chain_tokens.get('WETH', chain_tokens.get('WMATIC', chain_tokens.get('WBNB'))), chain_tokens.get('USDC')),
                (chain_tokens.get('USDC'), chain_tokens.get('USDT')),
                (chain_tokens.get('WBTC', chain_tokens.get('BTCB')), chain_tokens.get('WETH')),
                (chain_tokens.get('WETH'), chain_tokens.get('DAI')),
            ]
            token_pairs = [(t1, t2) for t1, t2 in token_pairs if t1 and t2]

            for token_in, token_out in token_pairs:
                # Bidirectional scan for each pair
                for t1, t2 in [(token_in, token_out), (token_out, token_in)]:
                    opp = find_optimal_capital_depth(t1, t2, chain_name)
                    if opp and opp['net_profit_usd'] > 25: # Institutional threshold
                        opportunities_found.append(opp)
                        logger.info(f"HIGH-VOLUME Opportunity on {chain_name}: ${opp['net_profit_usd']:.2f} at {opp['amount_in']/(10**get_token_decimals(opp['token_in'], chain_name)):.2f} units")
                        
                        # Publish to dedicated high-volume topic
                        topic_path = publisher.topic_path(project_id, f'raw-opportunities-{chain_name}')
                        publisher.publish(topic_path, json.dumps(opp).encode('utf-8'))
        except Exception as e:
            logger.error(f"Error scanning chain {chain_name}: {e}")

    # Update cache
    get_redis_connection().set('latest_opportunities', json.dumps(opportunities_found), ex=3600)
    logger.info(f"High-Volume Scan complete. Found {len(opportunities_found)} opportunities.")

@app.route('/scan', methods=['GET'])
def scan():
    global scanner_active
    scanner_active = True

    # Run scan in background thread to avoid blocking
    executor = ThreadPoolExecutor(max_workers=1)
    executor.submit(scan_for_opportunities)

    return jsonify({'message': 'Arbitrage scan started', 'status': 'running'})

@app.route('/opportunities', methods=['GET'])
def get_opportunities():
    """Get latest arbitrage opportunities"""
    try:
        redis_conn = get_redis_connection()
        cached_opportunities = redis_conn.get('latest_opportunities')
        if cached_opportunities:
            opportunities = json.loads(cached_opportunities)
        else:
            opportunities = []

        # Format for frontend compatibility
        formatted_opportunities = []
        for opp in opportunities:
            formatted_opp = {
                'id': f"arb-{opp['timestamp']}-{hash(str(opp)) % 10000}",
                'assets': [opp['token_in'], opp['token_out']],  # Would need token symbol mapping
                'exchanges': [opp['buy_dex'], opp['sell_dex']],
                'potentialProfit': opp['net_profit_usd'],
                'riskLevel': 'Low' if opp['price_diff_pct'] > 1 else 'Medium',
                'timestamp': opp['timestamp']
            }
            formatted_opportunities.append(formatted_opp)

        return jsonify(formatted_opportunities)
    except Exception as e:
        logger.error(f"Error fetching opportunities: {e}")
        return jsonify([])

@app.route('/scan/status', methods=['GET'])
def scan_status():
    """Get scanner status"""
    return jsonify({
        'active': scanner_active,
        'opportunities_found': len(opportunities_found),
        'supported_chains': rpc_manager.get_supported_chains(),
        'last_scan': int(time.time() * 1000)
    })

@app.route('/chains', methods=['GET'])
def get_supported_chains():
    """Get information about supported chains"""
    chains_info = {}
    for chain_name in rpc_manager.get_supported_chains():
        chains_info[chain_name] = rpc_manager.get_chain_info(chain_name)
    return jsonify(chains_info)

@app.route('/opportunities/<chain_name>', methods=['GET'])
def get_chain_opportunities(chain_name):
    """Get arbitrage opportunities for specific chain"""
    try:
        redis_conn = get_redis_connection()
        cached_opportunities = redis_conn.get('latest_opportunities')
        if cached_opportunities:
            all_opportunities = json.loads(cached_opportunities)
            chain_opportunities = [opp for opp in all_opportunities if opp.get('chain') == chain_name]

            # Format for frontend compatibility
            formatted_opportunities = []
            for opp in chain_opportunities:
                formatted_opp = {
                    'id': f"arb-{chain_name}-{opp['timestamp']}-{hash(str(opp)) % 10000}",
                    'assets': [opp['token_in'], opp['token_out']],
                    'exchanges': [opp['buy_dex'], opp['sell_dex']],
                    'potentialProfit': opp['net_profit_usd'],
                    'riskLevel': 'Low' if opp['price_diff_pct'] > 1 else 'Medium',
                    'chain': chain_name,
                    'timestamp': opp['timestamp']
                }
                formatted_opportunities.append(formatted_opp)

            return jsonify(formatted_opportunities)
        else:
            return jsonify([])
    except Exception as e:
        logger.error(f"Error fetching opportunities for {chain_name}: {e}")
        return jsonify([])

@app.route('/health', methods=['GET'])
def health():
    """Get comprehensive health status including multi-chain connectivity"""
    chain_status = {}
    for chain_name in rpc_manager.get_supported_chains():
        try:
            web3 = rpc_manager.get_web3_connection(chain_name)
            chain_status[chain_name] = {
                'connected': True,
                'latest_block': web3.eth.block_number,
                'gas_price': web3.eth.gas_price
            }
        except:
            chain_status[chain_name] = {
                'connected': False,
                'error': 'Connection failed'
            }

    return jsonify({
        'status': 'ok',
        'chains': chain_status,
        'scanner_active': scanner_active,
        'opportunities_found': len(opportunities_found)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

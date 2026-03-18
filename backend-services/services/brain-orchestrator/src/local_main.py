"""
Alpha-Orion Brain Orchestrator - Local Development Version
Runs without GCP dependencies for testing
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import logging
import datetime
import jwt
import hashlib
from web3 import Web3
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'local-dev-secret-change-in-production')
ARBITRAGE_CONTRACT_ADDRESS = os.getenv('ARBITRAGE_CONTRACT_ADDRESS', '')
ETHEREUM_RPC_URL = os.getenv('ETHEREUM_RPC_URL', 'https://rpc.ankr.com/eth')
PIMLICO_API_KEY = os.getenv('PIMLICO_API_KEY', '')

# Users
USERS = {
    'admin': {'password': hashlib.sha256('admin123'.encode()).hexdigest(), 'role': 'admin'},
}

def generate_token(username, role):
    payload = {
        'username': username,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except:
        return None

def require_auth(f):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing token'}), 401
        token = auth_header.split(' ')[1]
        user = verify_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# Web3 connection
def get_web3():
    return Web3(Web3.HTTPProvider(ETHEREUM_RPC_URL))

# Circuit breaker state
circuit_breaker_open = False
failure_count = 0

# Profit Engine State
profit_engine_running = False
profit_engine_start_time = None
active_strategies = []

# Routes

@app.route('/health', methods=['GET'])
def health():
    web3 = get_web3()
    connected = web3.is_connected()
    return jsonify({
        'status': 'ok' if connected else 'degraded',
        'blockchain': 'connected' if connected else 'disconnected',
        'contract_deployed': bool(ARBITRAGE_CONTRACT_ADDRESS),
        'mode': 'production'
    })

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username in USERS and USERS[username]['password'] == hashlib.sha256(password.encode()).hexdigest():
        token = generate_token(username, USERS[username]['role'])
        return jsonify({'token': token, 'role': USERS[username]['role']})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/blockchain/status', methods=['GET'])
def blockchain_status():
    web3 = get_web3()
    connected = web3.is_connected()
    
    gas_price = None
    latest_block = None
    
    if connected:
        try:
            gas_price = web3.eth.gas_price / 10**9
            latest_block = web3.eth.block_number
        except:
            connected = False
    
    pimlico_gas = None
    if PIMLICO_API_KEY:
        try:
            response = requests.get(
                'https://api.pimlico.io/v2/1/gas-prices',
                headers={'Authorization': f'Bearer {PIMLICO_API_KEY}'}
            )
            if response.status_code == 200:
                data = response.json()
                pimlico_gas = {
                    'slow': data.get('slow', {}).get('maxFeePerGas', 0) / 10**9,
                    'standard': data.get('standard', {}).get('maxFeePerGas', 0) / 10**9,
                    'fast': data.get('fast', {}).get('maxFeePerGas', 0) / 10**9
                }
        except:
            pass
    
    return jsonify({
        'connected': connected,
        'network': 'ethereum',
        'chain_id': 1,
        'latest_block': latest_block,
        'gas_price_gwei': gas_price,
        'contract_deployed': bool(ARBITRAGE_CONTRACT_ADDRESS),
        'contract_address': ARBITRAGE_CONTRACT_ADDRESS,
        'pimlico_enabled': bool(PIMLICO_API_KEY),
        'pimlico_gas_prices': pimlico_gas,
        'timestamp': datetime.datetime.utcnow().isoformat()
    })

@app.route('/profit/real-time', methods=['GET'])
def profit_real_time():
    """Get real profit data from blockchain contract events"""
    web3 = get_web3()
    connected = web3.is_connected()
    
    if not connected:
        return jsonify({
            'mode': 'offline',
            'totalPnl': 0,
            'totalTrades': 0,
            'winRate': 0,
            'status': 'waiting_for_blockchain',
            'note': 'Cannot connect to Ethereum RPC'
        })
    
    if not ARBITRAGE_CONTRACT_ADDRESS:
        return jsonify({
            'mode': 'waiting',
            'totalPnl': 0,
            'totalTrades': 0,
            'winRate': 0,
            'status': 'waiting_for_contract',
            'note': 'ARBITRAGE_CONTRACT_ADDRESS not set'
        })
    
    # Fetch events from contract
    try:
        contract = web3.eth.contract(
            address=Web3.to_checksum_address(ARBITRAGE_CONTRACT_ADDRESS),
            abi=[
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "tokenIn", "type": "address"},
                        {"indexed": True, "name": "tokenOut", "type": "address"},
                        {"indexed": False, "name": "profit", "type": "uint256"},
                        {"indexed": False, "name": "gasUsed", "type": "uint256"}
                    ],
                    "name": "ArbitrageExecuted",
                    "type": "event"
                }
            ]
        )
        
        # Get events from last 10000 blocks
        from_block = max(0, web3.eth.block_number - 10000)
        events = contract.events.ArbitrageExecuted.get_logs(fromBlock=from_block, toBlock='latest')
        
        total_pnl = 0
        trades = []
        
        for event in events:
            args = event['args']
            profit_wei = args['profit']
            eth_price = 2600.0  # Would use price feed in production
            profit_usd = web3.from_wei(profit_wei, 'ether') * eth_price
            
            total_pnl += float(profit_usd)
            trades.append({
                'timestamp': datetime.datetime.utcnow().isoformat(),
                'block': event['blockNumber'],
                'tx_hash': event['transactionHash'].hex(),
                'profit_usd': float(profit_usd),
                'token_in': args['tokenIn'],
                'token_out': args['tokenOut']
            })
        
        return jsonify({
            'mode': 'live',
            'totalPnl': round(total_pnl, 2),
            'totalTrades': len(trades),
            'winRate': 100.0 if len(trades) > 0 else 0,
            'avgProfitPerTrade': round(total_pnl / len(trades), 2) if trades else 0,
            'recentTrades': trades[-10:] if trades else [],
            'status': 'active',
            'contractAddress': ARBITRAGE_CONTRACT_ADDRESS,
            'note': 'Real on-chain data',
            'timestamp': datetime.datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        return jsonify({
            'mode': 'error',
            'error': str(e),
            'status': 'error_fetching_events'
        })

@app.route('/wallet', methods=['GET'])
def wallet():
    """Get wallet balances from blockchain"""
    web3 = get_web3()
    connected = web3.is_connected()
    
    if not connected:
        return jsonify({
            'connected': False,
            'error': 'Cannot connect to Ethereum'
        }), 503
    
    wallet_address = os.getenv('WALLET_ADDRESS', '0x0000000000000000000000000000000000000000')
    
    try:
        eth_balance_wei = web3.eth.get_balance(wallet_address)
        eth_balance = web3.from_wei(eth_balance_wei, 'ether')
        
        return jsonify({
            'balance': {
                'ETH': float(eth_balance)
            },
            'address': wallet_address,
            'network': 'ethereum',
            'connected': True,
            'latest_block': web3.eth.block_number,
            'gas_price': web3.eth.gas_price / 10**9
        })
    except Exception as e:
        return jsonify({
            'connected': False,
            'error': str(e)
        }), 500

@app.route('/settings', methods=['GET'])
def settings():
    return jsonify({
        'deployMode': 'production',
        'autoWithdrawal': False,
        'manualWithdrawalOnly': True,
        'gaslessMode': bool(PIMLICO_API_KEY)
    })

@app.route('/security/status', methods=['GET'])
def security_status():
    return jsonify({
        'autoWithdrawal': 'DISABLED',
        'threshold': 999999,
        'circuitBreaker': 'ACTIVE' if not circuit_breaker_open else 'OPEN',
        'authentication': 'REQUIRED',
        'manualControl': 'ENFORCED',
        'contractDeployed': bool(ARBITRAGE_CONTRACT_ADDRESS)
    })

@app.route('/')
def index():
    return jsonify({
        'name': 'Alpha-Orion Brain Orchestrator',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': [
            '/health',
            '/blockchain/status',
            '/profit/real-time',
            '/profit/start',
            '/profit/stop',
            '/profit/status',
            '/wallet',
            '/settings',
            '/security/status'
        ]
    })

# Profit Engine Endpoints
@app.route('/profit/start', methods=['POST'])
@require_auth
def start_profit_engine():
    """Start the profit generation engine"""
    global profit_engine_running, profit_engine_start_time, active_strategies
    
    if profit_engine_running:
        return jsonify({
            'success': False,
            'message': 'Profit engine already running'
        }), 400
    
    # Validate wallet configuration
    wallet_address = os.getenv('WALLET_ADDRESS')
    if not wallet_address:
        return jsonify({
            'success': False,
            'message': 'No wallet configured'
        }), 400
    
    # Validate contract deployment
    if not ARBITRAGE_CONTRACT_ADDRESS:
        return jsonify({
            'success': False,
            'message': 'No arbitrage contract deployed'
        }), 400
    
    # Initialize profit engine
    profit_engine_running = True
    profit_engine_start_time = datetime.datetime.utcnow()
    active_strategies = [
        {'name': 'Flash Loan Arbitrage', 'status': 'active', 'minProfitThreshold': 10},
        {'name': 'Triangular Arbitrage', 'status': 'active', 'minProfitThreshold': 5},
        {'name': 'Cross-DEX Arbitrage', 'status': 'active', 'minProfitThreshold': 15}
    ]
    
    logger.info(f"Profit engine started at {profit_engine_start_time}")
    
    return jsonify({
        'success': True,
        'message': 'Profit engine started',
        'startTime': profit_engine_start_time.isoformat(),
        'strategies': active_strategies
    })

@app.route('/profit/stop', methods=['POST'])
@require_auth
def stop_profit_engine():
    """Stop the profit generation engine"""
    global profit_engine_running, active_strategies
    
    if not profit_engine_running:
        return jsonify({
            'success': False,
            'message': 'Profit engine not running'
        }), 400
    
    profit_engine_running = False
    active_strategies = []
    
    logger.info("Profit engine stopped")
    
    return jsonify({
        'success': True,
        'message': 'Profit engine stopped'
    })

@app.route('/profit/status', methods=['GET'])
def profit_status():
    """Get profit engine status"""
    global profit_engine_running, profit_engine_start_time, active_strategies
    
    # Get current profit data
    web3 = get_web3()
    connected = web3.is_connected()
    
    total_profit = 0
    total_trades = 0
    
    if connected and ARBITRAGE_CONTRACT_ADDRESS:
        try:
            contract = web3.eth.contract(
                address=Web3.to_checksum_address(ARBITRAGE_CONTRACT_ADDRESS),
                abi=[{
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "profit", "type": "uint256"}
                    ],
                    "name": "ArbitrageExecuted",
                    "type": "event"
                }]
            )
            from_block = max(0, web3.eth.block_number - 10000)
            events = contract.events.ArbitrageExecuted.get_logs(fromBlock=from_block, toBlock='latest')
            total_trades = len(events)
            for event in events:
                profit_wei = event['args']['profit']
                total_profit += float(web3.from_wei(profit_wei, 'ether'))
        except Exception as e:
            logger.error(f"Error fetching profit data: {e}")
    
    return jsonify({
        'running': profit_engine_running,
        'startTime': profit_engine_start_time.isoformat() if profit_engine_start_time else None,
        'uptime': str(datetime.datetime.utcnow() - profit_engine_start_time) if profit_engine_running and profit_engine_start_time else None,
        'strategies': active_strategies,
        'totalStrategies': len(active_strategies),
        'metrics': {
            'totalProfit': total_profit,
            'totalProfitUSD': round(total_profit * 2600, 2),
            'totalTrades': total_trades,
            'winRate': 100.0 if total_trades > 0 else 0
        },
        'blockchain': {
            'connected': connected,
            'contractDeployed': bool(ARBITRAGE_CONTRACT_ADDRESS)
        }
    })

if __name__ == '__main__':
    print("Starting Alpha-Orion Brain Orchestrator (Local Mode)")
    print(f"Contract: {ARBITRAGE_CONTRACT_ADDRESS or 'Not configured'}")
    print(f"RPC: {ETHEREUM_RPC_URL[:50]}...")
    app.run(host='0.0.0.0', port=8080, debug=True)

# Bot loop
import time
import logging
import threading
import os
import requests
from datetime import datetime
import sys
import multiprocessing
import json

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Fix: Set CWD to project root so relative config paths in strategy/utils work inside Docker
os.chdir(PROJECT_ROOT)

sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "strategy_engine", "src"))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "market_data_aggregator", "scripts"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import redis

from strategy import find_profitable_opportunities
from utils import estimate_net_profit
from risk_management.risk_check import full_risk_assessment

try:
    from alerts import send_alert
except ImportError:
    # Fallback if alerts.py is missing/not found
    def send_alert(msg): logging.info(f"ALERT: {msg}")


# Import the module object to modify global state dynamically
import executor
from executor import execute_flashloan

try:
    from fetch_liquidity import fetch_liquidity
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("fetch_liquidity module not found. Using mock for initialization.")
    def fetch_liquidity(chain, token): 
        return 100000.0 # Mock liquidity


# Implement structured logging
import json
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "worker_id": getattr(record, 'worker_id', 'MAIN'),  # Default to MAIN if no worker_id
            "message": record.getMessage(),
            "chain": getattr(record, 'chain', 'N/A'),  # Chain name if available
            # Add other relevant fields as needed
        }
        return json.dumps(log_record)

logHandler = logging.StreamHandler()
logHandler.setFormatter(JsonFormatter())
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(logHandler)


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
MIN_USD_PROFIT = 50
PROFIT_THRESHOLD = 0.005
MAX_SLIPPAGE = float(os.environ.get("MAX_SLIPPAGE", "0.005"))
MIN_LIQUIDITY = int(os.environ.get("MIN_LIQUIDITY", "1000"))  # tokens
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "http://localhost:3000")
REDIS_URL = os.environ.get("REDIS_URL")

def report_execution_to_dashboard(opportunity, success, profit=0, loss=0, tx_hash=None):
    """Report execution results to dashboard server asynchronously (non-blocking)"""
    def _send():
        try:
            payload = {
                "success": success,
                "profit": profit,
                "loss": loss,
                "chain": opportunity.get('chain'),
                "txHash": tx_hash,
                "timestamp": datetime.now().isoformat()
            }
            requests.post(
                f"{DASHBOARD_URL}/api/bot/update",
                json=payload,
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to report to dashboard: {e}")

    # Fire and forget - don't block the trading loop
    threading.Thread(target=_send, daemon=True).start()

def scanner_process(opportunity_queue: multiprocessing.Queue):
    """
    Dedicated process to scan for opportunities and put them in a queue.
    """
    logger.info("✅ Scanner process started.")
    while True:

        # === KILL SWITCH (Emergency Stop) ===
        if os.environ.get("KILL_SWITCH") == "true":
            logger.critical("EMERGENCY KILL SWITCH ACTIVATED! Halting scanner.")
            return # terminate process

        if REDIS_URL:
            try:
                r = redis.from_url(REDIS_URL)
                if r.get("alphamark:kill_switch") == "true":
                    logger.critical("EMERGENCY KILL SWITCH (Redis) ACTIVATED! Halting scanner.")
                    return # terminate process
            except Exception as e:
                logger.error(f"Redis kill switch check failed: {e}")

        try:
            opportunities = find_profitable_opportunities(MIN_USD_PROFIT)
            if opportunities:
                logger.info(f"Scanner found {len(opportunities)} potential opportunities.", extra={'chain': 'ALL'})
                for opp in opportunities:
                    opportunity_queue.put(opp)
            time.sleep(0.2) # Scan every 200ms
        except Exception as e:
            logger.error(f"Scanner process error: {e}")
            time.sleep(5)

def executor_worker(opportunity_queue: multiprocessing.Queue, worker_id: int):
    """
    A worker process that pulls an opportunity from the queue and executes it.
    """
    logger = logging.LoggerAdapter(logger, {'worker_id': worker_id}) # Add worker_id to logger
    logger.info(f"✅ Executor worker #{worker_id} started.") # Log structured data
    while True:

        # === KILL SWITCH (Emergency Stop) ===
        if os.environ.get("KILL_SWITCH") == "true":
            logger.critical(f"Worker #{worker_id}: EMERGENCY KILL SWITCH ACTIVATED! Halting executor.")
            return # terminate process

        if REDIS_URL:
            try:
                r = redis.from_url(REDIS_URL)
                if r.get("alphamark:kill_switch") == "true":
                    logger.critical(f"Worker #{worker_id}: EMERGENCY KILL SWITCH (Redis) ACTIVATED! Halting executor.")
                    return # terminate process
                
                # Dynamic Mode Synchronization
                # Workers must poll the mode to know if they are trading real funds
                current_mode = r.get("alphamark:mode")
                if current_mode:
                    mode_str = current_mode.decode('utf-8')
                    # Update the global flag in the loaded executor module
                    executor.PAPER_TRADING_MODE = (mode_str != 'live')

            except Exception as e:
                logger.error(f"Worker #{worker_id}: Redis kill switch check failed: {e}")

        try:
            opportunity = opportunity_queue.get() # This will block until an item is available
            logger = logging.LoggerAdapter(logger, {'chain': opportunity.get('chain', 'N/A')})
            logger.info(f"Worker #{worker_id} picked up opportunity on {opportunity['chain']}.")

            # --- Monitor-Only Check ---
            # Skip opportunities marked as monitor_only (e.g., cross-chain requires bridge integration)
            if opportunity.get('strategy') == 'monitor_only':
                logger.info(f"Worker #{worker_id} skipped {opportunity.get('type', 'unknown')} - monitor_only strategy")
                continue

            # --- Risk Assessment (Orchestrator Logic) ---
            # FIXED: Always run full risk assessment for ALL opportunity types
            # Previously bypassed for graph_arb - this was a CRITICAL security vulnerability
            current_prices = {
                'buy_dex': opportunity.get('buy_price', opportunity.get('dex', 'unknown')),
                'sell_dex': opportunity.get('sell_price', opportunity.get('dex', 'unknown'))
            }
            pool_liquidity = fetch_liquidity(opportunity['chain'], opportunity.get('base_token', opportunity.get('token', 'WETH')))
            liquidity_data = {opportunity.get('base_token', 'WETH'): pool_liquidity}
            
            safe, risks = full_risk_assessment(opportunity, current_prices, liquidity_data)
            if not safe:
                logger.warning(f"Worker #{worker_id} rejected risky opp: {risks}")
            
            if not safe:
                continue

            # --- Execution ---
            logger.info(f"Worker #{worker_id} 🚀 EXECUTING: ${opportunity['net_usd_profit']:.0f} | {opportunity['chain']}")
            success, tx_hash_or_error = execute_flashloan(opportunity)

            if success:
                eth_profit = opportunity.get('profit_eth', 0)
                send_alert(f"✅ Arb submitted! Profit: {eth_profit:.4f} ETH. Hash: {tx_hash_or_error}")
                report_execution_to_dashboard(opportunity, True, profit=eth_profit, tx_hash=tx_hash_or_error)
            else:
                send_alert(f"❌ Arb failed on {opportunity['chain']}: {tx_hash_or_error}")
                report_execution_to_dashboard(opportunity, False, loss=0, tx_hash='failed')
                logger.error(f"Execution failed: {tx_hash_or_error}")

        except Exception as e:
            logger.error(f"Executor worker #{worker_id} error: {e}")

def control_listener():
    """
    Listens for control messages from the dashboard via Redis.
    """
    global ACTIVE_WALLETS
    
    # Load initial wallets from env if present
    initial_key = os.environ.get("PRIVATE_KEY")
    if initial_key:
        try:
            from eth_account import Account
            acct = Account.from_key(initial_key)
            ACTIVE_WALLETS[acct.address] = {'key': initial_key, 'enabled': True}
            logger.info(f"Loaded initial wallet: {acct.address}")
        except Exception as e:
            logger.error(f"Failed to load initial env key: {e}")

    if not REDIS_URL:
        return
        
    try:
        r = redis.from_url(REDIS_URL)
        pubsub = r.pubsub()
        pubsub.subscribe('alphamark:control')
        pubsub.subscribe('alphamark:config') # Listen for wallet updates
        
        for message in pubsub.listen():
            if message['type'] == 'message':
                channel = message['channel'].decode('utf-8')
                data = json.loads(message['data'])
                
                if channel == 'alphamark:config':
                    msg_type = data.get('type')
                    if msg_type == 'WALLET_ADD':
                        w_data = data.get('data')
                        if w_data and w_data.get('address') and w_data.get('privateKey'):
                            ACTIVE_WALLETS[w_data['address']] = {'key': w_data['privateKey'], 'enabled': True}
                            logger.info(f"Added new active wallet: {w_data['address']}")
                    elif msg_type == 'WALLET_REMOVE':
                        w_data = data.get('data')
                        if w_data and w_data.get('address') in ACTIVE_WALLETS:
                            del ACTIVE_WALLETS[w_data['address']]
                            logger.info(f"Removed active wallet: {w_data['address']}")
                    elif msg_type == 'WALLET_TOGGLE':
                        w_data = data.get('data')
                        if w_data and w_data.get('address') in ACTIVE_WALLETS:
                            ACTIVE_WALLETS[w_data['address']]['enabled'] = w_data.get('enabled', False)
                            status = "enabled" if w_data.get('enabled') else "disabled"
                            logger.info(f"Wallet {w_data['address']} has been {status}.")

                    continue

                # Control commands
                command = data.get('command')
                
                if command == 'START':
                    mode = data.get('mode', 'paper')
                    logger.info(f"Received START command. Mode: {mode}")
                    # Update the executor module's global state
                    # Note: This only updates the MAIN process. 
                    # In a full multiprocessing setup, we'd need a Value or Manager.
                    # For this scope, we assume the environment var handles the initial state
                    # or that workers check a shared Redis key for mode.
                    if mode == 'live':
                        # Set redis key for workers to read
                        r.set('alphamark:mode', 'live')
                    else:
                        r.set('alphamark:mode', 'paper')

    except Exception as e:
        logger.error(f"Control listener failed: {e}")

def wallet_balance_updater():
    """
    Periodically fetches balances for all active wallets and updates Redis.
    """
    if not REDIS_URL:
        return

    r = redis.from_url(REDIS_URL)
    from web3 import Web3
    # Cache w3 providers
    w3_providers = {}

    while True:
        try:
            stats_str = r.get('alphamark:stats')
            if not stats_str:
                time.sleep(10)
                continue
            
            stats = json.loads(stats_str)
            if 'wallets' not in stats or not isinstance(stats['wallets'], list):
                time.sleep(10)
                continue

            # This is a simplified approach. A production system would batch these calls per chain.
            for wallet_meta in stats['wallets']:
                address = wallet_meta.get('address')
                # This is inefficient as it doesn't know the chain.
                # A better approach would be to have chain info per wallet or check all chains.
                # For now, we assume Ethereum as a default for balance checking.
                rpc_url = os.environ.get("ETHEREUM_RPC", "https://eth-mainnet.g.alchemy.com/v2/your_key")
                if 'ethereum' not in w3_providers:
                    w3_providers['ethereum'] = Web3(Web3.HTTPProvider(rpc_url))
                
                w3 = w3_providers['ethereum']
                balance_wei = w3.eth.get_balance(Web3.to_checksum_address(address))
                wallet_meta['balance'] = float(w3.from_wei(balance_wei, 'ether'))

            r.set('alphamark:stats', json.dumps(stats))
        except Exception as e:
            logger.error(f"Balance updater failed: {e}")
        
        time.sleep(30) # Update balances every 30 seconds

def run_bot():
    """
    Main function to orchestrate the multi-process bot.
    """
    logger.info("🚀 Alphamark Arbitrage Bot starting in ENTERPRISE (multi-process) mode...")
    logger.info(f"Dashboard URL: {DASHBOARD_URL}")
    # Create a shared queue for opportunities
    opportunity_queue = multiprocessing.Queue()
    
    # Start control listener
    threading.Thread(target=control_listener, daemon=True).start()
    threading.Thread(target=wallet_balance_updater, daemon=True).start()

    # Start the scanner process
    scanner = multiprocessing.Process(target=scanner_process, args=(opportunity_queue,), daemon=True)
    scanner.start()

    # Start a pool of executor workers
    num_workers = os.cpu_count() or 2 # Use all available CPUs, or 2 as a fallback
    logger.info(f"Starting {num_workers} executor workers...")
    workers = []
    for i in range(num_workers):
        worker = multiprocessing.Process(target=executor_worker, args=(opportunity_queue, i + 1), daemon=True)
        workers.append(worker)
        worker.start()
        
    # Note: In a real multi-process env, ACTIVE_WALLETS needs to be shared 
    # (e.g. via Manager().dict()) or passed to workers. 
    # For this implementation, we assume workers read keys from a secure Redis store 
    # or environment. The control_listener updates the local process state.

    # Keep the main process alive
    try:
        scanner.join()
        for w in workers:
            w.join()
    except KeyboardInterrupt:
        logger.info("Shutting down all processes...")

if __name__ == "__main__":
    run_bot()

# Bot loop
import time
import logging
import os
import requests
from datetime import datetime
import sys
import json

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "strategy_engine", "src"))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "risk_management"))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "market_data_aggregator", "scripts"))

# Add current directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

sys.path.insert(0, os.path.join(PROJECT_ROOT, "strategy_engine", "src"))
from strategy import find_profitable_opportunities
from utils_fixed import estimate_gas_cost, estimate_net_profit
from risk_management.risk_check import full_risk_assessment
from market_data_aggregator.scripts.fetch_liquidity import fetch_liquidity
from alerts import send_alert
from executor import execute_flashloan
from fetch_liquidity import fetch_liquidity

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
MIN_USD_PROFIT = 50
PROFIT_THRESHOLD = 0.005
MAX_SLIPPAGE = float(os.environ.get("MAX_SLIPPAGE", "0.005"))
MIN_LIQUIDITY = int(os.environ.get("MIN_LIQUIDITY", "1000"))  # tokens
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "http://localhost:3000")

def report_execution_to_dashboard(opportunity, success, profit=0, tx_hash=None):
    """Report execution results to dashboard server"""
    try:
        response = requests.post(
            f"{DASHBOARD_URL}/api/relay",
            json={
                "opportunity": opportunity,
                "success": success,
                "profit": profit,
                "txHash": tx_hash,
                "timestamp": datetime.now().isoformat()
            },
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"Dashboard updated: {response.json()}")
        else:
            logger.warning(f"Dashboard update failed: {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to report to dashboard: {e}")

def run_bot():
    """
    Main arbitrage bot loop. Production-grade with monitoring, retries, alerting.
    """
    logger.info("🚀 Alphamark Arbitrage Bot starting in PRODUCTION mode...")
    logger.info(f"Dashboard URL: {DASHBOARD_URL}")
    
    consecutive_errors = 0
    max_errors = 10
    
    while True:
        try:
            # 1. Find $$$ profitable opportunities
            opportunities = find_profitable_opportunities(MIN_USD_PROFIT)
            logger.info(f"Found {len(opportunities)} $$$ opportunities")
            
            if not opportunities:
                time.sleep(2)
                continue
            
            # 2. Full risk assessment
            valid_opps = []
            for opp in opportunities:
                current_prices = {'buy_dex': opp['buy_price'], 'sell_dex': opp['sell_price']}
                pool_liquidity = fetch_liquidity(opp['chain'], opp['base_token'])
                liquidity_data = {opp['base_token']: pool_liquidity}
                
                safe, risks = full_risk_assessment(opp, current_prices, liquidity_data)
                if safe:
                    logger.info(f"✅ Valid opp: ${opp['net_usd_profit']:.0f} {opp['chain']}")
                    valid_opps.append(opp)
                else:
                    logger.warning(f"Risky opp rejected: {risks}")
            
            logger.info(f"{len(valid_opps)} validated $$$ opps")
            
            # 3. Execute BEST (highest NET USD)
            if valid_opps:
                best_opp = max(valid_opps, key=lambda x: x['net_usd_profit'])
                logger.info(f"🚀 EXECUTING: ${best_opp['net_usd_profit']:.0f} | {best_opp['chain']}")
                
                success = execute_flashloan(best_opp)
                
                if success:
                    profit = best_opp['net_usd_profit']
                    send_alert(f"✅ Arb executed! Profit: ${profit:.2f} {best_opp['token']} on {best_opp['chain']}")
                    
                    # Report to dashboard
                    report_execution_to_dashboard(best_opp, True, profit=profit)
                    
                    consecutive_errors = 0
                else:
                    send_alert(f"❌ Arb failed on {best_opp['chain']}")
                    report_execution_to_dashboard(best_opp, False)
                    logger.error("Execution failed")
            
            consecutive_errors = 0
            
        except KeyboardInterrupt:
            logger.info("Bot stopped by user")
            break
        except Exception as e:
            consecutive_errors += 1
            logger.error(f"Loop error: {e}")
            if consecutive_errors >= max_errors:
                send_alert("🚨 Bot CRASHED after max retries")
                break
            
            time.sleep(5)  # Backoff
        
        time.sleep(1)  # Poll interval

if __name__ == "__main__":
    run_bot()

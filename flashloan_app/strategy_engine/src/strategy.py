import json
import os
import sys

# Ensure utils can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils_fixed import (
    get_price, get_multiple_prices, estimate_gas_cost, 
    estimate_net_profit, get_top_pairs, estimate_optimal_trade_size
)
from risk_management.risk_check import full_risk_assessment

# Load config with error handling
print("[STRATEGY] Loading config...")
try:
    config_path = os.path.join("config_asset_registry", "data", "contracts.json")
    print(f"[STRATEGY] Config path: {config_path}")
    with open(config_path) as f:
        config = json.load(f)
    print(f"[STRATEGY] Config loaded! Chains: {list(config.keys())}")
except Exception as e:
    print(f"ERROR: Could not load config: {e}")
    config = {}

# Profitable thresholds
MIN_NET_PROFIT_USD = 50
MAX_SLIPPAGE_PCT = 0.005
MIN_LIQUIDITY_USD = 100000

# Chains to scan (L1 expensive, L2 cheap)
PRIORITY_CHAINS = ["ethereum", "polygon", "bsc", "arbitrum", "optimism"]

CHAIN_GAS = {
    'ethereum': 40,
    'polygon': 0.1,
    'bsc': 2,
    'arbitrum': 1,
    'optimism': 1
}

def find_profitable_opportunities(min_usd_profit=50):
    """
    Scan across chains for cross-chain arbitrage opportunities.
    Compares token prices in USD terms across different chains.
    """
    opportunities = []
    chains = ["ethereum", "polygon", "bsc", "arbitrum", "optimism"]
    
    print(f"[STRATEGY] Scanning {len(chains)} chains for CROSS-CHAIN opportunities...")
    
    # Common tokens to compare across chains
    common_tokens = ["USDC", "USDT"]
    
    # Collect prices from all chains
    all_prices = {}  # {chain: {token: price_in_native}}
    
    for chain in chains:
        if chain not in config:
            continue
        
        chain_config = config[chain]
        rpc = chain_config.get('rpc')
        
        if not rpc:
            print(f"[STRATEGY] No RPC for {chain}")
            continue
        
        all_prices[chain] = {}
        
        for token in common_tokens:
            # Get price from first DEX
            dexes = chain_config.get('dexes', {})
            if not dexes:
                continue
            
            dex_name = list(dexes.keys())[0]  # Use first DEX
            price = get_price(chain, dex_name, token)
            
            if price > 0:
                all_prices[chain][token] = price
                print(f"[STRATEGY] {chain}/{token}: {price} ({CHAIN_NATIVE[chain]})")
    
    # Now compare prices across chains
    # We need to convert to a common unit (USD) to compare
    # For stablecoins, we can use the native token price
    
    print(f"\n[STRATEGY] Analyzing cross-chain opportunities...")
    
    # Get ETH prices on each chain (to normalize)
    eth_prices = {}
    for chain in chains:
        if chain in all_prices and 'WETH' in all_prices[chain]:
            # Price of ETH in USD terms (from USDC/ETH)
            if all_prices[chain].get('USDC', 0) > 0:
                # USDC per ETH = 1/price, so USD per ETH = 1/price
                eth_prices[chain] = 1.0 / all_prices[chain]['USDC']
                print(f"[STRATEGY] {chain} ETH price: ${eth_prices[chain]:,.2f}")
    
    # Compare stablecoin prices across chains (they should all be ~$1 but may differ slightly)
    for token in common_tokens:
        for chain_a in chains:
            for chain_b in chains:
                if chain_a >= chain_b:
                    continue
                
                if token not in all_prices.get(chain_a, {}) or token not in all_prices.get(chain_b, {}):
                    continue
                
                price_a = all_prices[chain_a][token]  # in native token (e.g., WETH)
                price_b = all_prices[chain_b][token]
                
                if price_a <= 0 or price_b <= 0:
                    continue
                
                # Convert to USD for comparison
                # If we have ETH prices, use them
                if chain_a in eth_prices and chain_b in eth_prices:
                    usd_a = price_a * eth_prices[chain_a]
                    usd_b = price_b * eth_prices[chain_b]
                    
                    # Calculate spread
                    spread = abs(usd_a - usd_b)
                    avg_usd = (usd_a + usd_b) / 2
                    spread_pct = spread / avg_usd if avg_usd > 0 else 0
                    
                    print(f"[STRATEGY] {token}: {chain_a}=${usd_a:.4f} vs {chain_b}=${usd_b:.4f} (spread: {spread_pct*100:.4f}%)")
                    
                    if spread_pct >= min_profit_threshold:
                        # Found opportunity!
                        buy_chain = chain_a if usd_a < usd_b else chain_b
                        sell_chain = chain_b if usd_a < usd_b else chain_a
                        
                        print(f"[STRATEGY] ✅ Cross-chain opportunity! Buy {token} on {buy_chain}, sell on {sell_chain}")
                        
                        opportunities.append({
                            "type": "cross_chain",
                            "token": token,
                            "buy_chain": buy_chain,
                            "sell_chain": sell_chain,
                            "profit": spread_pct,
                            "buy_price_usd": min(usd_a, usd_b),
                            "sell_price_usd": max(usd_a, usd_b)
                        })
    
    # Also check same-chain DEX arbitrage (as fallback)
    print(f"\n[STRATEGY] Checking same-chain DEX opportunities...")
    for chain in chains:
        if chain not in config:
            continue
        
        chain_config = config[chain]
        dexes = chain_config.get('dexes', {})
        
        if len(dexes) < 2:
            continue
        
        for token in common_tokens:
            prices = {}
            for dex_name, dex_addr in dexes.items():
                price = get_price(chain, dex_name, token)
                if price > 0:
                    prices[dex_name] = price
            
            if len(prices) < 2:
                continue
            
            buy_dex = min(prices, key=prices.get)
            sell_dex = max(prices, key=prices.get)
            buy_price = prices[buy_dex]
            sell_price = prices[sell_dex]
            
            spread_pct = abs(sell_price - buy_price) / buy_price if buy_price > 0 else 0
            
            print(f"[STRATEGY] {chain}/{token}: {buy_dex}={buy_price} vs {sell_dex}={sell_price} (spread: {spread_pct*100:.4f}%)")
            
            if spread_pct >= min_profit_threshold:
                print(f"[STRATEGY] ✅ Same-chain opportunity on {chain}!")
                opportunities.append({
                    "type": "same_chain",
                    "chain": chain,
                    "token": token,
                    "buy_dex": buy_dex,
                    "sell_dex": sell_dex,
                    "profit": spread_pct
                })
    
    print(f"\n[STRATEGY] Found {len(opportunities)} total opportunities!")
    return opportunities


if __name__ == "__main__":
    print(find_cross_chain_opportunities())

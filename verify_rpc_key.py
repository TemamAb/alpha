import requests
import argparse
import json
import sys
import time
import random

# --- DYNAMIC MODE: ADAPTIVE RATE LIMITER ---
class DynamicRateLimiter:
    def __init__(self, initial_delay=2.0):
        self.optimal_delay = initial_delay
        self.min_delay = 0.5
        self.max_delay = 60.0
        self.success_streak = 0

    def on_success(self):
        self.success_streak += 1
        if self.success_streak >= 3:
            # Gradually try to speed up after success streak
            self.optimal_delay = max(self.min_delay, self.optimal_delay * 0.8)
            self.success_streak = 0

    def on_rate_limit(self, chain_name):
        self.success_streak = 0
        # Aggressive exponential backoff
        self.optimal_delay = min(self.max_delay, self.optimal_delay * 3.0 + 2.0)
        print(f"📉 [DYNAMIC] Rate limit on {chain_name}. Scaling back to {self.optimal_delay:.1f}s delay...")
        time.sleep(self.optimal_delay) # Mandatory cool-down

    def wait(self):
        # Spacing out requests with jitter to avoid rhythmic detection
        time.sleep(self.optimal_delay + random.uniform(0.1, 0.5))

limiter = DynamicRateLimiter()

def test_rpc_endpoint(chain_name, url):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_blockNumber",
        "params": []
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "AlphaMark-Bot/1.0",
        "Connection": "keep-alive"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15) # Increased timeout for potentially slower public RPCs
        if response.status_code == 200 and "result" in response.json():
            data = response.json()
            if "result" in data:
                block = int(data["result"], 16)
                print(f"✅ {chain_name:15} | Connected | Block: {block}")
                return True
            else:
                error_msg = data.get("error", {}).get("message", "Unknown RPC error")
                print(f"❌ {chain_name:15} | RPC Error | {error_msg}")
        elif response.status_code == 401:
            print(f"❌ {chain_name:15} | Auth Error | Invalid API Key (401)")
        elif response.status_code == 429:
            try:
                error_body = response.json()
                err_msg = error_body.get("error", {}).get("message", "").lower()
                # INFURA & ALCHEMY: Detection of hard quota exhaustion
                if any(phrase in err_msg for phrase in ["count exceeded", "rate limit", "limit exceeded", "compute unit", "credit"]):
                    print(f"🛑 CRITICAL: Quota Exhausted for {chain_name}!")
                    print(f"   Message: {err_msg}")
                    return "QUOTA_EXHAUSTED"
            except Exception:
                pass
            limiter.on_rate_limit(chain_name)
            return False
        else:
            print(f"❌ {chain_name:15} | HTTP {response.status_code} | {response.text[:50]}")
    except Exception as e:
        print(f"❌ {chain_name:15} | Exception  | {str(e)}")
    return False

def run_validation(rpc_url: str, chain_name: str = "Generic RPC"):
    print(f"\n🔍 Starting DYNAMIC RPC Validation for: {chain_name} ({rpc_url[:50]}...)")
    print("ℹ️  Adaptive Mode: Adjusting backoff to find optimal throughput.")
    print("-" * 65)
    
    results = []
    success = False
    retries = 0
    while not success and retries < 5:
        limiter.wait()
        status = test_rpc_endpoint(chain_name, rpc_url)
        if status is True:
            success = True
            limiter.on_success()
        elif status == "QUOTA_EXHAUSTED": # This is Alchemy-specific, but keeping for now if the user re-uses the script for Alchemy
            print(f"🛑 CRITICAL: RPC Quota Exhausted for {chain_name}!")
            sys.exit(1)
        else:
            retries += 1
            if limiter.optimal_delay >= limiter.max_delay:
                print(f"⏩ Max delay reached for {chain_name}. Skipping to avoid hang.")
                break
            if retries < 5:
                print(f"🔄 Retrying {chain_name} ({retries}/5) with learned backoff...")
    
    results.append(success)

    success_count = sum(results)
    print("-" * 65)
    print(f"📊 Summary: {success_count}/1 endpoint functional.")
    
    if success_count == len(results) and len(results) > 0:
        print(f"\n🚀 RPC for {chain_name} is functional.")
        sys.exit(0)
    elif success_count > 0:
        print(f"\n⚠️  RPC Audit partially successful ({success_count}/{len(results)}). Check specific chain failures.")
        sys.exit(0) # Proceed but with caution
    else:
        print(f"\n❌ RPC for {chain_name} is invalid or blocked. Profit generation will fail.")
        sys.exit(1)

def run_infura_audit(key: str):
    print(f"\n🌐 Starting Global Infura Multi-Chain Audit for Key: {key[:6]}...")
    networks = [
        ("Ethereum", "mainnet"),
        ("Polygon", "polygon-mainnet"),
        ("Arbitrum", "arbitrum-mainnet"),
        ("Optimism", "optimism-mainnet"),
        ("Base", "base-mainnet"),
        ("Avalanche", "avalanche-mainnet"),
        ("Linea", "linea-mainnet"),
        ("Celo", "celo-mainnet"),
        ("Scroll", "scroll-mainnet")
    ]
    
    success_count = 0
    for name, sub in networks:
        url = f"https://{sub}.infura.io/v3/{key}"
        limiter.wait()
        if test_rpc_endpoint(name, url):
            success_count += 1
            limiter.on_success()
    
    print("-" * 65)
    print(f"📊 Summary: {success_count}/{len(networks)} functional.")
    if success_count == len(networks):
        print("🚀 Infura Key is fully functional across all production extensions.")
    elif success_count > 0:
        print("⚠️  Key is partially active. Check Infura Dashboard for network add-ons.")
    else:
        print("❌ Key failed validation.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dynamically validate an RPC endpoint.")
    parser.add_argument("rpc_url", nargs='?', help="The RPC URL to validate.")
    parser.add_argument("--chain", default="Generic RPC", help="Name of the chain for logging.")
    parser.add_argument("--infura-key", help="Batch test all Infura subdomains with this key.")
    args = parser.parse_args()
    if args.infura_key:
        run_infura_audit(args.infura_key)
    elif args.rpc_url:
        run_validation(args.rpc_url, args.chain)
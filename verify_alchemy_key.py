import requests
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

def test_alchemy_endpoint(chain_name, url):
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
        response = requests.post(url, json=payload, headers=headers, timeout=10)
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
                # Check for hard quota exhaustion
                if "compute unit" in err_msg or "credit" in err_msg or "limit" in err_msg:
                    print(f"🛑 CRITICAL: Alchemy Quota Exhausted for {chain_name}!")
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

def run_validation():
    # The key provided for verification
    key = "AiTkecJt-cMKIYl_Wm3W5"
    
    # List of endpoints to verify based on Alchemy's multi-chain support
    endpoints = {
        "Ethereum Mainnet": f"https://eth-mainnet.g.alchemy.com/v2/{key}",
        "Ethereum Sepolia": f"https://eth-sepolia.g.alchemy.com/v2/{key}",
        "Ethereum Holesky": f"https://eth-holesky.g.alchemy.com/v2/{key}",
        "Polygon Mainnet": f"https://polygon-mainnet.g.alchemy.com/v2/{key}",
        "Arbitrum Mainnet": f"https://arb-mainnet.g.alchemy.com/v2/{key}",
        "Base Mainnet": f"https://base-mainnet.g.alchemy.com/v2/{key}"
    }
    
    print(f"\n🔍 Starting DYNAMIC Alchemy Key Validation for: {key}")
    print("ℹ️  Hyper-Conservative Mode: Checking fresh key activation status...")
    print("-" * 65)
    
    results = []
    for chain, url in endpoints.items():
        success = False
        retries = 0
        while not success and retries < 5:
            limiter.wait()
            status = test_alchemy_endpoint(chain, url)
            if status is True:
                success = True
                limiter.on_success()
            elif status == "QUOTA_EXHAUSTED":
                print(f"🛑 Stopping validation. Key '{key}' has no remaining credits.")
                sys.exit(1)
            else:
                retries += 1
                if limiter.optimal_delay >= limiter.max_delay:
                    print(f"⏩ Max delay reached for {chain}. Skipping to avoid hang.")
                    break
                if retries < 5:
                    print(f"🔄 Retrying {chain} ({retries}/5) with learned backoff...")
        
        results.append(success)

    success_count = sum(results)
    print("-" * 65)
    print(f"📊 Summary: {success_count}/{len(endpoints)} endpoints functional.")
    
    if success_count == len(endpoints):
        print("\n🚀 The key is FULLY valid and all requested networks are active.")
        sys.exit(0)
    elif success_count > 0:
        print("\n⚠️  The key is working, but failed on some networks. Check Alchemy dashboard.")
        sys.exit(0) # Proceed but with caution
    else:
        print("\n❌ The key is invalid or blocked. Profit generation will fail.")
        sys.exit(1)

if __name__ == "__main__":
    run_validation()
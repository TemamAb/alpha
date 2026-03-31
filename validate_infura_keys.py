#!/usr/bin/env python3
"""
Infura API Key Validation Script
Tests Infura endpoints to verify API keys are valid and working.
"""

import requests
import json
import time
from datetime import datetime

# Infura API key from .env file
INFURA_KEY = "264da6b977804b3880d76c0fe2ac8213"

# List of Infura endpoints to test (sample of major chains)
INFURA_ENDPOINTS = [
    {"name": "Ethereum Mainnet", "url": f"https://mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Ethereum Sepolia", "url": f"https://sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Polygon Mainnet", "url": f"https://polygon-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Polygon Amoy", "url": f"https://polygon-amoy.infura.io/v3/{INFURA_KEY}"},
    {"name": "Arbitrum Mainnet", "url": f"https://arbitrum-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Arbitrum Sepolia", "url": f"https://arbitrum-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Optimism Mainnet", "url": f"https://optimism-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Optimism Sepolia", "url": f"https://optimism-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Base Mainnet", "url": f"https://base-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Base Sepolia", "url": f"https://base-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Blast Mainnet", "url": f"https://blast-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Blast Sepolia", "url": f"https://blast-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Avalanche Mainnet", "url": f"https://avalanche-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Avalanche Fuji", "url": f"https://avalanche-fuji.infura.io/v3/{INFURA_KEY}"},
    {"name": "BSC Mainnet", "url": f"https://bsc-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "BSC Testnet", "url": f"https://bsc-testnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Linea Mainnet", "url": f"https://linea-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Linea Sepolia", "url": f"https://linea-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Scroll Mainnet", "url": f"https://scroll-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Scroll Sepolia", "url": f"https://scroll-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Mantle Mainnet", "url": f"https://mantle-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Mantle Sepolia", "url": f"https://mantle-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "opBNB Mainnet", "url": f"https://opbnb-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "opBNB Testnet", "url": f"https://opbnb-testnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Starknet Mainnet", "url": f"https://starknet-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Starknet Sepolia", "url": f"https://starknet-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "ZKsync Mainnet", "url": f"https://zksync-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "ZKsync Sepolia", "url": f"https://zksync-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Celo Mainnet", "url": f"https://celo-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Solana Mainnet", "url": f"https://solana-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Solana Devnet", "url": f"https://solana-devnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Swellchain Mainnet", "url": f"https://swellchain-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Swellchain Testnet", "url": f"https://swellchain-testnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Unichain Mainnet", "url": f"https://unichain-mainnet.infura.io/v3/{INFURA_KEY}"},
    {"name": "Unichain Sepolia", "url": f"https://unichain-sepolia.infura.io/v3/{INFURA_KEY}"},
    {"name": "Sei Mainnet", "url": f"https://sei-mainnet.infura.io/v3/{INFURA_KEY}"},
]

def test_evm_endpoint(url, name):
    """Test an EVM-compatible endpoint by calling eth_blockNumber"""
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_blockNumber",
        "params": [],
        "id": 1
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "result" in data:
            block_number = int(data["result"], 16)
            return {"status": "SUCCESS", "block_number": block_number, "error": None}
        elif "error" in data:
            return {"status": "ERROR", "block_number": None, "error": data["error"]}
        else:
            return {"status": "ERROR", "block_number": None, "error": "Unexpected response format"}
            
    except requests.exceptions.RequestException as e:
        return {"status": "FAILED", "block_number": None, "error": str(e)}

def test_solana_endpoint(url, name):
    """Test a Solana endpoint by calling getSlot"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSlot"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "result" in data:
            slot = data["result"]
            return {"status": "SUCCESS", "slot": slot, "error": None}
        elif "error" in data:
            return {"status": "ERROR", "slot": None, "error": data["error"]}
        else:
            return {"status": "ERROR", "slot": None, "error": "Unexpected response format"}
            
    except requests.exceptions.RequestException as e:
        return {"status": "FAILED", "slot": None, "error": str(e)}

def main():
    print("=" * 80)
    print("INFURA API KEY VALIDATION REPORT")
    print("=" * 80)
    print(f"API Key: {INFURA_KEY}")
    print(f"Validation Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print("=" * 80)
    print()
    
    results = []
    success_count = 0
    error_count = 0
    failed_count = 0
    
    for endpoint in INFURA_ENDPOINTS:
        name = endpoint["name"]
        url = endpoint["url"]
        
        print(f"Testing {name}...", end=" ", flush=True)
        
        # Determine if this is a Solana endpoint
        is_solana = "solana" in name.lower()
        
        if is_solana:
            result = test_solana_endpoint(url, name)
            if result["status"] == "SUCCESS":
                print(f"✓ SUCCESS (Slot: {result['slot']})")
                success_count += 1
            elif result["status"] == "ERROR":
                print(f"✗ ERROR: {result['error']}")
                error_count += 1
            else:
                print(f"✗ FAILED: {result['error']}")
                failed_count += 1
        else:
            result = test_evm_endpoint(url, name)
            if result["status"] == "SUCCESS":
                print(f"✓ SUCCESS (Block: {result['block_number']})")
                success_count += 1
            elif result["status"] == "ERROR":
                print(f"✗ ERROR: {result['error']}")
                error_count += 1
            else:
                print(f"✗ FAILED: {result['error']}")
                failed_count += 1
        
        results.append({
            "name": name,
            "url": url,
            "result": result
        })
        
        # Small delay to avoid rate limiting
        time.sleep(0.5)
    
    print()
    print("=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print(f"Total Endpoints Tested: {len(INFURA_ENDPOINTS)}")
    print(f"Successful: {success_count}")
    print(f"Errors: {error_count}")
    print(f"Failed: {failed_count}")
    print()
    
    if success_count == len(INFURA_ENDPOINTS):
        print("✓ ALL INFURA ENDPOINTS ARE WORKING CORRECTLY!")
    elif success_count > 0:
        print(f"⚠ PARTIAL SUCCESS: {success_count}/{len(INFURA_ENDPOINTS)} endpoints working")
    else:
        print("✗ ALL INFURA ENDPOINTS FAILED - API KEY MAY BE INVALID")
    
    print("=" * 80)
    
    # Save detailed results to JSON file
    with open("infura_validation_results.json", "w") as f:
        json.dump({
            "api_key": INFURA_KEY,
            "validation_time": datetime.utcnow().isoformat(),
            "summary": {
                "total": len(INFURA_ENDPOINTS),
                "success": success_count,
                "error": error_count,
                "failed": failed_count
            },
            "results": results
        }, f, indent=2)
    
    print(f"\nDetailed results saved to: infura_validation_results.json")

if __name__ == "__main__":
    main()

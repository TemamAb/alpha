"""
AlphaMark Deployment Verification Script
Verifies all aspects of the deployment are working correctly.
"""

import os
import sys
import json
import requests
import redis
from web3 import Web3

def check_dashboard_health(base_url):
    """Check dashboard health endpoint."""
    print("\n" + "="*60)
    print("1. DASHBOARD HEALTH CHECK")
    print("="*60)
    
    try:
        response = requests.get(f"{base_url}/api/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dashboard is healthy")
            print(f"   Redis: {data.get('redis', 'unknown')}")
            print(f"   Engine: {data.get('engine', 'unknown')}")
            return True
        else:
            print(f"❌ Dashboard health check failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Dashboard health check failed: {e}")
        return False

def check_environment_variables():
    """Check critical environment variables."""
    print("\n" + "="*60)
    print("2. ENVIRONMENT VARIABLES CHECK")
    print("="*60)
    
    critical_vars = ['REDIS_URL']
    important_vars = [
        'PRIVATE_KEY', 'WALLET_ADDRESS', 'DEPLOYER_ADDRESS',
        'PIMLICO_API_KEY', 'FLASHLOAN_CONTRACT_ADDRESS'
    ]
    rpc_vars = [
        'ETH_RPC_URL', 'POLYGON_RPC_URL', 'BSC_RPC_URL',
        'ARBITRUM_RPC_URL', 'OPTIMISM_RPC_URL', 'BASE_RPC_URL', 'AVALANCHE_RPC_URL'
    ]
    
    all_critical_set = True
    working_rpcs = []
    
    print("\nCritical Variables:")
    for var in critical_vars:
        value = os.environ.get(var)
        if value:
            print(f"  ✅ {var}: Set")
        else:
            print(f"  ❌ {var}: NOT SET")
            all_critical_set = False
    
    print("\nImportant Variables:")
    for var in important_vars:
        value = os.environ.get(var)
        if value and 'YOUR_' not in value:
            print(f"  ✅ {var}: Set")
        else:
            print(f"  ⚠️ {var}: Not set or placeholder")
    
    print("\nRPC Variables:")
    for var in rpc_vars:
        value = os.environ.get(var)
        if value and 'YOUR_' not in value:
            print(f"  ✅ {var}: Set")
            working_rpcs.append(var)
        else:
            print(f"  ⚠️ {var}: Not set")
    
    if not working_rpcs:
        print("\n⚠️ No RPC URLs configured. Bot will run in monitor-only mode.")
    
    return all_critical_set

def check_redis_connection():
    """Check Redis connection."""
    print("\n" + "="*60)
    print("3. REDIS CONNECTION CHECK")
    print("="*60)
    
    redis_url = os.environ.get('REDIS_URL')
    if not redis_url:
        print("❌ REDIS_URL is not set")
        return False
    
    try:
        r = redis.from_url(redis_url, socket_timeout=5, socket_connect_timeout=5)
        r.ping()
        print("✅ Redis connection successful")
        
        # Check bot status
        status = r.get('alphamark:status')
        mode = r.get('alphamark:mode')
        print(f"   Engine Status: {status or 'UNKNOWN'}")
        print(f"   Engine Mode: {mode or 'UNKNOWN'}")
        
        # Check heartbeat
        heartbeat = r.hgetall('alphamark:heartbeat')
        if heartbeat:
            print(f"   Last Heartbeat: {heartbeat.get('timestamp', 'UNKNOWN')}")
            print(f"   Active Opportunities: {heartbeat.get('activeOpps', '0')}")
        else:
            print("   ⚠️ No heartbeat found (bot may not be running)")
        
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

def check_rpc_connections():
    """Check RPC connections."""
    print("\n" + "="*60)
    print("4. RPC CONNECTIONS CHECK")
    print("="*60)
    
    rpc_vars = [
        ('ETH_RPC_URL', 'Ethereum'),
        ('POLYGON_RPC_URL', 'Polygon'),
        ('BSC_RPC_URL', 'BSC'),
        ('ARBITRUM_RPC_URL', 'Arbitrum'),
        ('OPTIMISM_RPC_URL', 'Optimism'),
        ('BASE_RPC_URL', 'Base'),
        ('AVALANCHE_RPC_URL', 'Avalanche'),
    ]
    
    working_rpcs = []
    
    for var, chain_name in rpc_vars:
        url = os.environ.get(var)
        if not url or 'YOUR_' in url:
            print(f"  ⚠️ {chain_name}: Not configured")
            continue
        
        try:
            w3 = Web3(Web3.HTTPProvider(url, request_kwargs={'timeout': 5}))
            if w3.is_connected():
                block_number = w3.eth.block_number
                print(f"  ✅ {chain_name}: Connected (block #{block_number})")
                working_rpcs.append(chain_name)
            else:
                print(f"  ❌ {chain_name}: Connection failed")
        except Exception as e:
            print(f"  ❌ {chain_name}: Connection error - {e}")
    
    if not working_rpcs:
        print("\n⚠️ No working RPC connections found.")
        return False
    
    print(f"\n✅ Working RPCs: {', '.join(working_rpcs)}")
    return True

def check_bot_status(base_url):
    """Check bot status via dashboard."""
    print("\n" + "="*60)
    print("5. BOT STATUS CHECK")
    print("="*60)
    
    try:
        response = requests.get(f"{base_url}/api/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            print(f"Engine Status: {data.get('engineStatus', 'UNKNOWN')}")
            print(f"Current Mode: {data.get('currentMode', 'UNKNOWN')}")
            print(f"Total Profit: ${data.get('totalProfit', 0):.4f}")
            print(f"Win Rate: {data.get('winRate', 0):.1f}%")
            print(f"Total Trades: {data.get('trades', 0)}")
            print(f"Active Opportunities: {data.get('activeOpps', 0)}")
            
            # Check performance metrics
            perf = data.get('performanceMetrics', {})
            if perf:
                print(f"\nPerformance Metrics:")
                print(f"  Scan Latency: {perf.get('scanLatencyMs', 0):.2f}ms")
                print(f"  Execution Latency: {perf.get('executionLatencyMs', 0):.2f}ms")
                print(f"  RPC Latency: {perf.get('rpcLatencyMs', 0):.2f}ms")
                print(f"  Opportunities Found: {perf.get('opportunitiesFound', 0)}")
                print(f"  Successful Executions: {perf.get('successfulExecutions', 0)}")
                print(f"  Failed Executions: {perf.get('failedExecutions', 0)}")
            
            # Check if bot is actually running
            if data.get('engineStatus') == 'RUNNING':
                if data.get('activeOpps', 0) > 0:
                    print("\n✅ Bot is running and finding opportunities")
                    return True
                else:
                    print("\n⚠️ Bot is running but not finding opportunities")
                    print("   This could mean:")
                    print("   - No profitable opportunities exist right now")
                    print("   - RPC connections are not working")
                    print("   - Bot is not scanning correctly")
                    return True
            else:
                print(f"\n❌ Bot is not running (status: {data.get('engineStatus', 'UNKNOWN')})")
                return False
        else:
            print(f"❌ Failed to get bot status: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Failed to get bot status: {e}")
        return False

def main():
    """Main verification function."""
    print("="*60)
    print("ALPHAMARK DEPLOYMENT VERIFICATION")
    print("="*60)
    
    # Get base URL
    base_url = os.environ.get('DASHBOARD_URL', 'https://alpha-104.onrender.com')
    print(f"\nDashboard URL: {base_url}")
    
    # Run all checks
    checks = [
        ("Dashboard Health", lambda: check_dashboard_health(base_url)),
        ("Environment Variables", check_environment_variables),
        ("Redis Connection", check_redis_connection),
        ("RPC Connections", check_rpc_connections),
        ("Bot Status", lambda: check_bot_status(base_url)),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} check failed with exception: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n✅ ALL CHECKS PASSED - Deployment is healthy!")
        return 0
    else:
        print(f"\n❌ {failed} CHECKS FAILED - Deployment needs attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())

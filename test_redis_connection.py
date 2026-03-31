"""
Test Redis Connection for AlphaMark
Verifies Redis connection and basic operations.
"""

import os
import sys
import redis
import json

def test_redis_connection():
    """Test Redis connection and basic operations."""
    print("="*60)
    print("ALPHAMARK REDIS CONNECTION TEST")
    print("="*60)
    
    # Get Redis URL
    redis_url = os.environ.get('REDIS_URL')
    if not redis_url:
        print("❌ REDIS_URL environment variable is not set")
        print("\nTo set it:")
        print("  Windows: set REDIS_URL=redis://...")
        print("  Linux/Mac: export REDIS_URL=redis://...")
        return False
    
    print(f"🔍 Testing Redis connection...")
    print(f"   URL: {redis_url[:50]}...")
    
    try:
        # Test connection
        r = redis.from_url(
            redis_url,
            socket_timeout=5,
            socket_connect_timeout=5,
            decode_responses=True
        )
        
        # Test ping
        r.ping()
        print("✅ Redis PING successful")
        
        # Test write
        test_key = 'alphamark:test:connection'
        test_value = {'status': 'ok', 'timestamp': '2026-03-31'}
        r.set(test_key, json.dumps(test_value), ex=60)
        print("✅ Redis WRITE successful")
        
        # Test read
        stored = r.get(test_key)
        if stored:
            stored_data = json.loads(stored)
            print(f"✅ Redis READ successful: {stored_data}")
        else:
            print("⚠️ Redis READ returned None")
        
        # Test delete
        r.delete(test_key)
        print("✅ Redis DELETE successful")
        
        # Test publish
        r.publish('alphamark:test', json.dumps({'test': True}))
        print("✅ Redis PUBLISH successful")
        
        # Test hash operations
        r.hset('alphamark:test:hash', mapping={'field1': 'value1', 'field2': 'value2'})
        hash_data = r.hgetall('alphamark:test:hash')
        print(f"✅ Redis HASH operations successful: {hash_data}")
        r.delete('alphamark:test:hash')
        
        # Test list operations
        r.lpush('alphamark:test:list', 'item1', 'item2', 'item3')
        list_data = r.lrange('alphamark:test:list', 0, -1)
        print(f"✅ Redis LIST operations successful: {list_data}")
        r.delete('alphamark:test:list')
        
        print("\n" + "="*60)
        print("✅ ALL REDIS TESTS PASSED")
        print("="*60)
        return True
        
    except redis.ConnectionError as e:
        print(f"\n❌ Redis connection error: {e}")
        print("\nPossible causes:")
        print("  1. Redis service is not running")
        print("  2. Redis URL is incorrect")
        print("  3. Network/firewall blocking connection")
        print("  4. Redis requires authentication")
        return False
        
    except redis.TimeoutError as e:
        print(f"\n❌ Redis timeout error: {e}")
        print("\nPossible causes:")
        print("  1. Redis service is overloaded")
        print("  2. Network latency is too high")
        print("  3. Redis service is not responding")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_redis_connection()
    sys.exit(0 if success else 1)

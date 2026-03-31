"""
AlphaMark Bot Startup Validator
Validates critical environment variables and connections before starting the bot.
Fails fast with clear error messages if configuration is invalid.
"""

import os
import sys
import logging
import redis
from web3 import Web3

logger = logging.getLogger(__name__)

def validate_environment():
    """
    Validate critical environment variables.
    Returns True if all critical vars are set, False otherwise.
    """
    logger.info("🔍 Validating environment variables...")
    
    # Critical variables (bot cannot start without these)
    critical_vars = {
        'REDIS_URL': 'Redis connection URL (required for bot-dashboard communication)',
    }
    
    # Important variables (bot can start but functionality will be limited)
    important_vars = {
        'PRIVATE_KEY': 'Wallet private key (required for live trading)',
        'WALLET_ADDRESS': 'Wallet address (required for live trading)',
        'DEPLOYER_ADDRESS': 'Deployer address (required for contract interactions)',
        'PIMLICO_API_KEY': 'Pimlico API key (required for gasless transactions)',
        'FLASHLOAN_CONTRACT_ADDRESS': 'FlashLoan contract address (required for execution)',
    }
    
    # RPC variables (at least one should be set for live trading)
    rpc_vars = [
        'ETH_RPC_URL', 'ETHEREUM_RPC_URL', 'ETH_RPC', 'ETHEREUM_RPC',
        'POLYGON_RPC_URL', 'POLYGON_RPC',
        'BSC_RPC_URL', 'BSC_RPC',
        'ARBITRUM_RPC_URL', 'ARBITRUM_RPC',
        'OPTIMISM_RPC_URL', 'OPTIMISM_RPC',
        'BASE_RPC_URL', 'BASE_RPC',
        'AVALANCHE_RPC_URL', 'AVALANCHE_RPC',
    ]
    
    missing_critical = []
    missing_important = []
    working_rpcs = []
    
    # Check critical variables
    for var, description in critical_vars.items():
        value = os.environ.get(var)
        if not value:
            missing_critical.append(f"  ❌ {var}: {description}")
            logger.error(f"CRITICAL: {var} is not set. {description}")
        else:
            logger.info(f"  ✅ {var}: Set")
    
    # Check important variables
    for var, description in important_vars.items():
        value = os.environ.get(var)
        if not value or 'YOUR_' in value:
            missing_important.append(f"  ⚠️ {var}: {description}")
            logger.warning(f"IMPORTANT: {var} is not set or is placeholder. {description}")
        else:
            logger.info(f"  ✅ {var}: Set")
    
    # Check RPC variables
    for var in rpc_vars:
        value = os.environ.get(var)
        if value and 'YOUR_' not in value:
            working_rpcs.append(var)
            logger.info(f"  ✅ {var}: Set")
    
    if not working_rpcs:
        logger.warning("⚠️ No RPC URLs configured. Bot will run in monitor-only mode.")
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("ENVIRONMENT VALIDATION SUMMARY")
    logger.info("="*60)
    
    if missing_critical:
        logger.error(f"\n🚨 CRITICAL ISSUES ({len(missing_critical)}):")
        for issue in missing_critical:
            logger.error(issue)
        logger.error("\n❌ Bot cannot start without these variables. Exiting.")
        return False
    
    if missing_important:
        logger.warning(f"\n⚠️ IMPORTANT ISSUES ({len(missing_important)}):")
        for issue in missing_important:
            logger.warning(issue)
        logger.warning("\n⚠️ Bot will start but live trading functionality will be limited.")
    
    if working_rpcs:
        logger.info(f"\n✅ WORKING RPCs ({len(working_rpcs)}):")
        for rpc in working_rpcs:
            logger.info(f"  ✅ {rpc}")
    else:
        logger.warning("\n⚠️ No working RPCs found. Bot will run in monitor-only mode.")
    
    logger.info("\n" + "="*60)
    return True

def validate_redis_connection():
    """
    Validate Redis connection.
    Returns True if connection successful, False otherwise.
    """
    logger.info("\n🔍 Validating Redis connection...")
    
    redis_url = os.environ.get('REDIS_URL')
    if not redis_url:
        logger.error("❌ REDIS_URL is not set. Cannot validate Redis connection.")
        return False
    
    try:
        r = redis.from_url(redis_url, socket_timeout=5, socket_connect_timeout=5)
        r.ping()
        logger.info("✅ Redis connection successful")
        
        # Test write
        r.set('alphamark:health_check', 'ok', ex=10)
        value = r.get('alphamark:health_check')
        if value == b'ok':
            logger.info("✅ Redis write/read successful")
        else:
            logger.warning("⚠️ Redis write/read test failed")
        
        # Test publish
        r.publish('alphamark:health_check', '{"test": true}')
        logger.info("✅ Redis publish successful")
        
        return True
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        logger.error("❌ Bot cannot start without Redis. Exiting.")
        return False

def validate_rpc_connections():
    """
    Validate RPC connections.
    Returns list of working RPCs.
    """
    logger.info("\n🔍 Validating RPC connections...")
    
    rpc_vars = [
        'ETH_RPC_URL', 'ETHEREUM_RPC_URL', 'ETH_RPC', 'ETHEREUM_RPC',
        'POLYGON_RPC_URL', 'POLYGON_RPC',
        'BSC_RPC_URL', 'BSC_RPC',
        'ARBITRUM_RPC_URL', 'ARBITRUM_RPC',
        'OPTIMISM_RPC_URL', 'OPTIMISM_RPC',
        'BASE_RPC_URL', 'BASE_RPC',
        'AVALANCHE_RPC_URL', 'AVALANCHE_RPC',
    ]
    
    working_rpcs = []
    
    for var in rpc_vars:
        url = os.environ.get(var)
        if not url or 'YOUR_' in url:
            continue
        
        try:
            w3 = Web3(Web3.HTTPProvider(url, request_kwargs={'timeout': 5}))
            if w3.is_connected():
                block_number = w3.eth.block_number
                logger.info(f"✅ {var}: Connected (block #{block_number})")
                working_rpcs.append(var)
            else:
                logger.warning(f"⚠️ {var}: Connection failed")
        except Exception as e:
            logger.warning(f"⚠️ {var}: Connection error - {e}")
    
    if not working_rpcs:
        logger.warning("⚠️ No working RPC connections found. Bot will run in monitor-only mode.")
    else:
        logger.info(f"\n✅ Working RPCs: {len(working_rpcs)}")
    
    return working_rpcs

def validate_all():
    """
    Run all validations.
    Returns True if all critical validations pass, False otherwise.
    """
    logger.info("="*60)
    logger.info("ALPHAMARK BOT STARTUP VALIDATION")
    logger.info("="*60)
    
    # Step 1: Validate environment variables
    if not validate_environment():
        return False
    
    # Step 2: Validate Redis connection
    if not validate_redis_connection():
        return False
    
    # Step 3: Validate RPC connections (non-critical)
    working_rpcs = validate_rpc_connections()
    
    # Final summary
    logger.info("\n" + "="*60)
    logger.info("VALIDATION COMPLETE")
    logger.info("="*60)
    
    if working_rpcs:
        logger.info("✅ All critical validations passed. Bot can start.")
        logger.info(f"✅ Working RPCs: {len(working_rpcs)}")
        return True
    else:
        logger.warning("⚠️ Critical validations passed but no RPCs available.")
        logger.warning("⚠️ Bot will start in monitor-only mode.")
        return True

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run validation
    if validate_all():
        logger.info("\n✅ Startup validation passed. Proceeding with bot startup.")
        sys.exit(0)
    else:
        logger.error("\n❌ Startup validation failed. Bot cannot start.")
        sys.exit(1)

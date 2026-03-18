#!/usr/bin/env python3
"""
Alpha-Orion Strategies Deployment Script
Deploys all 10 arbitrage strategies to production
"""

import os
import sys
import json
import yaml
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_config(config_path: str) -> dict:
    """Load production configuration"""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


def validate_config(config: dict) -> bool:
    """Validate configuration"""
    required_keys = ['strategies', 'apis', 'risk_management']
    
    for key in required_keys:
        if key not in config:
            logger.error(f"Missing required config key: {key}")
            return False
    
    # Validate each strategy has required fields
    for strategy_name, strategy_config in config.get('strategies', {}).items():
        if 'enabled' not in strategy_config:
            logger.warning(f"Strategy {strategy_name} missing 'enabled' field, defaulting to True")
            strategy_config['enabled'] = True
    
    return True


def deploy_strategies(config_path: str = None):
    """Deploy all strategies"""
    if config_path is None:
        config_path = os.path.join(
            os.path.dirname(__file__), 
            'config', 
            'production_config.yaml'
        )
    
    logger.info("=" * 60)
    logger.info("Alpha-Orion Strategies Deployment")
    logger.info("=" * 60)
    
    # Load configuration
    logger.info(f"Loading configuration from {config_path}")
    config = load_config(config_path)
    
    # Validate configuration
    if not validate_config(config):
        logger.error("Configuration validation failed")
        return False
    
    logger.info("Configuration validated successfully")
    
    # Log enabled strategies
    enabled_strategies = [
        name for name, cfg in config.get('strategies', {}).items()
        if cfg.get('enabled', False)
    ]
    
    logger.info(f"Deploying {len(enabled_strategies)} strategies:")
    for strategy in enabled_strategies:
        logger.info(f"  - {strategy}")
    
    # Initialize strategies (import the orchestrator)
    try:
        from orchestrator import StrategyOrchestrator
        
        orchestrator = StrategyOrchestrator(config_path)
        logger.info("Strategies initialized successfully")
        
        # Get status
        status = orchestrator.get_strategy_status()
        logger.info(f"Strategy status: {json.dumps(status, indent=2)}")
        
    except Exception as e:
        logger.error(f"Failed to initialize strategies: {e}")
        return False
    
    logger.info("=" * 60)
    logger.info("Deployment completed successfully!")
    logger.info("=" * 60)
    
    return True


def main():
    """Main entry point"""
    # Get config path from args or use default
    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    success = deploy_strategies(config_path)
    
    if success:
        print("\n✅ Deployment successful!")
        sys.exit(0)
    else:
        print("\n❌ Deployment failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()

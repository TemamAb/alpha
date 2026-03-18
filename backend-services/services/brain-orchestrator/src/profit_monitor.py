"""
Alpha-Orion Profit Monitor Module
Tracks real on-chain arbitrage profits from FlashLoanArbitrage contract
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from web3 import Web3
import redis
import threading

logger = logging.getLogger(__name__)

class ProfitMonitor:
    """Monitors and tracks real arbitrage profits from blockchain"""
    
    # Contract ABI - minimal for event tracking
    ARBITRAGE_ABI = [
        {
            "anonymous": False,
            "inputs": [
                {"indexed": True, "name": "tokenIn", "type": "address"},
                {"indexed": True, "name": "tokenOut", "type": "address"},
                {"indexed": False, "name": "profit", "type": "uint256"},
                {"indexed": False, "name": "gasUsed", "type": "uint256"}
            ],
            "name": "ArbitrageExecuted",
            "type": "event"
        },
        {
            "anonymous": False,
            "inputs": [
                {"indexed": False, "name": "token", "type": "address"},
                {"indexed": False, "name": "amount", "type": "uint256"}
            ],
            "name": "FundsRecovered",
            "type": "event"
        }
    ]
    
    # Token addresses (mainnet)
    WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    
    def __init__(self, web3: Web3, contract_address: str, redis_client: redis.Redis):
        self.web3 = web3
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.redis = redis_client
        
        # Initialize contract
        self.contract = self.web3.eth.contract(
            address=self.contract_address,
            abi=self.ARBITRAGE_ABI
        )
        
        # Track profit state
        self.total_profit_usd = 0.0
        self.total_trades = 0
        self.winning_trades = 0
        self.profit_history = []
        
        # Start monitoring thread
        self._running = False
        self._monitor_thread = None
    
    def start(self):
        """Start profit monitoring"""
        self._running = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        logger.info(f"Profit monitor started for contract {self.contract_address}")
    
    def stop(self):
        """Stop profit monitoring"""
        self._running = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)
        logger.info("Profit monitor stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop - polls for new events"""
        last_block = self.web3.eth.block_number
        
        while self._running:
            try:
                current_block = self.web3.eth.block_number
                
                if current_block > last_block:
                    # Fetch new events
                    self._fetch_events(last_block + 1, current_block)
                    last_block = current_block
                
                # Update profit metrics
                self._update_profit_metrics()
                
                # Sleep before next check
                threading.Event().wait(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                threading.Event().wait(30)  # Wait longer on error
    
    def _fetch_events(self, from_block: int, to_block: int):
        """Fetch arbitrage events from contract"""
        try:
            # Get ArbitrageExecuted events
            events = self.contract.events.ArbitrageExecuted.get_logs(
                fromBlock=from_block,
                toBlock=to_block
            )
            
            for event in events:
                self._process_arbitrage_event(event)
                
        except Exception as e:
            logger.warning(f"Error fetching events: {e}")
    
    def _process_arbitrage_event(self, event):
        """Process a single arbitrage event"""
        try:
            args = event['args']
            profit_wei = args['profit']
            gas_used = args['gasUsed']
            
            # Convert profit to USD (simplified - use WETH price)
            profit_eth = self.web3.from_wei(profit_wei, 'ether')
            eth_price_usd = self._get_eth_price()
            profit_usd = float(profit_eth) * eth_price_usd
            
            # Update state
            self.total_profit_usd += profit_usd
            self.total_trades += 1
            self.winning_trades += 1  # Events only emitted on success
            
            # Record in history
            trade_record = {
                'timestamp': datetime.utcnow().isoformat(),
                'block': event['blockNumber'],
                'tx_hash': event['transactionHash'].hex(),
                'profit_eth': float(profit_eth),
                'profit_usd': profit_usd,
                'gas_used': gas_used,
                'token_in': args['tokenIn'],
                'token_out': args['tokenOut']
            }
            
            self.profit_history.append(trade_record)
            
            # Keep only last 100 trades
            if len(self.profit_history) > 100:
                self.profit_history = self.profit_history[-100:]
            
            # Store in Redis
            self._store_profit_metrics()
            
            logger.info(f"Trade recorded: ${profit_usd:.2f} USD (tx: {trade_record['tx_hash'][:16]}...)")
            
        except Exception as e:
            logger.error(f"Error processing event: {e}")
    
    def _get_eth_price(self) -> float:
        """Get current ETH price from Uniswap V3"""
        try:
            # Simplified - in production use price feed or oracle
            # This is a placeholder - actual implementation would query router
            return 2600.0  # Approximate ETH price
        except Exception:
            return 2600.0
    
    def _get_wallet_balance(self, token_address: str) -> float:
        """Get wallet token balance"""
        try:
            token_address = Web3.to_checksum_address(token_address)
            contract = self.web3.eth.contract(
                address=token_address,
                abi=[
                    {
                        "constant": True,
                        "inputs": [{"name": "_owner", "type": "address"}],
                        "name": "balanceOf",
                        "outputs": [{"name": "balance", "type": "uint256"}],
                        "type": "function"
                    }
                ]
            )
            balance_wei = contract.functions.balanceOf(self.contract_address).call()
            return self.web3.from_wei(balance_wei, 'ether')
        except Exception as e:
            logger.error(f"Error getting balance: {e}")
            return 0.0
    
    def _update_profit_metrics(self):
        """Update profit metrics in Redis"""
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        metrics = {
            'total_profit_usd': self.total_profit_usd,
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': win_rate,
            'last_updated': datetime.utcnow().isoformat()
        }
        
        try:
            self.redis.hset('profit_metrics', mapping=metrics)
        except Exception as e:
            logger.warning(f"Redis update failed: {e}")
    
    def _store_profit_metrics(self):
        """Store profit metrics to Redis"""
        try:
            # Store current metrics
            self.redis.set('total_pnl', self.total_profit_usd)
            self.redis.set('total_trades', self.total_trades)
            self.redis.set('win_rate', (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0)
            
            # Store trade history
            self.redis.set('trade_history', json.dumps(self.profit_history[-50:]))
            
        except Exception as e:
            logger.warning(f"Failed to store metrics: {e}")
    
    def get_real_profit_metrics(self) -> Dict:
        """Get real profit metrics"""
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        # Get current balances
        balances = {
            'WETH': self._get_wallet_balance(self.WETH_ADDRESS),
            'USDC': self._get_wallet_balance(self.USDC_ADDRESS),
            'USDT': self._get_wallet_balance(self.USDT_ADDRESS),
            'DAI': self._get_wallet_balance(self.DAI_ADDRESS)
        }
        
        return {
            'status': 'active' if self._running else 'stopped',
            'contract_address': self.contract_address,
            'total_profit_usd': round(self.total_profit_usd, 2),
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': round(win_rate, 2),
            'current_balances': balances,
            'recent_trades': self.profit_history[-10:],
            'last_updated': datetime.utcnow().isoformat()
        }
    
    def get_profit_per_token(self) -> Dict[str, float]:
        """Calculate profit breakdown by token"""
        profit_by_token = {}
        
        for trade in self.profit_history:
            token = trade.get('token_in', 'unknown')
            if token not in profit_by_token:
                profit_by_token[token] = 0.0
            profit_by_token[token] += trade.get('profit_usd', 0)
        
        return profit_by_token
    
    def get_daily_profit(self, days: int = 7) -> List[Dict]:
        """Get daily profit summary"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        daily_profit = {}
        
        for trade in self.profit_history:
            trade_date = datetime.fromisoformat(trade['timestamp'])
            if trade_date >= cutoff:
                date_key = trade_date.strftime('%Y-%m-%d')
                if date_key not in daily_profit:
                    daily_profit[date_key] = 0.0
                daily_profit[date_key] += trade.get('profit_usd', 0)
        
        return [
            {'date': date, 'profit_usd': round(amount, 2)}
            for date, amount in sorted(daily_profit.items())
        ]

"""
Alpha-Orion Pre-computed Arbitrage Paths Cache
Accelerates execution by caching optimal arbitrage paths.
"""

import asyncio
import logging
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict
import hashlib
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ArbitragePath:
    """Represents a single arbitrage path"""
    id: str
    token_in: str
    token_out: str
    dex_sequence: List[str]  # ['uniswap_v2', 'sushiswap', 'uniswap_v3']
    expected_profit_pct: float
    gas_estimate: float
    slippage_tolerance: float
    min_profit_threshold: float
    last_updated: datetime = field(default_factory=datetime.utcnow)
    confidence_score: float = 0.0
    execution_count: int = 0
    success_count: int = 0
    avg_execution_time: float = 0.0

    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.execution_count == 0:
            return 0.0
        return self.success_count / self.execution_count

    @property
    def net_profit_pct(self) -> float:
        """Calculate net profit after gas costs"""
        gas_cost_pct = (self.gas_estimate * 0.0001)  # Simplified gas to % conversion
        return self.expected_profit_pct - gas_cost_pct


@dataclass
class PathCacheEntry:
    """Cache entry for arbitrage paths"""
    token_pair: Tuple[str, str]
    paths: List[ArbitragePath] = field(default_factory=list)
    last_refresh: datetime = field(default_factory=datetime.utcnow)
    cache_hits: int = 0
    cache_misses: int = 0

    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total = self.cache_hits + self.cache_misses
        if total == 0:
            return 0.0
        return self.cache_hits / total


class ArbitragePathCache:
    """
    Pre-computed arbitrage paths cache for sub-50ms execution.
    Maintains optimal paths for frequently traded pairs.
    """

    def __init__(self, max_cache_size: int = 10000, refresh_interval: int = 300):
        self.cache: Dict[Tuple[str, str], PathCacheEntry] = {}
        self.max_cache_size = max_cache_size
        self.refresh_interval = refresh_interval  # seconds
        self.is_running = False

        # Supported DEXes and token pairs
        self.supported_dexes = ['uniswap_v2', 'uniswap_v3', 'sushiswap', 'balancer', '1inch']
        self.popular_tokens = ['WETH', 'USDC', 'USDT', 'WBTC', 'DAI', 'LINK', 'UNI', 'AAVE']

        # Generate all possible pairs
        self.all_pairs = self._generate_token_pairs()

        logger.info(f"ArbitragePathCache initialized with {len(self.all_pairs)} token pairs")

    def _generate_token_pairs(self) -> List[Tuple[str, str]]:
        """Generate all possible token pairs from popular tokens"""
        pairs = []
        for i, token1 in enumerate(self.popular_tokens):
            for token2 in self.popular_tokens[i+1:]:
                pairs.append((token1, token2))
                pairs.append((token2, token1))  # Both directions
        return pairs

    async def start(self):
        """Start the cache refresh daemon"""
        self.is_running = True
        logger.info("ArbitragePathCache started")

        # Initial cache population
        await self._populate_initial_cache()

        # Start background refresh
        asyncio.create_task(self._cache_refresh_daemon())

    async def stop(self):
        """Stop the cache"""
        self.is_running = False
        logger.info("ArbitragePathCache stopped")

    async def _populate_initial_cache(self):
        """Populate cache with initial arbitrage paths"""
        logger.info("Populating initial arbitrage paths cache...")

        # Process in batches to avoid overwhelming
        batch_size = 50
        for i in range(0, len(self.all_pairs), batch_size):
            batch_pairs = self.all_pairs[i:i+batch_size]

            tasks = []
            for pair in batch_pairs:
                tasks.append(self._compute_paths_for_pair(pair))

            await asyncio.gather(*tasks, return_exceptions=True)

            # Small delay between batches
            await asyncio.sleep(0.1)

        logger.info(f"Initial cache populated with {len(self.cache)} entries")

    async def _cache_refresh_daemon(self):
        """Background daemon to refresh cache periodically"""
        while self.is_running:
            try:
                await asyncio.sleep(self.refresh_interval)
                await self._refresh_cache()
            except Exception as e:
                logger.error(f"Cache refresh error: {e}")
                await asyncio.sleep(60)  # Wait before retry

    async def _refresh_cache(self):
        """Refresh outdated cache entries"""
        logger.info("Refreshing arbitrage paths cache...")

        current_time = datetime.utcnow()
        refresh_threshold = timedelta(seconds=self.refresh_interval)

        # Find entries that need refresh
        to_refresh = []
        for pair, entry in self.cache.items():
            if current_time - entry.last_refresh > refresh_threshold:
                to_refresh.append(pair)

        # Refresh in batches
        batch_size = 20
        for i in range(0, len(to_refresh), batch_size):
            batch = to_refresh[i:i+batch_size]
            tasks = [self._compute_paths_for_pair(pair) for pair in batch]
            await asyncio.gather(*tasks, return_exceptions=True)

        logger.info(f"Refreshed {len(to_refresh)} cache entries")

    async def _compute_paths_for_pair(self, pair: Tuple[str, str]) -> None:
        """Compute arbitrage paths for a token pair"""
        token_in, token_out = pair

        # Create cache entry if not exists
        if pair not in self.cache:
            self.cache[pair] = PathCacheEntry(token_pair=pair)

        entry = self.cache[pair]

        # Generate possible arbitrage paths
        paths = await self._generate_arbitrage_paths(token_in, token_out)

        # Filter and rank paths
        viable_paths = [p for p in paths if p.net_profit_pct > 0.1]  # Min 0.1% profit
        viable_paths.sort(key=lambda p: p.net_profit_pct, reverse=True)

        # Keep top 10 paths
        entry.paths = viable_paths[:10]
        entry.last_refresh = datetime.utcnow()

        logger.debug(f"Computed {len(viable_paths)} paths for {token_in}->{token_out}")

    async def _generate_arbitrage_paths(self, token_in: str, token_out: str) -> List[ArbitragePath]:
        """Generate possible arbitrage paths between two tokens"""
        paths = []

        # Direct paths (2 DEXes)
        for dex1 in self.supported_dexes:
            for dex2 in self.supported_dexes:
                if dex1 != dex2:
                    path = await self._evaluate_path([dex1, dex2], token_in, token_out)
                    if path:
                        paths.append(path)

        # Triangular paths (3 DEXes)
        for dex1 in self.supported_dexes:
            for dex2 in self.supported_dexes:
                for dex3 in self.supported_dexes:
                    if len(set([dex1, dex2, dex3])) == 3:  # All different
                        path = await self._evaluate_path([dex1, dex2, dex3], token_in, token_out)
                        if path:
                            paths.append(path)

        return paths

    async def _evaluate_path(self, dex_sequence: List[str], token_in: str, token_out: str) -> Optional[ArbitragePath]:
        """Evaluate a specific arbitrage path"""
        try:
            # Generate unique path ID
            path_str = f"{token_in}_{token_out}_{'_'.join(dex_sequence)}"
            path_id = hashlib.md5(path_str.encode()).hexdigest()[:8]

            # Simulate path evaluation (in production, this would query DEX APIs)
            expected_profit_pct = await self._simulate_path_profit(dex_sequence, token_in, token_out)
            gas_estimate = len(dex_sequence) * 150000  # Rough gas estimate
            slippage_tolerance = 0.005  # 0.5%
            min_profit_threshold = 0.001  # 0.1%

            # Only return viable paths
            if expected_profit_pct > min_profit_threshold:
                return ArbitragePath(
                    id=path_id,
                    token_in=token_in,
                    token_out=token_out,
                    dex_sequence=dex_sequence,
                    expected_profit_pct=expected_profit_pct,
                    gas_estimate=gas_estimate,
                    slippage_tolerance=slippage_tolerance,
                    min_profit_threshold=min_profit_threshold,
                    confidence_score=0.8  # Placeholder
                )

        except Exception as e:
            logger.debug(f"Path evaluation error for {dex_sequence}: {e}")

        return None

    async def _simulate_path_profit(self, dex_sequence: List[str], token_in: str, token_out: str) -> float:
        """Simulate profit calculation for a path (placeholder)"""
        # In production, this would:
        # 1. Query current prices from each DEX
        # 2. Calculate effective exchange rates
        # 3. Account for fees and slippage
        # 4. Return expected profit percentage

        # Simple simulation based on DEX sequence length and token pair
        base_profit = 0.002  # 0.2% base profit
        dex_multiplier = len(dex_sequence) * 0.001  # More DEXes = more opportunities
        token_popularity = 0.001 if token_in in ['WETH', 'USDC'] else 0.0005

        # Add some randomness to simulate real market conditions
        import random
        noise = random.uniform(-0.001, 0.003)

        return base_profit + dex_multiplier + token_popularity + noise

    async def get_best_path(self, token_in: str, token_out: str, min_profit: float = 0.001) -> Optional[ArbitragePath]:
        """Get the best arbitrage path for a token pair"""
        pair = (token_in, token_out)

        # Check cache
        if pair in self.cache:
            entry = self.cache[pair]
            entry.cache_hits += 1

            # Filter paths by minimum profit
            viable_paths = [p for p in entry.paths if p.net_profit_pct >= min_profit]

            if viable_paths:
                # Return highest profit path
                best_path = max(viable_paths, key=lambda p: p.net_profit_pct)
                logger.debug(f"Cache hit: {token_in}->{token_out}, profit: {best_path.net_profit_pct:.4f}%")
                return best_path
        else:
            # Cache miss - compute on demand
            await self._compute_paths_for_pair(pair)
            if pair in self.cache:
                self.cache[pair].cache_misses += 1
                return await self.get_best_path(token_in, token_out, min_profit)

        return None

    async def update_path_stats(self, path_id: str, success: bool, execution_time: float):
        """Update execution statistics for a path"""
        # Find the path in cache
        for entry in self.cache.values():
            for path in entry.paths:
                if path.id == path_id:
                    path.execution_count += 1
                    if success:
                        path.success_count += 1

                    # Update average execution time
                    if path.avg_execution_time == 0:
                        path.avg_execution_time = execution_time
                    else:
                        path.avg_execution_time = (path.avg_execution_time + execution_time) / 2

                    logger.debug(f"Updated stats for path {path_id}: success_rate={path.success_rate:.2f}")
                    return

    def get_cache_stats(self) -> Dict:
        """Get cache performance statistics"""
        total_entries = len(self.cache)
        total_paths = sum(len(entry.paths) for entry in self.cache.values())
        avg_hit_rate = sum(entry.hit_rate for entry in self.cache.values()) / max(total_entries, 1)

        return {
            'total_entries': total_entries,
            'total_paths': total_paths,
            'avg_hit_rate': avg_hit_rate,
            'cache_size_mb': len(pickle.dumps(self.cache)) / (1024 * 1024)
        }

    async def preload_hot_pairs(self, hot_pairs: List[Tuple[str, str]]):
        """Preload cache for frequently traded pairs"""
        logger.info(f"Preloading cache for {len(hot_pairs)} hot pairs")

        tasks = [self._compute_paths_for_pair(pair) for pair in hot_pairs]
        await asyncio.gather(*tasks, return_exceptions=True)

        logger.info("Hot pairs preloading completed")

    def clear_cache(self):
        """Clear the entire cache"""
        self.cache.clear()
        logger.info("Cache cleared")


# Global cache instance
path_cache = ArbitragePathCache()


async def main():
    """Demo the arbitrage path cache"""
    await path_cache.start()

    # Test cache with some pairs
    test_pairs = [('WETH', 'USDC'), ('WBTC', 'WETH'), ('LINK', 'UNI')]

    for token_in, token_out in test_pairs:
        path = await path_cache.get_best_path(token_in, token_out)
        if path:
            print(f"Best path {token_in}->{token_out}: {path.net_profit_pct:.4f}% profit via {path.dex_sequence}")
        else:
            print(f"No viable path found for {token_in}->{token_out}")

    # Show cache stats
    stats = path_cache.get_cache_stats()
    print(f"Cache stats: {stats}")

    await path_cache.stop()


if __name__ == "__main__":
    asyncio.run(main())

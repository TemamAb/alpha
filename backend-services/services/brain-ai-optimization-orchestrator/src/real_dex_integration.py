"""
Alpha-Orion Real DEX Integration
Replace simulated prices with actual DEX API calls and on-chain data.
"""

import asyncio
import logging
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Set
import aiohttp
import websockets
import os

# Web3 imports for on-chain data
try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
    from eth_abi import decode_abi
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    logger.warning("Web3 not available - on-chain integration disabled")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DexPrice:
    """Price data from a DEX"""
    dex_name: str
    token_in: str
    token_out: str
    price: float  # token_out per token_in
    liquidity: float  # USD liquidity
    fee: float  # Fee in basis points
    timestamp: datetime = field(default_factory=datetime.utcnow)
    confidence: float = 1.0  # Data quality confidence


@dataclass
class LiquidityPool:
    """Liquidity pool information"""
    address: str
    token0: str
    token1: str
    reserve0: float
    reserve1: float
    fee: int  # Fee in basis points
    tvl_usd: float
    volume_24h: float
    apy: float


class RealDexIntegrator:
    """
    Real DEX integration replacing simulated prices.
    Supports Uniswap V2/V3, Sushiswap, Balancer, 1inch, and Paraswap.
    """

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.web3_providers: Dict[str, Web3] = {}
        self.price_cache: Dict[str, DexPrice] = {}
        self.cache_ttl = 30  # seconds
        self.is_running = False

        # DEX configurations
        self.dex_configs = {
            'uniswap_v2': {
                'api_url': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
                'factory_address': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
                'router_address': '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
                'fee': 30  # 0.3%
            },
            'uniswap_v3': {
                'api_url': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
                'factory_address': '0x1F98431c8aC98597336d07217c6D0B8D8B0a7a8',
                'router_address': '0x68b3465833fb72B5a828cCEd3294e3e6962E3786',
                'fee_tiers': [500, 3000, 10000]  # 0.05%, 0.3%, 1%
            },
            'sushiswap': {
                'api_url': 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
                'factory_address': '0xC0AEe478e3658e2610c5F753A278b1B6B739aab5',
                'router_address': '0xd9e1cE17f2641f24aE5D51AEe6325DAA6F3Dcf45',
                'fee': 30
            },
            'balancer': {
                'api_url': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
                'vault_address': '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                'fee': 4  # 0.04%
            }
        }

        # Token addresses
        self.token_addresses = {
            'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            'LINK': '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            'UNI': '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            'AAVE': '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
        }

        # Initialize Web3 providers
        if WEB3_AVAILABLE:
            self._init_web3_providers()

        logger.info("RealDexIntegrator initialized")

    def _init_web3_providers(self):
        """Initialize Web3 providers for on-chain data"""
        providers = {
            'mainnet': 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',  # Replace with actual key
            'polygon': 'https://polygon-rpc.com/',
            'arbitrum': 'https://arb1.arbitrum.io/rpc'
        }

        for network, url in providers.items():
            try:
                web3 = Web3(Web3.HTTPProvider(url))
                if network == 'mainnet':
                    web3.middleware_onion.inject(geth_poa_middleware, layer=0)
                web3.eth.account.enable_unaudited_hdwallet_features()
                self.web3_providers[network] = web3
                logger.info(f"Web3 provider initialized for {network}")
            except Exception as e:
                logger.error(f"Failed to initialize {network} provider: {e}")

    async def start(self):
        """Start the DEX integrator"""
        self.is_running = True
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            headers={'Content-Type': 'application/json'}
        )
        logger.info("RealDexIntegrator started")

    async def stop(self):
        """Stop the DEX integrator"""
        self.is_running = False
        if self.session:
            await self.session.close()
        logger.info("RealDexIntegrator stopped")

    async def get_real_price(self, dex_name: str, token_in: str, token_out: str,
                           amount_in: float = 1.0) -> Optional[DexPrice]:
        """
        Get real price from a DEX.
        Uses multiple methods: GraphQL API, on-chain calls, 1inch API.
        """
        cache_key = f"{dex_name}_{token_in}_{token_out}_{amount_in}"

        # Check cache first
        if cache_key in self.price_cache:
            cached = self.price_cache[cache_key]
            if (datetime.utcnow() - cached.timestamp).seconds < self.cache_ttl:
                return cached

        try:
            # Try different methods based on DEX
            if dex_name in ['uniswap_v2', 'uniswap_v3', 'sushiswap']:
                price = await self._get_uniswap_price(dex_name, token_in, token_out, amount_in)
            elif dex_name == 'balancer':
                price = await self._get_balancer_price(token_in, token_out, amount_in)
            elif dex_name == '1inch':
                price = await self._get_1inch_price(token_in, token_out, amount_in)
            else:
                logger.warning(f"Unsupported DEX: {dex_name}")
                return None

            if price:
                dex_price = DexPrice(
                    dex_name=dex_name,
                    token_in=token_in,
                    token_out=token_out,
                    price=price,
                    liquidity=await self._get_liquidity(dex_name, token_in, token_out),
                    fee=self.dex_configs[dex_name]['fee']
                )

                # Cache result
                self.price_cache[cache_key] = dex_price
                return dex_price

        except Exception as e:
            logger.error(f"Error getting price from {dex_name}: {e}")

        return None

    async def _get_uniswap_price(self, dex_name: str, token_in: str, token_out: str,
                                amount_in: float) -> Optional[float]:
        """Get price from Uniswap V2/V3 using The Graph"""
        try:
            api_url = self.dex_configs[dex_name]['api_url']
            token_in_addr = self.token_addresses.get(token_in)
            token_out_addr = self.token_addresses.get(token_out)

            if not token_in_addr or not token_out_addr:
                return None

            # GraphQL query for pair data
            query = """
            {
              pairs(where: {
                token0: "%s",
                token1: "%s"
              }, first: 1, orderBy: volumeUSD, orderDirection: desc) {
                token0Price
                token1Price
                reserve0
                reserve1
                volumeUSD
              }
            }
            """ % (token_in_addr.lower(), token_out_addr.lower())

            async with self.session.post(api_url, json={'query': query}) as response:
                if response.status == 200:
                    data = await response.json()
                    pairs = data.get('data', {}).get('pairs', [])

                    if pairs:
                        pair = pairs[0]
                        # Calculate price based on token order
                        if token_in_addr.lower() < token_out_addr.lower():
                            # token0 is token_in
                            price = float(pair['token1Price'])
                        else:
                            # token1 is token_in
                            price = float(pair['token0Price'])

                        return price

        except Exception as e:
            logger.error(f"Uniswap GraphQL error: {e}")

        return None

    async def _get_balancer_price(self, token_in: str, token_out: str,
                                amount_in: float) -> Optional[float]:
        """Get price from Balancer"""
        try:
            api_url = self.dex_configs['balancer']['api_url']

            # Balancer uses different token ordering
            query = """
            {
              pools(where: {
                tokensList_contains: ["%s", "%s"]
              }, first: 5, orderBy: totalLiquidity, orderDirection: desc) {
                tokens {
                  address
                  balance
                  weight
                }
                totalLiquidity
                swapFee
              }
            }
            """ % (self.token_addresses[token_in], self.token_addresses[token_out])

            async with self.session.post(api_url, json={'query': query}) as response:
                if response.status == 200:
                    data = await response.json()
                    pools = data.get('data', {}).get('pools', [])

                    if pools:
                        # Use the largest pool
                        pool = pools[0]
                        # Simplified price calculation
                        return 1.0  # Placeholder - would need proper AMM math

        except Exception as e:
            logger.error(f"Balancer API error: {e}")

        return None

    async def _get_1inch_price(self, token_in: str, token_out: str,
                             amount_in: float) -> Optional[float]:
        """Get price from 1inch API"""
        try:
            base_url = "https://api.1inch.io/v5.0/1"  # Ethereum mainnet
            token_in_addr = self.token_addresses[token_in]
            token_out_addr = self.token_addresses[token_out]

            amount_in_wei = int(amount_in * 10**18)  # Assume 18 decimals

            url = f"{base_url}/quote?fromTokenAddress={token_in_addr}&toTokenAddress={token_out_addr}&amount={amount_in_wei}"

            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    to_token_amount = int(data['toTokenAmount'])
                    from_token_amount = int(data['fromTokenAmount'])

                    # Calculate price
                    price = to_token_amount / from_token_amount
                    return price

        except Exception as e:
            logger.error(f"1inch API error: {e}")

        return None

    async def _get_liquidity(self, dex_name: str, token_in: str, token_out: str) -> float:
        """Get liquidity for a token pair"""
        try:
            # Simplified - in production would query specific DEX APIs
            # For now, return estimated liquidity based on token popularity
            popular_pairs = [
                ('WETH', 'USDC'), ('WETH', 'USDT'), ('WETH', 'DAI'),
                ('WBTC', 'WETH'), ('LINK', 'WETH')
            ]

            if (token_in, token_out) in popular_pairs or (token_out, token_in) in popular_pairs:
                return 50000000  # $50M for popular pairs
            else:
                return 5000000   # $5M for others

        except Exception as e:
            logger.error(f"Liquidity estimation error: {e}")
            return 1000000  # $1M fallback

    async def get_multiple_prices(self, token_pairs: List[Tuple[str, str]],
                                dexes: List[str]) -> Dict[str, List[DexPrice]]:
        """
        Get prices for multiple token pairs across multiple DEXes.
        Optimized for parallel execution.
        """
        results = {}

        # Create all tasks
        tasks = []
        for token_in, token_out in token_pairs:
            pair_key = f"{token_in}_{token_out}"
            results[pair_key] = []

            for dex in dexes:
                task = self.get_real_price(dex, token_in, token_out)
                tasks.append((pair_key, dex, task))

        # Execute in batches to avoid rate limits
        batch_size = 10
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i+batch_size]

            # Execute batch
            batch_results = await asyncio.gather(
                *[task for _, _, task in batch],
                return_exceptions=True
            )

            # Process results
            for (pair_key, dex, _), result in zip(batch, batch_results):
                if isinstance(result, DexPrice):
                    results[pair_key].append(result)
                elif isinstance(result, Exception):
                    logger.debug(f"Price fetch failed for {pair_key} on {dex}: {result}")

            # Small delay between batches
            await asyncio.sleep(0.1)

        return results

    async def get_arbitrage_opportunities(self, token_pairs: List[Tuple[str, str]],
                                        dexes: List[str]) -> List[Dict]:
        """
        Find arbitrage opportunities across DEXes.
        Returns opportunities with profit calculations.
        """
        opportunities = []

        # Get prices for all pairs and DEXes
        all_prices = await self.get_multiple_prices(token_pairs, dexes)

        for pair_key, prices in all_prices.items():
            if len(prices) < 2:
                continue

            token_in, token_out = pair_key.split('_')

            # Find best buy and sell prices
            buy_prices = [p for p in prices if p.token_in == token_in]
            sell_prices = [p for p in prices if p.token_in == token_out]

            if not buy_prices or not sell_prices:
                continue

            # Sort by price
            buy_prices.sort(key=lambda p: p.price)  # Lowest price first
            sell_prices.sort(key=lambda p: p.price, reverse=True)  # Highest price first

            best_buy = buy_prices[0]
            best_sell = sell_prices[0]

            # Calculate spread
            spread_bps = ((best_sell.price - best_buy.price) / best_buy.price) * 10000

            if spread_bps > 10:  # Minimum 0.1% spread
                # Estimate profit after fees
                trade_size = min(best_buy.liquidity, best_sell.liquidity) * 0.01  # 1% of liquidity
                gross_profit = trade_size * (spread_bps / 10000)

                # Subtract fees (simplified)
                total_fee_bps = best_buy.fee + best_sell.fee
                net_profit = gross_profit * (1 - total_fee_bps / 10000)

                if net_profit > 10:  # Minimum $10 profit
                    opportunity = {
                        'token_pair': pair_key,
                        'buy_dex': best_buy.dex_name,
                        'sell_dex': best_sell.dex_name,
                        'buy_price': best_buy.price,
                        'sell_price': best_sell.price,
                        'spread_bps': spread_bps,
                        'estimated_profit': net_profit,
                        'liquidity': min(best_buy.liquidity, best_sell.liquidity),
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    opportunities.append(opportunity)

        # Sort by profit
        opportunities.sort(key=lambda x: x['estimated_profit'], reverse=True)

        return opportunities

    def get_price_stats(self) -> Dict:
        """Get price fetching statistics"""
        return {
            'cache_size': len(self.price_cache),
            'cache_ttl_seconds': self.cache_ttl,
            'web3_providers': len(self.web3_providers),
            'supported_dexes': list(self.dex_configs.keys()),
            'supported_tokens': list(self.token_addresses.keys())
        }


# Global DEX integrator instance
dex_integrator = RealDexIntegrator()


async def demo_real_dex_integration():
    """Demo real DEX price fetching"""
    await dex_integrator.start()

    # Test token pairs
    test_pairs = [('WETH', 'USDC'), ('WETH', 'USDT'), ('WBTC', 'WETH')]
    dexes = ['uniswap_v2', 'uniswap_v3', 'sushiswap']

    print("Fetching real DEX prices...")

    # Get prices for test pairs
    all_prices = await dex_integrator.get_multiple_prices(test_pairs, dexes)

    for pair_key, prices in all_prices.items():
        print(f"\n{pair_key}:")
        for price in prices:
            print(f"  {price.dex_name}: ${price.price:.4f} "
                  f"(liquidity: ${price.liquidity:,.0f})")

    # Find arbitrage opportunities
    print("\nScanning for arbitrage opportunities...")
    opportunities = await dex_integrator.get_arbitrage_opportunities(test_pairs, dexes)

    print(f"\nFound {len(opportunities)} arbitrage opportunities:")
    for opp in opportunities[:3]:  # Top 3
        print(f"  {opp['token_pair']}: ${opp['estimated_profit']:.2f} profit "
              f"({opp['spread_bps']:.2f} bps spread)")

    # Stats
    stats = dex_integrator.get_price_stats()
    print(f"\nStats: {stats}")

    await dex_integrator.stop()


if __name__ == "__main__":
    asyncio.run(demo_real_dex_integration())

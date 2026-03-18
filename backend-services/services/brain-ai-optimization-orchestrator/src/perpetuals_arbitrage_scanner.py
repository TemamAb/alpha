"""
Perpetual Futures Arbitrage Scanner for Alpha-Orion
Implements perpetual futures arbitrage and hedging strategies

Version: 1.0
Date: February 15, 2026
"""

import asyncio
import logging
import time
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import requests
import numpy as np
from web3 import Web3

@dataclass
class PerpetualsArbitrageSignal:
    """Perpetual futures arbitrage opportunity"""
    market: str
    base_asset: str
    quote_asset: str
    spot_price: float
    futures_price: float
    funding_rate: float
    price_difference_pct: float
    expected_profit: float
    confidence: float
    risk_level: str
    direction: str  # 'long_futures' or 'short_futures'
    leverage: float
    liquidation_price: float
    timestamp: float

class PerpetualsArbitrageScanner:
    """Scanner for perpetual futures arbitrage opportunities"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Minimum price difference threshold (0.1%)
        self.min_price_diff_pct = 0.001

        # Supported perpetuals platforms
        self.platforms = {
            'dydx': {
                'api_url': 'https://api.dydx.exchange/v3',
                'markets_endpoint': '/markets',
                'funding_endpoint': '/funding'
            },
            'gmx': {
                'api_url': 'https://api.gmx.io',
                'markets_endpoint': '/markets',
                'funding_endpoint': '/funding-rates'
            }
        }

        # Spot price cache
        self.spot_prices = {}
        self.price_cache_time = 30  # seconds

    async def scan_perpetuals_markets(self) -> List[PerpetualsArbitrageSignal]:
        """
        Scan perpetual futures markets for arbitrage opportunities
        """
        try:
            self.logger.info("Scanning perpetual futures markets for arbitrage opportunities")

            opportunities = []

            # Scan dYdX markets
            dydx_opportunities = await self._scan_dydx_markets()
            opportunities.extend(dydx_opportunities)

            # Scan GMX markets
            gmx_opportunities = await self._scan_gmx_markets()
            opportunities.extend(gmx_opportunities)

            # Sort by expected profit
            opportunities.sort(key=lambda x: x.expected_profit, reverse=True)

            self.logger.info(f"Found {len(opportunities)} perpetuals arbitrage opportunities")
            return opportunities

        except Exception as e:
            self.logger.error(f"Error scanning perpetuals markets: {e}")
            return []

    async def _scan_dydx_markets(self) -> List[PerpetualsArbitrageSignal]:
        """
        Scan dYdX perpetual markets
        """
        try:
            opportunities = []

            # Get dYdX markets
            response = requests.get(f"{self.platforms['dydx']['api_url']}{self.platforms['dydx']['markets_endpoint']}")
            markets_data = response.json()

            if 'markets' not in markets_data:
                return opportunities

            for market_key, market_data in markets_data['markets'].items():
                try:
                    if not market_data.get('perpetualMarket', {}).get('status') == 'ACTIVE':
                        continue

                    opportunity = await self._analyze_perpetuals_pair(
                        'dydx', market_key, market_data
                    )
                    if opportunity:
                        opportunities.append(opportunity)

                except Exception as e:
                    self.logger.error(f"Error analyzing dYdX market {market_key}: {e}")
                    continue

            return opportunities

        except Exception as e:
            self.logger.error(f"Error scanning dYdX markets: {e}")
            return []

    async def _scan_gmx_markets(self) -> List[PerpetualsArbitrageSignal]:
        """
        Scan GMX perpetual markets
        """
        try:
            opportunities = []

            # Get GMX markets
            response = requests.get(f"{self.platforms['gmx']['api_url']}{self.platforms['gmx']['markets_endpoint']}")
            markets_data = response.json()

            if not isinstance(markets_data, list):
                return opportunities

            for market_data in markets_data:
                try:
                    market_key = market_data.get('marketKey', '')
                    if not market_key:
                        continue

                    opportunity = await self._analyze_perpetuals_pair(
                        'gmx', market_key, market_data
                    )
                    if opportunity:
                        opportunities.append(opportunity)

                except Exception as e:
                    self.logger.error(f"Error analyzing GMX market {market_key}: {e}")
                    continue

            return opportunities

        except Exception as e:
            self.logger.error(f"Error scanning GMX markets: {e}")
            return []

    async def _analyze_perpetuals_pair(self, platform: str, market_key: str,
                                     market_data: Dict) -> Optional[PerpetualsArbitrageSignal]:
        """
        Analyze individual perpetual market for arbitrage opportunity
        """
        try:
            # Extract market information
            if platform == 'dydx':
                base_asset = market_data.get('baseAsset', '')
                quote_asset = market_data.get('quoteAsset', 'USD')
                futures_price = float(market_data.get('oraclePrice', 0))
                funding_rate = float(market_data.get('nextFundingRate', 0))
            elif platform == 'gmx':
                # GMX market structure
                base_asset = market_key.split('-')[0] if '-' in market_key else market_key
                quote_asset = 'USD'
                futures_price = float(market_data.get('poolValue', 0))
                funding_rate = float(market_data.get('fundingRate', 0))
            else:
                return None

            if not base_asset or futures_price <= 0:
                return None

            # Get spot price
            spot_price = await self._get_spot_price(base_asset)
            if not spot_price:
                return None

            # Calculate price difference
            price_diff_pct = (futures_price - spot_price) / spot_price

            # Check if difference exceeds threshold
            if abs(price_diff_pct) < self.min_price_diff_pct:
                return None

            # Determine arbitrage direction
            if price_diff_pct > 0:
                # Futures price > spot price, short futures and long spot
                direction = 'short_futures'
                expected_profit = price_diff_pct * spot_price * 1000  # Assume $1000 position
            else:
                # Futures price < spot price, long futures and short spot
                direction = 'long_futures'
                expected_profit = abs(price_diff_pct) * spot_price * 1000

            # Calculate confidence
            confidence = self._calculate_perpetuals_confidence(
                abs(price_diff_pct), funding_rate, platform
            )

            # Assess risk level
            risk_level = self._assess_perpetuals_risk(
                abs(price_diff_pct), funding_rate
            )

            # Calculate liquidation price (simplified)
            leverage = 5.0  # Assume 5x leverage
            if direction == 'long_futures':
                liquidation_price = futures_price * (1 - 1/leverage)
            else:
                liquidation_price = futures_price * (1 + 1/leverage)

            return PerpetualsArbitrageSignal(
                market=f"{platform}:{market_key}",
                base_asset=base_asset,
                quote_asset=quote_asset,
                spot_price=spot_price,
                futures_price=futures_price,
                funding_rate=funding_rate,
                price_difference_pct=price_diff_pct,
                expected_profit=expected_profit,
                confidence=confidence,
                risk_level=risk_level,
                direction=direction,
                leverage=leverage,
                liquidation_price=liquidation_price,
                timestamp=time.time()
            )

        except Exception as e:
            self.logger.error(f"Error analyzing perpetuals pair {market_key}: {e}")
            return None

    async def _get_spot_price(self, asset: str) -> Optional[float]:
        """
        Get spot price for asset
        """
        try:
            # Check cache first
            cache_key = f"{asset}_price"
            if cache_key in self.spot_prices:
                cached_time, cached_price = self.spot_prices[cache_key]
                if time.time() - cached_time < self.price_cache_time:
                    return cached_price

            # Fetch from CoinGecko
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={asset.lower()}&vs_currencies=usd"
            response = requests.get(url, timeout=5)
            data = response.json()

            if asset.lower() in data and 'usd' in data[asset.lower()]:
                price = data[asset.lower()]['usd']
                self.spot_prices[cache_key] = (time.time(), price)
                return price

            return None

        except Exception as e:
            self.logger.error(f"Error getting spot price for {asset}: {e}")
            return None

    def _calculate_perpetuals_confidence(self, price_diff_pct: float,
                                       funding_rate: float, platform: str) -> float:
        """
        Calculate confidence score for perpetuals arbitrage
        """
        try:
            # Factors:
            # 1. Magnitude of price difference
            # 2. Funding rate (extreme rates indicate stress)
            # 3. Platform reliability

            diff_score = min(price_diff_pct * 1000, 1.0)  # Scale up small differences

            # Penalize extreme funding rates
            funding_penalty = min(abs(funding_rate) * 100, 0.5)
            funding_score = max(0, 1.0 - funding_penalty)

            # Platform reliability score
            platform_score = 0.9 if platform == 'dydx' else 0.8

            confidence = (diff_score * 0.6 + funding_score * 0.2 + platform_score * 0.2)
            return min(confidence, 1.0)

        except Exception:
            return 0.5

    def _assess_perpetuals_risk(self, price_diff_pct: float, funding_rate: float) -> str:
        """
        Assess risk level of perpetuals position
        """
        try:
            # High risk if large price difference or extreme funding rates
            if price_diff_pct > 0.05 or abs(funding_rate) > 0.01:
                return 'HIGH'
            elif price_diff_pct > 0.02 or abs(funding_rate) > 0.005:
                return 'MEDIUM'
            else:
                return 'LOW'
        except Exception:
            return 'MEDIUM'

    async def get_funding_rates(self, platform: str) -> Dict[str, float]:
        """
        Get current funding rates for all markets
        """
        try:
            if platform not in self.platforms:
                return {}

            endpoint = self.platforms[platform]['funding_endpoint']
            response = requests.get(f"{self.platforms[platform]['api_url']}{endpoint}")

            if response.status_code != 200:
                return {}

            data = response.json()

            funding_rates = {}
            if platform == 'dydx' and 'fundingRates' in data:
                for rate_data in data['fundingRates']:
                    market = rate_data.get('market', '')
                    rate = float(rate_data.get('rate', 0))
                    funding_rates[market] = rate
            elif platform == 'gmx' and isinstance(data, list):
                for item in data:
                    market = item.get('marketKey', '')
                    rate = float(item.get('fundingRate', 0))
                    funding_rates[market] = rate

            return funding_rates

        except Exception as e:
            self.logger.error(f"Error getting funding rates for {platform}: {e}")
            return {}

    async def scan_all_perpetuals(self) -> List[PerpetualsArbitrageSignal]:
        """
        Main scanning method for all perpetuals platforms
        """
        return await self.scan_perpetuals_markets()

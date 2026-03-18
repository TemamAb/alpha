"""
Alpha-Orion WebSocket Price Feed
Real-time price feeds for sub-50ms arbitrage execution.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Set
import websockets
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WebSocketPriceFeed:
    """
    WebSocket-based real-time price feed for sub-50ms execution.
    Connects to multiple DEX price streams.
    """

    def __init__(self):
        self.price_streams = {
            'uniswap_v2': 'wss://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
            'uniswap_v3': 'wss://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
            'sushiswap': 'wss://api.thegraph.com/subgraphs/name/sushiswap/exchange'
        }

        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.price_cache: Dict[str, Dict[str, float]] = {}
        self.subscriptions: Set[str] = set()
        self.is_running = False

        logger.info("WebSocketPriceFeed initialized")

    async def connect(self, dex_name: str):
        """Connect to a DEX's WebSocket stream"""
        if dex_name not in self.price_streams:
            logger.warning(f"No WebSocket stream configured for {dex_name}")
            return

        try:
            uri = self.price_streams[dex_name]
            websocket = await websockets.connect(uri)
            self.connections[dex_name] = websocket

            # Subscribe to price updates
            subscription_message = {
                "id": "1",
                "type": "start",
                "payload": {
                    "query": """
                    subscription {
                      swaps(first: 1, orderBy: timestamp, orderDirection: desc) {
                        pair {
                          token0 { symbol }
                          token1 { symbol }
                        }
                        amount0In
                        amount0Out
                        amount1In
                        amount1Out
                        timestamp
                      }
                    }
                    """
                }
            }

            await websocket.send(json.dumps(subscription_message))
            logger.info(f"Connected to {dex_name} WebSocket stream")

        except Exception as e:
            logger.error(f"Failed to connect to {dex_name}: {e}")

    async def disconnect(self, dex_name: str):
        """Disconnect from a DEX's WebSocket stream"""
        if dex_name in self.connections:
            await self.connections[dex_name].close()
            del self.connections[dex_name]
            logger.info(f"Disconnected from {dex_name}")

    async def start_all_feeds(self):
        """Start all WebSocket price feeds"""
        self.is_running = True

        for dex_name in self.price_streams.keys():
            await self.connect(dex_name)

        # Start listening for price updates
        asyncio.create_task(self.listen_for_updates())

        logger.info("All WebSocket price feeds started")

    async def stop_all_feeds(self):
        """Stop all WebSocket price feeds"""
        self.is_running = False

        for dex_name in self.connections.keys():
            await self.disconnect(dex_name)

        logger.info("All WebSocket price feeds stopped")

    async def listen_for_updates(self):
        """Listen for price updates from all connected streams"""
        while self.is_running:
            try:
                # Check all connections for new messages
                for dex_name, websocket in self.connections.items():
                    try:
                        message = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=0.1
                        )

                        data = json.loads(message)
                        await self.process_price_update(dex_name, data)

                    except asyncio.TimeoutError:
                        continue
                    except Exception as e:
                        logger.error(f"Error reading from {dex_name}: {e}")
                        # Try to reconnect
                        await self.disconnect(dex_name)
                        await asyncio.sleep(5)
                        await self.connect(dex_name)

                await asyncio.sleep(0.01)  # Small delay to prevent busy loop

            except Exception as e:
                logger.error(f"Error in price feed listener: {e}")
                await asyncio.sleep(1)

    async def process_price_update(self, dex_name: str, data: Dict):
        """Process incoming price update"""
        try:
            if 'payload' in data and 'data' in data['payload']:
                swaps = data['payload']['data'].get('swaps', [])

                for swap in swaps:
                    pair = swap['pair']
                    token0 = pair['token0']['symbol']
                    token1 = pair['token1']['symbol']

                    # Calculate price
                    amount0_out = float(swap.get('amount0Out', '0'))
                    amount1_out = float(swap.get('amount1Out', '0'))
                    amount0_in = float(swap.get('amount0In', '0'))
                    amount1_in = float(swap.get('amount1In', '0'))

                    if amount0_out > 0 and amount1_in > 0:
                        price = amount0_out / amount1_in
                    elif amount1_out > 0 and amount0_in > 0:
                        price = amount1_out / amount0_in
                    else:
                        continue

                    # Update price cache
                    pair_key = f"{token0}/{token1}"
                    if dex_name not in self.price_cache:
                        self.price_cache[dex_name] = {}

                    self.price_cache[dex_name][pair_key] = price

                    # Also store reverse pair
                    reverse_key = f"{token1}/{token0}"
                    self.price_cache[dex_name][reverse_key] = 1 / price

        except Exception as e:
            logger.error(f"Error processing price update from {dex_name}: {e}")

    async def get_price(self, dex_name: str, token_pair: str) -> Optional[float]:
        """Get current price for a token pair from cache"""
        if dex_name in self.price_cache and token_pair in self.price_cache[dex_name]:
            return self.price_cache[dex_name][token_pair]
        return None

    async def get_all_prices(self, dex_name: str) -> Dict[str, float]:
        """Get all cached prices for a DEX"""
        return self.price_cache.get(dex_name, {})


async def main():
    """Demo the WebSocket price feed"""
    feed = WebSocketPriceFeed()

    print("Starting WebSocket price feeds...")
    await feed.start_all_feeds()

    # Run for 30 seconds
    await asyncio.sleep(30)

    print("Stopping feeds...")
    await feed.stop_all_feeds()

    # Show cached prices
    for dex_name in feed.price_streams.keys():
        prices = await feed.get_all_prices(dex_name)
        print(f"{dex_name}: {len(prices)} price pairs cached")


if __name__ == "__main__":
    asyncio.run(main())

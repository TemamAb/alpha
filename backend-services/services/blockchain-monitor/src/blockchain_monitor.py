#!/usr/bin/env python3
"""
Alpha-Orion Blockchain Node Monitor
Monitors RPC node health, block sync status, and gas price trends
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from prometheus_client import Counter, Gauge, Histogram, start_http_server
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(level)s - %(message)s')
logger = logging.getLogger(__name__)

class BlockchainMonitor:
    def __init__(self):
        # RPC endpoints for different chains
        self.rpc_endpoints = {
            'ethereum': os.getenv('ETHEREUM_RPC_URL', 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID'),
            'arbitrum': os.getenv('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc'),
            'polygon': os.getenv('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
        }

        # Prometheus metrics
        self.rpc_response_time = Histogram(
            'blockchain_rpc_response_time_seconds',
            'RPC response time in seconds',
            ['chain', 'method']
        )

        self.rpc_errors = Counter(
            'blockchain_rpc_errors_total',
            'Total RPC errors',
            ['chain', 'error_type']
        )

        self.block_height = Gauge(
            'blockchain_block_height',
            'Current block height',
            ['chain']
        )

        self.sync_status = Gauge(
            'blockchain_sync_status',
            'Sync status (1=synced, 0=behind)',
            ['chain']
        )

        self.gas_price = Gauge(
            'blockchain_gas_price_gwei',
            'Current gas price in gwei',
            ['chain']
        )

        self.peer_count = Gauge(
            'blockchain_peer_count',
            'Number of connected peers',
            ['chain']
        )

    async def make_rpc_call(self, chain: str, method: str, params: list = None) -> dict:
        """Make RPC call with timing and error handling"""
        if params is None:
            params = []

        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1
        }

        start_time = time.time()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.rpc_endpoints[chain],
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    result = await response.json()
                    response_time = time.time() - start_time

                    self.rpc_response_time.labels(chain=chain, method=method).observe(response_time)

                    if 'error' in result:
                        self.rpc_errors.labels(chain=chain, error_type='rpc_error').inc()
                        logger.error(f"RPC error for {chain}: {result['error']}")
                        return None

                    return result.get('result')

        except Exception as e:
            response_time = time.time() - start_time
            self.rpc_response_time.labels(chain=chain, method=method).observe(response_time)
            self.rpc_errors.labels(chain=chain, error_type=type(e).__name__).inc()
            logger.error(f"Request failed for {chain}: {e}")
            return None

    async def monitor_chain(self, chain: str):
        """Monitor a specific blockchain"""
        try:
            # Get latest block number
            block_number_hex = await self.make_rpc_call(chain, 'eth_blockNumber')
            if block_number_hex:
                block_number = int(block_number_hex, 16)
                self.block_height.labels(chain=chain).set(block_number)
                logger.info(f"{chain} block height: {block_number}")

            # Get gas price
            gas_price_hex = await self.make_rpc_call(chain, 'eth_gasPrice')
            if gas_price_hex:
                gas_price_gwei = int(gas_price_hex, 16) / 1e9  # Convert wei to gwei
                self.gas_price.labels(chain=chain).set(gas_price_gwei)

            # Get peer count (if available)
            if chain == 'ethereum':
                peer_count_hex = await self.make_rpc_call(chain, 'net_peerCount')
                if peer_count_hex:
                    peer_count = int(peer_count_hex, 16)
                    self.peer_count.labels(chain=chain).set(peer_count)

            # Check sync status
            sync_status = await self.make_rpc_call(chain, 'eth_syncing')
            if sync_status is False:
                self.sync_status.labels(chain=chain).set(1)  # Synced
            elif isinstance(sync_status, dict):
                self.sync_status.labels(chain=chain).set(0)  # Syncing
                logger.warning(f"{chain} is still syncing: {sync_status}")

        except Exception as e:
            logger.error(f"Error monitoring {chain}: {e}")
            self.rpc_errors.labels(chain=chain, error_type='monitoring_error').inc()

    async def run_monitoring_loop(self):
        """Main monitoring loop"""
        logger.info("Starting blockchain monitoring...")

        while True:
            tasks = []
            for chain in self.rpc_endpoints.keys():
                tasks.append(self.monitor_chain(chain))

            await asyncio.gather(*tasks, return_exceptions=True)
            await asyncio.sleep(30)  # Monitor every 30 seconds

async def main():
    monitor = BlockchainMonitor()

    # Start Prometheus metrics server
    start_http_server(8004)
    logger.info("Metrics server started on port 8004")

    await monitor.run_monitoring_loop()

if __name__ == "__main__":
    asyncio.run(main())

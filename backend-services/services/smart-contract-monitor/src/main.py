#!/usr/bin/env python3
"""
Alpha-Orion Smart Contract Monitor
Monitors contract events, balance changes, gas usage, and unusual activity
"""

import asyncio
import json
import time
from datetime import datetime
from web3 import Web3
from prometheus_client import Counter, Gauge, Histogram, start_http_server
import logging
import os
from typing import Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(level)s - %(message)s')
logger = logging.getLogger(__name__)

class SmartContractMonitor:
    def __init__(self):
        # Web3 connections
        self.w3_mainnet = Web3(Web3.HTTPProvider(os.getenv('ETHEREUM_RPC_URL', 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID')))
        self.w3_arbitrum = Web3(Web3.HTTPProvider(os.getenv('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc')))

        # Contract addresses to monitor
        self.contracts = {
            'FlashLoanArbitrage': {
                'mainnet': os.getenv('FLASH_LOAN_ARBITRAGE_MAINNET', '0x0000000000000000000000000000000000000000'),
                'arbitrum': os.getenv('FLASH_LOAN_ARBITRAGE_ARBITRUM', '0x0000000000000000000000000000000000000000'),
            }
        }

        # Prometheus metrics
        self.contract_balance = Gauge(
            'smart_contract_balance_eth',
            'Contract balance in ETH',
            ['contract', 'chain']
        )

        self.contract_events = Counter(
            'smart_contract_events_total',
            'Total contract events',
            ['contract', 'chain', 'event_type']
        )

        self.gas_usage = Histogram(
            'smart_contract_gas_usage',
            'Gas usage per transaction',
            ['contract', 'chain', 'method']
        )

        self.unusual_activity = Counter(
            'smart_contract_unusual_activity_total',
            'Unusual contract activity detected',
            ['contract', 'chain', 'activity_type']
        )

        self.last_block_checked = Gauge(
            'smart_contract_last_block_checked',
            'Last block checked for events',
            ['chain']
        )

    async def get_contract_balance(self, w3: Web3, address: str, chain: str, contract_name: str):
        """Get contract balance"""
        try:
            balance_wei = w3.eth.get_balance(address)
            balance_eth = w3.from_wei(balance_wei, 'ether')
            self.contract_balance.labels(contract=contract_name, chain=chain).set(float(balance_eth))
            logger.info(f"{contract_name} on {chain} balance: {balance_eth} ETH")
        except Exception as e:
            logger.error(f"Error getting balance for {contract_name} on {chain}: {e}")

    async def monitor_events(self, w3: Web3, address: str, chain: str, contract_name: str):
        """Monitor contract events"""
        try:
            # Get latest block
            latest_block = w3.eth.block_number
            last_checked = int(self.last_block_checked.labels(chain=chain)._value or (latest_block - 100))

            # Check for events in recent blocks
            from_block = max(last_checked, latest_block - 100)

            # Monitor OwnershipTransferred events
            ownership_filter = w3.eth.filter({
                'address': address,
                'fromBlock': from_block,
                'topics': [w3.keccak(text="OwnershipTransferred(address,address)").hex()]
            })

            ownership_events = ownership_filter.get_all_entries()
            if ownership_events:
                self.contract_events.labels(contract=contract_name, chain=chain, event_type='ownership_transferred').inc(len(ownership_events))
                self.unusual_activity.labels(contract=contract_name, chain=chain, activity_type='ownership_change').inc(len(ownership_events))
                logger.warning(f"Ownership transferred for {contract_name} on {chain}: {len(ownership_events)} events")

            # Monitor Paused events
            paused_filter = w3.eth.filter({
                'address': address,
                'fromBlock': from_block,
                'topics': [w3.keccak(text="Paused(address)").hex()]
            })

            paused_events = paused_filter.get_all_entries()
            if paused_events:
                self.contract_events.labels(contract=contract_name, chain=chain, event_type='paused').inc(len(paused_events))
                self.unusual_activity.labels(contract=contract_name, chain=chain, activity_type='contract_paused').inc(len(paused_events))
                logger.warning(f"Contract paused for {contract_name} on {chain}: {len(paused_events)} events")

            # Monitor large balance changes (by checking transactions to/from contract)
            # This is simplified - in production, you'd want more sophisticated monitoring
            block = w3.eth.get_block(latest_block, full_transactions=True)
            for tx in block.transactions:
                if tx['to'] == address or tx['from'] == address:
                    gas_used = tx['gas']
                    self.gas_usage.labels(contract=contract_name, chain=chain, method='unknown').observe(gas_used)

            self.last_block_checked.labels(chain=chain).set(latest_block)

        except Exception as e:
            logger.error(f"Error monitoring events for {contract_name} on {chain}: {e}")

    async def monitor_contract(self, w3: Web3, chain: str, contract_name: str):
        """Monitor a specific contract"""
        address = self.contracts[contract_name][chain]
        if address == '0x0000000000000000000000000000000000000000':
            return  # Skip if no address configured

        await self.get_contract_balance(w3, address, chain, contract_name)
        await self.monitor_events(w3, address, chain, contract_name)

    async def run_monitoring_loop(self):
        """Main monitoring loop"""
        logger.info("Starting smart contract monitoring...")

        while True:
            tasks = []

            # Monitor mainnet contracts
            for contract_name in self.contracts:
                tasks.append(self.monitor_contract(self.w3_mainnet, 'mainnet', contract_name))

            # Monitor arbitrum contracts
            for contract_name in self.contracts:
                tasks.append(self.monitor_contract(self.w3_arbitrum, 'arbitrum', contract_name))

            await asyncio.gather(*tasks, return_exceptions=True)
            await asyncio.sleep(60)  # Monitor every minute

async def main():
    monitor = SmartContractMonitor()

    # Start Prometheus metrics server
    start_http_server(8006)
    logger.info("Metrics server started on port 8006")

    await monitor.run_monitoring_loop()

if __name__ == "__main__":
    asyncio.run(main())

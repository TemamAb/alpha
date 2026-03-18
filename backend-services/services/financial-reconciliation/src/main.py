#!/usr/bin/env python3
"""
Alpha-Orion Financial Reconciliation Service
Compares on-chain balances with database records, tracks discrepancies, generates reports
"""

import asyncio
import json
import time
from datetime import datetime
from web3 import Web3
from prometheus_client import Counter, Gauge, Histogram, start_http_server
import logging
import os
from sqlalchemy import create_engine, text
import psycopg2

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(level)s - %(message)s')
logger = logging.getLogger(__name__)

class FinancialReconciliation:
    def __init__(self):
        # Web3 connections
        self.w3_mainnet = Web3(Web3.HTTPProvider(os.getenv('ETHEREUM_RPC_URL', 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID')))
        self.w3_arbitrum = Web3(Web3.HTTPProvider(os.getenv('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc')))

        # Database connection
        db_url = os.getenv('DATABASE_URL', 'postgresql://user:password@postgres:5432/alpha_orion')
        self.engine = create_engine(db_url)

        # Contract addresses
        self.contracts = {
            'FlashLoanArbitrage': {
                'mainnet': os.getenv('FLASH_LOAN_ARBITRAGE_MAINNET', '0x0000000000000000000000000000000000000000'),
                'arbitrum': os.getenv('FLASH_LOAN_ARBITRAGE_ARBITRUM', '0x0000000000000000000000000000000000000000'),
            }
        }

        # Prometheus metrics
        self.balance_discrepancy = Gauge(
            'financial_balance_discrepancy_usd',
            'Balance discrepancy in USD',
            ['asset', 'chain']
        )

        self.reconciliation_checks = Counter(
            'financial_reconciliation_checks_total',
            'Total reconciliation checks performed',
            ['asset', 'chain']
        )

        self.significant_discrepancies = Counter(
            'financial_significant_discrepancies_total',
            'Significant discrepancies detected',
            ['asset', 'chain', 'severity']
        )

    async def get_onchain_balance(self, w3: Web3, address: str) -> float:
        """Get balance from blockchain"""
        try:
            balance_wei = w3.eth.get_balance(address)
            balance_eth = w3.from_wei(balance_wei, 'ether')
            return float(balance_eth)
        except Exception as e:
            logger.error(f"Error getting on-chain balance: {e}")
            return 0.0

    async def get_db_balance(self, asset: str, chain: str) -> float:
        """Get balance from database"""
        try:
            with self.engine.connect() as conn:
                # Assuming a table for balances
                query = text("""
                    SELECT balance FROM wallet_balances
                    WHERE asset = :asset AND chain = :chain
                    ORDER BY timestamp DESC LIMIT 1
                """)
                result = conn.execute(query, {'asset': asset, 'chain': chain}).fetchone()
                return float(result[0]) if result else 0.0
        except Exception as e:
            logger.error(f"Error getting DB balance: {e}")
            return 0.0

    async def reconcile_asset(self, asset: str, chain: str, contract_address: str):
        """Reconcile balances for an asset"""
        w3 = self.w3_mainnet if chain == 'mainnet' else self.w3_arbitrum

        onchain_balance = await self.get_onchain_balance(w3, contract_address)
        db_balance = await self.get_db_balance(asset, chain)

        discrepancy = abs(onchain_balance - db_balance)
        self.balance_discrepancy.labels(asset=asset, chain=chain).set(discrepancy)
        self.reconciliation_checks.labels(asset=asset, chain=chain).inc()

        # Convert to USD (simplified, using fixed ETH price)
        eth_price_usd = 2000  # In production, get from price feed
        discrepancy_usd = discrepancy * eth_price_usd

        if discrepancy_usd > 1000:  # Significant discrepancy
            self.significant_discrepancies.labels(asset=asset, chain=chain, severity='high').inc()
            logger.warning(f"High discrepancy for {asset} on {chain}: ${discrepancy_usd} (onchain: {onchain_balance}, db: {db_balance})")
        elif discrepancy_usd > 100:
            self.significant_discrepancies.labels(asset=asset, chain=chain, severity='medium').inc()
            logger.info(f"Medium discrepancy for {asset} on {chain}: ${discrepancy_usd}")

        logger.info(f"Reconciled {asset} on {chain}: onchain={onchain_balance}, db={db_balance}, diff={discrepancy}")

    async def generate_reconciliation_report(self):
        """Generate daily reconciliation report"""
        try:
            report = {
                'timestamp': datetime.utcnow().isoformat(),
                'reconciliations': [],
                'summary': {
                    'total_checks': 0,
                    'significant_discrepancies': 0
                }
            }

            # Collect current metrics (simplified)
            # In production, query Prometheus or store in DB

            logger.info(f"Generated reconciliation report: {json.dumps(report, indent=2)}")

            # Store report in database
            with self.engine.connect() as conn:
                query = text("""
                    INSERT INTO reconciliation_reports (timestamp, report_data)
                    VALUES (:timestamp, :report_data)
                """)
                conn.execute(query, {
                    'timestamp': datetime.utcnow(),
                    'report_data': json.dumps(report)
                })
                conn.commit()

        except Exception as e:
            logger.error(f"Error generating reconciliation report: {e}")

    async def run_reconciliation_loop(self):
        """Main reconciliation loop"""
        logger.info("Starting financial reconciliation...")

        while True:
            tasks = []

            # Reconcile all contracts
            for contract_name, addresses in self.contracts.items():
                for chain, address in addresses.items():
                    if address != '0x0000000000000000000000000000000000000000':
                        tasks.append(self.reconcile_asset('ETH', chain, address))

            await asyncio.gather(*tasks, return_exceptions=True)

            # Generate report every hour
            if int(time.time()) % 3600 < 60:  # Roughly every hour
                await self.generate_reconciliation_report()

            await asyncio.sleep(300)  # Reconcile every 5 minutes

async def main():
    recon = FinancialReconciliation()

    # Start Prometheus metrics server
    start_http_server(8007)
    logger.info("Metrics server started on port 8007")

    await recon.run_reconciliation_loop()

if __name__ == "__main__":
    asyncio.run(main())

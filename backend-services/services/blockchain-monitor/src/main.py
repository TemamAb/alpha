#!/usr/bin/env python3
"""
Main entry point for Alpha-Orion Blockchain Monitor Service
"""

import asyncio
import uvicorn
from fastapi import FastAPI
from blockchain_monitor import BlockchainMonitor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(level)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Alpha-Orion Blockchain Monitor", version="1.0.0")

# Global monitor instance
monitor = None

@app.on_event("startup")
async def startup_event():
    """Initialize the blockchain monitor on startup"""
    global monitor
    monitor = BlockchainMonitor()
    logger.info("Blockchain monitor initialized")

    # Start monitoring in background
    asyncio.create_task(monitor.run_monitoring_loop())

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "blockchain-monitor"}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    # Metrics are exposed via prometheus_client's default handler
    pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)

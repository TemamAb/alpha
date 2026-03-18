#!/usr/bin/env python3
"""
Main entry point for Alpha-Orion Backtesting Service
"""

import asyncio
import uvicorn
from fastapi import FastAPI, Request
from backtesting_engine import BacktestingEngine
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Alpha-Orion Backtesting Service", version="1.0.0")

# Global backtesting engine instance
backtesting_engine = None

@app.on_event("startup")
async def startup_event():
    """Initialize the backtesting engine on startup"""
    global backtesting_engine
    backtesting_engine = BacktestingEngine()
    logger.info("Backtesting engine initialized")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "backtesting"}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    # Metrics are exposed via prometheus_client's default handler
    pass

@app.post("/backtest/run")
async def run_backtest(start_date: str, end_date: str, strategy: str = "arbitrage"):
    """Run a backtest for the specified period and strategy"""
    try:
        results = await backtesting_engine.run_backtest(start_date, end_date, strategy)
        return {"status": "success", "results": results}
    except Exception as e:
        logger.error(f"Backtest failed: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/backtest/results/{backtest_id}")
async def get_backtest_results(backtest_id: str):
    """Get results for a specific backtest"""
    try:
        results = backtesting_engine.get_results(backtest_id)
        return {"status": "success", "results": results}
    except Exception as e:
        logger.error(f"Failed to get results: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/welcome")
async def welcome(request: Request):
    """Welcome endpoint that logs request metadata"""
    logger.info(f"Request received: {request.method} {request.url.path}")
    return {"message": "Welcome to the Alpha-Orion Backtesting Service!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8007)

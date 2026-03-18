import threading
import time
import random
from flask import Flask, jsonify
from flask_cors import CORS

# Requirements: pip install flask flask-cors

app = Flask(__name__)
CORS(app)  # Enable CORS for dashboard communication

# Initial Strategy Matrix (Mocking the "Scraped" Data)
strategies = [
    {"id": 1, "source": "Alpha-Orion", "name": "Flash Loan Tri-Arb", "apy": 142.5, "winRate": 98.2, "risk": "Low", "isApex": True},
    {"id": 2, "source": "Alpha-Orion", "name": "Gamma Scalping", "apy": 85.2, "winRate": 94.5, "risk": "Medium", "isApex": False},
    {"id": 3, "source": "Benchmark: Nexus", "name": "Spatial Arbitrage", "apy": 112.4, "winRate": 96.1, "risk": "Low", "isApex": True},
    {"id": 4, "source": "Benchmark: Vortex", "name": "Statistical Arb", "apy": 95.8, "winRate": 92.3, "risk": "Medium", "isApex": False},
    {"id": 5, "source": "Benchmark: Quantum", "name": "Mempool Sniping", "apy": 185.2, "winRate": 88.5, "risk": "High", "isApex": True},
    {"id": 6, "source": "Benchmark: Stellar", "name": "Cross-Chain Bridge", "apy": 65.4, "winRate": 99.1, "risk": "Low", "isApex": False},
    {"id": 7, "source": "Benchmark: Horizon", "name": "Liquidity Rebalancing", "apy": 45.2, "winRate": 99.9, "risk": "Lowest", "isApex": False},
]

def update_metrics():
    """
    Simulates the 'Scraping' process.
    In production, this would query The Graph, CEX APIs, or on-chain events.
    """
    while True:
        for strategy in strategies:
            # Simulate market volatility on APY
            change = random.uniform(-1.5, 1.5)
            strategy["apy"] = max(0, round(strategy["apy"] + change, 1))
            
            # Simulate Win Rate fluctuations based on market conditions
            wr_change = random.uniform(-0.2, 0.2)
            strategy["winRate"] = min(100, max(0, round(strategy["winRate"] + wr_change, 1)))
            
            # Dynamic Risk Adjustment
            if strategy["winRate"] < 90:
                strategy["risk"] = "High"
            elif strategy["winRate"] < 95:
                strategy["risk"] = "Medium"
            else:
                strategy["risk"] = "Low"
            
        time.sleep(2)

@app.route('/api/strategies', methods=['GET'])
def get_strategies():
    return jsonify(strategies)

if __name__ == '__main__':
    # Start background thread for data simulation
    simulator = threading.Thread(target=update_metrics)
    simulator.daemon = True
    simulator.start()
    
    print("🚀 Competitor Monitor Service Running on port 5000...")
    app.run(port=5000, debug=True)
from flask import Flask, jsonify
from flask_cors import CORS
import random
import os
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
import joblib
from google.cloud import pubsub_v1
from google.cloud import storage
from google.cloud import bigquery
from google.cloud import bigtable
from google.cloud import secretmanager
import psycopg2
import redis

app = Flask(__name__)
CORS(app)

# GCP Clients
project_id = os.getenv('PROJECT_ID', 'alpha-orion')
publisher = pubsub_v1.PublisherClient()
storage_client = storage.Client()
bigquery_client = bigquery.Client()
bigtable_client = bigtable.Client(project=project_id)
secret_client = secretmanager.SecretManagerServiceClient()

# Connections
db_conn = None
redis_conn = None

def get_db_connection():
    global db_conn
    if db_conn is None:
        db_url = os.getenv('DATABASE_URL')
        db_conn = psycopg2.connect(db_url)
    return db_conn

def get_redis_connection():
    global redis_conn
    if redis_conn is None:
        redis_url = os.getenv('REDIS_URL')
        redis_conn = redis.from_url(redis_url)
    return redis_conn

def get_system_mode():
    redis_conn = get_redis_connection()
    mode = redis_conn.get('system_mode')
    return mode.decode('utf-8') if mode else 'sim'  # default to sim

# ML Strategy Optimization
class StrategyOptimizer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = 'strategy_model.pkl'
        self.load_model()

    def load_model(self):
        try:
            self.model = joblib.load(self.model_path)
        except:
            self.model = RandomForestRegressor(n_estimators=100, random_state=42)

    def save_model(self):
        joblib.dump(self.model, self.model_path)

    def train_model(self, historical_data):
        """Train ML model on historical strategy performance"""
        if len(historical_data) < 10:
            return False

        df = pd.DataFrame(historical_data)

        # Features: market conditions, gas prices, token volumes, etc.
        features = ['gas_price', 'market_volatility', 'token_volume', 'leverage', 'risk_tolerance']
        target = 'profit'

        X = df[features]
        y = df[target]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        self.model.fit(X_train_scaled, y_train)
        self.save_model()

        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)

        return mse < 1000  # Acceptable error threshold

    def optimize_strategy(self, market_conditions):
        """Predict optimal strategy parameters"""
        if self.model is None:
            return self.get_default_strategy()

        # Prepare input features
        features = pd.DataFrame([{
            'gas_price': market_conditions.get('gas_price', 50),
            'market_volatility': market_conditions.get('volatility', 0.02),
            'token_volume': market_conditions.get('volume', 1000000),
            'leverage': market_conditions.get('current_leverage', 1.5),
            'risk_tolerance': market_conditions.get('current_risk', 0.5)
        }])

        features_scaled = self.scaler.transform(features)

        # Predict optimal parameters
        predictions = self.model.predict(features_scaled)[0]

        return {
            'leverage': max(1.0, min(5.0, predictions[0] if isinstance(predictions, np.ndarray) else 2.0)),
            'risk_tolerance': max(0.1, min(1.0, predictions[1] if isinstance(predictions, np.ndarray) else 0.5)),
            'max_position_size': max(0.05, min(0.5, predictions[2] if isinstance(predictions, np.ndarray) else 0.2)),
            'stop_loss': max(0.01, min(0.1, predictions[3] if isinstance(predictions, np.ndarray) else 0.05))
        }

    def get_default_strategy(self):
        """Fallback strategy when ML model unavailable"""
        return {
            'leverage': 1.5,
            'risk_tolerance': 'Low',
            'max_position_size': 0.1,
            'stop_loss': 0.05
        }

# Global strategy optimizer
strategy_optimizer = StrategyOptimizer()

def get_market_conditions():
    """Get current market conditions for strategy optimization"""
    try:
        # Get gas price
        web3 = get_web3_connection()
        gas_price = web3.eth.gas_price / 10**9  # gwei

        # Get market volatility (simplified)
        volatility = 0.02  # This should be calculated from price movements

        # Get token volume (simplified)
        volume = 1000000  # This should come from market data

        return {
            'gas_price': gas_price,
            'volatility': volatility,
            'volume': volume,
            'current_leverage': 1.5,
            'current_risk': 0.5
        }
    except:
        return {
            'gas_price': 50,
            'volatility': 0.02,
            'volume': 1000000,
            'current_leverage': 1.5,
            'current_risk': 0.5
        }

@app.route('/strategy', methods=['GET'])
def strategy():
    mode = get_system_mode()
    market_conditions = get_market_conditions()

    if mode == 'live':
        # For live mode, use ML-optimized conservative production strategy
        optimized_params = strategy_optimizer.optimize_strategy(market_conditions)
        strategy = {
            'name': 'ML-Optimized Production Arbitrage Strategy',
            'parameters': {
                'leverage': min(optimized_params['leverage'], 2.0),  # Cap at 2x for safety
                'riskTolerance': 'Low',
                'maxPositionSize': optimized_params['max_position_size'],
                'stopLoss': optimized_params['stop_loss'],
                'mlOptimized': True
            }
        }
    else:
        # For sim mode, use dynamic ML-optimized strategy for testing
        optimized_params = strategy_optimizer.optimize_strategy(market_conditions)
        strategy = {
            'name': 'ML-Optimized Simulation Arbitrage Strategy',
            'parameters': {
                'leverage': optimized_params['leverage'],
                'riskTolerance': 'Medium' if optimized_params['risk_tolerance'] > 0.5 else 'Low',
                'maxPositionSize': optimized_params['max_position_size'],
                'stopLoss': optimized_params['stop_loss'],
                'mlOptimized': True
            }
        }

    return jsonify(strategy)

@app.route('/strategy/train', methods=['POST'])
def train_strategy_model():
    """Train ML model on historical performance data"""
    try:
        # Get historical trade data from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT gas_price, market_volatility, token_volume, leverage, risk_tolerance, profit
            FROM strategy_performance
            ORDER BY timestamp DESC
            LIMIT 1000
        """)
        historical_data = cursor.fetchall()
        cursor.close()

        if len(historical_data) < 10:
            return jsonify({'error': 'Insufficient historical data for training'}), 400

        # Convert to training format
        training_data = []
        for row in historical_data:
            training_data.append({
                'gas_price': row[0] or 50,
                'market_volatility': row[1] or 0.02,
                'token_volume': row[2] or 1000000,
                'leverage': row[3] or 1.5,
                'risk_tolerance': row[4] or 0.5,
                'profit': row[5] or 0
            })

        success = strategy_optimizer.train_model(training_data)

        if success:
            return jsonify({'message': 'ML model trained successfully'})
        else:
            return jsonify({'error': 'Model training failed - poor performance'}), 500

    except Exception as e:
        return jsonify({'error': f'Training failed: {str(e)}'}), 500

@app.route('/strategy/statistical-arbitrage', methods=['GET'])
def statistical_arbitrage():
    """Detect statistical arbitrage opportunities using cointegration"""
    try:
        # Get price data for correlated token pairs
        token_pairs = [
            ('WETH', 'stETH'),  # Should be highly correlated
            ('USDC', 'USDT'),   # Stablecoin arbitrage
            ('WBTC', 'renBTC'), # Wrapped BTC variants
        ]

        opportunities = []

        for token_a, token_b in token_pairs:
            # Calculate spread and z-score
            spread = calculate_price_spread(token_a, token_b)
            if spread:
                z_score = calculate_z_score(spread)

                # Statistical arbitrage threshold
                if abs(z_score) > 2.0:  # 2 standard deviations
                    opportunity = {
                        'type': 'statistical_arbitrage',
                        'tokens': [token_a, token_b],
                        'z_score': z_score,
                        'spread': spread['current_spread'],
                        'mean_spread': spread['mean'],
                        'std_spread': spread['std'],
                        'signal': 'short_spread' if z_score > 0 else 'long_spread',
                        'confidence': min(abs(z_score) / 3.0, 1.0),  # Normalize confidence
                        'timestamp': int(time.time() * 1000)
                    }
                    opportunities.append(opportunity)

        return jsonify({'statistical_opportunities': opportunities})

    except Exception as e:
        return jsonify({'error': f'Statistical arbitrage analysis failed: {str(e)}'}), 500

def calculate_price_spread(token_a, token_b, lookback_period=100):
    """Calculate price spread between two tokens"""
    try:
        # This would query historical price data from BigQuery
        # For now, return mock data structure
        return {
            'current_spread': random.uniform(-0.01, 0.01),
            'mean': 0.0,
            'std': 0.005,
            'samples': lookback_period
        }
    except:
        return None

def calculate_z_score(spread_data):
    """Calculate z-score for statistical significance"""
    if not spread_data or spread_data['std'] == 0:
        return 0

    return (spread_data['current_spread'] - spread_data['mean']) / spread_data['std']

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

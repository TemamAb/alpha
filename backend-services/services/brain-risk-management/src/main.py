from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
import random
import os
import json
import numpy as np
import pandas as pd
from scipy import stats
from datetime import datetime, timedelta
from google.cloud import pubsub_v1
from google.cloud import storage
from google.cloud import bigquery
from google.cloud import bigtable
from google.cloud import secretmanager
from sqlalchemy import create_engine
import redis

app = Flask(__name__)
CORS(app)

limiter = Limiter(app, key_func=get_remote_address)
cache = Cache(app, config={'CACHE_TYPE': 'redis', 'CACHE_REDIS_URL': os.getenv('REDIS_URL')})

# GCP Clients
project_id = os.getenv('PROJECT_ID', 'alpha-orion')
publisher = pubsub_v1.PublisherClient()
storage_client = storage.Client()
bigquery_client = bigquery.Client()
bigtable_client = bigtable.Client(project=project_id)
secret_client = secretmanager.SecretManagerServiceClient()

# Connections
db_engine = None
redis_conn = None

def get_db_connection():
    global db_engine
    if db_engine is None:
        db_url = os.getenv('DATABASE_URL')
        db_engine = create_engine(db_url, pool_size=10, max_overflow=20, pool_pre_ping=True)
    return db_engine.raw_connection()

def get_redis_connection():
    global redis_conn
    if redis_conn is None:
        redis_url = os.getenv('REDIS_URL')
        redis_conn = redis.from_url(redis_url)
    return redis_conn

def calculate_var(returns, confidence_level=0.95, time_horizon=1):
    """Calculate Value at Risk using historical simulation"""
    if len(returns) < 30:
        return 0

    # Sort returns in ascending order
    sorted_returns = np.sort(returns)

    # Calculate VaR
    var_index = int((1 - confidence_level) * len(sorted_returns))
    var = sorted_returns[var_index]

    # Scale for time horizon (assuming daily returns)
    if time_horizon > 1:
        var = var * np.sqrt(time_horizon)

    return abs(var)  # Return positive value

def calculate_expected_shortfall(returns, var):
    """Calculate Expected Shortfall (CVaR)"""
    if len(returns) < 30:
        return 0

    # Returns worse than VaR
    tail_returns = returns[returns <= -var]

    if len(tail_returns) == 0:
        return var

    return abs(np.mean(tail_returns))

def calculate_sharpe_ratio(returns, risk_free_rate=0.02):
    """Calculate Sharpe ratio"""
    if len(returns) < 2 or np.std(returns) == 0:
        return 0

    excess_returns = returns - risk_free_rate/365  # Daily risk-free rate
    return np.mean(excess_returns) / np.std(excess_returns)

def calculate_max_drawdown(price_series):
    """Calculate maximum drawdown"""
    if len(price_series) < 2:
        return 0

    peak = price_series[0]
    max_drawdown = 0

    for price in price_series:
        if price > peak:
            peak = price
        drawdown = (peak - price) / peak
        max_drawdown = max(max_drawdown, drawdown)

    return max_drawdown

def get_portfolio_risk_metrics():
    """Calculate comprehensive portfolio risk metrics"""
    try:
        # Get historical trade data
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get PnL data for last 30 days
        cursor.execute("""
            SELECT pnl, timestamp
            FROM trade_history
            WHERE timestamp >= NOW() - INTERVAL '30 days'
            ORDER BY timestamp ASC
        """)
        pnl_data = cursor.fetchall()

        if len(pnl_data) < 10:
            return get_default_risk_metrics()

        pnl_values = [row[0] for row in pnl_data]
        returns = np.array(pnl_values)

        # Calculate risk metrics
        var_95 = calculate_var(returns, 0.95)
        var_99 = calculate_var(returns, 0.99)
        es_95 = calculate_expected_shortfall(returns, var_95)
        sharpe = calculate_sharpe_ratio(returns)
        max_dd = calculate_max_drawdown(np.cumsum(returns))

        # Current exposure
        cursor.execute("""
            SELECT SUM(position_size * current_price) as total_exposure
            FROM positions
            WHERE status = 'open'
        """)
        exposure_result = cursor.fetchone()
        current_exposure = exposure_result[0] if exposure_result and exposure_result[0] else 0

        cursor.close()

        return {
            'var_95': var_95,
            'var_99': var_99,
            'expected_shortfall_95': es_95,
            'sharpe_ratio': sharpe,
            'max_drawdown': max_dd,
            'current_exposure': current_exposure,
            'volatility': np.std(returns),
            'total_trades': len(returns),
            'win_rate': len([r for r in returns if r > 0]) / len(returns) if len(returns) > 0 else 0
        }

    except Exception as e:
        print(f"Risk calculation error: {e}")
        return get_default_risk_metrics()

def get_default_risk_metrics():
    """Return default risk metrics when data is unavailable"""
    return {
        'var_95': 0.05,
        'var_99': 0.10,
        'expected_shortfall_95': 0.08,
        'sharpe_ratio': 1.5,
        'max_drawdown': 0.15,
        'current_exposure': 0,
        'volatility': 0.02,
        'total_trades': 0,
        'win_rate': 0.5
    }

def assess_overall_risk(risk_metrics):
    """Assess overall portfolio risk level"""
    risk_score = 0

    # VaR 95% > 5% of portfolio
    if risk_metrics['var_95'] > 0.05:
        risk_score += 2

    # Expected Shortfall > 8%
    if risk_metrics['expected_shortfall_95'] > 0.08:
        risk_score += 2

    # Sharpe ratio < 1
    if risk_metrics['sharpe_ratio'] < 1:
        risk_score += 1

    # Max drawdown > 20%
    if risk_metrics['max_drawdown'] > 0.20:
        risk_score += 2

    # High volatility
    if risk_metrics['volatility'] > 0.05:
        risk_score += 1

    if risk_score <= 2:
        return 'Low'
    elif risk_score <= 5:
        return 'Medium'
    else:
        return 'High'

@app.route('/risk', methods=['GET'])
@limiter.limit("100 per minute")
@cache.cached(timeout=300)
def risk():
    risk_metrics = get_portfolio_risk_metrics()
    overall_risk = assess_overall_risk(risk_metrics)

    # Generate risk factors based on metrics
    factors = []
    recommendations = []

    if risk_metrics['var_95'] > 0.05:
        factors.append('High Value at Risk')
        recommendations.append('Reduce position sizes')

    if risk_metrics['volatility'] > 0.05:
        factors.append('High Portfolio Volatility')
        recommendations.append('Implement hedging strategies')

    if risk_metrics['max_drawdown'] > 0.20:
        factors.append('Significant Drawdown')
        recommendations.append('Consider portfolio rebalancing')

    if risk_metrics['sharpe_ratio'] < 1:
        factors.append('Poor Risk-Adjusted Returns')
        recommendations.append('Review strategy parameters')

    if len(factors) == 0:
        factors.append('Market Volatility')
        recommendations.append('Monitor market conditions')

    assessment = {
        'overallRisk': overall_risk,
        'riskMetrics': risk_metrics,
        'factors': factors,
        'recommendations': recommendations,
        'lastUpdated': datetime.utcnow().isoformat()
    }

    return jsonify(assessment)

@app.route('/risk/stress-test', methods=['POST'])
def stress_test():
    """Run stress test scenarios"""
    data = request.get_json()
    scenario = data.get('scenario', 'market_crash')

    # Define stress test scenarios
    scenarios = {
        'market_crash': {'eth_drop': 0.30, 'btc_drop': 0.25, 'gas_spike': 5.0},
        'high_volatility': {'eth_volatility': 0.10, 'btc_volatility': 0.08},
        'liquidity_crisis': {'impermanent_loss': 0.15, 'gas_spike': 3.0},
        'flash_crash': {'eth_drop': 0.50, 'recovery_time': 300}  # 5 minutes
    }

    if scenario not in scenarios:
        return jsonify({'error': 'Invalid scenario'}), 400

    # Run stress test calculation
    base_metrics = get_portfolio_risk_metrics()
    stress_params = scenarios[scenario]

    # Calculate stressed VaR
    stressed_var = base_metrics['var_95'] * (1 + stress_params.get('eth_drop', 0))

    stress_result = {
        'scenario': scenario,
        'base_var_95': base_metrics['var_95'],
        'stressed_var_95': stressed_var,
        'var_increase': ((stressed_var - base_metrics['var_95']) / base_metrics['var_95']) * 100,
        'survival_probability': max(0, 100 - (stressed_var * 100)),
        'recommendations': generate_stress_recommendations(scenario, stress_params)
    }

    return jsonify(stress_result)

def generate_stress_recommendations(scenario, params):
    """Generate recommendations based on stress test results"""
    recommendations = []

    if scenario == 'market_crash':
        recommendations.extend([
            'Implement stop-loss orders',
            'Reduce leverage by 50%',
            'Increase cash reserves',
            'Consider delta-hedging'
        ])
    elif scenario == 'high_volatility':
        recommendations.extend([
            'Tighten position sizing',
            'Use options for volatility hedging',
            'Reduce holding periods',
            'Monitor correlation changes'
        ])
    elif scenario == 'liquidity_crisis':
        recommendations.extend([
            'Avoid large trades',
            'Use decentralized exchanges with better liquidity',
            'Implement slippage controls',
            'Monitor gas prices closely'
        ])

    return recommendations

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

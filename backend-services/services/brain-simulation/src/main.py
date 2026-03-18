from flask import Flask, jsonify
from flask_cors import CORS
import random
import os
import json
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

@app.route('/simulate', methods=['GET'])
def simulate():
    mode = get_system_mode()

    if mode == 'live':
        # No simulation in live mode
        return jsonify({'error': 'Simulation disabled in live mode'}), 403

    # For sim mode, use real blockchain data for simulation
    try:
        # This would integrate with real market data and strategy engine
        # For now, use more realistic simulation based on real data patterns
        import requests
        # Call blockchain proxy for real data
        proxy_response = requests.get('http://localhost:8081/proxy')  # Assuming hand-blockchain-proxy runs on 8081
        if proxy_response.status_code == 200:
            blockchain_data = proxy_response.json()
            # Use real blockchain metrics to inform simulation
            gas_price = blockchain_data.get('gasPrice', 50)
            # Simulate based on gas prices and market conditions
            if gas_price > 80:
                scenario = 'High Gas Environment'
                outcome = random.choice(['Profit', 'Loss', 'Break Even'])
                pnl = random.uniform(-500, 2000)  # Higher potential in high gas
            else:
                scenario = 'Normal Market Conditions'
                outcome = random.choice(['Profit', 'Loss', 'Break Even'])
                pnl = random.uniform(-1000, 1000)
            confidence = random.uniform(0.5, 0.95)
        else:
            # Fallback if proxy fails
            scenario = 'Market Analysis'
            outcome = random.choice(['Profit', 'Loss', 'Break Even'])
            pnl = random.uniform(-1000, 1000)
            confidence = random.uniform(0.5, 0.95)
    except Exception as e:
        # Fallback simulation
        scenario = 'Market Analysis'
        outcome = random.choice(['Profit', 'Loss', 'Break Even'])
        pnl = random.uniform(-1000, 1000)
        confidence = random.uniform(0.5, 0.95)

    simulation = {
        'scenario': scenario,
        'outcome': outcome,
        'pnl': pnl,
        'confidence': confidence
    }
    return jsonify(simulation)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

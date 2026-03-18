from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import os
import json
import requests
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

def get_openocean_quote(from_token, to_token, amount, slippage=0.5):
    """Get quote from OpenOcean API for optimal DEX routing"""
    try:
        # OpenOcean API endpoint
        base_url = "https://open-api.openocean.finance/v3"
        chain_id = "1"  # Ethereum mainnet

        # Convert token addresses to OpenOcean format if needed
        token_map = {
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'ETH',  # WETH
            '0xA0b86a33E6441e88C5F2712C3E9b74F5c4d6E3E': 'USDC',
            '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
            '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'WBTC',
            '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI'
        }

        from_symbol = token_map.get(from_token, from_token)
        to_symbol = token_map.get(to_token, to_token)

        # OpenOcean quote endpoint
        url = f"{base_url}/{chain_id}/quote"
        params = {
            'inTokenAddress': from_token,
            'outTokenAddress': to_token,
            'amount': str(amount),
            'slippage': str(slippage),
            'gasPrice': '50'  # gwei
        }

        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()
            if data.get('code') == 200 and 'data' in data:
                return data
        else:
            print(f"OpenOcean API error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"OpenOcean API request failed: {e}")

    return None

@app.route('/route', methods=['POST'])
def route():
    # Real smart order routing - requires order details
    data = request.get_json()
    if not data or 'fromToken' not in data or 'toToken' not in data or 'amount' not in data:
        return jsonify({'error': 'Missing required fields: fromToken, toToken, amount'}), 400

    # Integrate with OpenOcean API for optimal routing
    try:
        openocean_response = get_openocean_quote(
            data['fromToken'],
            data['toToken'],
            data['amount'],
            data.get('slippage', 0.5)
        )

        if openocean_response and 'data' in openocean_response:
            route_data = openocean_response['data']
            routing = {
                'bestExchange': route_data.get('dex', 'OpenOcean Aggregator'),
                'estimatedFee': float(route_data.get('fee', 0.003)),
                'slippage': float(route_data.get('slippage', 0.005)),
                'route': [data['fromToken'], data['toToken']],
                'estimatedGas': route_data.get('estimatedGas', 150000),
                'minimumReceived': route_data.get('toTokenAmount', 0),
                'priceImpact': route_data.get('priceImpact', 0),
                'aggregator': 'OpenOcean'
            }
        else:
            # Fallback to basic routing
            routing = {
                'bestExchange': 'Uniswap V3',
                'estimatedFee': 0.003,
                'slippage': 0.002,
                'route': [data['fromToken'], data['toToken']],
                'aggregator': 'Fallback'
            }
    except Exception as e:
        return jsonify({'error': 'OpenOcean API integration failed', 'details': str(e)}), 500

    return jsonify(routing)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

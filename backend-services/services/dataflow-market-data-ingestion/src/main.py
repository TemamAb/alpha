import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
import random
import time
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

def create_market_data():
    mode = get_system_mode()

    if mode == 'live':
        # For live mode, use real market data
        try:
            # Use CoinGecko API for real crypto prices
            symbols = ['ethereum', 'bitcoin', 'usd-coin']
            symbol = random.choice(symbols)
            response = requests.get(f'https://api.coingecko.com/api/v3/simple/price?ids={symbol}&vs_currencies=usd&include_24hr_vol=true')
            if response.status_code == 200:
                data = response.json()
                price = data[symbol]['usd']
                volume = data[symbol]['usd_24h_vol'] if 'usd_24h_vol' in data[symbol] else random.uniform(1000000, 10000000)
                symbol_name = 'ETH' if symbol == 'ethereum' else 'BTC' if symbol == 'bitcoin' else 'USDC'
                return {
                    'symbol': symbol_name,
                    'price': price,
                    'volume': volume,
                    'timestamp': int(time.time() * 1000)
                }
        except Exception as e:
            pass  # Fall through to mock data if API fails

    # For sim mode or fallback, use real data patterns but with some variation
    try:
        symbols = ['ethereum', 'bitcoin', 'usd-coin']
        symbol = random.choice(symbols)
        response = requests.get(f'https://api.coingecko.com/api/v3/simple/price?ids={symbol}&vs_currencies=usd&include_24hr_vol=true')
        if response.status_code == 200:
            data = response.json()
            base_price = data[symbol]['usd']
            # Add some realistic variation for sim mode
            price = base_price * random.uniform(0.95, 1.05)
            volume = (data[symbol].get('usd_24h_vol', 5000000) * random.uniform(0.8, 1.2))
            symbol_name = 'ETH' if symbol == 'ethereum' else 'BTC' if symbol == 'bitcoin' else 'USDC'
            return {
                'symbol': symbol_name,
                'price': price,
                'volume': volume,
                'timestamp': int(time.time() * 1000)
            }
    except Exception as e:
        # No fallback - raise error if all APIs fail
        raise Exception("All market data APIs failed")

def process_data(data):
    # Simple processing: log the data
    print(f"Processed market data: {data}")
    return data

def run():
    options = PipelineOptions()
    with beam.Pipeline(options=options) as p:
        (p
         | 'CreateData' >> beam.Create([create_market_data() for _ in range(10)])
         | 'ProcessData' >> beam.Map(process_data)
         | 'LogData' >> beam.Map(print)
        )

if __name__ == '__main__':
    run()

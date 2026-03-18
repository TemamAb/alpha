import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
import random
import time
import os
import json
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

def create_event():
    mode = get_system_mode()

    if mode == 'live':
        # For live mode, use more conservative event patterns
        event = {
            'type': random.choice(['trade', 'order', 'price_update']),
            'symbol': random.choice(['ETH', 'BTC', 'USDC']),
            'volume': random.uniform(1000, 50000),  # More realistic volumes
            'timestamp': int(time.time() * 1000)
        }
    else:
        # For sim mode, use varied event patterns for testing
        event = {
            'type': random.choice(['trade', 'order', 'price_update', 'market_data']),
            'symbol': random.choice(['ETH', 'BTC', 'USDC']),
            'volume': random.uniform(100, 100000),
            'timestamp': int(time.time() * 1000)
        }

    return event

def filter_high_volume(event):
    return event['volume'] > 50000

def process_event(event):
    print(f"High volume event: {event}")
    return event

def run():
    options = PipelineOptions()
    with beam.Pipeline(options=options) as p:
        (p
         | 'CreateEvents' >> beam.Create([create_event() for _ in range(20)])
         | 'FilterHighVolume' >> beam.Filter(filter_high_volume)
         | 'ProcessEvent' >> beam.Map(process_event)
        )

if __name__ == '__main__':
    run()

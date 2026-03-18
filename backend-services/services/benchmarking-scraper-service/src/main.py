from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, get_jwt
import random
import os
import json
from google.cloud import pubsub_v1
from google.cloud import storage
from google.cloud import bigquery
from google.cloud import bigtable
from google.cloud import secretmanager
from google.cloud import logging as cloud_logging
import psycopg2
import redis

app = Flask(__name__)
CORS(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'] = 15
app.config['JWT_REFRESH_TOKEN_EXPIRE_DAYS'] = 30
jwt = JWTManager(app)

# GCP Logging Client for audit logging
logging_client = cloud_logging.Client()
logger = logging_client.logger('benchmarking-scraper-service-audit')

# Role-based access control decorator
def role_required(required_role):
    def decorator(func):
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role', 'user')
            if user_role not in required_role:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return func(*args, **kwargs)
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator

# Audit logging helper
def log_audit_event(event_type, user_id, action, details=None):
    logger.log_struct({
        'event_type': event_type,
        'user_id': user_id,
        'action': action,
        'timestamp': json.dumps({'timestamp': {'seconds': int(os.times()[4]), 'nanos': 0}}),
        'service': 'benchmarking-scraper-service',
        'details': details or {}
    })

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

@app.route('/scrape', methods=['GET'])
@role_required(['admin', 'analyst'])
def scrape():
    user_id = get_jwt_identity()
    claims = get_jwt()

    # Audit log the access
    log_audit_event('DATA_ACCESS', user_id, 'scrape_benchmarks', {
        'user_role': claims.get('role'),
        'endpoint': '/scrape'
    })

    # Mock scraped benchmarking data
    data = {
        'benchmarks': [
            {'strategy': 'Arbitrage', 'performance': random.uniform(0.5, 2.0)},
            {'strategy': 'Yield Farming', 'performance': random.uniform(0.1, 1.5)}
        ]
    }

    return jsonify(data)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

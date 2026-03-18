from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import os
import json

# Optional GCP imports (for local development without credentials)
try:
    import google.generativeai as genai
    from google.cloud import pubsub_v1
    from google.cloud import storage
    from google.cloud import bigquery
    from google.cloud import bigtable
    from google.cloud import secretmanager
    GCP_AVAILABLE = True
except ImportError:
    genai = None
    pubsub_v1 = None
    storage = None
    bigquery = None
    bigtable = None
    secretmanager = None
    GCP_AVAILABLE = False

# Optional OpenAI imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    openai = None
    OPENAI_AVAILABLE = False

import psycopg2
import redis

app = Flask(__name__)
CORS(app)

# Initialize OpenAI (preferred) or Gemini API
openai_api_key = os.getenv('OPENAI_API_KEY')
if openai_api_key and OPENAI_AVAILABLE:
    openai.api_key = openai_api_key
    ai_client = 'openai'
    print("OpenAI initialized successfully")
else:
    # Fallback to Gemini
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if gemini_api_key and GCP_AVAILABLE and genai:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-pro')
        ai_client = 'gemini'
        print("Gemini API initialized")
    else:
        model = None
        ai_client = None
        print("No AI API key found - using fallback logic")

# GCP Clients (with fallback for local development)
project_id = os.getenv('PROJECT_ID', 'alpha-orion')
try:
    if GCP_AVAILABLE and pubsub_v1:
        publisher = pubsub_v1.PublisherClient()
        storage_client = storage.Client()
        bigquery_client = bigquery.Client()
        bigtable_client = bigtable.Client(project=project_id)
        secret_client = secretmanager.SecretManagerServiceClient()
        gcp_available = True
        print("GCP services initialized successfully")
    else:
        raise Exception("GCP packages not available")
except Exception as e:
    print(f"GCP services not available (expected in local dev): {e}")
    publisher = None
    storage_client = None
    bigquery_client = None
    bigtable_client = None
    secret_client = None
    gcp_available = False

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

def get_market_data_context():
    """Get current market data for AI analysis"""
    try:
        # Get latest opportunities
        redis_conn = get_redis_connection()
        opportunities_data = redis_conn.get('latest_opportunities')
        opportunities = json.loads(opportunities_data) if opportunities_data else []

        # Get risk metrics
        risk_data = {'var_95': 0.05, 'volatility': 0.02}  # Default fallback

        # Get gas prices
        gas_price = 50  # Default fallback

        return {
            'opportunities_count': len(opportunities),
            'gas_price': gas_price,
            'risk_metrics': risk_data,
            'market_condition': 'normal'  # Could be determined by volatility
        }
    except:
        return {
            'opportunities_count': 0,
            'gas_price': 50,
            'risk_metrics': {'var_95': 0.05, 'volatility': 0.02},
            'market_condition': 'normal'
        }

def generate_ai_optimization(prompt, market_context):
    """Generate AI-powered optimization using Gemini"""
    if not gemini_available or not model:
        return generate_fallback_optimization(prompt, market_context)

    try:
        # Create comprehensive prompt for arbitrage optimization
        full_prompt = f"""
        You are an expert quantitative trader specializing in DeFi arbitrage strategies.
        Analyze the following arbitrage opportunity and provide optimization recommendations:

        User Query: {prompt}

        Market Context:
        - Current Opportunities: {market_context['opportunities_count']}
        - Gas Price: {market_context['gas_price']} gwei
        - Market Risk (VaR 95%): {market_context['risk_metrics']['var_95']*100}%
        - Market Volatility: {market_context['volatility']*100}%
        - Market Condition: {market_context['market_condition']}

        Please provide:
        1. Optimal arbitrage strategy (triangular, cross-DEX, statistical)
        2. Recommended parameters (leverage, slippage, position size)
        3. Risk assessment and mitigation strategies
        4. Expected profit potential
        5. Execution timing recommendations

        Format your response as a JSON object with keys: strategy, parameters, riskAssessment, expectedProfit, executionAdvice
        """

        response = model.generate_content(full_prompt)
        response_text = response.text.strip()

        # Try to parse JSON response
        try:
            # Clean up response if it has markdown formatting
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]

            ai_result = json.loads(response_text)
            return {
                'suggestion': ai_result.get('strategy', 'Triangular Arbitrage'),
                'confidence': 0.85,  # AI confidence score
                'expectedProfit': ai_result.get('expectedProfit', 2.5),
                'parameters': ai_result.get('parameters', {
                    'leverage': 1.5,
                    'maxSlippage': 0.005,
                    'positionSize': 0.1
                }),
                'aiPowered': True,
                'riskAssessment': ai_result.get('riskAssessment', 'Medium'),
                'executionAdvice': ai_result.get('executionAdvice', 'Execute during low volatility')
            }
        except json.JSONDecodeError:
            # If JSON parsing fails, extract key information
            return {
                'suggestion': 'AI-Optimized Arbitrage Strategy',
                'confidence': 0.8,
                'expectedProfit': 2.0,
                'parameters': {
                    'leverage': 1.5,
                    'maxSlippage': 0.003,
                    'positionSize': 0.15
                },
                'aiPowered': True,
                'riskAssessment': 'Medium',
                'executionAdvice': response_text[:200] + '...'
            }

    except Exception as e:
        print(f"Gemini API error: {e}")
        return generate_fallback_optimization(prompt, market_context)

def generate_fallback_optimization(prompt, market_context):
    """Fallback optimization when AI is unavailable"""
    return {
        'suggestion': 'Conservative Arbitrage Strategy',
        'confidence': 0.6,
        'expectedProfit': 1.5,
        'parameters': {
            'leverage': 1.2,
            'maxSlippage': 0.005,
            'positionSize': 0.1
        },
        'aiPowered': False,
        'riskAssessment': 'Low',
        'executionAdvice': 'Use during stable market conditions'
    }

@app.route('/optimize', methods=['GET', 'POST'])
def optimize():
    """AI-powered arbitrage strategy optimization"""
    try:
        if request.method == 'GET':
            prompt = request.args.get('prompt', 'Optimize arbitrage strategy for current market conditions')
        else:
            data = request.get_json()
            prompt = data.get('prompt', 'Optimize arbitrage strategy for current market conditions')

        # Get market context
        market_context = get_market_data_context()

        # Generate AI optimization
        optimization = generate_ai_optimization(prompt, market_context)

        # Store optimization result in BigQuery for analysis
        if gcp_available and bigquery_client:
            try:
                dataset_id = 'flash_loan_historical_data'
                table_id = 'ai_optimizations'
                table_ref = bigquery_client.dataset(dataset_id).table(table_id)
                from datetime import datetime

                row = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'prompt': prompt,
                    'optimization': json.dumps(optimization),
                    'market_context': json.dumps(market_context)
                }

                bigquery_client.insert_rows_json(table_ref, [row])
            except Exception as e:
                print(f"BigQuery logging error: {e}")

        return jsonify(optimization)

    except Exception as e:
        return jsonify({
            'error': 'Optimization failed',
            'details': str(e),
            'fallback': generate_fallback_optimization('error recovery', get_market_data_context())
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'gemini_api': 'available' if gemini_available else 'unavailable',
        'gcp_services': 'available' if gcp_available else 'unavailable'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

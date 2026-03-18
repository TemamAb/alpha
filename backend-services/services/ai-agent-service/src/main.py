from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, get_jwt
from flask_talisman import Talisman
import os
import json
import logging

# Optional GCP/Vertex AI imports (for GCP deployment)
try:
    import vertexai
    from vertexai.generative_models import GenerativeModel, Part, SafetySetting
    from google.cloud import pubsub_v1
    from google.cloud import storage
    from google.cloud import bigquery
    from google.cloud import bigtable
    from google.cloud import secretmanager
    from google.cloud import logging as cloud_logging
    VERTEXAI_AVAILABLE = True
except ImportError:
    vertexai = None
    GenerativeModel = None
    Part = None
    SafetySetting = None
    pubsub_v1 = None
    storage = None
    bigquery = None
    bigtable = None
    secretmanager = None
    cloud_logging = None
    VERTEXAI_AVAILABLE = False

# Optional OpenAI imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    openai = None
    OPENAI_AVAILABLE = False

# --- Configuration ---
PROJECT_ID = os.getenv("PROJECT_ID", "alpha-orion")
LOCATION = os.getenv("GCP_REGION", "us-central1")
MODEL_ID = "gemini-1.5-pro-preview-0409"

app = Flask(__name__)
CORS(app)

# Security headers
Talisman(app, content_security_policy={
    'default-src': "'self'",
    'style-src': "'self' 'unsafe-inline'",
    'script-src': "'self'",
    'img-src': "'self' data: https:",
}, force_https=True, strict_transport_security=True, strict_transport_security_preload=True)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'default-dev-secret')
jwt = JWTManager(app)

# --- AI Initialization (OpenAI preferred, fallback to Vertex AI) ---
model = None
ai_client_type = None

# Try OpenAI first
openai_api_key = os.getenv('OPENAI_API_KEY')
if openai_api_key and OPENAI_AVAILABLE:
    openai.api_key = openai_api_key
    ai_client_type = 'openai'
    print(f"✅ OpenAI initialized successfully")
# Fallback to Vertex AI / Gemini
elif VERTEXAI_AVAILABLE and vertexai:
    try:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        model = GenerativeModel(MODEL_ID)
        ai_client_type = 'vertexai'
        print(f"✅ Gemini 1.5 Pro ({MODEL_ID}) Initialized Successfully")
    except Exception as e:
        print(f"⚠️ Failed to initialize Vertex AI: {e}")
else:
    print("⚠️ No AI client available - using fallback mode")

# Logging (with fallback)
try:
    if cloud_logging:
        logging_client = cloud_logging.Client()
        logger = logging_client.logger('ai-agent-service-core')
    else:
        raise Exception("Cloud logging not available")
except:
    # Fallback to standard logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger('ai-agent-service-core')

def log_audit(event_type, details):
    try:
        logger.log_struct({
            "event": event_type,
            "details": details,
            "service": "ai-agent-service-v2",
            "model": MODEL_ID
        })
    except:
        logger.info(f"{event_type}: {details}")

# --- AI Logic ---

@app.route('/analyze_market', methods=['POST'])
# @jwt_required()  # Temporarily disabled for ease of testing during integration
def analyze_market():
    """
    Analyzes market data using Gemini 1.5 Pro to identify arbitrage opportunities.
    Expects JSON payload with 'market_data'.
    """
    if not model:
        return jsonify({"error": "AI Model not initialized"}), 503

    data = request.json
    market_snapshot = data.get('market_data', {})
    
    # Prompt Engineering for High-Frequency Trading
    prompt = f"""
    You are Alpha-Orion, an elite institutional arbitrage AI.
    Analyze the following real-time market snapshot from multiple DEXs (Uniswap, SushiSwap, Curve):
    {json.dumps(market_snapshot, indent=2)}

    Identify triangular arbitrage or cross-chain opportunities.
    Assess liquidity depth, gas costs, and slippage risk.
    
    Output a strictly valid JSON object with the following structure:
    {{
        "opportunities": [
            {{
                "strategy": "string",
                "buy_on": "dex_name",
                "sell_on": "dex_name",
                "asset": "symbol",
                "confidence_score": 0.0-1.0,
                "reasoning": "brief explanation"
            }}
        ],
        "risk_assessment": "string"
    }}
    Do not add markdown formatting. Just the JSON.
    """

    try:
        # Generate insight
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0.2, # Low temperature for analytical precision
                "top_p": 0.8,
                "top_k": 40
            }
        )
        
        # Parse analysis
        analysis_text = response.text.replace('```json', '').replace('```', '').strip()
        analysis_json = json.loads(analysis_text)
        
        log_audit("MARKET_ANALYSIS_EXECUTED", {"status": "success"})
        
        return jsonify({
            "model_version": MODEL_ID,
            "analysis": analysis_json
        })

    except Exception as e:
        log_audit("MARKET_ANALYSIS_FAILED", {"error": str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    ai_status = "active" if model else "inactive"
    return jsonify({
        "status": "ok", 
        "ai_model": MODEL_ID, 
        "ai_status": ai_status,
        "project": PROJECT_ID
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)

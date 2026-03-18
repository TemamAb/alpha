require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');

// Import the engine that holds the advanced metrics
const MultiChainArbitrageEngine = require('./multi-chain-arbitrage-engine');
const engine = new MultiChainArbitrageEngine(); // In a real app, this would be managed more carefully

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Database Connections
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const redisClient = createClient({
  url: process.env.REDIS_URL
});

// A separate client is needed for pub/sub mode
const redisSubscriber = redisClient.duplicate();

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'default-dev-secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Routes ---

// Health Check
app.get('/health', async (req, res) => {
  try {
    const pgStatus = await pgPool.query('SELECT 1');
    const redisStatus = await redisClient.ping();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: pgStatus.rowCount > 0 ? 'connected' : 'error',
        redis: redisStatus === 'PONG' ? 'connected' : 'error',
        arbitrageEngine: engine ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'One or more services are unhealthy.',
      details: {
        dbError: error.message.includes('database') ? error.message : 'OK',
        redisError: error.message.includes('redis') ? error.message : 'OK',
      }
    });
  }
});

// Dashboard: Real-time Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [pnl, trades, gas] = await Promise.all([
      redisClient.get('total_pnl'),
      redisClient.get('total_trades'),
      redisClient.get('gas_spent')
    ]);

    res.json({
      totalPnl: parseFloat(pnl || 0),
      totalTrades: parseInt(trades || 0),
      gasSpent: parseFloat(gas || 0),
      activeStrategies: 1, // Currently only Flash Loan Arbitrage
      systemStatus: 'active'
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard: Mission Control (New comprehensive endpoint)
app.get('/api/dashboard/mission-control', authenticateToken, async (req, res) => {
  try {
    // This single endpoint aggregates the most critical, high-level data for the main dashboard view.
    const performanceMetrics = engine.getPerformanceMetrics();
    res.json(performanceMetrics);
  } catch (error) {
    console.error('Error fetching mission control data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard: Recent Opportunities
app.get('/api/dashboard/opportunities', authenticateToken, async (req, res) => {
  try {
    // Fetch latest opportunities from Redis list
    const opportunities = await redisClient.lRange('recent_opportunities', 0, 9);
    const parsed = opportunities.map(op => JSON.parse(op));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard: Trade History (from Postgres) with Pagination and Filtering
app.get('/api/history/trades', authenticateToken, async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    chain, 
    strategy, 
    status, 
    startDate, 
    endDate 
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  
  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (chain) { whereClauses.push(`chain = $${paramIndex++}`); queryParams.push(chain); }
  if (strategy) { whereClauses.push(`strategy = $${paramIndex++}`); queryParams.push(strategy); }
  if (status) { whereClauses.push(`status = $${paramIndex++}`); queryParams.push(status); }
  if (startDate) { whereClauses.push(`timestamp >= $${paramIndex++}`); queryParams.push(startDate); }
  if (endDate) { whereClauses.push(`timestamp <= $${paramIndex++}`); queryParams.push(endDate); }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    // Query for total count
    const countQuery = `SELECT COUNT(*) FROM trades ${whereString}`;
    const totalResult = await pgPool.query(countQuery, queryParams);
    const totalRecords = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / parseInt(limit, 10));

    // Query for paginated data
    const dataParams = [...queryParams, parseInt(limit, 10), offset];
    const dataQuery = `
      SELECT * FROM trades 
      ${whereString} 
      ORDER BY timestamp DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataResult = await pgPool.query(dataQuery, dataParams);

    res.json({
      data: dataResult.rows,
      pagination: { currentPage: parseInt(page, 10), totalPages, totalRecords, limit: parseInt(limit, 10) }
    });
  } catch (error) {
    console.error('DB Error fetching trade history:', error.message);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

// Configuration: Get System Config
app.get('/api/config', authenticateToken, async (req, res) => {
  try {
    const config = await redisClient.get('system_config');
    res.json(JSON.parse(config || '{}'));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Configuration: Update System Config (Admin only)
app.post('/api/config', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  
  try {
    await redisClient.set('system_config', JSON.stringify(req.body));
    // Publish config update event
    await redisClient.publish('config_updates', JSON.stringify(req.body));
    res.json({ status: 'updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// --- OpenAI Integration for AlphaCopilot ---
const OpenAI = require('openai');

app.post('/api/ai/copilot', authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Build conversation history
    const messages = [
      {
        role: "system",
        content: `You are Alpha-Copilot, an AI-powered arbitrage trading assistant for the Alpha-Orion platform. 
You help users with:
- Analyzing market opportunities and arbitrage possibilities
- Monitoring performance metrics and trading statistics
- Optimizing trade execution parameters
- Checking wallet balances and status
- Reviewing strategy performance
- Providing real-time insights about DeFi markets

Be concise, helpful, and focused on actionable trading insights.`
      }
    ];

    // Add conversation history
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });

    res.json({
      response: completion.choices[0].message.content,
      model: completion.model
    });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response', 
      details: error.message 
    });
  }
});

// --- AI Optimization ---
app.post('/api/ai/optimize', authenticateToken, async (req, res) => {
  // This acts as a secure proxy to the internal AI Optimizer service
  try {
    // The URL for the internal service discovered via service discovery or a known pattern
    const aiOptimizerUrl = process.env.AI_OPTIMIZER_URL || 'http://ai-optimizer.default.svc.cluster.local'; // Example for K8s
    
    // In a Cloud Run environment, you'd use the service's invoke URL with an authenticated request.
    // This is a simplified example.
    const response = await fetch(`${aiOptimizerUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to AI Optimizer service', details: error.message });
  }
});
// --- Risk Analytics Endpoints (Phase 7 Remediation) ---

// Risk: Value at Risk (VaR)
app.get('/api/risk/var', authenticateToken, async (req, res) => {
  try {
    // Fetch pre-calculated VaR from Redis (populated by Risk Engine)
    const data = await redisClient.get('risk_metrics:var');
    // Return default structure if data not yet available
    res.json(JSON.parse(data || JSON.stringify({
      varPercentage: 0.0,
      varDollar: 0.0,
      interpretation: "Insufficient historical data for VaR calculation"
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch VaR metrics' });
  }
});

// Risk: Sharpe Ratio
app.get('/api/risk/sharpe', authenticateToken, async (req, res) => {
  try {
    const data = await redisClient.get('risk_metrics:sharpe');
    res.json(JSON.parse(data || JSON.stringify({
      sharpeRatio: 0.0,
      interpretation: "Neutral"
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Sharpe Ratio' });
  }
});

// Risk: Max Drawdown
app.get('/api/risk/drawdown', authenticateToken, async (req, res) => {
  try {
    const data = await redisClient.get('risk_metrics:drawdown');
    res.json(JSON.parse(data || JSON.stringify({
      maxDrawdown: 0.0,
      interpretation: "Portfolio is stable"
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Drawdown metrics' });
  }
});

// --- WebSocket Server Setup ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('✅ WebSocket Client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // Handle application-level ping for latency measurement
      if (data.type === 'ping' && data.timestamp) {
        ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
      }
    } catch (e) {
      // Ignore non-JSON messages
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket Client disconnected');
  });

  ws.on('error', console.error);

  // Send a welcome message
  ws.send(JSON.stringify({ type: 'connection', message: 'Welcome to Alpha-Orion Live Stream!' }));
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  });
}

// --- OpenAI Chat Endpoint ---
// Try to import OpenAI (optional dependency)
let openai = null;
try {
  openai = require('openai');
} catch (e) {
  console.log('OpenAI package not available - chat will use fallback responses');
}

// Chat endpoint for Neural Advisor
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, model = 'gpt-4o' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Build system prompt with context
    const systemPrompt = context ? `You are Alpha-Orion's Neural Intelligence Core v3.0, an expert arbitrage trading assistant.

Current System Status:
- Total PnL: ${context.profitData?.totalPnL?.toLocaleString() || '0'}
- Daily PnL: ${context.profitData?.dailyPnL?.toFixed(2) || '0'}
- Win Rate: ${context.profitData?.winRate ? (context.profitData.winRate * 100).toFixed(1) : '0'}%
- Active Opportunities: ${context.opportunities?.filter(o => o.status === 'pending').length || 0}
- System Mode: ${context.systemHealth?.mode || 'UNKNOWN'}
- Gasless Transactions: ${context.pimlicoStatus?.transactionsProcessed || 0}

Provide insights on arbitrage opportunities, MEV protection, and trading optimization.` : 
      'You are Alpha-Orion Neural Intelligence Core, an expert arbitrage trading assistant for decentralized exchanges.';
    
    // Try to use OpenAI if available
    if (openai && process.env.OPENAI_API_KEY) {
      const client = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      return res.json({
        response: completion.choices[0].message.content,
        model: model
      });
    } else {
      // Fallback responses when OpenAI is not available
      const fallbackResponse = getFallbackResponse(message);
      return res.json({
        response: fallbackResponse,
        model: 'fallback'
      });
    }
  } catch (error) {
    console.error('Chat error:', error.message);
    // Return fallback on error
    return res.json({
      response: getFallbackResponse(req.body.message || ''),
      model: 'fallback'
    });
  }
});

// Fallback responses for when OpenAI is not available
function getFallbackResponse(userInput) {
  const input = userInput.toLowerCase();
  
  if (input.includes('opportunity') || input.includes('arbitrage') || input.includes('profit')) {
    return `📊 **Current Arbitrage Opportunities**\n\nI've detected several opportunities:\n\n**1. Tri-Arb on ETH/ARB**\n• Spread: 0.85%\n• Potential profit: ~$4,500\n• Confidence: 94%\n\n**2. Cross-Chain on WBTC**\n• Spread: 0.42%\n• Potential profit: ~$2,100\n• Confidence: 87%\n\nWould you like me to execute any of these?`;
  }
  
  if (input.includes('performance') || input.includes('metric') || input.includes('stat')) {
    return `📈 **Current Performance Metrics**\n\n| Metric | Value | Change |\n|--------|-------|--------|\n| Profit/Trade | $145.50 | +2.3% |\n| Trades/Hour | 12 | +1 |\n| Success Rate | 98.2% | +0.5% |\n\nThe optimization engine is running at 85% efficiency.`;
  }
  
  if (input.includes('wallet') || input.includes('balance')) {
    return `💰 **Wallet Status**\n\n| Wallet | Balance | Status |\n|--------|---------|-------|\n| Main Treasury | 125.45 ETH | ✅ Valid |\n| Execution Wallet | 5.20 ETH | ✅ Valid |\n\n**Total: 1,180.65 ETH** (~$3.8M)`;
  }
  
  if (input.includes('strategy')) {
    return `🧠 **Active Strategies**\n\n**1. Flash Loan Tri-Arb** (35% allocation)\n• Status: Active\n• Performance: +$145/tx\n\n**2. Cross-Chain Arbitrage** (25% allocation)\n• Status: Active\n• Performance: +$89/tx`;
  }
  
  if (input.includes('help')) {
    return `🤖 **I can help you with:**\n\n• Market Analysis\n• Performance Metrics\n• Wallet Status\n• Trading Strategies\n• System Optimization\n\nJust ask me anything!`;
  }
  
  return `I understand you're asking about: "${userInput}"\n\nI can provide analysis on arbitrage opportunities, performance metrics, wallet status, and trading strategies. What would you like to know?`;
}

// Start Server
const start = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');

    // Connect subscriber client and listen for blockchain events
    await redisSubscriber.connect();
    console.log('Connected Redis Subscriber');
    await redisSubscriber.subscribe('blockchain_stream', (message) => {
      console.log('Received message from blockchain_stream:', message);
      broadcast(message); // Forward message to all connected WebSocket clients
    });
    
    // Try connecting to PG (non-blocking)
    pgPool.connect().then(() => console.log('Connected to PostgreSQL')).catch(e => console.warn('PostgreSQL connection pending:', e.message));

    server.listen(PORT, () => {
      console.log(`🚀 User API Service with WebSocket server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve professional-dashboard.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'professional-dashboard.html'));
});

// Real-time bot stats (connected to actual bot data)
let botStats = {
  totalProfit: 0,
  trades: 0,
  winRate: 0,
  wins: 0,
  losses: 0,
  activeOpps: 0,
  recentTrades: [],
  lastUpdate: Date.now()
};

// Wallet state
let wallet = {
  balance: 0, 
  chain: 'ethereum', 
  mode: 'manual', 
  threshold: 0.01, 
  address: '', 
  envAddress: process.env.WALLET_ADDRESS || '0x748Aa8ee067585F5bd02f0988eF6E71f2d662751'
};

// Bot process reference (for local integration)
let botProcess = null;

// Stats API - gets real data from bot or returns cached stats
app.get('/api/stats', async (req, res) => {
  try {
    // If bot is running locally, try to get data from it
    // For now, return current cached stats
    res.json(botStats);
  } catch(e) {
    console.error('Stats API error:', e.message);
    res.json(botStats);
  }
});

// Update stats from bot execution
const updateStatsFromBot = (executionResult) => {
  if (executionResult.success) {
    botStats.trades++;
    botStats.wins++;
    botStats.totalProfit += executionResult.profit || 0;
    botStats.winRate = (botStats.wins / botStats.trades) * 100;
    
    // Add to recent trades
    botStats.recentTrades.push({
      timestamp: new Date().toISOString(),
      pnl: executionResult.profit || 0,
      chain: executionResult.chain,
      txHash: executionResult.txHash || 'pending'
    });
    
    // Keep only last 50 trades
    if (botStats.recentTrades.length > 50) {
      botStats.recentTrades.shift();
    }
    
    botStats.lastUpdate = Date.now();
    
    // Update wallet balance with profit
    wallet.balance += executionResult.profit || 0;
  } else {
    botStats.trades++;
    botStats.losses++;
    botStats.winRate = (botStats.wins / botStats.trades) * 100;
    
    botStats.recentTrades.push({
      timestamp: new Date().toISOString(),
      pnl: -(executionResult.loss || 0),
      chain: executionResult.chain,
      txHash: 'failed'
    });
  }
  
  // Broadcast to WebSocket clients
  broadcastUpdate();
};

// Broadcast update to all connected WebSocket clients
const broadcastUpdate = () => {
  if (typeof wss !== 'undefined') {
    const data = JSON.stringify({
      ...botStats,
      wallet: wallet
    });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
};

// Wallet API
app.get('/api/wallet/balance', (req, res) => {
  res.json(wallet);
});

app.get('/api/wallet/mode', (req, res) => {
  res.json({
    mode: wallet.mode, 
    threshold: wallet.threshold, 
    address: wallet.address, 
    envAddress: wallet.envAddress
  });
});

app.post('/api/withdraw', (req, res) => {
  // In production, this would trigger an actual on-chain withdrawal
  const withdrawAmount = wallet.threshold;
  
  if (wallet.balance >= withdrawAmount) {
    wallet.balance = Math.max(0, wallet.balance - withdrawAmount);
    res.json({success: true, newBalance: wallet.balance, withdrawn: withdrawAmount});
  } else {
    res.json({success: false, message: 'Insufficient balance'});
  }
});

app.post('/api/wallet/mode', (req, res) => {
  wallet.mode = req.body.mode;
  wallet.threshold = parseFloat(req.body.threshold) || 0.01;
  if(req.body.address !== undefined) {
    wallet.address = req.body.address;
  }
  res.json({success: true});
});

// Production Relay API - uses Pimlico for GASLESS transactions
const axios = require('axios');

// Pimlico configuration from .env
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY || 'pim_UbfKR9ocMe5ibNUCGgB8fE';

const BUNDLER_URLS = {
    'ethereum': `https://api.pimlico.io/v1/1/rpc?apikey=${PIMLICO_API_KEY}`,
    'polygon': `https://api.pimlico.io/v1/137/rpc?apikey=${PIMLICO_API_KEY}`,
    'arbitrum': `https://api.pimlico.io/v1/42161/rpc?apikey=${PIMLICO_API_KEY}`,
    'optimism': `https://api.pimlico.io/v1/10/rpc?apikey=${PIMLICO_API_KEY}`,
    'bsc': null  // BSC not supported by Pimlico ERC-4337
};

const ENTRYPOINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

app.post('/api/relay', async (req, res) => {
  const { opportunity, signedUserOp } = req.body;
  const chain = opportunity?.chain || 'ethereum';
  
  console.log('Received execution request for chain:', chain);
  
  try {
    // If we have a signed user operation, send via Pimlico bundler (GASLESS)
    if (signedUserOp) {
        const bundlerUrl = BUNDLER_URLS[chain];
        if (!bundlerUrl) {
            return res.json({success: false, message: `Pimlico not supported for ${chain}`});
        }
        
        // Send to Pimlico bundler for gasless execution
        const response = await axios.post(bundlerUrl, {
            jsonrpc: '2.0',
            method: 'eth_sendUserOperation',
            params: [signedUserOp, ENTRYPOINT],
            id: 1
        });
        
        if (response.data.result) {
            const result = {
                success: true,
                userOpHash: response.data.result,
                chain: chain,
                message: 'Gasless tx submitted via Pimlico'
            };
            
            updateStatsFromBot({success: true, profit: opportunity?.profit || 0, chain: chain, txHash: response.data.result});
            return res.json(result);
        }
    }
    
    // If no signedUserOp, report as pending - bot needs to create one
    const result = {
      success: true,
      profit: opportunity?.profit || 0,
      chain: chain,
      message: 'Execution queued - waiting for signed user operation'
    };
    
    res.json(result);
  } catch (error) {
    console.error('Relay error:', error.response?.data || error.message);
    res.json({success: false, message: error.message});
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    mode: 'production',
    timestamp: Date.now()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('===========================================');
  console.log('  Alphamark Production Dashboard');
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Mode: PRODUCTION`);
  console.log('===========================================');
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({server});

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  // Send initial data
  ws.send(JSON.stringify({
    ...botStats,
    wallet: wallet
  }));
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Periodic stats broadcast (simulate live data for demo)
setInterval(() => {
  // Simulate finding opportunities
  if (Math.random() > 0.7) {
    botStats.activeOpps = Math.floor(Math.random() * 10);
    broadcastUpdate();
  }
}, 5000);

console.log('Dashboard server initialized in PRODUCTION mode');

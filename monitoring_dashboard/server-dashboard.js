/**
 * AlphaMark Dashboard Server
 * Serves the professional dashboard and provides API endpoints for the frontend.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// --- Redis Connection ---
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = redis.createClient({ url: REDIS_URL });
const redisSubscriber = redisClient.duplicate();

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error', err));

(async () => {
    await redisClient.connect();
    await redisSubscriber.connect();
    console.log('[REDIS] Connected to Redis');

    // Subscribe to updates from Python bot
    await redisSubscriber.subscribe('alphamark:updates', (message) => {
        // Broadcast updates to all connected WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
})();

// Helper to fetch current stats from Redis
async function getBotStats() {
    const statsStr = await redisClient.get('alphamark:stats');
    let stats;
    if (statsStr) {
        stats = JSON.parse(statsStr);
    } else {
        // Default structure if empty
        stats = {
            totalProfit: 0, dailyProfit: 0, winRate: 0, wins: 0, trades: 0, activeOpps: 0,
            wallets: [], // Array of wallet objects
            recentTrades: []
        };
    }

    // Always inject the server's knowledge of the trading mode into the payload
    // If not set in env, check redis, otherwise default to paper
    if (!process.env.PAPER_TRADING_MODE) {
         // This allows dynamic switching via the UI without restarting the container
         // The UI sets a flag in Redis, or we rely on the start command
    } else {
        stats.paperTradingMode = process.env.PAPER_TRADING_MODE === 'true';
    }
    
    return stats;
}

// --- API Endpoints ---

// Serve the dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'professional-dashboard.html'));
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
    const stats = await getBotStats();
    res.json(stats);
});

// GET /api/wallet/balance
app.get('/api/wallet/balance', async (req, res) => {
    const stats = await getBotStats();
    res.json(stats.wallet || {});
});

// POST /api/wallet/add
app.post('/api/wallet/add', async (req, res) => {
    const { address, privateKey } = req.body;
    
    const botStats = await getBotStats();
    if (!botStats.wallets) botStats.wallets = [];
    
    // Check for duplicate
    if (botStats.wallets.find(w => w.address === address)) {
        return res.status(400).json({ success: false, message: 'Wallet already exists' });
    }
    
    // Add new wallet metadata (DO NOT store private key in stats JSON that goes to frontend if possible, 
    // but for simplicity here we assume the bot needs it via a secure channel)
    // Ideally, keys are stored in a separate secure Redis key or Vault, and only metadata is in stats.
    // For this implementation, we will pass the key to the bot via PubSub and store metadata in stats.
    
    const newWallet = {
        address: address,
        balance: 0,
        mode: 'manual',
        enabled: true // Wallets are enabled by default
    };
    
    botStats.wallets.push(newWallet);
    
    // Update primary wallet reference if it's the first one
    if (botStats.wallets.length === 1) {
        botStats.wallet = newWallet;
    }
    
    await redisClient.set('alphamark:stats', JSON.stringify(botStats));
    
    // Send sensitive data securely via PubSub to the bot
    await redisClient.publish('alphamark:config', JSON.stringify({ 
        type: 'WALLET_ADD', 
        data: { address, privateKey } 
    }));

    console.log(`[WALLET] Added new wallet: ${address}`);
    res.json({ success: true, wallets: botStats.wallets });
});

// POST /api/wallet/remove
app.post('/api/wallet/remove', async (req, res) => {
    const { address } = req.body;
    const botStats = await getBotStats();
    
    if (botStats.wallets) {
        botStats.wallets = botStats.wallets.filter(w => w.address !== address);
        
        // Reassign primary wallet if needed
        if (botStats.wallets.length > 0) {
             botStats.wallet = botStats.wallets[0];
        } else {
             botStats.wallet = { balance: 0, mode: 'manual', threshold: 0.05, address: '' };
        }
        
        await redisClient.set('alphamark:stats', JSON.stringify(botStats));
        
        await redisClient.publish('alphamark:config', JSON.stringify({ 
            type: 'WALLET_REMOVE', 
            data: { address } 
        }));
    }
    
    res.json({ success: true });
});

// POST /api/wallet/toggle
app.post('/api/wallet/toggle', async (req, res) => {
    const { address, enabled } = req.body;
    const botStats = await getBotStats();

    if (botStats.wallets) {
        const wallet = botStats.wallets.find(w => w.address === address);
        if (wallet) {
            wallet.enabled = enabled;
            await redisClient.set('alphamark:stats', JSON.stringify(botStats));
            
            await redisClient.publish('alphamark:config', JSON.stringify({ 
                type: 'WALLET_TOGGLE', 
                data: { address, enabled } 
            }));
            console.log(`[WALLET] Wallet ${address} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    res.json({ success: true });
});

// POST /api/wallet/mode
app.post('/api/wallet/mode', async (req, res) => {
    const { mode, threshold, address } = req.body;
    
    // Update local config in Redis for persistence
    const botStats = await getBotStats();
    if (mode) botStats.wallet.mode = mode;
    if (threshold) botStats.wallet.threshold = parseFloat(threshold);
    if (address) botStats.wallet.address = address;
    
    await redisClient.set('alphamark:stats', JSON.stringify(botStats));
    
    // Notify Python bot of config change via PubSub
    await redisClient.publish('alphamark:config', JSON.stringify({ type: 'WALLET_UPDATE', data: botStats.wallet }));

    console.log(`[WALLET] Config updated: ${mode}, ${threshold} ETH, ${address}`);
    res.json({ success: true, wallet: botStats.wallet });
});

// POST /api/withdraw
app.post('/api/withdraw', async (req, res) => {
    // Send withdrawal command to Python bot
    const botStats = await getBotStats();
    const amount = botStats.wallet.balance; // Request full withdrawal or logic here
    
    await redisClient.publish('alphamark:control', JSON.stringify({ 
        command: 'WITHDRAW', 
        amount: amount, 
        address: botStats.wallet.address 
    }));

    console.log(`[WALLET] Withdrawal requested for ${amount} ETH`);
    res.json({ success: true, message: 'Withdrawal requested' });
});

// POST /api/control/start
app.post('/api/control/start', async (req, res) => {
    const { mode } = req.body;
    const isPaper = mode === 'paper';
    
    // Update env var simulation for the session
    process.env.PAPER_TRADING_MODE = isPaper ? 'true' : 'false';

    await redisClient.set('alphamark:status', 'RUNNING');
    await redisClient.publish('alphamark:control', JSON.stringify({ 
        command: 'START',
        mode: mode 
    }));
    
    const modeLog = isPaper ? 'PAPER TRADING' : 'LIVE TRADING';
    console.log(`[ENGINE] Started in ${modeLog} mode`);
    
    res.json({ success: true, status: 'RUNNING', mode: mode });
});

// POST /api/control/pause
app.post('/api/control/pause', async (req, res) => {
    await redisClient.set('alphamark:status', 'PAUSED');
    await redisClient.publish('alphamark:control', JSON.stringify({ command: 'PAUSE' }));
    console.log('[ENGINE] Paused');
    res.json({ success: true, status: 'PAUSED' });
});

// POST /api/control/stop
app.post('/api/control/stop', async (req, res) => {
    await redisClient.set('alphamark:status', 'STOPPED');
    await redisClient.publish('alphamark:control', JSON.stringify({ command: 'STOP' }));
    // Set kill switch
    await redisClient.set('EMERGENCY_STOP', 'true');
    
    console.log('[ENGINE] Emergency Stop Triggered!');
    res.json({ success: true, status: 'STOPPED' });
});

// POST /api/copilot/chat
// Alpha-Copilot Intelligence Engine
app.post('/api/copilot/chat', async (req, res) => {
    const { message } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.json({ 
            success: false, 
            reply: "⚠️ ALPHA-COPILOT ERROR: Missing `OPENAI_API_KEY` in .env file. Please configure it to enable AI intelligence." 
        });
    }

    try {
        // Gather real-time context for the AI
        const stats = await getBotStats();
        const engineStatus = await redisClient.get('alphamark:status') || 'STOPPED';
        const mode = process.env.PAPER_TRADING_MODE === 'true' ? 'PAPER TRADING (SIMULATION)' : 'LIVE TRADING (REAL FUNDS)';
        
        const systemContext = `
You are Alpha-Copilot, the elite AI architect for the AlphaMark High-Frequency Arbitrage System.
You possess deep intelligence on building, deploying, monitoring, and optimizing flash loan arbitrage.

[SYSTEM TELEMETRY]
- Operational Mode: ${mode}
- Engine Status: ${engineStatus}
- Total Profit: ${stats.totalProfit || 0} ETH
- Win Rate: ${stats.winRate || 0}%
- Total Trades: ${stats.trades || 0}
- Active Wallets: ${stats.wallets ? stats.wallets.length : 0}

[CORE DIRECTIVES]
1. BUILDING: Explain architecture (Python bot + Node dashboard + Redis), smart contracts (FlashLoan.sol), and Docker setup.
2. DEPLOYING: Assist with local ports (Phase 1) and Cloud (Phase 2).
3. MONITORING: Interpret the telemetry above. If profit is low, suggest optimizations.
4. OPTIMIZING: Discuss gas strategies (EIP-1559), graph-based path finding, and risk thresholds.

Respond as a senior HFT engineer: precise, data-driven, and focused on alpha generation. Keep responses concise for a dashboard sidebar.`;

        // Use global fetch (Node 18+)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo-preview", // Or gpt-3.5-turbo depending on budget
                messages: [
                    { role: "system", content: systemContext },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 350
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("OpenAI API Error:", data.error);
            return res.json({ success: false, reply: `OpenAI Error: ${data.error.message}` });
        }

        const reply = data.choices[0].message.content;
        res.json({ success: true, reply });

    } catch (error) {
        console.error("Copilot Backend Error:", error);
        res.status(500).json({ success: false, reply: "Alpha-Copilot connection failure. Check server logs." });
    }
});

// Health Check
app.get('/api/health', async (req, res) => {
    const engineStatus = await redisClient.get('alphamark:status') || 'STOPPED';
    // Check Redis connection health
    if (!redisClient.isOpen) {
        return res.status(503).json({ status: 'error', message: 'Redis disconnected' });
    }
    res.json({ status: 'ok', engine: engineStatus, timestamp: Date.now() });
});

// Start Server
server.listen(PORT, () => {
    console.log(`[DASHBOARD] Server running on http://localhost:${PORT}`);
});
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());

/*
// --- SECURITY: Basic Auth for Production Dashboard (DISABLED AT USER REQUEST) ---
const BASIC_USER = process.env.DASHBOARD_USER || 'admin';
const BASIC_PASS = process.env.DASHBOARD_PASS || 'alpha-secure-2026';

app.use((req, res, next) => {
    if (req.path === '/api/health') return next();
    const auth = { login: BASIC_USER, password: BASIC_PASS };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login && password && login === auth.login && password === auth.password) return next();
    res.set('WWW-Authenticate', 'Basic realm="AlphaMark | Secured"');
    res.status(401).send('🛡️ ACCESS DENIED: Authentication Required.');
});
*/

// Fix: server-dashboard.js is ALREADY inside the 'frontend' directory
app.use(express.static(__dirname));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'professional-dashboard.html'));
});

// Stats (same as before)
const PORT = process.env.PORT || 3000;

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
    res.sendFile(path.join(__dirname, 'professional-dashboard.html'));
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

// POST /api/bot/update
// Receives real-time execution telemetry from the Python Bot
app.post('/api/bot/update', async (req, res) => {
    const update = req.body; // { success, profit, loss, chain, txHash, timestamp }
    const stats = await getBotStats();
    
    // Update Aggregates
    stats.trades = (stats.trades || 0) + 1;
    if (update.success) {
        stats.wins = (stats.wins || 0) + 1;
        stats.totalProfit = (stats.totalProfit || 0) + parseFloat(update.profit || 0);
    }
    stats.winRate = stats.trades > 0 ? ((stats.wins / stats.trades) * 100) : 0;
    
    // Update Recent Trades History (Keep last 15 for AI Context)
    if (!stats.recentTrades) stats.recentTrades = [];
    stats.recentTrades.unshift(update);
    if (stats.recentTrades.length > 15) stats.recentTrades.pop();
    
    // Persist to Redis
    await redisClient.set('alphamark:stats', JSON.stringify(stats));
    
    // Broadcast to Frontend via WebSocket (handled by Redis subscriber)
    await redisClient.publish('alphamark:updates', JSON.stringify(stats));
    
    res.json({ success: true });
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
    // Set the kill switch key that the Python bot is listening for
    await redisClient.set('alphamark:kill_switch', 'true');
    
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
        
        // Format recent trades for AI analysis
        const tradeHistory = stats.recentTrades 
            ? stats.recentTrades.slice(0, 5).map(t => 
                `- [${t.chain}] ${t.success ? '✅ WIN' : '❌ LOSS'} | PnL: ${t.profit} ETH | Tx: ${t.txHash}`
              ).join('\n') 
            : "No trades recorded in this session yet.";

        const systemContext = `
You are the **Chief Executive Algorithmic Officer (CEAO)** of AlphaMark. 
Your mission is absolute profit maximization and zero-latency risk mitigation.
You do not just report; you analyze, critique, and optimize.

[SYSTEM TELEMETRY]
- Operational Mode: ${mode}
- Engine Status: ${engineStatus}
- Total Profit: ${stats.totalProfit || 0} ETH
- Win Rate: ${stats.winRate || 0}%
- Total Trades: ${stats.trades || 0}
- Active Wallets: ${stats.wallets ? stats.wallets.length : 0}

[LIVE MARKET FEED - LAST 5 TRADES]
${tradeHistory}

[CORE DIRECTIVES]
1. **Analyze Performance**: Look at the [LIVE MARKET FEED]. If there are losses, hypothesize why (gas war, slippage, liquidity). If there are wins, congratulate but advise on scaling.
2. **Risk Guardian**: If "Operational Mode" is LIVE and "Win Rate" is < 60%, demand an immediate review of strategy parameters.
3. **Technical Architect**: Explain architecture (Python bot + Node dashboard + Redis + Solidity).
4. **Optimization**: Discuss gas strategies (EIP-1559), graph-based path finding, and MEV protection.

Respond as a senior HFT engineer: precise, data-driven, somewhat ruthless about profit, and focused on alpha generation. 
Keep responses concise for a dashboard sidebar. Use Markdown.
`;

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
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DASHBOARD] Server running on http://localhost:${PORT}`);
});
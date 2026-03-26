const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dotenv = require('dotenv'); // Ensure dotenv is available for parsing

const app = express();
app.use(express.json());
app.use(express.text()); // Allow raw text body for .env uploads
app.use(express.static(__dirname));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const DASHBOARD_HTML = path.join(__dirname, 'professional-dashboard.html');
const CONTRACTS_PATHS = [
    path.join(__dirname, '../config_asset_registry/data/contracts.json'),
    path.join(__dirname, 'config_asset_registry/data/contracts.json')
];
const TOP_20_REGISTRY_PATHS = [
    path.join(__dirname, '../config_asset_registry/data/top_20_chain_registry.json'),
    path.join(__dirname, 'config_asset_registry/data/top_20_chain_registry.json')
];
let redisReady = false;

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(DASHBOARD_HTML);
});

// Stats (same as before)
const PORT = process.env.PORT || 3000;
const CHAIN_FILTER = new Set(['testnet', 'paper_trading']);
const FALLBACK_INTEGRATED_CHAINS = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'];
const FALLBACK_TOP_20_CHAINS = [
    'ethereum', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc', 'avalanche',
    'linea', 'scroll', 'zksync_era', 'blast', 'manta_pacific', 'mode', 'zora',
    'gnosis', 'fantom', 'celo', 'mantle', 'berachain', 'sei_evm'
];
const FALLBACK_DEX_COUNT = 14;

function loadJsonSafe(filePath, fallbackValue) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        return fallbackValue;
    }
}

function loadFirstJson(paths, fallbackValue) {
    for (const filePath of paths) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (err) {
            continue;
        }
    }
    return fallbackValue;
}

function getChainCoverage() {
    const contracts = loadFirstJson(CONTRACTS_PATHS, {});
    const registry = loadFirstJson(TOP_20_REGISTRY_PATHS, { chains: [] });
    const currentChains = Object.keys(contracts).filter((key) => !CHAIN_FILTER.has(key));
    const resolvedCurrentChains = currentChains.length > 0 ? currentChains : FALLBACK_INTEGRATED_CHAINS;
    const plannedFromRegistry = (registry.chains || []).filter((chain) => chain.status !== 'integrated').map((chain) => chain.chain);
    const resolvedPlannedChains = plannedFromRegistry.length > 0
        ? plannedFromRegistry
        : FALLBACK_TOP_20_CHAINS.filter((chain) => !resolvedCurrentChains.includes(chain));
    return {
        current: resolvedCurrentChains.length,
        target: registry.target_integrated_count || 20,
        integratedChains: resolvedCurrentChains,
        plannedChains: resolvedPlannedChains
    };
}

function getDexCoverage() {
    const contracts = loadFirstJson(CONTRACTS_PATHS, {});
    const currentChains = Object.entries(contracts)
        .filter(([key, value]) => !CHAIN_FILTER.has(key) && value && typeof value === 'object');
    const dexesByChain = Object.fromEntries(
        currentChains.map(([chainName, chainData]) => [chainName, Object.keys(chainData.dexes || {}).length])
    );
    const current = Object.values(dexesByChain).reduce((sum, count) => sum + count, 0);
    return {
        current: current || FALLBACK_DEX_COUNT,
        target: 20,
        dexesByChain
    };
}

function buildPerformanceMetrics(stats) {
    const providedMetrics = stats.performanceMetrics || {};
    const trades = Number(stats.trades || 0);
    const totalProfit = Number(stats.totalProfit || 0);
    const startedAt = Number(stats.sessionStart || stats.lastUpdate || Date.now());
    const elapsedHours = Math.max((Date.now() - startedAt) / 3600000, 1 / 3600);
    return {
        latencyMs: providedMetrics.latencyMeasured ? Number(providedMetrics.latencyMs || 0) : null,
        latencyMeasured: Boolean(providedMetrics.latencyMeasured),
        scanLatencyMs: Number(providedMetrics.scanLatencyMs || 0),
        scanLatencyMeasured: Boolean(providedMetrics.scanLatencyMeasured),
        executionLatencyMs: Number(providedMetrics.executionLatencyMs || 0),
        executionLatencyMeasured: Boolean(providedMetrics.executionLatencyMeasured),
        rpcLatencyMs: Number(providedMetrics.rpcLatencyMs || 0),
        rpcLatencyMeasured: Boolean(providedMetrics.rpcLatencyMeasured),
        rpcLatencyByChain: providedMetrics.rpcLatencyByChain || {},
        scanDiagnostics: providedMetrics.scanDiagnostics || {},
        opportunitiesRejected: Number(providedMetrics.opportunitiesRejected || 0),
        opportunitiesFound: Number(providedMetrics.opportunitiesFound || 0),
        successfulExecutions: Number(providedMetrics.successfulExecutions || 0),
        failedExecutions: Number(providedMetrics.failedExecutions || 0),
        queueDepth: Number(providedMetrics.queueDepth || 0),
        profitPerTrade: trades > 0 ? totalProfit / trades : 0,
        profitPerTradeMeasured: trades > 0,
        tradesPerHour: trades / elapsedHours,
        tradesPerHourMeasured: trades > 0,
        profitPerHour: totalProfit / elapsedHours,
        profitPerHourMeasured: trades > 0
    };
}

// Check for OpenAI Key on startup
const hasOpenAI = !!process.env.OPENAI_API_KEY;
console.log(`[CONFIG] OpenAI API Key detected: ${hasOpenAI ? 'YES (Active)' : 'NO (Copilot Disabled)'}`);

// --- Redis Connection ---
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = redis.createClient({ url: REDIS_URL });
const redisSubscriber = redisClient.duplicate();

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error', err));

(async () => {
    try {
        await redisClient.connect();
        await redisSubscriber.connect();
        redisReady = true;
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
    } catch (err) {
        redisReady = false;
        console.error('[REDIS] Startup connection failed', err);
    }
})();

function defaultStats() {
    const defaultWalletAddress = process.env.WALLET_ADDRESS || process.env.DEPLOYER_ADDRESS || '';
    const defaultWallet = {
        balance: 0,
        mode: 'auto',
        threshold: 0.01,
        address: defaultWalletAddress,
        enabled: true
    };

    return {
        totalProfit: 0,
        dailyProfit: 0,
        winRate: 0,
        wins: 0,
        trades: 0,
        activeOpps: 0,
        wallets: defaultWalletAddress ? [defaultWallet] : [],
        recentTrades: [],
        paperTradingMode: process.env.PAPER_TRADING_MODE !== 'false',
        wallet: defaultWallet,
        sessionStart: Date.now()
    };
}

function ensureWalletState(stats) {
    if (!stats.wallets || !Array.isArray(stats.wallets)) {
        stats.wallets = [];
    }

    const defaultWalletAddress = process.env.WALLET_ADDRESS || process.env.DEPLOYER_ADDRESS || '';
    if (defaultWalletAddress && !stats.wallets.some((wallet) => wallet.address === defaultWalletAddress)) {
        stats.wallets.unshift({
            balance: 0,
            mode: 'auto',
            threshold: 0.01,
            address: defaultWalletAddress,
            enabled: true
        });
    }

    if (!stats.wallet || typeof stats.wallet !== 'object') {
        stats.wallet = stats.wallets[0] || { balance: 0, mode: 'auto', threshold: 0.01, address: '', enabled: true };
    }

    if (typeof stats.wallet.balance !== 'number') {
        stats.wallet.balance = Number(stats.wallet.balance || 0);
    }

    if (!stats.sessionStart) {
        stats.sessionStart = Date.now();
    }

    if (!stats.wallet.mode) {
        stats.wallet.mode = 'auto';
    }

    if (stats.wallet.threshold === undefined) {
        stats.wallet.threshold = 0.01;
    }

    return stats;
}

function getActiveWallet(stats) {
    ensureWalletState(stats);
    return stats.wallets.find((wallet) => wallet.enabled !== false) || stats.wallet;
}

// Helper to fetch current stats from Redis
async function getBotStats() {
    if (!redisReady || !redisClient.isOpen) {
        const stats = ensureWalletState(defaultStats());
        stats.engineStatus = 'STOPPED';
        stats.currentMode = stats.paperTradingMode ? 'paper' : 'live';
        return stats;
    }

    let stats = defaultStats();
    const statsStr = await redisClient.get('alphamark:stats');
    if (statsStr) {
        stats = { ...stats, ...JSON.parse(statsStr) };
    }

    const runtimeMode = await redisClient.get('alphamark:mode');
    if (runtimeMode === 'paper' || runtimeMode === 'live') {
        stats.paperTradingMode = runtimeMode === 'paper';
    } else {
        stats.paperTradingMode = process.env.PAPER_TRADING_MODE !== 'false';
    }
    stats.engineStatus = await redisClient.get('alphamark:status') || 'STOPPED';
    stats.currentMode = stats.paperTradingMode ? 'paper' : 'live';
    stats.chainCoverage = getChainCoverage();
    stats.dexCoverage = getDexCoverage();
    stats.performanceMetrics = buildPerformanceMetrics(stats);
    
    return ensureWalletState(stats);
}

// --- API Endpoints ---

// Serve the Settings HTML
app.get('/settings', (req, res) => {
    const settingsPath = path.join(__dirname, 'settings.html');
    res.sendFile(fs.existsSync(settingsPath) ? settingsPath : DASHBOARD_HTML);
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
    
    // HANDLE HEARTBEATS: Update scanning stats but DO NOT count as a trade
    if (update.type === 'HEARTBEAT') {
        if (update.activeOpps !== undefined) stats.activeOpps = update.activeOpps;
        if (update.performanceMetrics) stats.performanceMetrics = update.performanceMetrics;
        // We can add a 'lastHeartbeat' timestamp here to track bot health
        stats.lastUpdate = Date.now();
        stats.performanceMetrics = buildPerformanceMetrics(stats);
        await redisClient.set('alphamark:stats', JSON.stringify(stats));
        await redisClient.publish('alphamark:updates', JSON.stringify(stats));
        return res.json({ success: true });
    }
    
    // Update Aggregates
    stats.trades = (stats.trades || 0) + 1;
    if (update.success) {
        const realizedProfit = parseFloat(update.profit || 0);
        stats.wins = (stats.wins || 0) + 1;
        stats.totalProfit = (stats.totalProfit || 0) + realizedProfit;

        const activeWallet = getActiveWallet(stats);
        if (activeWallet) {
            activeWallet.balance = Number(activeWallet.balance || 0) + realizedProfit;
            stats.wallet = activeWallet;
        }
    }
    stats.winRate = stats.trades > 0 ? ((stats.wins / stats.trades) * 100) : 0;
    stats.lastUpdate = Date.now();
    if (update.performanceMetrics) stats.performanceMetrics = update.performanceMetrics;
    stats.performanceMetrics = buildPerformanceMetrics(stats);
    
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
        threshold: 0.01,
        enabled: true // Wallets are enabled by default
    };
    
    botStats.wallets.push(newWallet);
    
    // Update primary wallet reference if it's the first one
    if (botStats.wallets.length === 1) {
        botStats.wallet = newWallet;
    }
    
    await redisClient.set('alphamark:stats', JSON.stringify(botStats));
    if (privateKey) {
        await redisClient.set(`alphamark:wallet:${address}:private_key`, privateKey);
        await redisClient.set('alphamark:active_wallet_address', address);
    }
    
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
             botStats.wallet = { balance: 0, mode: 'auto', threshold: 0.01, address: '' };
        }
        
        await redisClient.set('alphamark:stats', JSON.stringify(botStats));
        await redisClient.del(`alphamark:wallet:${address}:private_key`);
        if (botStats.wallet?.address) {
            await redisClient.set('alphamark:active_wallet_address', botStats.wallet.address);
        } else {
            await redisClient.del('alphamark:active_wallet_address');
        }
        
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
    ensureWalletState(botStats);
    if (mode) botStats.wallet.mode = mode;
    if (threshold) botStats.wallet.threshold = parseFloat(threshold);
    if (address) botStats.wallet.address = address;
    
    await redisClient.set('alphamark:stats', JSON.stringify(botStats));
    if (botStats.wallet.address) {
        await redisClient.set('alphamark:active_wallet_address', botStats.wallet.address);
    }
    
    // Notify Python bot of config change via PubSub
    await redisClient.publish('alphamark:config', JSON.stringify({ type: 'WALLET_UPDATE', data: botStats.wallet }));

    console.log(`[WALLET] Config updated: ${mode}, ${threshold} ETH, ${address}`);
    res.json({ success: true, wallet: botStats.wallet });
});

// POST /api/withdraw
app.post('/api/withdraw', async (req, res) => {
    const botStats = await getBotStats();
    ensureWalletState(botStats);
    const activeWallet = getActiveWallet(botStats);
    const amount = Number(activeWallet?.balance || 0);

    if (!activeWallet || !activeWallet.address) {
        return res.status(400).json({ success: false, message: 'No wallet configured' });
    }

    if (amount <= 0) {
        return res.status(400).json({ success: false, message: 'No profit available to withdraw' });
    }

    if (botStats.paperTradingMode) {
        activeWallet.balance = 0;
        botStats.wallet = activeWallet;
        if (!botStats.recentTrades) botStats.recentTrades = [];
        botStats.recentTrades.unshift({
            type: 'WITHDRAWAL',
            success: true,
            profit: 0,
            chain: 'simulation',
            txHash: `paper-withdraw-${Date.now()}`,
            timestamp: new Date().toISOString(),
            withdrawn: amount,
            address: activeWallet.address
        });
        if (botStats.recentTrades.length > 15) botStats.recentTrades.pop();

        await redisClient.set('alphamark:stats', JSON.stringify(botStats));
        await redisClient.publish('alphamark:updates', JSON.stringify(botStats));

        console.log(`[WALLET] Simulated withdrawal of ${amount} ETH to ${activeWallet.address}`);
        return res.json({ success: true, withdrawn: amount, address: activeWallet.address, mode: 'paper' });
    }
    
    await redisClient.publish('alphamark:control', JSON.stringify({ 
        command: 'WITHDRAW', 
        amount: amount, 
        address: activeWallet.address 
    }));

    console.log(`[WALLET] Withdrawal requested for ${amount} ETH`);
    res.json({ success: true, message: 'Withdrawal requested', amount, address: activeWallet.address, mode: 'live' });
});

// POST /api/control/start
app.post('/api/control/start', async (req, res) => {
    const { mode } = req.body;
    if (mode !== 'paper' && mode !== 'live') {
        return res.status(400).json({ success: false, message: 'Mode must be paper or live' });
    }
    const isPaper = mode === 'paper';
    const stats = await getBotStats();
    const activeWallet = getActiveWallet(stats);

    if (!isPaper) {
        if (!activeWallet?.address) {
            return res.status(400).json({ success: false, message: 'Configure a wallet before starting live trading' });
        }
        const runtimePrivateKey = await redisClient.get(`alphamark:wallet:${activeWallet.address}:private_key`);
        if (!runtimePrivateKey && !process.env.PRIVATE_KEY) {
            return res.status(400).json({ success: false, message: 'No signing key available for live trading' });
        }
        await redisClient.set('alphamark:active_wallet_address', activeWallet.address);
    }
    
    // Update env var simulation for the session
    process.env.PAPER_TRADING_MODE = isPaper ? 'true' : 'false';

    await redisClient.del('alphamark:kill_switch');
    await redisClient.set('alphamark:status', 'RUNNING');
    await redisClient.set('alphamark:mode', mode);
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

// POST /api/settings/upload-env
// Parses an uploaded .env file and applies it dynamically
app.post('/api/settings/upload-env', async (req, res) => {
    try {
        const envContent = req.body;
        if (!envContent) return res.status(400).json({ success: false, message: "No content received" });

        // Parse the .env content
        const newConfig = dotenv.parse(envContent);
        
        console.log(`[CONFIG] Received .env upload with ${Object.keys(newConfig).length} keys`);

        // --- Backup & Persist Logic ---
        const envPath = path.join(__dirname, '../.env');
        const backupDir = path.join(__dirname, '../backups');

        // 1. Create backup directory if needed
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        // 2. Backup existing .env to JSON
        if (fs.existsSync(envPath)) {
            const currentEnvRaw = fs.readFileSync(envPath, 'utf8');
            const currentConfig = dotenv.parse(currentEnvRaw);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `config_backup_${timestamp}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(currentConfig, null, 2));
            console.log(`[BACKUP] Saved current config to ${backupFile}`);
        }

        // 3. Write new .env content to disk (Persistence)
        fs.writeFileSync(envPath, envContent);
        // ------------------------------

        // Broadcast to Python Bot via Redis
        await redisClient.publish('alphamark:config', JSON.stringify({
            type: 'ENV_UPDATE',
            data: newConfig
        }));

        res.json({ success: true, message: "Configuration uploaded and broadcast to engine." });
    } catch (e) {
        console.error("Env upload failed:", e);
        res.status(500).json({ success: false, message: e.message });
    }
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
    if (!redisReady || !redisClient.isOpen) {
        return res.status(503).json({ status: 'error', engine: 'STOPPED', message: 'Redis disconnected' });
    }
    const engineStatus = await redisClient.get('alphamark:status') || 'STOPPED';
    res.json({ status: 'ok', engine: engineStatus, timestamp: Date.now() });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DASHBOARD] Server running on http://localhost:${PORT}`);
});

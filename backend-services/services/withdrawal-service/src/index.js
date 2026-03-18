const express = require('express');
const cors = require('cors');
const PimlicoGaslessEngine = require('./pimlico-gasless');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8081;

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║      ALPHA-ORION GASLESS WITHDRAWAL SERVICE                   ║
║         ZERO GAS FEES VIA PIMLICO ACCOUNT ABSTRACTION         ║
║         Polygon zkEVM Network                                  ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Verify Pimlico API key from GCP Secret Manager
if (!process.env.PIMLICO_API_KEY) {
  console.error('❌ FATAL: PIMLICO_API_KEY not configured');
  console.error('   Required from GCP Secret Manager');
  process.exit(1);
}

// Initialize Pimlico engine
let gaslessEngine;
try {
  gaslessEngine = new PimlicoGaslessEngine();
} catch (error) {
  console.error(`❌ Failed to initialize Pimlico: ${error.message}`);
  process.exit(1);
}

let withdrawalHistory = [];
let autoWithdrawalSettings = {};

// ============================================
// GASLESS WITHDRAWAL ENGINE
// ============================================

/**
 * Execute gasless USDC withdrawal
 * Zero gas fees - Pimlico paymaster sponsors
 */
async function executeGaslessWithdrawal(amount, destinationAddress) {
  console.log(`\n[WITHDRAWAL] GASLESS WITHDRAWAL VIA PIMLICO`);
  console.log(`[WITHDRAWAL] Amount: ${amount} USDC`);
  console.log(`[WITHDRAWAL] To: ${destinationAddress}`);
  console.log(`[WITHDRAWAL] Gas Cost: $0.00 (Pimlico Paymaster)`);

  try {
    // Validate address
    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Execute gasless withdrawal via Pimlico
    const result = await gaslessEngine.executeGaslessWithdrawal(amount, destinationAddress);

    withdrawalHistory.push({
      ...result,
      amount,
      recipient: destinationAddress,
      timestamp: Date.now()
    });

    console.log(`[WITHDRAWAL] ✅ Confirmed (Gasless)`);
    return result;

  } catch (error) {
    console.error(`[WITHDRAWAL] Error: ${error.message}`);
    throw error;
  }
}

// ============================================
// API ENDPOINTS - GASLESS MODE
// ============================================

/**
 * Execute gasless withdrawal
 */
app.post('/withdraw', async (req, res) => {
  const { amount, address } = req.body;

  if (!amount || !address) {
    return res.status(400).json({
      error: 'Missing required fields: amount, address'
    });
  }

  try {
    const result = await executeGaslessWithdrawal(amount, address);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      type: 'withdrawal_failed'
    });
  }
});

/**
 * Get withdrawal history
 */
app.get('/withdrawals', (req, res) => {
  res.json({
    count: withdrawalHistory.length,
    withdrawals: withdrawalHistory.slice(-20),
    totalWithdrawn: withdrawalHistory.reduce((sum, w) => sum + w.amount, 0),
    totalGasSavings: `$0.00 (All gasless via Pimlico)`
  });
});

/**
 * Setup auto-withdrawal
 */
app.post('/auto-withdrawal', (req, res) => {
  const { threshold, address } = req.body;

  if (!threshold || !address) {
    return res.status(400).json({
      error: 'Missing required fields: threshold, address'
    });
  }

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({
      error: 'Invalid Ethereum address format'
    });
  }

  autoWithdrawalSettings = {
    threshold,
    address,
    enabled: true,
    gasless: true,
    paymaster: 'Pimlico',
    gasCost: '$0.00',
    createdAt: Date.now()
  };

  console.log(`[AUTO-WITHDRAW] Settings configured: $${threshold} gasless withdrawal to ${address}`);

  res.json({
    success: true,
    settings: autoWithdrawalSettings
  });
});

/**
 * Get auto-withdrawal settings
 */
app.get('/auto-withdrawal', (req, res) => {
  res.json({
    settings: autoWithdrawalSettings,
    enabled: !!autoWithdrawalSettings.enabled,
    gasless: true,
    paymaster: 'Pimlico'
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'GASLESS_VIA_PIMLICO',
    network: 'Polygon zkEVM',
    pimlico: !!process.env.PIMLICO_API_KEY,
    gasless: true,
    gasCost: '$0.00'
  });
});

/**
 * Gasless mode status
 */
app.get('/pimlico/status', (req, res) => {
  res.json({
    service: 'Gasless Withdrawal',
    engine: 'Pimlico ERC-4337',
    network: 'Polygon zkEVM',
    bundler: 'Pimlico',
    paymaster: 'Pimlico (TOKEN_PAYMASTER)',
    gasless: true,
    gasCostPerWithdrawal: '$0.00',
    totalWithdrawals: withdrawalHistory.length,
    totalGasSavings: `$0.00`
  });
});

app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║  ✅ GASLESS WITHDRAWAL SERVICE - PORT ${PORT}`);
  console.log(`║  🚀 NETWORK: Polygon zkEVM (Account Abstraction)`);
  console.log(`║  💰 GAS COST: $0.00 per withdrawal (Pimlico Paymaster)`);
  console.log(`║  🔐 Verified: Pimlico ERC-4337 Bundler`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);
});

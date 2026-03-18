const axios = require('axios');
const { ethers } = require('ethers');

class MEVBlockerEngine {
  constructor() {
    // Configuration
    this.rpcUrl = 'https://api.mevblocker.io/rpc';
    this.walletAddress = process.env.EXECUTION_WALLET_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    this.mevBlockerEnabled = process.env.MEV_BLOCKER_ENABLED !== 'false';

    // Initialize Ethers
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    
    console.log('[MEVBlocker] Initialized for', this.wallet.address);
  }

  /**
   * Send transaction through encrypted mempool
   */
  async sendPrivateTransaction(transactionData) {
    if (!this.mevBlockerEnabled) {
      throw new Error('MEV-Blocker not enabled');
    }

    try {
      // Get fee data (Ethers v6)
      const feeData = await this.provider.getFeeData();

      // Build transaction
      const tx = {
        from: this.walletAddress,
        to: transactionData.to,
        data: transactionData.data,
        value: transactionData.value || '0',
        gasPrice: feeData.gasPrice,
      };

      // Estimate gas
      const gasEstimate = await this.provider.estimateGas(tx);
      // Add 10% buffer (BigInt math for Ethers v6)
      tx.gasLimit = (gasEstimate * 110n) / 100n;

      // Set nonce
      tx.nonce = await this.provider.getTransactionCount(this.walletAddress);

      // Sign transaction
      const signedTx = await this.wallet.signTransaction(tx);

      // Send via MEV-Blocker RPC
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_sendPrivateTransaction',
          params: [{
            tx: signedTx,
            preferences: {
              fast: true,
              privacy: { hints: ['Encrypted'] },
            },
          }],
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.data.error) {
        throw new Error(`MEV-Blocker error: ${response.data.error.message}`);
      }

      return {
        txHash: response.data.result,
        method: 'mev-blocker',
        mevProtected: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[MEVBlocker] Error:', error.message);
      throw error;
    }
  }

  /**
   * Estimate MEV exposure for transaction
   */
  async estimateMevExposure(transactionData) {
    try {
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'mev_estimateExposure',
          params: [transactionData],
        },
        { timeout: 10000 }
      );

      if (response.data.error) {
        return null;
      }

      const { maxMEV, avgMEV, risk } = response.data.result;
      return {
        maxMevLoss: ethers.formatEther(maxMEV),
        avgMevLoss: ethers.formatEther(avgMEV),
        riskLevel: risk,
        recommendation: this.getMevRecommendation(risk),
      };
    } catch (error) {
      console.warn('[MEVBlocker] Exposure estimation failed:', error.message);
      return null;
    }
  }

  /**
   * Get recommendation based on MEV risk
   */
  getMevRecommendation(risk) {
    if (risk === 'critical') return 'Use MEV-Blocker only';
    if (risk === 'high') return 'Use MEV-Blocker or private RPC';
    if (risk === 'medium') return 'Use Flashbots or MEV-Blocker';
    return 'Any method acceptable';
  }
}

module.exports = MEVBlockerEngine;
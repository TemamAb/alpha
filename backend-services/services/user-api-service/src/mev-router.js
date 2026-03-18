const MEVBlockerEngine = require('./mev-blocker-engine');
const FlashbotsEngine = require('./flashbots-engine');
const { ethers } = require('ethers');

class MEVRouter {
  constructor() {
    this.mevBlocker = new MEVBlockerEngine();
    this.flashbots = new FlashbotsEngine();
    this.strategy = process.env.MEV_STRATEGY || 'hybrid';
    this.publicProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is not set for MEVRouter.");
    }

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.publicProvider);
  }

  async routeTransaction(transaction, tradeSize) {
    /**
     * Route selection logic:
     * - Large trades ($50K+): MEV-Blocker (maximum privacy)
     * - Medium trades ($5K-$50K): Flashbots (good privacy + speed)
     * - Small trades (<$5K): Fallback to public mempool for now.
     */

    const route = this.selectRoute(tradeSize);

    console.log(`[MEV Router] Routing trade of size $${tradeSize.toFixed(2)} via ${route}`);

    switch (route) {
      case 'mev-blocker':
        try {
          // MEV-Blocker expects an unsigned transaction object
          return await this.mevBlocker.sendPrivateTransaction(transaction);
        } catch (error) {
          console.error(`[MEV Router] MEV-Blocker failed, falling back to Flashbots. Error: ${error.message}`);
          // Fallback to Flashbots before going public
          // Flashbots expects an array of signed transaction objects.
          // Need to ensure the transaction is properly signed for Flashbots.
          // The transaction object passed to routeTransaction might not be fully prepared for signing by wallet.
          // Let's assume `transaction` here is a raw transaction object suitable for `wallet.signTransaction`.
          const signedTx = await this.wallet.signTransaction({ ...transaction, from: this.wallet.address });
          const flashbotsResult = await this.flashbots.submitBundle([{ signedTransaction: signedTx }]);
          return { ...flashbotsResult, method: 'flashbots_fallback', mevProtected: true };
        }

      case 'flashbots':
        try {
          // Flashbots expects an array of signed transaction objects
          const signedTx = await this.wallet.signTransaction(transaction);
          return await this.flashbots.submitBundle([{ signedTransaction: signedTx }]);
        } catch (error) { // Catch specific Flashbots errors if possible
          // If Flashbots fails, try MEV-Blocker as a fallback.
          // This might be less ideal as MEV-Blocker is often preferred for larger trades.
          console.error(`[MEV Router] Flashbots failed, falling back to MEV-Blocker. Error: ${error.message}`);
          // Fallback to MEV-Blocker before going public
          return await this.mevBlocker.sendPrivateTransaction(transaction);
        }

      case 'public':
        return await this.sendViaPublic(transaction);

      default:
        console.warn(`[MEV Router] Unknown route: ${route}, falling back to public.`);
        return await this.sendViaPublic(transaction);
    }
  }

  selectRoute(tradeSize) {
    // Dynamic routing logic based on strategy, trade size, and potentially real-time network conditions
    // In a real enterprise system, this would involve ML models predicting MEV risk and optimal inclusion.

    const gasPriceGwei = parseFloat(ethers.formatUnits(this.publicProvider.getFeeData().then(data => data.gasPrice), 'gwei')); // Simulate fetching current gas price
    const networkCongestionScore = Math.min(1, gasPriceGwei / 100); // Simple score, 100 Gwei = max congestion

    // Prioritize MEV-Blocker for very large trades or high congestion for maximum privacy
    if (tradeSize > 100000 || (tradeSize > 50000 && networkCongestionScore > 0.5)) {
      if (this.strategy === 'mev-blocker' || this.strategy === 'hybrid') {
        return 'mev-blocker';
      }
    }

    // Prioritize Flashbots for medium-to-large trades or moderate congestion for speed and privacy
    if (tradeSize > 10000 || (tradeSize > 5000 && networkCongestionScore > 0.2)) {
      if (this.strategy === 'flashbots' || this.strategy === 'hybrid') {
        return 'flashbots';
      }
    }

    // If a specific strategy is forced, use it
    if (this.strategy === 'mev-blocker') return 'mev-blocker';
    if (this.strategy === 'flashbots') return 'flashbots';

    // Default hybrid logic (if not explicitly forced)
    if (this.strategy === 'hybrid') {
      if (tradeSize > 50000) { // Very large trades, prefer MEV-Blocker
        return 'mev-blocker';
      } else if (tradeSize > 5000) { // Medium to large trades, prefer Flashbots
        return 'flashbots';
      } else { // Small trades, public mempool is acceptable
        return 'public';
      }
    }

    // Small trades or non-hybrid default
    return 'public';
  }

  async sendViaPublic(transaction) {
    // Fallback to public mempool
    try {
      console.log('[MEV Router] Sending transaction via public mempool.');
      const txResponse = await this.wallet.sendTransaction(transaction);
      const receipt = await txResponse.wait();
      return { status: 'success', receipt, method: 'public', mevProtected: false };
    } catch (error) {
      console.error('[MEV Router] Public mempool transaction failed:', error.message);
      throw error;
    }
  }
}

module.exports = MEVRouter;
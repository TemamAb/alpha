const { ethers } = require('ethers');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle');

class FlashbotsEngine {
    constructor() {
        this.publicProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        this.privateKey = process.env.PRIVATE_KEY;
        this.flashbotsRelay = process.env.FLASHBOTS_RELAY || 'https://relay.flashbots.net';
        this.bundleProvider = null;

        if (!this.privateKey || !process.env.ETHEREUM_RPC_URL) {
            throw new Error("PRIVATE_KEY and ETHEREUM_RPC_URL must be set in environment variables.");
        }
    }

    async initialize() {
        if (this.bundleProvider) return;
        // The authSigner is a separate key for signing Flashbots requests, not transactions.
        const authSigner = ethers.Wallet.createRandom();
        // Initialize Flashbots bundle provider
        this.bundleProvider = await FlashbotsBundleProvider.create(
            this.publicProvider,
            authSigner,
            this.flashbotsRelay
        );
    }

    async submitBundle(transactions) {
        /**
         * Submit bundle to Flashbots Relay for MEV protection and atomic execution.
         */
        await this.initialize();
        try {
            const targetBlock = (await this.publicProvider.getBlockNumber()) + 1;

            const signedBundle = await this.bundleProvider.signBundle(transactions);

            const simulation = await this.bundleProvider.simulate(
                signedBundle,
                targetBlock
            );

            if ('error' in simulation) {
                console.error(`[Flashbots] Simulation failed on block ${targetBlock}:`, simulation.error.message);
                return { status: 'failed', error: simulation.error.message };
            }

            console.log('[Flashbots] Simulation successful');

            // Submit bundle
            const bundleSubmission = await this.bundleProvider.sendBundle(
                signedBundle,
                targetBlock
            );

            const receipt = await bundleSubmission.wait();

            return { status: 'success', receipt, targetBlock, method: 'flashbots', mevProtected: true };
        } catch (error) {
            console.error('[Flashbots] Bundle submission failed:', error);
            throw error;
        }
    }
}

module.exports = FlashbotsEngine;
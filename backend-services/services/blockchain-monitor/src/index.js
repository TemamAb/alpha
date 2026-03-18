require('dotenv').config();
const { ethers } = require('ethers');
const { createClient } = require('redis');
const express = require('express');
const client = require('prom-client');
const winston = require('winston');

// --- Configuration ---
const PORT = process.env.PORT || 8080;
const RPC_URL = process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// --- Logging ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// --- Metrics (Prometheus) ---
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const blockHeightGauge = new client.Gauge({ name: 'blockchain_block_height', help: 'Current block height' });
const gasPriceGauge = new client.Gauge({ name: 'blockchain_gas_price_gwei', help: 'Current gas price in Gwei' });
const eventCounter = new client.Counter({ name: 'blockchain_events_detected', help: 'Number of relevant events detected' });

// --- Redis Setup ---
const redisPublisher = createClient({ url: REDIS_URL });
redisPublisher.on('error', (err) => logger.error('Redis Client Error', err));

// --- Blockchain Monitor Logic ---

async function startMonitor() {
  try {
    await redisPublisher.connect();
    logger.info('Connected to Redis');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    logger.info(`Connected to RPC: ${RPC_URL}`);

    // 1. Block Listener
    provider.on('block', async (blockNumber) => {
      try {
        blockHeightGauge.set(blockNumber);
        
        // Get Gas Price
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
        
        gasPriceGauge.set(gasPriceGwei);

        const update = {
          type: 'BLOCK_UPDATE',
          blockNumber,
          gasPriceGwei,
          timestamp: Date.now()
        };

        // Publish to Orchestrator and Dashboard
        await redisPublisher.publish('blockchain_updates', JSON.stringify(update));
        
        // Store latest gas price for quick access
        await redisPublisher.set('latest_gas_price', gasPriceGwei);
        
        logger.info(`Block ${blockNumber} | Gas: ${gasPriceGwei} Gwei`);
      } catch (err) {
        logger.error('Error processing block', err);
      }
    });

    // 2. Event Listener (Arbitrage Contract)
    const contractAddress = process.env.ARBITRAGE_CONTRACT_ADDRESS;
    if (contractAddress) {
      const abi = [
        "event ArbitrageExecuted(address indexed tokenIn, address indexed tokenOut, uint256 profit, uint256 gasUsed)"
      ];
      const contract = new ethers.Contract(contractAddress, abi, provider);

      contract.on('ArbitrageExecuted', (tokenIn, tokenOut, profit, gasUsed, event) => {
        eventCounter.inc();
        
        const eventData = {
          type: 'ARBITRAGE_EVENT',
          txHash: event.log.transactionHash,
          tokenIn,
          tokenOut,
          profit: profit.toString(),
          gasUsed: gasUsed.toString(),
          timestamp: Date.now()
        };

        logger.info('Arbitrage Event Detected', eventData);
        redisPublisher.publish('arbitrage_events', JSON.stringify(eventData));
        
        // Update stats
        redisPublisher.incr('total_trades');
        // Note: Profit summation would require token price normalization, handled by Orchestrator
      });
      
      logger.info(`Monitoring contract: ${contractAddress}`);
    } else {
      logger.warn('No ARBITRAGE_CONTRACT_ADDRESS provided. Event monitoring disabled.');
    }

  } catch (error) {
    logger.error('Fatal Monitor Error', error);
    process.exit(1);
  }
}

// --- Express Server (Health & Metrics) ---
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'blockchain-monitor' });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.listen(PORT, () => {
  logger.info(`Blockchain Monitor listening on port ${PORT}`);
  startMonitor();
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down...');
  await redisPublisher.disconnect();
  process.exit(0);
});
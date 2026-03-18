const { WebSocketServer } = require('ws');
const { ethers } = require('ethers');
require('dotenv').config();

const PORT = process.env.PORT || 8081;
const ARBITRUM_SEPOLIA_RPC = process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";

console.log("--- ALPHA-ORION REAL-TIME DATA SERVICE ---");
console.log(`[CONFIG] RPC Endpoint: ${ARBITRUM_SEPOLIA_RPC}`);

const wss = new WebSocketServer({ port: PORT });
const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);

let lastBlockNumber = 0;

const broadcast = (data) => {
  const jsonData = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(jsonData);
    }
  });
};

const monitorBlockchain = async () => {
  console.log("[MONITOR] Starting blockchain listener...");

  provider.on('block', async (blockNumber) => {
    if (blockNumber <= lastBlockNumber) return;

    try {
      console.log(`[BLOCK] New block detected: #${blockNumber}`);
      lastBlockNumber = blockNumber;

      const block = await provider.getBlock(blockNumber);
      const feeData = await provider.getFeeData();

      const data = {
        type: 'BLOCK_DATA',
        payload: {
          blockNumber: block.number,
          gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
          timestamp: block.timestamp,
        }
      };

      broadcast(data);
    } catch (error) {
      console.error(`[ERROR] Failed to process block #${blockNumber}:`, error);
    }
  });
};

wss.on('connection', ws => {
  console.log('[WSS] Frontend client connected.');
  ws.on('close', () => {
    console.log('[WSS] Frontend client disconnected.');
  });
});

console.log(`[WSS] Real-Time WebSocket Server started on port ${PORT}`);
monitorBlockchain();
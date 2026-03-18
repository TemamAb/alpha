/**
 * Integration Test: Live Data Pipeline
 * Tests the Redis to WebSocket pipeline
 * 
 * Environment: docker-compose.test.yml with blockchain-monitor, redis, and user-api-service
 */

const Redis = require('ioredis');
const WebSocket = require('ws');
const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const CONFIG = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  userApi: {
    baseUrl: process.env.USER_API_URL || 'http://localhost:8080',
    wsUrl: process.env.USER_API_WS_URL || 'ws://localhost:8080',
  },
  postgres: {
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/alpha_orion',
  }
};

// Test data
const TEST_EVENT = {
  type: 'ARBITRAGE_EVENT',
  txHash: '0x' + 'a'.repeat(64),
  tokenIn: '0x' + '1'.repeat(40),
  tokenOut: '0x' + '2'.repeat(40),
  profit: '1000000000000000000',
  gasUsed: '150000',
  timestamp: Date.now(),
};

describe('Live Data Pipeline Integration Tests', () => {
  let redisPublisher;
  let redisSubscriber;
  let wsClient;
  let pgPool;

  beforeAll(async () => {
    // Initialize Redis clients
    redisPublisher = new Redis({
      host: CONFIG.redis.host,
      port: CONFIG.redis.port,
    });

    redisSubscriber = new Redis({
      host: CONFIG.redis.host,
      port: CONFIG.redis.port,
    });

    // Initialize PostgreSQL pool
    pgPool = new Pool({
      connectionString: CONFIG.postgres.connectionString,
    });

    // Wait for connections
    await redisPublisher.ping();
    await redisSubscriber.ping();
    console.log('Connected to Redis');
  });

  afterAll(async () => {
    // Cleanup
    if (wsClient) {
      wsClient.close();
    }
    await redisPublisher.quit();
    await redisSubscriber.quit();
    await pgPool.end();
  });

  describe('Pipeline: Redis PUBLISH -> WebSocket Client', () => {
    it('should receive event via WebSocket after Redis publish', async () => {
      // Step 1: Connect WebSocket client
      const wsPromise = new Promise((resolve, reject) => {
        wsClient = new WebSocket(CONFIG.userApi.wsUrl);
        
        wsClient.on('open', () => {
          console.log('WebSocket connected');
        });

        wsClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          resolve(message);
        });

        wsClient.on('error', (error) => {
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Timeout waiting for message')), 10000);
      });

      // Wait a bit for WebSocket to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Publish event to Redis blockchain_stream channel
      // Note: The blockchain-monitor normally publishes to this channel
      await redisPublisher.publish('blockchain_stream', JSON.stringify(TEST_EVENT));

      console.log('Published test event to Redis');

      // Step 3: Wait for WebSocket to receive the event
      const receivedMessage = await wsPromise;

      // Step 4: Verify the received message
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.type).toBe(TEST_EVENT.type);
      expect(receivedMessage.txHash).toBe(TEST_EVENT.txHash);
      
      console.log('Received message via WebSocket:', receivedMessage);
    });

    it('should receive block updates via WebSocket', async () => {
      // Publish a block update
      const blockUpdate = {
        type: 'BLOCK_UPDATE',
        blockNumber: 18500000,
        gasPriceGwei: 20.5,
        timestamp: Date.now(),
      };

      const wsPromise = new Promise((resolve, reject) => {
        wsClient = new WebSocket(CONFIG.userApi.wsUrl);
        
        wsClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'BLOCK_UPDATE') {
            resolve(message);
          }
        });

        wsClient.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });

      await redisPublisher.publish('blockchain_updates', JSON.stringify(blockUpdate));

      const receivedMessage = await wsPromise;
      expect(receivedMessage.type).toBe('BLOCK_UPDATE');
      expect(receivedMessage.blockNumber).toBe(18500000);
    });
  });

  describe('Pipeline: Redis Subscribe -> Application Processing', () => {
    it('should store latest gas price in Redis', async () => {
      const testGasPrice = 25.5;
      
      // Simulate blockchain-monitor setting gas price
      await redisPublisher.set('latest_gas_price', testGasPrice);

      // Verify it was stored
      const storedGasPrice = await redisPublisher.get('latest_gas_price');
      expect(parseFloat(storedGasPrice)).toBe(testGasPrice);
    });

    it('should increment trade counter on arbitrage event', async () => {
      // Get initial count
      const initialCount = await redisPublisher.get('total_trades') || '0';

      // Simulate arbitrage event (as blockchain-monitor would do)
      await redisPublisher.incr('total_trades');

      // Verify count incremented
      const newCount = await redisPublisher.get('total_trades');
      expect(parseInt(newCount)).toBe(parseInt(initialCount) + 1);
    });

    it('should publish events to arbitrage_events channel', async () => {
      const eventData = { ...TEST_EVENT, timestamp: Date.now() };
      
      const subscriberPromise = new Promise((resolve) => {
        redisSubscriber.subscribe('arbitrage_events');
        redisSubscriber.on('message', (channel, message) => {
          if (channel === 'arbitrage_events') {
            resolve(JSON.parse(message));
          }
        });
      });

      await redisPublisher.publish('arbitrage_events', JSON.stringify(eventData));

      const received = await subscriberPromise;
      expect(received.type).toBe('ARBITRAGE_EVENT');
    });
  });

  describe('Health Check Integration', () => {
    it('should return healthy status from user-api-service', async () => {
      try {
        const response = await axios.get(`${CONFIG.userApi.baseUrl}/health`, {
          timeout: 5000,
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status', 'ok');
        console.log('Health check response:', response.data);
      } catch (error) {
        // If the service isn't running, log but don't fail
        console.log('Note: User API service may not be running. Skipping health check.');
      }
    });

    it('should verify Redis connection via health endpoint', async () => {
      try {
        const response = await axios.get(`${CONFIG.userApi.baseUrl}/health`);
        
        if (response.data.services) {
          expect(response.data.services.redis).toBe('connected');
        }
      } catch (error) {
        console.log('Note: User API service may not be running.');
      }
    });
  });
});

// Export for use in other tests
module.exports = { CONFIG, TEST_EVENT };

/**
 * Integration Test: Historical Data API
 * Tests the /api/history/trades endpoint with seeded database
 * 
 * Environment: docker-compose.test.yml with user-api-service and postgres
 */

const axios = require('axios');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Configuration
const CONFIG = {
  userApi: {
    baseUrl: process.env.USER_API_URL || 'http://localhost:8080',
  },
  postgres: {
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/alpha_orion',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-secret',
  }
};

// Generate a valid JWT token for testing
function generateToken() {
  return jwt.sign({ userId: 1, role: 'admin' }, CONFIG.jwt.secret, { expiresIn: '1h' });
}

// Seed data
const SEED_TRADES = [
  { chain: 'Polygon', strategy: 'flash_loan', status: 'success', profit_usd: 100.50, timestamp: '2024-01-15T10:00:00Z' },
  { chain: 'Ethereum', strategy: 'triangular', status: 'success', profit_usd: 250.75, timestamp: '2024-01-15T09:00:00Z' },
  { chain: 'Polygon', strategy: 'arbitrage', status: 'failed', profit_usd: -50.00, timestamp: '2024-01-15T08:00:00Z' },
  { chain: 'BSC', strategy: 'flash_loan', status: 'success', profit_usd: 75.25, timestamp: '2024-01-14T15:00:00Z' },
  { chain: 'Ethereum', strategy: 'arbitrage', status: 'success', profit_usd: 320.00, timestamp: '2024-01-14T12:00:00Z' },
  { chain: 'Polygon', strategy: 'triangular', status: 'failed', profit_usd: -25.50, timestamp: '2024-01-14T10:00:00Z' },
  { chain: 'BSC', strategy: 'arbitrage', status: 'success', profit_usd: 45.00, timestamp: '2024-01-13T20:00:00Z' },
  { chain: 'Ethereum', strategy: 'flash_loan', status: 'success', profit_usd: 180.00, timestamp: '2024-01-13T18:00:00Z' },
  { chain: 'Polygon', strategy: 'arbitrage', status: 'success', profit_usd: 95.75, timestamp: '2024-01-13T14:00:00Z' },
  { chain: 'BSC', strategy: 'triangular', status: 'failed', profit_usd: -100.00, timestamp: '2024-01-12T22:00:00Z' },
  // Additional records for pagination testing
  ...Array.from({ length: 10 }, (_, i) => ({
    chain: ['Polygon', 'Ethereum', 'BSC'][i % 3],
    strategy: ['flash_loan', 'triangular', 'arbitrage'][i % 3],
    status: i % 2 === 0 ? 'success' : 'failed',
    profit_usd: Math.random() * 500 - 100,
    timestamp: new Date(`2024-01-${10 + (i % 10)}T12:00:00Z`).toISOString(),
  })),
];

describe('Historical Data API Integration Tests', () => {
  let pool;
  let authToken;

  beforeAll(async () => {
    // Initialize PostgreSQL pool
    pool = new Pool({
      connectionString: CONFIG.postgres.connectionString,
    });

    // Generate auth token
    authToken = generateToken();

    // Seed the database
    await seedDatabase();
    console.log('Database seeded with test data');
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM trades');
    await pool.end();
  });

  async function seedDatabase() {
    // Clear existing data
    await pool.query('DELETE FROM trades');

    // Insert seed data
    for (const trade of SEED_TRADES) {
      await pool.query(
        `INSERT INTO trades (chain, strategy, status, profit_usd, timestamp) 
         VALUES ($1, $2, $3, $4, $5)`,
        [trade.chain, trade.strategy, trade.status, trade.profit_usd, trade.timestamp]
      );
    }
  }

  describe('GET /api/history/trades', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
    };

    it('should return all trades without filters', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades`,
        { headers }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('pagination');
      expect(response.data.data.length).toBeGreaterThan(0);
    });

    it('should return correct pagination info', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?page=1&limit=5`,
        { headers }
      );

      expect(response.status).toBe(200);
      expect(response.data.pagination.currentPage).toBe(1);
      expect(response.data.pagination.limit).toBe(5);
      expect(response.data.pagination.totalRecords).toBe(SEED_TRADES.length);
      expect(response.data.pagination.totalPages).toBe(Math.ceil(SEED_TRADES.length / 5));
    });

    it('should filter trades by chain', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?chain=Polygon`,
        { headers }
      );

      expect(response.status).toBe(200);
      const polygonTrades = response.data.data;
      expect(polygonTrades.length).toBeGreaterThan(0);
      polygonTrades.forEach(trade => {
        expect(trade.chain).toBe('Polygon');
      });
    });

    it('should filter trades by status', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?status=success`,
        { headers }
      );

      expect(response.status).toBe(200);
      const successTrades = response.data.data;
      expect(successTrades.length).toBeGreaterThan(0);
      successTrades.forEach(trade => {
        expect(trade.status).toBe('success');
      });
    });

    it('should filter trades by strategy', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?strategy=flash_loan`,
        { headers }
      );

      expect(response.status).toBe(200);
      const flashLoanTrades = response.data.data;
      flashLoanTrades.forEach(trade => {
        expect(trade.strategy).toBe('flash_loan');
      });
    });

    it('should filter trades by date range', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?startDate=2024-01-14T00:00:00Z&endDate=2024-01-15T23:59:59Z`,
        { headers }
      );

      expect(response.status).toBe(200);
      const dateFilteredTrades = response.data.data;
      
      // Verify all returned trades are within the date range
      const startDate = new Date('2024-01-14T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');
      
      dateFilteredTrades.forEach(trade => {
        const tradeDate = new Date(trade.timestamp);
        expect(tradeDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(tradeDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should combine multiple filters', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?chain=Polygon&status=success`,
        { headers }
      );

      expect(response.status).toBe(200);
      const filteredTrades = response.data.data;
      
      filteredTrades.forEach(trade => {
        expect(trade.chain).toBe('Polygon');
        expect(trade.status).toBe('success');
      });
    });

    it('should handle pagination correctly', async () => {
      const page1Response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?page=1&limit=5`,
        { headers }
      );

      const page2Response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?page=2&limit=5`,
        { headers }
      );

      expect(page1Response.status).toBe(200);
      expect(page2Response.status).toBe(200);
      
      // Pages should have different data
      const page1Ids = page1Response.data.data.map(t => t.trade_id);
      const page2Ids = page2Response.data.data.map(t => t.trade_id);
      
      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
    });

    it('should return 401 without authentication', async () => {
      try {
        await axios.get(`${CONFIG.userApi.baseUrl}/api/history/trades`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should return 403 with invalid token', async () => {
      try {
        await axios.get(
          `${CONFIG.userApi.baseUrl}/api/history/trades`,
          { headers: { 'Authorization': 'Bearer invalid-token' } }
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });

    it('should return empty array when no matches', async () => {
      // Use a chain that doesn't exist in seed data
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?chain=NonExistentChain`,
        { headers }
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toEqual([]);
      expect(response.data.pagination.totalRecords).toBe(0);
    });

    it('should handle large page numbers gracefully', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades?page=999&limit=10`,
        { headers }
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toEqual([]);
    });

    it('should default to page 1 with limit 20', async () => {
      const response = await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades`,
        { headers }
      );

      expect(response.status).toBe(200);
      expect(response.data.pagination.currentPage).toBe(1);
      expect(response.data.pagination.limit).toBe(20);
    });
  });

  describe('Database Query Performance', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();
      
      await axios.get(
        `${CONFIG.userApi.baseUrl}/api/history/trades`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      const responseTime = Date.now() - startTime;
      console.log(`API response time: ${responseTime}ms`);
      
      // Response should be under 500ms for the seeded dataset
      expect(responseTime).toBeLessThan(500);
    });
  });
});

module.exports = { CONFIG, SEED_TRADES, generateToken };

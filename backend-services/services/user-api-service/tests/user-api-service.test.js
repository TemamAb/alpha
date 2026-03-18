/**
 * Unit Tests for /api/history/trades endpoint
 * Tests the trade history query logic with various filter and pagination inputs
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the dependencies before requiring the app
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
      connect: jest.fn()
    })),
    mockQuery
  };
});

const { Pool } = require('pg');
const mockQuery = Pool.mockReturnValue({ query: jest.fn() });

// Create mock app by extracting the route handler logic
const express = require('express');
const app = express();
app.use(express.json());

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  lRange: jest.fn(),
  publish: jest.fn(),
  connect: jest.fn(),
  on: jest.fn()
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis)
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, cb) => {
    if (token === 'valid-token') {
      cb(null, { userId: 1, role: 'admin' });
    } else {
      cb(new Error('Invalid token'));
    }
  })
}));

// Import the actual index.js after mocking
const indexModule = require('../src/index');

// Test data
const mockTrades = [
  { trade_id: '1', chain: 'Polygon', strategy: 'flash_loan', status: 'success', profit_usd: 100.50, timestamp: '2024-01-15T10:00:00Z' },
  { trade_id: '2', chain: 'Ethereum', strategy: 'triangular', status: 'success', profit_usd: 250.75, timestamp: '2024-01-15T09:00:00Z' },
  { trade_id: '3', chain: 'Polygon', strategy: 'arbitrage', status: 'failed', profit_usd: -50.00, timestamp: '2024-01-15T08:00:00Z' }
];

describe('User API Service - /api/history/trades Endpoint', () => {
  let mockPgPool;
  const validToken = 'valid-token';
  const adminAuthHeader = `Bearer ${validToken}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPgPool = {
      query: jest.fn()
    };
    Pool.mockReturnValue(mockPgPool);
  });

  describe('GET /api/history/trades', () => {
    it('should return paginated trades without filters', async () => {
      // Mock count query
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: mockTrades });

      const response = await request(indexModule)
        .get('/api/history/trades')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalRecords).toBe(3);
      expect(response.body.pagination.totalPages).toBe(1);
    });

    it('should filter trades by chain', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockTrades[0]] });

      const response = await request(indexModule)
        .get('/api/history/trades?chain=Polygon')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].chain).toBe('Polygon');
      
      // Verify the SQL query includes the chain filter
      const dataQuery = mockPgPool.query.mock.calls[1][0];
      expect(dataQuery).toContain('chain = $');
    });

    it('should filter trades by status', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockTrades[2]] });

      const response = await request(indexModule)
        .get('/api/history/trades?status=failed')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('failed');
    });

    it('should filter trades by strategy', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockTrades[1]] });

      const response = await request(indexModule)
        .get('/api/history/trades?strategy=triangular')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].strategy).toBe('triangular');
    });

    it('should filter trades by date range', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockTrades.slice(0, 2) });

      const response = await request(indexModule)
        .get('/api/history/trades?startDate=2024-01-15T09:00:00Z&endDate=2024-01-15T12:00:00Z')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      
      // Verify the SQL query includes timestamp filters
      const countQuery = mockPgPool.query.mock.calls[0][0];
      expect(countQuery).toContain('timestamp >= $');
      expect(countQuery).toContain('timestamp <= $');
    });

    it('should handle pagination correctly', async () => {
      // Generate 20 mock trades
      const manyTrades = Array.from({ length: 20 }, (_, i) => ({
        trade_id: `${i + 1}`,
        chain: 'Polygon',
        strategy: 'arbitrage',
        status: 'success',
        profit_usd: 100,
        timestamp: new Date().toISOString()
      }));

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: manyTrades.slice(0, 10) });

      const response = await request(indexModule)
        .get('/api/history/trades?page=2&limit=10')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.totalPages).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(indexModule)
        .get('/api/history/trades');

      expect(response.status).toBe(401);
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(indexModule)
        .get('/api/history/trades')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    it('should combine multiple filters', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockTrades[0]] });

      const response = await request(indexModule)
        .get('/api/history/trades?chain=Polygon&strategy=flash_loan&status=success')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      
      // Verify all filters are applied
      const dataQuery = mockPgPool.query.mock.calls[1][0];
      expect(dataQuery).toContain('chain = $');
      expect(dataQuery).toContain('strategy = $');
      expect(dataQuery).toContain('status = $');
    });

    it('should handle database errors gracefully', async () => {
      mockPgPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(indexModule)
        .get('/api/history/trades')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should default to page 1 with limit 20', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: mockTrades });

      const response = await request(indexModule)
        .get('/api/history/trades')
        .set('Authorization', adminAuthHeader);

      expect(response.status).toBe(200);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });
  });

  describe('SQL Query Generation', () => {
    it('should generate correct SQL for count query with filters', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(indexModule)
        .get('/api/history/trades?chain=Ethereum&strategy=arbitrage&status=success')
        .set('Authorization', adminAuthHeader);

      const countQuery = mockPgPool.query.mock.calls[0][0];
      expect(countQuery).toContain('SELECT COUNT(*) FROM trades');
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('chain = $1');
      expect(countQuery).toContain('strategy = $2');
      expect(countQuery).toContain('status = $3');
    });

    it('should generate correct SQL for data query with pagination', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(indexModule)
        .get('/api/history/trades?page=3&limit=15')
        .set('Authorization', adminAuthHeader);

      const dataQuery = mockPgPool.query.mock.calls[1][0];
      expect(dataQuery).toContain('ORDER BY timestamp DESC');
      expect(dataQuery).toContain('LIMIT $');
      expect(dataQuery).toContain('OFFSET $');
    });
  });
});

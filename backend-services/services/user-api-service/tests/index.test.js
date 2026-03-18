const request = require('supertest');
const app = require('../src/index');

describe('User API Service', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('GET /analytics/total-pnl', () => {
    it('should return total PNL', async () => {
      const response = await request(app).get('/analytics/total-pnl');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalPnl');
      expect(typeof response.body.totalPnl).toBe('number');
    });
  });

  describe('GET /mode/current', () => {
    it('should return current mode', async () => {
      const response = await request(app).get('/mode/current');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('mode');
      expect(response.body).toHaveProperty('totalPnl');
      expect(typeof response.body.totalPnl).toBe('number');
    });
  });

  // Add more tests for other routes as needed
});
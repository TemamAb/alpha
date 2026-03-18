import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import controlRoutes from '../routes/controlRoutes';

// Initialize Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/v1', controlRoutes);

describe('Control Controller API', () => {

  describe('POST /api/v1/controls/velocity', () => {
    it('should set capital velocity successfully with valid input', async () => {
      const response = await request(app)
        .post('/api/v1/controls/velocity')
        .send({ value: 80 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success', velocity: 80 });
    });

    it('should return 400 for invalid velocity (not a number)', async () => {
      const response = await request(app)
        .post('/api/v1/controls/velocity')
        .send({ value: 'high' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for velocity out of range (< 0)', async () => {
      const response = await request(app)
        .post('/api/v1/controls/velocity')
        .send({ value: -10 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for velocity out of range (> 100)', async () => {
      const response = await request(app)
        .post('/api/v1/controls/velocity')
        .send({ value: 150 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/controls/reinvest', () => {
    it('should set reinvestment rate successfully with valid input', async () => {
      const response = await request(app)
        .post('/api/v1/controls/reinvest')
        .send({ value: 50 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success', rate: 50 });
    });

    it('should return 400 for invalid reinvestment rate', async () => {
      const response = await request(app)
        .post('/api/v1/controls/reinvest')
        .send({ value: 101 });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/strategies/:strategyId/toggle', () => {
    it('should toggle a valid strategy successfully', async () => {
      const response = await request(app)
        .post('/api/v1/strategies/spot/toggle')
        .send({ active: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success', strategyId: 'spot', active: true });
    });

    it('should return 400 for an invalid strategy ID', async () => {
      const response = await request(app)
        .post('/api/v1/strategies/invalid-strategy/toggle')
        .send({ active: true });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid strategy ID.');
    });

    it('should return 400 for invalid active state (non-boolean)', async () => {
      const response = await request(app)
        .post('/api/v1/strategies/spot/toggle')
        .send({ active: 'yes' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/system/emergency-stop', () => {
    it('should trigger emergency stop successfully', async () => {
      // Mock console.error to keep test output clean
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/v1/system/emergency-stop');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success', message: 'Emergency stop triggered. System is halting.' });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
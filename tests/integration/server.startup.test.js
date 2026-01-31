/**
 * Integration test: server starts and health endpoint responds
 */
import request from 'supertest';
import app from '../../src/server.js';

describe('Server startup', () => {
  it('app loads without throwing', () => {
    expect(app).toBeDefined();
  });

  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });
});

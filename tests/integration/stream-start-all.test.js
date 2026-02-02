/**
 * Integration test: POST /api/streams/start-all
 * Guards: Start-all route exists, returns expected shape (started, failed, results)
 */
import request from 'supertest';
import app from '../../src/server.js';

describe('POST /api/streams/start-all', () => {
  it('returns 200 with body containing success, message, started, failed, results', async () => {
    const res = await request(app)
      .post('/api/streams/start-all')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('started');
    expect(res.body).toHaveProperty('failed');
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(typeof res.body.started).toBe('number');
    expect(typeof res.body.failed).toBe('number');
  });
});

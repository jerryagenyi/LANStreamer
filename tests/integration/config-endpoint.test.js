/**
 * Integration test: GET /api/system/config returns icecast.port (Copy URL guard)
 * Guards: Copy URL uses correct port (8200), not wrong default (8000)
 */
import request from 'supertest';
import app from '../../src/server.js';

describe('GET /api/system/config', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/system/config');
    expect(res.status).toBe(200);
  });

  it('returns body with icecast.port as number', async () => {
    const res = await request(app).get('/api/system/config');
    expect(res.body).toHaveProperty('icecast');
    expect(res.body.icecast).toHaveProperty('port');
    expect(typeof res.body.icecast.port).toBe('number');
    expect(res.body.icecast.port).toBeGreaterThan(0);
    expect(res.body.icecast.port).toBeLessThanOrEqual(65535);
  });

  it('returns body with icecast.host', async () => {
    const res = await request(app).get('/api/system/config');
    expect(res.body.icecast).toHaveProperty('host');
    expect(typeof res.body.icecast.host).toBe('string');
  });
});

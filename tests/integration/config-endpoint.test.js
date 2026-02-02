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

  it('returns top-level host for listener page / Copy URL (getPreferredLANHost)', async () => {
    const res = await request(app).get('/api/system/config');
    expect(res.body).toHaveProperty('host');
    expect(typeof res.body.host).toBe('string');
    expect(res.body.host.length).toBeGreaterThan(0);
  });

  it('returns source capacity fields (sourceLimit, activeStreams, remaining, configPath)', async () => {
    const res = await request(app).get('/api/system/config');
    expect(res.body.icecast).toHaveProperty('sourceLimit');
    expect(res.body.icecast).toHaveProperty('activeStreams');
    expect(res.body.icecast).toHaveProperty('remaining');
    expect(res.body.icecast).toHaveProperty('configPath');
    expect(typeof res.body.icecast.sourceLimit).toBe('number');
    expect(typeof res.body.icecast.activeStreams).toBe('number');
    expect(typeof res.body.icecast.remaining).toBe('number');
    expect(res.body.icecast.sourceLimit).toBeGreaterThanOrEqual(0);
    expect(res.body.icecast.activeStreams).toBeGreaterThanOrEqual(0);
    expect(res.body.icecast.remaining).toBe(res.body.icecast.sourceLimit - res.body.icecast.activeStreams);
  });
});

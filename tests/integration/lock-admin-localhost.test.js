/**
 * Integration test: admin locked to localhost; listener page and APIs allowed from LAN.
 */
import request from 'supertest';
import app from '../../src/server.js';

const fromLAN = (path, method = 'get') =>
  request(app)[method](path).set('X-Test-Remote-Address', '192.168.1.100');

describe('Lock admin to localhost', () => {
  it('allows GET /streams from non-localhost (listener page)', async () => {
    const res = await fromLAN('/streams');
    expect(res.status).toBe(200);
  });

  it('allows GET /api/system/config from non-localhost (listener needs host)', async () => {
    const res = await fromLAN('/api/system/config');
    expect(res.status).toBe(200);
  });

  it('allows GET /api/streams/status from non-localhost (listener needs stream list)', async () => {
    const res = await fromLAN('/api/streams/status');
    expect(res.status).toBe(200);
  });

  it('allows GET /api/streams/play/:id from non-localhost (playback proxy)', async () => {
    const res = await fromLAN('/api/streams/play/some-id');
    expect([200, 502]).toContain(res.status);
  });

  it('blocks GET /dashboard from non-localhost with 403 HTML', async () => {
    const res = await fromLAN('/dashboard');
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toMatch(/Admin access restricted|Admin.*localhost/i);
  });

  it('blocks GET /login from non-localhost with 403 HTML', async () => {
    const res = await fromLAN('/login');
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('blocks POST /api/streams/start from non-localhost with 403 JSON', async () => {
    const res = await request(app)
      .post('/api/streams/start')
      .set('X-Test-Remote-Address', '192.168.1.100')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/localhost/i);
  });

  it('allows GET /dashboard from localhost (no X-Test-Remote-Address)', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(200);
  });
});

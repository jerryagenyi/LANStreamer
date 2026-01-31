/**
 * Integration test: GET /api/streams/play/:streamId (listening page proxy)
 * Guards: Play button works via same-origin proxy; route exists and does not crash
 */
import request from 'supertest';
import app from '../../src/server.js';

describe('GET /api/streams/play/:streamId', () => {
  it('returns 502 or 200 (proxy to Icecast)', async () => {
    const res = await request(app).get('/api/streams/play/nonexistent_mount_123');
    // When Icecast is down or mount missing: 502; when up and mount exists: 200
    expect([200, 502]).toContain(res.status);
  });

  it('does not return 500 (route exists and handles errors)', async () => {
    const res = await request(app).get('/api/streams/play/test_stream_id');
    expect(res.status).not.toBe(500);
  });

  it('when 200 and content-type set, is stream or html (proxy forwards or Icecast page)', async () => {
    const res = await request(app).get('/api/streams/play/any_id');
    if (res.status === 200 && res.headers['content-type']) {
      const ct = res.headers['content-type'].toLowerCase();
      expect(ct).toMatch(/audio|octet-stream|text\/html/);
    }
  });
});

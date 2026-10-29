/**
 * Integration test: admin auth gate
 * - POST /api/auth/login issues a token for the default credentials
 * - wrong credentials -> 401
 * - protected routes answer 401 without a token, pass with one
 * - listener-facing reads stay public
 */
import request from 'supertest';
import { jest } from '@jest/globals';

// Re-enable the auth gate that tests/setup.js disables for the older suites.
delete process.env.AUTH_DISABLED;

const stopStreamMock = jest.fn().mockRejectedValue(new Error('Stream x not found'));

jest.unstable_mockModule('../../src/services/StreamingService.js', () => ({
  default: {
    stopStream: stopStreamMock,
    startStream: jest.fn(),
    stopAllStreams: jest.fn().mockResolvedValue({}),
    restartStream: jest.fn().mockResolvedValue(),
    getStats: jest.fn().mockReturnValue({ total: 0, running: 0, errors: 0, streams: [] }),
    cleanupOldStreams: jest.fn().mockReturnValue(0),
    updateStream: jest.fn().mockResolvedValue({}),
    deleteStream: jest.fn().mockResolvedValue(),
    createStoppedStream: jest.fn(),
    activeStreams: {}
  }
}));

const { default: app } = await import('../../src/server.js');

describe('Admin auth gate', () => {
  let token;

  it('rejects wrong credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('issues a token for the default credentials (README-documented)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'lanstreamer123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
  });

  it('blocks protected routes without a token', async () => {
    const res = await request(app).post('/api/streams/stop').send({ id: 'x' });
    expect(res.status).toBe(401);
  });

  it('lets protected routes through with a valid token', async () => {
    const res = await request(app)
      .post('/api/streams/stop')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'x' });
    // 401 would mean the gate rejected it; 500 "not found" means it got through
    // to the (mocked) service, which is exactly what we assert here.
    expect(res.status).toBe(500);
    expect(stopStreamMock).toHaveBeenCalled();
  });

  it('keeps listener-facing reads public', async () => {
    const res = await request(app).get('/api/streams/status');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('keeps the login page reachable', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Admin sign in');
  });
});

/**
 * Integration test: in-app admin credential change (dashboard → Admin account)
 * - GET /api/auth/settings reports the current username + defaults flag
 * - POST /api/auth/credentials requires the current password
 * - success stores a scrypt hash (never plaintext), rotates the JWT secret
 *   (old token dies, fresh token works), and the new login is active
 * - the persisted file is what a packaged install would keep across restarts
 */
import request from 'supertest';
import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Re-enable the auth gate that tests/setup.js disables for the older suites.
delete process.env.AUTH_DISABLED;

// Point the credential store at a throwaway file BEFORE the app (and its
// config singleton) loads — never the repo's real config/security.json.
const storePath = path.join(os.tmpdir(), `ls-sec-test-${Date.now()}.json`);
process.env.LS_SECURITY_FILE = storePath;

jest.unstable_mockModule('../../src/services/StreamingService.js', () => ({
  default: {
    stopStream: jest.fn(),
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

const DEFAULTS = { username: 'admin', password: 'lanstreamer123' };

afterAll(() => {
  try { fs.rmSync(storePath, { force: true }); } catch { /* ignore */ }
});

describe('In-app admin credential change', () => {
  let token;

  it('reports defaults via /api/auth/settings', async () => {
    const login = await request(app).post('/api/auth/login').send(DEFAULTS);
    expect(login.status).toBe(200);
    token = login.body.token;
    expect(token).toBeTruthy();

    const res = await request(app)
      .get('/api/auth/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'admin', usingDefaultCredentials: true });
  });

  it('rejects the change with a wrong current password (400 — not a session-killing 401)', async () => {
    const res = await request(app)
      .post('/api/auth/credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newUsername: 'op', newPassword: 'long-enough-9' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect/i);
  });

  it('rejects a too-short new password', async () => {
    const res = await request(app)
      .post('/api/auth/credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: DEFAULTS.password, newUsername: 'op', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('changes the login: fresh token works, old token dies, file stores a hash', async () => {
    const res = await request(app)
      .post('/api/auth/credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: DEFAULTS.password, newUsername: 'op', newPassword: 'new-secret-9' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.username).toBe('op');

    // Old session is dead (JWT secret rotated)
    const old = await request(app)
      .get('/api/auth/settings')
      .set('Authorization', `Bearer ${token}`);
    expect([401, 403]).toContain(old.status);

    // Fresh session works and the defaults flag retired
    const fresh = await request(app)
      .get('/api/auth/settings')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(fresh.status).toBe(200);
    expect(fresh.body).toMatchObject({ username: 'op', usingDefaultCredentials: false });

    // Old credentials no longer log in; new ones do
    const badLogin = await request(app).post('/api/auth/login').send(DEFAULTS);
    expect(badLogin.status).toBe(401);
    const goodLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'op', password: 'new-secret-9' });
    expect(goodLogin.status).toBe(200);

    // Persisted file: scrypt hash present, plaintext never stored
    const stored = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    expect(stored.adminUsername).toBe('op');
    expect(stored.adminPasswordHash).toMatch(/^scrypt:/);
    expect(JSON.stringify(stored)).not.toContain('new-secret-9');
    expect(stored.jwtSecret.length).toBeGreaterThanOrEqual(64);
  });
});

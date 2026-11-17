/**
 * GET /api/system/version — the running app's version, answered locally.
 *
 * Field testers need to read the version off the dashboard. The footer used
 * /api/system/update-check, which asks GitHub first: on a venue LAN with no
 * internet that can hang, and the footer then showed a made-up "v1.1.0".
 */
import fs from 'fs';
import request from 'supertest';
import app from '../../src/server.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('GET /api/system/version', () => {
  it('returns the package.json version without any network call', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error('no network allowed'); };
    try {
      const res = await request(app).get('/api/system/version');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ version: pkg.version });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

/**
 * Integration test: admin locked to localhost; listener page and APIs allowed from LAN.
 * Same machine via LAN IP redirects to localhost; truly remote gets 403.
 */
import request from 'supertest';
import os from 'os';
import app from '../../src/server.js';

const fromLAN = (path, method = 'get') =>
  request(app)[method](path).set('X-Test-Remote-Address', '192.168.1.100');

/** Get one of this machine's actual LAN IPs (for testing same-machine redirect) */
function getOwnLanIp() {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const iface of list) {
      if (iface.family !== 'IPv4' || iface.internal || !iface.address) continue;
      const addr = iface.address;
      const isPrivate =
        addr.startsWith('192.168.') ||
        addr.startsWith('10.') ||
        (addr.startsWith('172.') &&
          Number(addr.split('.')[1]) >= 16 &&
          Number(addr.split('.')[1]) <= 31);
      if (isPrivate) return addr;
    }
  }
  return null; // no LAN IP available in this environment
}

const OWN_LAN_IP = getOwnLanIp();
const HAS_OWN_LAN_IP = Boolean(OWN_LAN_IP);

const fromOwnMachine = (path, method = 'get') =>
  HAS_OWN_LAN_IP
    ? request(app)[method](path).set('X-Test-Remote-Address', OWN_LAN_IP)
    : request(app)[method](path);

describe('Lock admin to localhost', () => {
  describe('Listener paths allowed from LAN', () => {
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
  });

  describe('Admin blocked from truly remote (LAN IP not owned by server)', () => {
    it('blocks GET /dashboard from remote LAN with 403 HTML', async () => {
      const res = await fromLAN('/dashboard');
      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toMatch(/Admin access restricted|Admin.*localhost/i);
    });

    it('blocks GET /login from remote LAN with 403 HTML', async () => {
      const res = await fromLAN('/login');
      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    it('blocks POST /api/streams/start from remote LAN with 403 JSON', async () => {
      const res = await request(app)
        .post('/api/streams/start')
        .set('X-Test-Remote-Address', '192.168.1.100')
        .send({});
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/localhost/i);
    });
  });

  describe('Admin redirects when accessed from same machine via LAN IP', () => {
    it('redirects GET /dashboard from own LAN IP to localhost', async () => {
      const res = await fromOwnMachine('/dashboard');
      if (!HAS_OWN_LAN_IP) {
        expect(res.status).toBe(200);
        return;
      }
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/localhost:\d+\/dashboard/);
    });

    it('redirects GET /login from own LAN IP to localhost', async () => {
      const res = await fromOwnMachine('/login');
      if (!HAS_OWN_LAN_IP) {
        expect(res.status).toBe(200);
        return;
      }
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/localhost:\d+\/login/);
    });

    it('does NOT redirect POST /api/streams/start from own LAN IP (APIs get 403)', async () => {
      const req = request(app).post('/api/streams/start').send({});
      if (HAS_OWN_LAN_IP) req.set('X-Test-Remote-Address', OWN_LAN_IP);
      const res = await req;
      if (!HAS_OWN_LAN_IP) return;
      expect(res.status).toBe(403);
    });
  });

  describe('Localhost always works', () => {
    it('allows GET /dashboard from localhost (no test header)', async () => {
      const res = await request(app).get('/dashboard');
      expect(res.status).toBe(200);
    });
  });
});

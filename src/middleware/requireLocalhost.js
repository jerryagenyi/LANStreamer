/**
 * Lock admin to localhost: only allow admin UI and admin APIs when the request
 * comes from localhost. Listener page (/streams) and listener APIs remain
 * allowed from LAN for mobile and other devices.
 * If you're on the server but used the LAN IP (e.g. 192.168.1.244), we redirect
 * to localhost so the page loads; truly remote clients still get 403.
 */

import os from 'os';
import logger from '../utils/logger.js';

const LISTENER_GET_PATHS = [
  '/streams',
  '/streams.html',
  '/api/health',
  '/api/system/config',
  '/api/streams/status',
  '/api/contact-details',
  '/api/info'
];

const LISTENER_PLAY_REGEX = /^\/api\/streams\/play\/[^/]+$/;

/**
 * In tests we can't open a real connection from another machine, so we allow
 * the test to pretend to be "from LAN" by sending header X-Test-Remote-Address
 * (e.g. 192.168.1.100). Only used when NODE_ENV === 'test'.
 */
function getClientIp(req) {
  if (process.env.NODE_ENV === 'test' && req.get('X-Test-Remote-Address')) {
    return req.get('X-Test-Remote-Address');
  }
  return req.ip || req.socket?.remoteAddress || '';
}

function isLocalhost(req) {
  const ip = getClientIp(req);
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/** Server's own IPs (localhost + LAN IPs of this machine). Used to redirect "same machine via LAN IP" to localhost. */
function getServerOwnIps() {
  const set = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const iface of list) {
      if (iface.family === 'IPv4' && iface.address) set.add(iface.address);
      if (iface.family === 'IPv6' && iface.address) set.add(iface.address);
    }
  }
  return set;
}

function isListenerPathAllowed(req) {
  if (req.method !== 'GET') return false;
  const path = req.path || req.url?.split('?')[0] || '';
  if (LISTENER_GET_PATHS.includes(path)) return true;
  if (LISTENER_PLAY_REGEX.test(path)) return true;
  return false;
}

const ADMIN_BLOCKED_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin access restricted</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:2rem auto;padding:1rem;">
<h1>Admin access restricted</h1>
<p>Admin (login, dashboard) is only available from this computer (localhost).</p>
<p>Use <strong>http://127.0.0.1:PORT</strong> or <strong>http://localhost:PORT</strong> to manage streams. Listeners can still use this address to open the listener page.</p>
</body></html>`;

/**
 * Middleware: block admin pages and admin APIs when the request is not from localhost.
 * Listener page (/streams) and listener APIs (config, status, play, contact-details, health, info) remain allowed from LAN.
 */
export function requireLocalhostAdmin(req, res, next) {
  if (isLocalhost(req)) return next();
  if (isListenerPathAllowed(req)) return next();
  const clientIp = getClientIp(req);
  const path = req.path || req.url?.split('?')[0] || '';
  const isApi = path.startsWith('/api/');

  // Same machine but using LAN IP? Redirect GET (pages) to localhost so it just works.
  if (!isApi && req.method === 'GET') {
    const serverIps = getServerOwnIps();
    if (serverIps.has(clientIp)) {
      const host = req.get('host') || '';
      // Port is after last ':' (works for "host:3001" and "[::1]:3001"; split(':')[1] fails for IPv6)
      const port = host.includes(':') ? host.split(':').pop() : (process.env.PORT || '3001');
      const redirectUrl = `http://localhost:${port}${req.originalUrl || path}`;
      logger.info({ clientIp, path, redirectUrl }, 'Redirecting same-machine admin request to localhost');
      return res.redirect(302, redirectUrl);
    }
  }

  logger.warn({ clientIp, path, method: req.method }, 'Blocked non-localhost admin access');
  if (isApi) {
    res.status(403).json({
      error: 'Admin access is only allowed from localhost',
      message: 'Use this machine (127.0.0.1) to manage streams. Listeners can use the LAN IP to open the listener page.'
    });
  } else {
    res.status(403).set('Content-Type', 'text/html').send(ADMIN_BLOCKED_HTML);
  }
}

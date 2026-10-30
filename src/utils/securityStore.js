/**
 * Persisted admin credentials for the in-app settings path (dashboard →
 * Admin account). Packaged installs have no .env to edit, so credential
 * changes live in a small JSON file in the writable data dir.
 *
 * File: { adminUsername, adminPasswordHash, jwtSecret } — the password is
 * stored as a salted scrypt hash, never plaintext. Once the file exists it
 * takes precedence over env/defaults (an explicit in-app change must win);
 * config/index.js applies it at boot and routes/auth.js applies it at runtime.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dataDir } from './vendorPaths.js';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

export function securityFilePath() {
  // LS_SECURITY_FILE exists so tests can aim the store at a throwaway path.
  return process.env.LS_SECURITY_FILE || path.join(dataDir(), 'security.json');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), hash.toString('hex')].join(':');
}

export function verifyPasswordHash(password, encoded) {
  try {
    const [scheme, N, r, p, saltHex, hashHex] = String(encoded).split(':');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function loadSecurityFile() {
  try {
    const p = securityFilePath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')) || {};
  } catch { /* unreadable/corrupt file = fall back to env/defaults */ }
  return {};
}

export function saveSecurityFile(data) {
  const p = securityFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), { mode: 0o600 });
  return p;
}

export function mintJwtSecret() {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Unit tests: first-run per-install credential minting (packaged marker =
 * LANSTREAMER_DATA_DIR set; file path redirected via LS_SECURITY_FILE).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const store = await import('../../src/utils/securityStore.js');

describe('mintFirstRunSecurity', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-sec-'));
    process.env.LANSTREAMER_DATA_DIR = dir;
    process.env.LS_SECURITY_FILE = path.join(dir, 'security.json');
    delete process.env.ADMIN_PASSWORD;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.LANSTREAMER_DATA_DIR;
    delete process.env.LS_SECURITY_FILE;
  });

  it('mints once for packaged installs, never stores plaintext', () => {
    const creds = store.mintFirstRunSecurity();
    expect(creds).toMatchObject({ username: 'admin' });
    expect(creds.password).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);

    const raw = fs.readFileSync(process.env.LS_SECURITY_FILE, 'utf8');
    expect(raw).not.toContain(creds.password); // scrypt hash only
    expect(raw).toContain('"fresh": true');
    expect(store.verifyPasswordHash(creds.password, JSON.parse(raw).adminPasswordHash)).toBe(true);
  });

  it('is idempotent — a second call returns null', () => {
    expect(store.mintFirstRunSecurity()).not.toBeNull();
    expect(store.mintFirstRunSecurity()).toBeNull();
  });

  it('respects explicit env configuration', () => {
    process.env.ADMIN_PASSWORD = 'operator-set';
    expect(store.mintFirstRunSecurity()).toBeNull();
  });

  it('no-ops in dev/CLI (no data-dir marker)', () => {
    delete process.env.LANSTREAMER_DATA_DIR;
    expect(store.mintFirstRunSecurity()).toBeNull();
  });

  it('clearFreshFlag removes the flag without touching the hash', () => {
    const creds = store.mintFirstRunSecurity();
    store.clearFreshFlag();
    const raw = JSON.parse(fs.readFileSync(process.env.LS_SECURITY_FILE, 'utf8'));
    expect(raw.fresh).toBeUndefined();
    expect(store.verifyPasswordHash(creds.password, raw.adminPasswordHash)).toBe(true);
  });
});

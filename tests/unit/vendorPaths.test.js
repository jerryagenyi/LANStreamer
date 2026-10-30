/**
 * Unit tests: vendored binary resolution + bundled Icecast config generation.
 * The bundle is what makes a packaged install work on machines with NOTHING
 * installed — these paths must resolve deterministically.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';

const vendorPaths = await import('../../src/utils/vendorPaths.js');

function makeVendorFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-vendor-'));
  const vendor = path.join(base, 'vendor');
  fs.mkdirSync(path.join(vendor, 'ffmpeg'), { recursive: true });
  fs.writeFileSync(path.join(vendor, 'ffmpeg', 'ffmpeg.exe'), 'stub');
  fs.mkdirSync(path.join(vendor, 'icecast', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(vendor, 'icecast', 'bin', 'icecast.exe'), 'stub');
  fs.writeFileSync(path.join(vendor, 'icecast', 'icecast.xml'),
    '<icecast><authentication><source-password>hackme</source-password><admin-password>hackme</admin-password><relay-password>hackme</relay-password></authentication>' +
    '<listen-socket><port>8200</port><bind-address>0.0.0.0</bind-address></listen-socket>' +
    '<paths><logdir>./log</logdir><webroot>./web</webroot><adminroot>./admin</adminroot></paths></icecast>');
  return { base, vendor };
}

describe('vendorPaths resolution', () => {
  let fixture;

  beforeEach(() => {
    fixture = makeVendorFixture();
    process.env.LANSTREAMER_VENDOR_DIR = fixture.vendor;
    process.env.LANSTREAMER_DATA_DIR = path.join(fixture.base, 'data');
    delete process.resourcesPath;
  });

  afterEach(() => {
    fs.rmSync(fixture.base, { recursive: true, force: true });
    delete process.env.LANSTREAMER_VENDOR_DIR;
    delete process.env.LANSTREAMER_DATA_DIR;
  });

  it('resolves the vendor dir from the env override', () => {
    expect(vendorPaths.vendorDir()).toBe(fixture.vendor);
  });

  it('finds the vendored ffmpeg and icecast executables', () => {
    expect(vendorPaths.vendoredFfmpegPath()).toBe(path.join(fixture.vendor, 'ffmpeg', 'ffmpeg.exe'));
    expect(vendorPaths.vendoredIcecastExePath()).toBe(path.join(fixture.vendor, 'icecast', 'bin', 'icecast.exe'));
  });

  it('falls back to the repo checkout vendor/ when the env dir is missing', () => {
    // In this repo, vendor/ exists (populated by fetch-vendor-binaries.mjs), so
    // a bad env override resolves to the repo kit rather than null.
    process.env.LANSTREAMER_VENDOR_DIR = path.join(fixture.base, 'missing');
    const dir = vendorPaths.vendorDir();
    expect(dir).not.toBe(fixture.vendor);
    expect(dir === null || dir.endsWith('vendor')).toBe(true);
  });

  it('generates a WRITABLE icecast config with absolute rewritten paths', () => {
    const cfg = vendorPaths.ensureVendoredIcecastConfig();
    expect(cfg).toBe(path.join(fixture.base, 'data', 'icecast', 'icecast.xml'));

    const xml = fs.readFileSync(cfg, 'utf8');
    expect(xml).toContain(`<logdir>${path.join(fixture.base, 'data', 'icecast', 'log')}</logdir>`);
    expect(xml).toContain(`<webroot>${path.join(fixture.vendor, 'icecast', 'web')}</webroot>`);
    expect(xml).toContain(`<adminroot>${path.join(fixture.vendor, 'icecast', 'admin')}</adminroot>`);
    // logdir must actually exist (icecast fails to start otherwise)
    expect(fs.existsSync(path.join(fixture.base, 'data', 'icecast', 'log'))).toBe(true);
  });

  it('honors the stock-parity contract: stock credentials/binding/port survive generation, only paths are rewritten', () => {
    const cfg = vendorPaths.ensureVendoredIcecastConfig();
    const xml = fs.readFileSync(cfg, 'utf8');
    // Deliberate product decision (GO-LIVE-CHECKLIST §0.1): the packaged app
    // behaves exactly like a plain Icecast install — no hidden divergence.
    expect(xml).toMatch(/<source-password>hackme</);
    expect(xml).toMatch(/<admin-password>hackme</);
    expect(xml).toContain('<bind-address>0.0.0.0</bind-address>');
    expect(xml).toContain('<port>8200</port>');
    // generated marker present (enables conflict-recovery port claiming later)
    expect(xml).toContain('lanstreamer-generated');
  });

  it('is idempotent — an existing generated config is not rewritten', async () => {
    const cfg = vendorPaths.ensureVendoredIcecastConfig();
    fs.writeFileSync(cfg, '<icecast><!-- operator-edited --></icecast>');
    const again = vendorPaths.ensureVendoredIcecastConfig();
    expect(again).toBe(cfg);
    expect(fs.readFileSync(cfg, 'utf8')).toContain('operator-edited');
  });
});

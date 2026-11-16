/**
 * Unit tests for TelemetryService event envelope.
 * Guards: every event carries the REAL app version. Production events all
 * said appVersion "unknown" because the version came from an env var that
 * only exists under `npm run` — never in a packaged Electron build.
 */
import { jest } from '@jest/globals';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const { default: telemetry } = await import('../../src/services/TelemetryService.js');

describe('TelemetryService.capture envelope', () => {
  let sent;
  let savedEnv;

  beforeEach(() => {
    sent = [];
    telemetry.client = { capture: (e) => sent.push(e) };
    telemetry.enabled = true;
    telemetry.installId = 'test-install';
    savedEnv = process.env.npm_package_version;
  });

  afterEach(() => {
    telemetry.client = null;
    telemetry.enabled = false;
    if (savedEnv === undefined) delete process.env.npm_package_version;
    else process.env.npm_package_version = savedEnv;
  });

  it('reports the package.json version when not launched through npm (packaged app)', () => {
    delete process.env.npm_package_version;
    telemetry.capture('app_start', {});
    expect(sent).toHaveLength(1);
    expect(sent[0].properties.appVersion).toBe(pkg.version);
  });

  it('never reports "unknown" as the version', () => {
    delete process.env.npm_package_version;
    telemetry.capture('stream_started', { format: 'MP3' });
    expect(sent[0].properties.appVersion).not.toBe('unknown');
  });
});

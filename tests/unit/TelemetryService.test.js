/**
 * Unit tests for TelemetryService event envelope.
 * Guards: every event carries the REAL app version. Production events all
 * said appVersion "unknown" because the version came from an env var that
 * only exists under `npm run` — never in a packaged Electron build.
 */
import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const { default: telemetry } = await import('../../src/services/TelemetryService.js');
const { TelemetryJournal } = await import('../../src/services/TelemetryJournal.js');

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

describe('TelemetryService journal wiring (offline telemetry)', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-telsvc-'));
  });

  afterEach(() => {
    if (telemetry._uploadTimer) { clearTimeout(telemetry._uploadTimer); telemetry._uploadTimer = null; }
    telemetry._journal = null;
    telemetry.enabled = false;
    telemetry.consented = null;
    telemetry.client = null;
  });

  it('capture() writes the event to the journal FIRST (client not required)', () => {
    const order = [];
    telemetry.enabled = true;
    telemetry.installId = 'test-install';
    telemetry.client = { capture: () => order.push('client') };
    telemetry._journal = new TelemetryJournal({ dir, now: () => 1_700_000_000_000 });
    const origRecord = telemetry._journal.record.bind(telemetry._journal);
    telemetry._journal.record = (e) => { order.push('journal'); return origRecord(e); };

    telemetry.capture('app_start', {});

    expect(order[0]).toBe('journal');
    const lines = fs.readFileSync(path.join(dir, 'telemetry-journal.jsonl'), 'utf8').trim().split('\n');
    const rec = JSON.parse(lines[0]);
    expect(rec.event).toBe('lanstreamer_app_start');
    expect(rec.props.app).toBe('lanstreamer');
    expect(rec.props.appVersion).toBe(pkg.version);
  });

  it('capture() does not need a client when the journal is active (one delivery path)', () => {
    telemetry.enabled = true;
    telemetry.client = null;
    telemetry._journal = new TelemetryJournal({ dir });
    expect(() => telemetry.capture('app_stop', {})).not.toThrow();
    expect(fs.readFileSync(path.join(dir, 'telemetry-journal.jsonl'), 'utf8')).toMatch(/lanstreamer_app_stop/);
  });

  it('setConsented(false) deletes the journal — off means off', () => {
    telemetry.enabled = true;
    telemetry.consented = true;
    telemetry.configPath = path.join(dir, 'telemetry.json'); // keep _saveState off the real config dir
    telemetry._journal = new TelemetryJournal({ dir });
    telemetry._journal.record({ event: 'lanstreamer_app_start', props: {} });
    expect(fs.existsSync(path.join(dir, 'telemetry-journal.jsonl'))).toBe(true);

    telemetry.setConsented(false);

    expect(telemetry._journal).toBeNull();
    expect(fs.existsSync(path.join(dir, 'telemetry-journal.jsonl'))).toBe(false);
    expect(telemetry.enabled).toBe(false);
  });
});

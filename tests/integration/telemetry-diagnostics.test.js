/**
 * Integration test: offline telemetry hand-carry export routes
 * - GET /api/telemetry/diagnostics/status  (admin, localhost)
 * - GET /api/telemetry/diagnostics/export  (admin, localhost) — downloads a
 *   lanstreamer-diagnostics JSON bundle for hand-carrying to the maintainer
 * - a LAN client gets 403 (admin surface), no token gets 401
 * - telemetry off -> 409 with a clear JSON message
 * - an empty journal still exports 200 with eventCount 0 and logs nothing
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { jest } from '@jest/globals';

// Re-enable the auth gate that tests/setup.js disables for the older suites.
delete process.env.AUTH_DISABLED;

jest.unstable_mockModule('../../src/services/StreamingService.js', () => ({
  default: {
    stopStream: jest.fn().mockRejectedValue(new Error('Stream x not found')),
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
const { default: telemetry } = await import('../../src/services/TelemetryService.js');
const { TelemetryJournal } = await import('../../src/services/TelemetryJournal.js');

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function useJournal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-diag-'));
  telemetry._journal = new TelemetryJournal({ dir });
  telemetry.enabled = true;
  telemetry.consented = true;
  telemetry.installId = UUID;
  telemetry._appStartedAt = Date.now() - 30_000; // pretend the app started 30s ago
  telemetry._startupUploadDone = true;
  return telemetry._journal;
}

describe('Telemetry diagnostics export routes', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'lanstreamer123' });
    token = res.body.token;
    expect(token).toBeTruthy();
  });

  it('blocks a LAN client with 403 (admin surface, not a listener path)', async () => {
    const r1 = await request(app)
      .get('/api/telemetry/diagnostics/export')
      .set('X-Test-Remote-Address', '192.168.1.100');
    expect(r1.status).toBe(403);
    const r2 = await request(app)
      .get('/api/telemetry/diagnostics/status')
      .set('X-Test-Remote-Address', '192.168.1.100');
    expect(r2.status).toBe(403);
  });

  it('requires the admin token from localhost too', async () => {
    const res = await request(app).get('/api/telemetry/diagnostics/status');
    expect(res.status).toBe(401);
  });

  it('409s with a clear message when telemetry is off', async () => {
    telemetry.enabled = false;
    telemetry.consented = false;
    telemetry._journal = null;
    const res = await request(app)
      .get('/api/telemetry/diagnostics/export')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/telemetry is off/i);
  });

  it('downloads every journaled event with a deterministic filename', async () => {
    const j = useJournal();
    j.record({ event: 'lanstreamer_app_start', props: { app: 'lanstreamer' } });
    j.record({ event: 'lanstreamer_stream_started', props: { app: 'lanstreamer' } });

    const res = await request(app)
      .get('/api/telemetry/diagnostics/export')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    const cd = res.headers['content-disposition'] || '';
    expect(cd).toMatch(/attachment/);
    expect(cd.match(/filename="([^"]+)"/)[1]).toMatch(/^lanstreamer-diagnostics-[0-9a-f]{8}-\d{8}-\d{4}\.json$/);
    expect(res.body.format).toBe('lanstreamer-diagnostics');
    expect(res.body.formatVersion).toBe(1);
    expect(res.body.installId).toBe(UUID);
    expect(res.body.eventCount).toBe(2);
    expect(res.body.events.map((e) => e.event)).toEqual(
      expect.arrayContaining(['lanstreamer_app_start', 'lanstreamer_stream_started'])
    );

    // After the export the events are marked: no longer pending, export logged
    const status = await request(app)
      .get('/api/telemetry/diagnostics/status')
      .set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(200);
    expect(status.body.enabled).toBe(true);
    expect(status.body.pendingCount).toBe(0);
    expect(status.body.lastExportAt).toBeTruthy();
    expect(status.body.exports).toHaveLength(1);
    expect(status.body.exports[0].eventCount).toBe(2);
    expect(typeof status.body.remind).toBe('boolean');
  });

  it('exports 200 with eventCount 0 on an empty journal and logs nothing', async () => {
    const j = useJournal(); // fresh, empty journal
    const res = await request(app)
      .get('/api/telemetry/diagnostics/export')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.eventCount).toBe(0);
    expect(res.body.events).toEqual([]);

    const status = await request(app)
      .get('/api/telemetry/diagnostics/status')
      .set('Authorization', `Bearer ${token}`);
    expect(status.body.exports).toEqual([]);
    expect(status.body.lastExportAt).toBeNull();
    expect(status.body.remind).toBe(false); // nothing pending from before this start
  });
});

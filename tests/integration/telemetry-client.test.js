/**
 * Integration test: listener client-event telemetry relay
 * - POST /api/telemetry/client-event stays PUBLIC (listeners never log in)
 *   while the auth gate still protects other POSTs
 * - event whitelist (unknown -> 400)
 * - property caps: strings truncated, non-primitives dropped
 * - forwards to TelemetryService.capture as client_<event> with surface tag
 * - per-IP rate limit trips after 30 events/minute
 */
import request from 'supertest';
import { jest } from '@jest/globals';

// Re-enable the auth gate that tests/setup.js disables for the older suites.
delete process.env.AUTH_DISABLED;

const captureMock = jest.fn();
jest.unstable_mockModule('../../src/services/TelemetryService.js', () => ({
  default: {
    capture: captureMock,
    getConsentState: () => ({ installId: 'test-install', consented: true, enabled: true })
  }
}));

// Mock StreamingService like auth.test.js — the real constructor enumerates
// audio devices (spawns ffmpeg) at import time and hangs the worker.
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
const { flushListenerSummary } = await import('../../src/routes/telemetry.js');

describe('Listener client-event relay', () => {
  it('accepts a playback failure WITHOUT a token (public surface)', async () => {
    const res = await request(app)
      .post('/api/telemetry/client-event')
      .send({
        event: 'playback_error',
        properties: { streamId: 's1', label: 'S1', code: 4, msg: 'MEDIA_ERR_SRC_NOT_SUPPORTED', platform: 'Win32', ua: 'Mozilla/5.0' }
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, captured: true });
    expect(captureMock).toHaveBeenCalledWith('client_playback_error', expect.objectContaining({
      surface: 'listener',
      streamId: 's1',
      code: 4
    }));
  });

  // Regression (2026-11-16): the localhost admin lock sat in front of this
  // route and only let GETs through from the LAN, so every real listener
  // (a phone, never localhost) got 403 and no client event ever reached
  // PostHog from the field. Listeners are by definition NOT on localhost.
  it('accepts a listener event from a phone on the LAN (not localhost)', async () => {
    captureMock.mockClear();
    const res = await request(app)
      .post('/api/telemetry/client-event')
      .set('X-Test-Remote-Address', '192.168.1.100')
      .send({ event: 'playback_stalled', properties: { streamId: 's1' } });
    expect(res.status).toBe(200);
    expect(captureMock).toHaveBeenCalledWith('client_playback_stalled', expect.objectContaining({ surface: 'listener' }));
  });

  it('keeps every other POST blocked from the LAN (admin stays localhost-only)', async () => {
    const res = await request(app)
      .post('/api/telemetry/consent')
      .set('X-Test-Remote-Address', '192.168.1.100')
      .send({ enabled: false });
    expect(res.status).toBe(403);
  });

  it('still guards other POST routes (401 without token)', async () => {
    const res = await request(app).post('/api/streams/start').send({});
    expect(res.status).toBe(401);
  });

  it('rejects unknown event names', async () => {
    const res = await request(app)
      .post('/api/telemetry/client-event')
      .send({ event: 'arbitrary_thing', properties: {} });
    expect(res.status).toBe(400);
  });

  it('truncates long strings and drops non-primitive property values', async () => {
    const long = 'x'.repeat(500);
    const res = await request(app)
      .post('/api/telemetry/client-event')
      .send({ event: 'load_failed', properties: { msg: long, evil: { nested: true }, ok: true } });
    expect(res.status).toBe(200);
    const props = captureMock.mock.calls.at(-1)[1];
    expect(props.msg.length).toBe(160);
    expect(props).not.toHaveProperty('evil');
    expect(props.ok).toBe(true);
  });

  // Heartbeats are aggregated, not relayed one-by-one: 100 listeners posting
  // every 30s was ~24,000 PostHog events per 2-hour service (shared free
  // quota) and several Icecast admin calls per post on the capture machine.
  it('accepts buffer heartbeats without relaying each one', async () => {
    await flushListenerSummary(); // drop anything earlier tests left in the window
    captureMock.mockClear();
    const res = await request(app)
      .post('/api/telemetry/client-event')
      .send({ event: 'buffer_report', properties: { streamId: 's1', mode: 'mse', ahead: 0.78, rate: 1, underruns: 0, snaps: 0 } });
    expect(res.status).toBe(200);
    expect(captureMock).not.toHaveBeenCalled();
    await flushListenerSummary();
  });

  it('summarises a window of heartbeats into ONE event that keeps the slow-path signal', async () => {
    await flushListenerSummary();
    captureMock.mockClear();
    const post = (properties) => request(app).post('/api/telemetry/client-event').send({ event: 'buffer_report', properties });
    await post({ streamId: 's1', mode: 'mse', plat: 'android', ahead: 0.7, underruns: 0, snaps: 0 });
    await post({ streamId: 's1', mode: 'mse', plat: 'android', ahead: 0.9, underruns: 3, snaps: 1 });
    await post({ streamId: 's2', mode: 'src', why: 'unsupported', plat: 'ios', ahead: 4.2, underruns: 0, snaps: 0 });

    await flushListenerSummary();

    const summaries = captureMock.mock.calls.filter(c => c[0] === 'client_buffer_summary');
    expect(summaries).toHaveLength(1);
    expect(summaries[0][1]).toEqual(expect.objectContaining({
      surface: 'listener',
      reports: 3,
      mse: 2,
      src: 1,
      srcFallback: 0,
      ios: 1,
      android: 2,
      streams: 2,
      aheadMedian: 0.9,
      aheadMax: 4.2,
      srcAheadMax: 4.2,
      mseAheadMax: 0.9,
      underrunsMax: 3,
      snapsMax: 1
    }));
  });

  it('sends no summary for a window with no heartbeats', async () => {
    await flushListenerSummary();
    captureMock.mockClear();
    await flushListenerSummary();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('accepts the low-latency fallback report (the silent switch to the slow path)', async () => {
    captureMock.mockClear();
    const res = await request(app)
      .post('/api/telemetry/client-event')
      .send({ event: 'll_fallback', properties: { streamId: 's1', err: 'QuotaExceededError', plat: 'android' } });
    expect(res.status).toBe(200);
    expect(captureMock).toHaveBeenCalledWith('client_ll_fallback', expect.objectContaining({ err: 'QuotaExceededError' }));
  });

  it('rate-limits to 30 events per minute per IP', async () => {
    const statuses = [];
    for (let i = 0; i < 35; i++) {
      const res = await request(app)
        .post('/api/telemetry/client-event')
        .send({ event: 'playback_stalled', properties: { streamId: 's1' } });
      statuses.push(res.status);
    }
    const allowed = statuses.filter(s => s === 200).length;
    expect(allowed).toBeLessThanOrEqual(30);
    expect(statuses.at(-1)).toBe(429);
  });
});

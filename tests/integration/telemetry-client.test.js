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

/**
 * Stream lifecycle telemetry.
 *
 * Field data (2026-11) showed 31 stream_stopped vs 16 stream_started and zero
 * stream_failed: restarts (boot auto-start, Start All, Retry, resume) emitted
 * no start, a stop was emitted for streams that were not running, and an
 * FFmpeg process dying mid-service emitted nothing at all. These tests pin
 * the contract: every live session reports exactly one start and exactly one
 * end (stopped OR crashed), tied together by a per-session id.
 */
import { jest } from '@jest/globals';

const captureMock = jest.fn();
jest.unstable_mockModule('../../src/services/TelemetryService.js', () => ({
  default: {
    capture: captureMock,
    sourceHash: (label) => `hash(${label})`
  }
}));
jest.unstable_mockModule('../../src/services/IcecastService.js', () => ({
  default: {
    getActualPort: jest.fn(() => 8200),
    getSourcePassword: jest.fn(() => 'pw'),
    getHostname: jest.fn(() => 'localhost'),
  },
}));

const { default: svc } = await import('../../src/services/StreamingService.js');

// telemetry is emitted fire-and-forget through a dynamic import
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };
const eventsNamed = (name) => captureMock.mock.calls.filter(c => c[0] === name).map(c => c[1]);

function liveStream(overrides = {}) {
  return {
    id: 's1',
    name: 'English',
    status: 'running',
    config: { inputFile: 'lobby.mp3', bitrate: 128 },
    audioFormat: 'MP3',
    startedAt: new Date(Date.now() - 10 * 60_000),
    ffmpegProcess: null,
    intentionallyStopped: false,
    telemetrySid: 'abc12345',
    ...overrides
  };
}

describe('stream lifecycle telemetry', () => {
  let saved;

  beforeEach(() => {
    captureMock.mockClear();
    saved = {
      activeStreams: svc.activeStreams,
      save: svc.savePersistentStreams,
      ensure: svc.ensureIcecastRunning,
      start: svc.startFFmpegProcess,
      kill: svc.killProcessTree
    };
    svc.savePersistentStreams = jest.fn();   // never touch config/streams.json
    svc.ensureIcecastRunning = jest.fn().mockResolvedValue();
    svc.killProcessTree = jest.fn();
    svc.activeStreams = {};
  });

  afterEach(() => {
    svc.activeStreams = saved.activeStreams;
    svc.savePersistentStreams = saved.save;
    svc.ensureIcecastRunning = saved.ensure;
    svc.startFFmpegProcess = saved.start;
    svc.killProcessTree = saved.kill;
  });

  it('reports stream_started when a stream comes up through restartStream', async () => {
    svc.activeStreams.s1 = liveStream({ status: 'stopped', telemetrySid: undefined });
    svc.startFFmpegProcess = jest.fn().mockResolvedValue({ pid: 1, exitCode: null });

    await svc.restartStream('s1');
    await settle();

    const started = eventsNamed('stream_started');
    expect(started).toHaveLength(1);
    expect(started[0]).toEqual(expect.objectContaining({
      via: 'restart',
      format: 'MP3',
      bitrate: 128,
      sourceKind: 'file',
      sourceHash: 'hash(lobby.mp3)'
    }));
    expect(typeof started[0].sid).toBe('string');
    expect(started[0].sid.length).toBeGreaterThan(0);
  });

  it('reports stream_failed when a restart cannot bring the stream up', async () => {
    svc.activeStreams.s1 = liveStream({ status: 'stopped' });
    const boom = new Error('device busy');
    boom.cause = 'device_busy';
    svc.startFFmpegProcess = jest.fn().mockRejectedValue(boom);

    await expect(svc.restartStream('s1')).rejects.toThrow();
    await settle();

    const failed = eventsNamed('stream_failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toEqual(expect.objectContaining({ via: 'restart', category: 'device_busy' }));
    expect(eventsNamed('stream_started')).toHaveLength(0);
  });

  it('reports stream_crashed when FFmpeg dies while the stream is live', async () => {
    svc.activeStreams.s1 = liveStream();

    svc.handleProcessExit('s1', 1, null, 'some ffmpeg error');
    await settle();

    const crashed = eventsNamed('stream_crashed');
    expect(crashed).toHaveLength(1);
    expect(crashed[0]).toEqual(expect.objectContaining({ sid: 'abc12345', uptimeMin: 10 }));
    expect(typeof crashed[0].category).toBe('string');
  });

  it('does not report a crash when the operator stopped the stream', async () => {
    svc.activeStreams.s1 = liveStream({ status: 'stopped', intentionallyStopped: true });

    svc.handleProcessExit('s1', 1, null, '');
    await settle();

    expect(eventsNamed('stream_crashed')).toHaveLength(0);
  });

  it('pairs stream_stopped with its start through the session id', async () => {
    svc.activeStreams.s1 = liveStream();

    await svc.stopStream('s1');
    await settle();

    const stopped = eventsNamed('stream_stopped');
    expect(stopped).toHaveLength(1);
    expect(stopped[0]).toEqual(expect.objectContaining({ sid: 'abc12345', uptimeMin: 10 }));
  });

  it('closes the old session before opening a new one when a LIVE stream is restarted', async () => {
    // no pid → the non-taskkill branch (never run a real taskkill from a test)
    svc.activeStreams.s1 = liveStream({ ffmpegProcess: { exitCode: null, kill: jest.fn() } });
    svc.startFFmpegProcess = jest.fn().mockResolvedValue({ pid: 1, exitCode: null });

    await svc.restartStream('s1');
    await settle();

    const stopped = eventsNamed('stream_stopped');
    const started = eventsNamed('stream_started');
    expect(stopped).toHaveLength(1);
    expect(stopped[0]).toEqual(expect.objectContaining({ sid: 'abc12345', reason: 'restart' }));
    expect(started).toHaveLength(1);
    expect(started[0].sid).not.toBe('abc12345');
  });

  it('closes the session when a LIVE stream is edited onto another source', async () => {
    svc.activeStreams.s1 = liveStream({ deviceId: 'old-device', ffmpegProcess: { exitCode: null, kill: jest.fn() } });

    await svc.updateStream('s1', { deviceId: 'new-device' });
    await settle();

    const stopped = eventsNamed('stream_stopped');
    expect(stopped).toHaveLength(1);
    expect(stopped[0]).toEqual(expect.objectContaining({ sid: 'abc12345', reason: 'edit' }));
  });

  it('does not report stream_stopped for a stream that was not running', async () => {
    svc.activeStreams.s1 = liveStream({ status: 'stopped' });

    await svc.stopStream('s1');
    await settle();

    expect(eventsNamed('stream_stopped')).toHaveLength(0);
  });
});

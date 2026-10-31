/**
 * Integration test: startServer shutdown contract.
 * stopStreams:false (the Electron shell already stopped streams/icecast in its
 * own ordered teardown) must skip the duplicate stop pass and still close the
 * HTTP server.
 */
import { jest } from '@jest/globals';

const stopAllStreams = jest.fn().mockResolvedValue({});
jest.unstable_mockModule('../../src/services/StreamingService.js', () => ({
  default: {
    stopAllStreams,
    getStats: jest.fn().mockReturnValue({ total: 1, running: 1, errors: 0, streams: [{ id: 's1', status: 'running' }] }),
    loadPersistentStreams: jest.fn(),
    cleanupOldStreams: jest.fn().mockReturnValue(0)
  }
}));
jest.unstable_mockModule('../../src/services/IcecastService.js', () => ({
  default: { process: null, stop: jest.fn().mockResolvedValue({}), initialize: jest.fn().mockResolvedValue() }
}));

const { startServer } = await import('../../src/app.js');

describe('startServer shutdown', () => {
  it('default: stops running streams, then closes', async () => {
    const handle = startServer({ port: 0 });
    await new Promise(r => handle.server.once('listening', r));
    await handle.shutdown({ timeoutMs: 1000 });
    expect(stopAllStreams).toHaveBeenCalledTimes(1);
    expect(handle.server.listening).toBe(false);
  });

  it('stopStreams:false skips the duplicate stop pass (Electron ordered teardown)', async () => {
    stopAllStreams.mockClear();
    const handle = startServer({ port: 0 });
    await new Promise(r => handle.server.once('listening', r));
    await handle.shutdown({ timeoutMs: 1000, stopStreams: false });
    expect(stopAllStreams).not.toHaveBeenCalled();
    expect(handle.server.listening).toBe(false);
  });
});

/**
 * Integration test: POST /api/streams/create (drawer "Save")
 * Guards: creates a STOPPED stream without starting it; rejects bad payloads.
 */
import request from 'supertest';
import { jest } from '@jest/globals';

// Mock instance captured OUTSIDE the factory: unstable_mockModule may re-run
// the factory per import, and the route + test must share ONE jest.fn.
const createStoppedStreamMock = jest.fn();

jest.unstable_mockModule('../../src/services/StreamingService.js', () => ({
  default: {
    createStoppedStream: createStoppedStreamMock,
    startStream: jest.fn(),
    stopStream: jest.fn().mockResolvedValue(),
    stopAllStreams: jest.fn().mockResolvedValue({}),
    restartStream: jest.fn().mockResolvedValue(),
    getStats: jest.fn().mockReturnValue({ total: 0, running: 0, errors: 0, streams: [] }),
    cleanupOldStreams: jest.fn().mockReturnValue(0),
    updateStream: jest.fn().mockResolvedValue({}),
    deleteStream: jest.fn().mockResolvedValue(),
    activeStreams: {}
  }
}));

const { default: app } = await import('../../src/server.js');

describe('POST /api/streams/create (save as stopped)', () => {
  it('creates a stopped stream and returns it', async () => {
    const created = {
      id: 'created_1', name: 'Main Room English', deviceId: 'cable-output', status: 'stopped',
      config: { name: 'Main Room English', deviceId: 'cable-output', bitrate: 192, autoStart: true }
    };
    createStoppedStreamMock.mockResolvedValueOnce(created);

    const res = await request(app)
      .post('/api/streams/create')
      .send({ name: 'Main Room English', deviceId: 'cable-output', bitrate: 192, autoStart: true });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Stream created (stopped)');
    expect(res.body.streamId).toBe('created_1');
    expect(res.body.stream.status).toBe('stopped');
    expect(createStoppedStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Main Room English', autoStart: true })
    );
  });

  it('returns 400 when the service rejects (duplicate name / missing fields)', async () => {
    createStoppedStreamMock.mockRejectedValueOnce(
      new Error('A stream named "X" already exists. Use a unique name.')
    );

    const res = await request(app)
      .post('/api/streams/create')
      .send({ name: 'X', deviceId: 'd' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/);
  });
});

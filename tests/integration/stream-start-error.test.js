/**
 * Integration test: POST /api/streams/start returns structured error (cause, diagnosis) on failure
 * Guards: Stream error payload includes cause and diagnosis for UI and logging
 */
import request from 'supertest';
import { jest } from '@jest/globals';

const streamFailureError = new Error('Stream failed');
streamFailureError.shortMessage = 'Audio Device Not Found';
streamFailureError.cause = 'device_not_found';
streamFailureError.diagnosis = {
  category: 'device_not_found',
  title: 'Audio Device Not Found',
  description: 'The audio device cannot be found by FFmpeg.',
  solutions: ['Click "Refresh Devices"', 'Check Windows Sound settings']
};

jest.unstable_mockModule('../../src/services/StreamingService.js', () => ({
  default: {
    startStream: jest.fn().mockRejectedValue(streamFailureError),
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

describe('POST /api/streams/start (error response)', () => {
  it('returns 500 with cause and diagnosis when start fails', async () => {
    const res = await request(app)
      .post('/api/streams/start')
      .send({ deviceId: 'd1', id: 'stream1', name: 'Test' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error starting stream');
    expect(res.body).toHaveProperty('error', 'Audio Device Not Found');
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('cause', 'device_not_found');
    expect(res.body).toHaveProperty('diagnosis');
    expect(res.body.diagnosis).toHaveProperty('category', 'device_not_found');
    expect(res.body.diagnosis).toHaveProperty('title', 'Audio Device Not Found');
    expect(res.body.diagnosis).toHaveProperty('solutions');
    expect(Array.isArray(res.body.diagnosis.solutions)).toBe(true);
  });
});

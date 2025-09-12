import request from 'supertest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../../../src/server';
import ffmpegService from '../../../src/services/FFmpegService';

// We are now testing the actual singleton, so we don't mock the whole module.
// Instead, we spy on its methods and restore them after each test.

describe('Stream Control API', () => {

  afterEach(() => {
    // Restore original method implementations after each test
    vi.restoreAllMocks();
  });

  describe('POST /api/streams/start', () => {
    it('should call FFmpegService.startStream with the correct config and return 200', async () => {
      const streamConfig = { id: 'test-stream', deviceId: 'device-1' };
      // Spy directly on the imported singleton's method
      const spy = vi.spyOn(ffmpegService, 'startStream').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/streams/start')
        .send(streamConfig);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Stream started successfully', streamId: 'test-stream' });
      expect(spy).toHaveBeenCalledWith(streamConfig);
    });
  });

  describe('POST /api/streams/stop', () => {
    it('should call FFmpegService.stopStream with the correct ID and return 200', async () => {
      const streamId = 'test-stream';
      // Spy directly on the imported singleton's method
      const spy = vi.spyOn(ffmpegService, 'stopStream').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/streams/stop')
        .send({ id: streamId });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Stream stopped successfully', streamId: 'test-stream' });
      expect(spy).toHaveBeenCalledWith(streamId);
    });
  });
});

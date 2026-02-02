/**
 * Unit tests for StreamingService (buildFFmpegArgs)
 * Guards: Icecast source URL uses localhost; port from IcecastService
 */
import { jest } from '@jest/globals';

// Mock IcecastService before importing StreamingService
jest.unstable_mockModule('../../src/services/IcecastService.js', () => ({
  default: {
    getActualPort: jest.fn(() => 8200),
    getSourcePassword: jest.fn(() => 'hackme'),
    getHostname: jest.fn(() => '192.168.1.244'),
  },
}));

const { default: streamingService } = await import('../../src/services/StreamingService.js');

describe('StreamingService', () => {
  describe('buildFFmpegArgs', () => {
    it('builds Icecast URL with localhost (not getHostname())', () => {
      const args = streamingService.buildFFmpegArgs('my_stream_id', { inputFile: 'test.ogg', bitrate: 192 }, 0);
      const icecastUrl = args.find(a => typeof a === 'string' && a.startsWith('icecast://'));
      expect(icecastUrl).toBeDefined();
      expect(icecastUrl).toMatch(/@localhost:/);
      expect(icecastUrl).not.toMatch(/@192\.168\.1\.244:/);
    });

    it('builds Icecast URL with port from IcecastService (8200)', () => {
      const args = streamingService.buildFFmpegArgs('stream_1', { inputFile: 'x.ogg' }, 0);
      const icecastUrl = args.find(a => typeof a === 'string' && a.startsWith('icecast://'));
      expect(icecastUrl).toMatch(/localhost:8200\/stream_1/);
    });

    it('includes streamId in Icecast URL', () => {
      const streamId = 'test_2026_v3_1769900463252';
      const args = streamingService.buildFFmpegArgs(streamId, { inputFile: 'f.ogg' }, 0);
      const icecastUrl = args.find(a => typeof a === 'string' && a.startsWith('icecast://'));
      expect(icecastUrl).toContain(`/${streamId}`);
    });

    it('uses format fallback when formatIndex out of range', () => {
      const args = streamingService.buildFFmpegArgs('id', { inputFile: 'f.ogg' }, 99);
      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBeGreaterThan(0);
      const icecastUrl = args.find(a => typeof a === 'string' && a.startsWith('icecast://'));
      expect(icecastUrl).toMatch(/@localhost:8200/);
    });

    it('builds device-mode args and Icecast URL still uses localhost', () => {
      const args = streamingService.buildFFmpegArgs('id', { deviceId: 'SomeDevice' }, 0);
      const icecastUrl = args.find(a => typeof a === 'string' && a.startsWith('icecast://'));
      expect(icecastUrl).toMatch(/@localhost:8200\/id/);
    });
  });

  describe('streamNameExists', () => {
    it('returns false when no stream has the name', () => {
      const prev = streamingService.activeStreams;
      streamingService.activeStreams = { id1: { id: 'id1', name: 'Stream A' } };
      expect(streamingService.streamNameExists('Other Name', null)).toBe(false);
      streamingService.activeStreams = prev;
    });

    it('returns true when another stream has the same name (case-insensitive)', () => {
      const prev = streamingService.activeStreams;
      streamingService.activeStreams = {
        id1: { id: 'id1', name: 'Stream A' },
        id2: { id: 'id2', name: 'Stream B' }
      };
      expect(streamingService.streamNameExists('Stream B', null)).toBe(true);
      expect(streamingService.streamNameExists('stream b', null)).toBe(true);
      streamingService.activeStreams = prev;
    });

    it('returns false when only the excluded stream has the name', () => {
      const prev = streamingService.activeStreams;
      streamingService.activeStreams = {
        id1: { id: 'id1', name: 'Stream A' }
      };
      expect(streamingService.streamNameExists('Stream A', 'id1')).toBe(false);
      streamingService.activeStreams = prev;
    });
  });
});

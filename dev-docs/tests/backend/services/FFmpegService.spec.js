import { describe, it, expect, beforeEach } from 'vitest';
import ffmpegService from '../../../src/services/FFmpegService';

describe('FFmpegService Singleton', () => {

  // Before each test, reset the state of the singleton for test isolation
  beforeEach(() => {
    ffmpegService.activeStreams = {};
  });

  it('should initialize with no active streams', () => {
    expect(ffmpegService.getActiveStreams()).toEqual({});
  });

  it('should start a stream and update its status', () => {
    const streamConfig = {
      id: 'french',
      deviceId: 'device-2',
      bitrate: '128k'
    };

    ffmpegService.startStream(streamConfig);
    const activeStreams = ffmpegService.getActiveStreams();

    expect(activeStreams).toHaveProperty('french');
    expect(activeStreams['french'].status).toBe('running');
    expect(activeStreams['french'].config).toEqual(streamConfig);
  });

  it('should stop a stream and remove it from active streams', () => {
    const streamConfig = { id: 'french', deviceId: 'device-2' };

    // Start a stream first
    ffmpegService.startStream(streamConfig);
    expect(ffmpegService.getActiveStreams()).toHaveProperty('french');

    // Then stop it
    ffmpegService.stopStream('french');
    expect(ffmpegService.getActiveStreams()).not.toHaveProperty('french');
  });

  it('should not throw an error when stopping a non-existent stream', () => {
    expect(() => ffmpegService.stopStream('nonexistent')).not.toThrow();
    expect(ffmpegService.getActiveStreams()).toEqual({});
  });
});
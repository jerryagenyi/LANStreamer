class FFmpegService {
  constructor() {
    this.activeStreams = {};
  }

  /**
   * Returns the current list of active streams.
   * @returns {Object} A dictionary of active streams.
   */
  getActiveStreams() {
    return this.activeStreams;
  }

  /**
   * Simulates starting an FFmpeg stream process.
   * @param {object} streamConfig - The configuration for the stream.
   */
  startStream(streamConfig) {
    if (!streamConfig || !streamConfig.id) {
      throw new Error('Invalid stream configuration.');
    }

    console.log(`Simulating start of stream: ${streamConfig.id}`);
    this.activeStreams[streamConfig.id] = {
      status: 'running',
      config: streamConfig,
      // In a real implementation, this would hold the child process object.
      process: null, 
    };
  }

  /**
   * Simulates stopping an FFmpeg stream process.
   * @param {string} streamId - The ID of the stream to stop.
   */
  stopStream(streamId) {
    if (this.activeStreams[streamId]) {
      console.log(`Simulating stop of stream: ${streamId}`);
      delete this.activeStreams[streamId];
    }
  }
}

export default new FFmpegService();
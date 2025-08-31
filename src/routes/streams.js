import express from 'express';
import streamingService from '../services/StreamingService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route POST /api/streams/start
 * @description Start a new FFmpeg stream.
 * @access Public
 */
router.post('/start', async (req, res) => {
  try {
    const streamConfig = req.body;
    const stream = await streamingService.startStream(streamConfig);
    res.status(200).json({ 
      message: 'Stream started successfully', 
      streamId: stream.id,
      stream: stream
    });
  } catch (error) {
    logger.error('Error starting stream:', error);
    res.status(500).json({ message: 'Error starting stream', error: error.message });
  }
});

/**
 * @route POST /api/streams/stop
 * @description Stop an active stream.
 * @access Public
 */
router.post('/stop', async (req, res) => {
  try {
    const { id } = req.body;
    await streamingService.stopStream(id);
    res.status(200).json({ message: 'Stream stopped successfully', streamId: id });
  } catch (error) {
    logger.error('Error stopping stream:', error);
    res.status(500).json({ message: 'Error stopping stream', error: error.message });
  }
});

/**
 * @route GET /api/streams/status
 * @description Get status of all active streams.
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const stats = streamingService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Error getting stream status:', error);
    res.status(500).json({ message: 'Error getting stream status', error: error.message });
  }
});

/**
 * @route POST /api/streams/stop-all
 * @description Stop all active streams.
 * @access Public
 */
router.post('/stop-all', async (req, res) => {
  try {
    await streamingService.stopAllStreams();
    res.status(200).json({ message: 'All streams stopped successfully' });
  } catch (error) {
    logger.error('Error stopping all streams:', error);
    res.status(500).json({ message: 'Error stopping all streams', error: error.message });
  }
});

export default router;
import express from 'express';
import express from 'express';
import ffmpegService from '../services/FFmpegService.js';

const router = express.Router();

/**
 * @route POST /api/streams/start
 * @description Start a new FFmpeg stream.
 * @access Public
 */
router.post('/start', (req, res) => {
  try {
    const streamConfig = req.body;
    ffmpegService.startStream(streamConfig);
    res.status(200).json({ message: 'Stream started successfully', streamId: streamConfig.id });
  } catch (error) {
    res.status(500).json({ message: 'Error starting stream', error: error.message });
  }
});

/**
 * @route POST /api/streams/stop
 * @description Stop an active FFmpeg stream.
 * @access Public
 */
router.post('/stop', (req, res) => {
  try {
    const { id } = req.body;
    ffmpegService.stopStream(id);
    res.status(200).json({ message: 'Stream stopped successfully', streamId: id });
  } catch (error) {
    res.status(500).json({ message: 'Error stopping stream', error: error.message });
  }
});

export default router;
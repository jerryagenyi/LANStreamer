import express from 'express';
import http from 'http';
import streamingService from '../services/StreamingService.js';
import IcecastService from '../services/IcecastService.js';
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
    logger.info('Received stream start request:', { streamConfig });
    
    const stream = await streamingService.startStream(streamConfig);
    logger.info('Stream started successfully:', { streamId: stream.id });
    
    res.status(200).json({ 
      message: 'Stream started successfully', 
      streamId: stream.id,
      stream: stream
    });
  } catch (error) {
    logger.error('Error starting stream:', { error: error.message, stack: error.stack });
    const payload = { message: 'Error starting stream', error: error.shortMessage || error.message };
    if (error.capacity) payload.capacity = error.capacity;
    res.status(500).json(payload);
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
 * @route POST /api/streams/stop-all
 * @description Stop all running streams.
 * @access Public
 */
router.post('/stop-all', async (req, res) => {
  try {
    const result = await streamingService.stopAllStreams();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error stopping all streams:', error);
    res.status(500).json({ message: 'Error stopping all streams', error: error.message });
  }
});

/**
 * @route POST /api/streams/start-all
 * @description Start all persisted (stopped or error) streams.
 * @access Public
 */
router.post('/start-all', async (req, res) => {
  try {
    const result = await streamingService.startAllStoppedStreams();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error starting all streams:', error);
    res.status(500).json({ message: 'Error starting all streams', error: error.message });
  }
});

/**
 * @route POST /api/streams/restart
 * @description Restart a stopped stream.
 * @access Public
 */
router.post('/restart', async (req, res) => {
  try {
    const { id } = req.body;
    logger.info('Received stream restart request:', { streamId: id });
    
    const result = await streamingService.restartStream(id);
    logger.info('Stream restarted successfully:', { streamId: id });
    
    res.status(200).json({ 
      message: 'Stream restarted successfully', 
      streamId: id,
      result: result
    });
  } catch (error) {
    logger.error('Error restarting stream:', { error: error.message, stack: error.stack });
    const payload = { message: 'Error restarting stream', error: error.shortMessage || error.message };
    if (error.capacity) payload.capacity = error.capacity;
    res.status(500).json(payload);
  }
});

/**
 * @route GET /api/streams/play/:streamId
 * @description Proxy Icecast stream for same-origin playback (avoids CORS and firewall on Icecast port).
 * When Icecast returns 4xx (e.g. 401/404 for no source), respond with 502 and a clear message so the
 * listener page does not show "Authentication Failed" (e.g. after device change mid-stream).
 * @access Public
 */
const PLAY_PROXY_TIMEOUT_MS = 10000;

router.get('/play/:streamId', (req, res) => {
  const { streamId } = req.params;
  const port = IcecastService.getActualPort() || 8000;
  const url = `http://127.0.0.1:${port}/${encodeURIComponent(streamId)}`;
  const clientRequest = http.get(url, { timeout: PLAY_PROXY_TIMEOUT_MS }, (upstream) => {
    const status = upstream.statusCode || 0;
    if (status !== 200) {
      try {
        upstream.resume();
      } catch (e) {
        logger.warn('Stream proxy: failed to consume upstream body', { streamId, error: e.message });
      }
      logger.warn('Stream proxy: Icecast returned non-200', { streamId, status });
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Stream not available',
          message: 'Stream is not running or mount not ready. Start the stream on the dashboard, then try Play again.'
        });
      }
      return;
    }
    const contentType = upstream.headers['content-type'] || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    upstream.pipe(res);
  });
  clientRequest.on('timeout', () => {
    clientRequest.destroy();
    if (!res.headersSent) {
      logger.warn('Stream proxy: timeout', { streamId });
      res.status(502).json({ error: 'Stream unavailable', message: 'Stream connection timed out.' });
    }
  });
  clientRequest.on('error', (err) => {
    logger.warn('Stream proxy error:', { streamId, message: err.message });
    if (!res.headersSent) {
      res.status(502).json({ error: 'Stream unavailable', message: err.message });
    }
  });
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
 * @route POST /api/streams/cleanup
 * @description Clean up old stopped/error streams from persistent storage.
 * @access Public
 */
router.post('/cleanup', (req, res) => {
  try {
    const maxAge = req.body.maxAge || 24 * 60 * 60 * 1000; // Default 24 hours
    const cleanedCount = streamingService.cleanupOldStreams(maxAge);
    res.status(200).json({
      message: 'Stream cleanup completed',
      cleanedCount: cleanedCount
    });
  } catch (error) {
    logger.error('Error cleaning up streams:', error);
    res.status(500).json({ message: 'Error cleaning up streams', error: error.message });
  }
});

/**
 * @route POST /api/streams/reorder
 * @description Set display order of streams (S1, S2, S3). Persists to config; affects dashboard and listener page.
 * @access Public
 */
router.post('/reorder', async (req, res) => {
  try {
    const { streamIds } = req.body;
    if (!Array.isArray(streamIds)) {
      return res.status(400).json({ message: 'streamIds must be an array' });
    }
    streamingService.setStreamOrder(streamIds);
    res.status(200).json({ message: 'Stream order updated', streamIds });
  } catch (error) {
    logger.error('Error reordering streams:', error);
    res.status(500).json({ message: 'Error reordering streams', error: error.message });
  }
});

/**
 * @route POST /api/streams/update
 * @description Update a stream's configuration.
 * @access Public
 */
router.post('/update', async (req, res) => {
  try {
    const { streamId, name, deviceId } = req.body;
    const result = await streamingService.updateStream(streamId, { name, deviceId });
    res.status(200).json({
      message: 'Stream updated successfully',
      oldStreamId: result.oldStreamId,
      newStreamId: result.newStreamId,
      streamId: result.newStreamId // For backward compatibility
    });
  } catch (error) {
    logger.error('Error updating stream:', error);
    res.status(500).json({ message: 'Error updating stream', error: error.message });
  }
});

/**
 * @route POST /api/streams/delete
 * @description Delete a stream (remove from persistent storage).
 * @access Public
 */
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    await streamingService.deleteStream(id);
    res.status(200).json({ message: 'Stream deleted successfully', streamId: id });
  } catch (error) {
    logger.error('Error deleting stream:', error);
    res.status(500).json({ message: 'Error deleting stream', error: error.message });
  }
});



export default router;
import express from 'express';
import audioDeviceService from '../services/AudioDeviceService.js';
import IcecastService from '../services/IcecastService.js';

const router = express.Router();

/**
 * @route GET /api/system/audio-devices
 * @description Get a list of available audio input devices.
 * @access Public
 */
router.get('/audio-devices', (req, res) => {
  try {
    const devices = audioDeviceService.getAudioDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving audio devices', error: error.message });
  }
});

/**
 * @route GET /api/system/icecast-status
 * @description Check Icecast server status
 * @access Public
 */
router.get('/icecast-status', async (req, res) => {
  try {
    const status = await IcecastService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking Icecast status:', error);
    res.status(500).json({ 
      error: 'Failed to check Icecast status',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/system/icecast/start
 * @description Start Icecast service
 * @access Public
 */
router.post('/icecast/start', async (req, res) => {
  try {
    await IcecastService.start();
    res.json({ message: 'Icecast started successfully' });
  } catch (error) {
    console.error('Error starting Icecast:', error);
    res.status(500).json({ 
      error: 'Failed to start Icecast',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/system/icecast/stop
 * @description Stop Icecast service
 * @access Public
 */
router.post('/icecast/stop', async (req, res) => {
  try {
    await IcecastService.stop();
    res.json({ message: 'Icecast stopped successfully' });
  } catch (error) {
    console.error('Error stopping Icecast:', error);
    res.status(500).json({ 
      error: 'Failed to stop Icecast',
      message: error.message 
    });
  }
});

export default router;
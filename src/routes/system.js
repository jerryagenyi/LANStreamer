import express from 'express';
import AudioDeviceService from '../services/AudioDeviceService.js';

const router = express.Router();
const audioDeviceService = new AudioDeviceService();

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

export default router;
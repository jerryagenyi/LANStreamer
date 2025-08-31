import express from 'express';
import audioDeviceService from '../services/AudioDeviceService.js';
import IcecastService from '../services/IcecastService.js';

const router = express.Router();
const icecastService = new IcecastService();

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
    const status = await icecastService.getStatus();
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
    await icecastService.start();
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
    await icecastService.stop();
    res.json({ message: 'Icecast stopped successfully' });
  } catch (error) {
    console.error('Error stopping Icecast:', error);
    res.status(500).json({ 
      error: 'Failed to stop Icecast',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/system/ffmpeg-check
 * @description Check if FFmpeg is installed
 * @access Public
 */
router.get('/ffmpeg-check', async (req, res) => {
  try {
    const { execSync } = await import('child_process');
    
    // Try to get FFmpeg version
    try {
      const output = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 5000 });
      const versionMatch = output.match(/ffmpeg version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      res.json({
        installed: true,
        version: version,
        path: 'ffmpeg'
      });
    } catch (cmdError) {
      res.json({
        installed: false,
        error: 'FFmpeg not found in PATH'
      });
    }
  } catch (error) {
    console.error('Error checking FFmpeg:', error);
    res.status(500).json({ 
      error: 'Failed to check FFmpeg installation',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/system/ffmpeg-processes
 * @description Check running FFmpeg processes
 * @access Public
 */
router.get('/ffmpeg-processes', async (req, res) => {
  try {
    const { execSync } = await import('child_process');
    
    try {
      let processes = [];
      
      // Different commands for different platforms
      if (process.platform === 'win32') {
        const output = execSync('tasklist /FI "IMAGENAME eq ffmpeg.exe" /FO CSV', { encoding: 'utf8' });
        const lines = output.split('\n').filter(line => line.includes('ffmpeg.exe'));
        processes = lines.map(line => ({ name: 'ffmpeg.exe', platform: 'windows' }));
      } else {
        const output = execSync('pgrep -f ffmpeg', { encoding: 'utf8' });
        const pids = output.trim().split('\n').filter(pid => pid);
        processes = pids.map(pid => ({ pid: parseInt(pid), name: 'ffmpeg', platform: 'unix' }));
      }
      
      res.json({
        running: processes.length > 0,
        processes: processes,
        count: processes.length
      });
    } catch (cmdError) {
      // No processes found
      res.json({
        running: false,
        processes: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('Error checking FFmpeg processes:', error);
    res.status(500).json({ 
      error: 'Failed to check FFmpeg processes',
      message: error.message 
    });
  }
});

export default router;
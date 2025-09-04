import express from 'express';
import audioDeviceService from '../services/AudioDeviceService.js';
import IcecastService from '../services/IcecastService.js';
import { ErrorHandler, errorMiddleware } from '../utils/errors.js';

const router = express.Router();
const icecastService = new IcecastService();

// Initialize the service
icecastService.initialize().catch(error => {
  console.error('Failed to initialize Icecast service:', error.message);
});

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
 * @route GET /api/system/icecast/search-installations
 * @description Search for Icecast installations on the system
 * @access Public
 */
router.get('/icecast/search-installations', async (req, res) => {
  try {
    const searchResults = await icecastService.searchForIcecastInstallations();
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching for Icecast installations:', error);
    res.status(500).json({ 
      error: 'Failed to search for Icecast installations',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/system/icecast/start
 * @description Start Icecast service
 * @access Public
 */
router.post('/icecast/start', async (req, res, next) => {
  try {
    const result = await icecastService.start();

    // Backend handles all validation and timing
    if (result.success) {
      // Wait and verify the server actually started
      await new Promise(resolve => setTimeout(resolve, 3000));
      const status = await icecastService.getStatus();

      if (status.running) {
        res.json({
          success: true,
          message: result.message || 'Icecast server started successfully',
          status: 'running',
          pid: result.pid,
          service: result.service
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Server started but is not responding',
          code: 'START_VERIFICATION_FAILED'
        });
      }
    } else {
      res.json(result);
    }
  } catch (error) {
    next(error); // Pass to error middleware
  }
});

/**
 * @route POST /api/system/icecast/stop
 * @description Stop Icecast service
 * @access Public
 */
router.post('/icecast/stop', async (req, res) => {
  try {
    const result = await icecastService.stop();
    res.json({ 
      success: true,
      message: 'Icecast stopped successfully',
      ...result
    });
  } catch (error) {
    console.error('Error stopping Icecast:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to stop Icecast',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/system/icecast/restart
 * @description Restart Icecast service
 * @access Public
 */
router.post('/icecast/restart', async (req, res) => {
  try {
    const result = await icecastService.restart();
    res.json({ 
      success: true,
      message: 'Icecast restarted successfully',
      ...result
    });
  } catch (error) {
    console.error('Error restarting Icecast:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to restart Icecast',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/system/icecast/detailed-status
 * @description Get detailed Icecast server status including mountpoints and configuration
 * @access Public
 */
router.get('/icecast/detailed-status', async (req, res) => {
  try {
    const status = await icecastService.getDetailedStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting detailed Icecast status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get detailed Icecast status',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/system/icecast/check-installation
 * @description Check if Icecast is properly installed and accessible
 * @access Public
 */
router.post('/icecast/check-installation', async (req, res) => {
  try {
    const installation = await icecastService.checkInstallation();
    res.json({
      success: true,
      ...installation
    });
  } catch (error) {
    console.error('Error checking Icecast installation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check Icecast installation',
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

/**
 * @route GET /api/system/icecast/validate-config
 * @description Validate Icecast configuration file
 * @access Public
 */
router.get('/icecast/validate-config', async (req, res) => {
  try {
    const validation = await icecastService.validateConfiguration();
    res.json({
      success: true,
      ...validation
    });
  } catch (error) {
    console.error('Error validating Icecast configuration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to validate Icecast configuration',
      message: error.message 
    });
  }
});

// Add error handling middleware
router.use(errorMiddleware);

export default router;
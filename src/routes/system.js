import express from 'express';
import audioDeviceService from '../services/AudioDeviceService.js';
import IcecastService from '../services/IcecastService.js';
// import { updateService } from '../services/UpdateService.js';
import { ErrorHandler, errorMiddleware } from '../utils/errors.js';

const router = express.Router();
const icecastService = IcecastService;

// Initialize the service
icecastService.initialize().catch(error => {
  console.error('Failed to initialize Icecast service:', error.message);
});

/**
 * @route GET /api/system/audio-devices
 * @description Get a list of available audio input devices.
 * @access Public
 */
router.get('/audio-devices', async (req, res) => {
  try {
    // Check if refresh is requested
    if (req.query.refresh === 'true') {
      audioDeviceService.clearCache();
    }
    
    const devices = await audioDeviceService.getAudioDevices();
    
    // Return in the format expected by the frontend
    res.json({
      success: true,
      devices: devices,
      count: devices.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving audio devices', 
      error: error.message 
    });
  }
});

/**
 * @route POST /api/system/audio-devices/refresh
 * @description Force refresh of audio device list (clears cache).
 * @access Public
 */
router.post('/audio-devices/refresh', async (req, res) => {
  try {
    audioDeviceService.clearCache();
    const devices = await audioDeviceService.getAudioDevices();
    res.json({ 
      success: true, 
      message: 'Audio devices refreshed', 
      devices,
      count: devices.length 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error refreshing audio devices', error: error.message });
  }
});

/**
 * @route POST /api/system/audio-devices/test
 * @description Test if a specific audio device is accessible.
 * @access Public
 */
router.post('/audio-devices/test', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }

    const isAccessible = await audioDeviceService.testDevice(deviceId);

    res.json({
      success: true,
      deviceId,
      accessible: isAccessible
    });
  } catch (error) {
    res.status(500).json({ message: 'Error testing audio device', error: error.message });
  }
});

/**
 * @route GET /api/system/audio-devices/diagnose
 * @description Diagnose audio device issues and provide detailed information.
 * @access Public
 */
router.get('/audio-devices/diagnose', async (req, res) => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {

    // Get raw FFmpeg device list
    const { stdout, stderr } = await execAsync('ffmpeg -list_devices true -f dshow -i dummy 2>&1');
    const ffmpegOutput = stderr || stdout;

    // Check for VB-Audio Virtual Cable specifically
    const hasVBCable = ffmpegOutput.includes('CABLE Output') || ffmpegOutput.includes('VB-Audio Virtual Cable');
    const hasVoiceMeeter = ffmpegOutput.includes('VB-Audio Voicemeeter');

    // Parse all audio devices
    const audioDevices = [];
    const lines = ffmpegOutput.split('\n');
    for (const line of lines) {
      const audioMatch = line.match(/\[dshow @ .*\] "([^"]+)" \(audio\)/);
      if (audioMatch) {
        audioDevices.push(audioMatch[1]);
      }
    }

    res.json({
      success: true,
      diagnosis: {
        vbAudioCableDetected: hasVBCable,
        voiceMeeterDetected: hasVoiceMeeter,
        totalAudioDevices: audioDevices.length,
        audioDevices: audioDevices,
        recommendations: hasVBCable ?
          ['VB-Audio Virtual Cable is detected and should work'] :
          [
            'VB-Audio Virtual Cable not detected',
            'Install VB-Audio Virtual Cable from vb-audio.com',
            'Make sure VB-Audio Virtual Cable is running',
            'Try using a physical microphone instead'
          ]
      },
      rawOutput: ffmpegOutput.slice(0, 2000) // First 2000 chars for debugging
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error diagnosing audio devices',
      error: error.message,
      suggestion: 'This might indicate FFmpeg is not installed or accessible'
    });
  }
});

/**
 * @route GET /api/system/config
 * @description Get system config for frontend (Icecast port, host). Used for building listener/copy URLs.
 * @access Public
 */
router.get('/config', async (req, res, next) => {
  try {
    await icecastService.ensureInitialized();
    const actualPort = icecastService.getActualPort() || 8000;
    const host = icecastService.getHostname() || 'localhost';
    res.json({
      icecast: {
        port: actualPort,
        host
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/system/icecast-status
 * @description Check Icecast server status
 * @access Public
 */
router.get('/icecast-status', async (req, res, next) => {
  try {
    const status = await icecastService.getStatus();
    res.json(status);
  } catch (error) {
    next(error); // Pass to error middleware
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
 * @route GET /api/system/icecast/browse-directories
 * @description Browse directories for Icecast installation selection
 * @access Public
 */
router.get('/icecast/browse-directories', async (req, res) => {
  try {
    const { path: browsePath } = req.query;
    const directories = await icecastService.browseDirectories(browsePath);
    res.json(directories);
  } catch (error) {
    console.error('Error browsing directories:', error);
    res.status(500).json({
      error: 'Failed to browse directories',
      message: error.message
    });
  }
});

/**
 * @route POST /api/system/icecast/browse-directories
 * @description Browse directories for Icecast installation
 * @access Public
 */
router.post('/icecast/browse-directories', async (req, res) => {
  try {
    const { path: browsePath } = req.body;
    const directories = await icecastService.browseDirectories(browsePath);
    res.json(directories);
  } catch (error) {
    console.error('Error browsing directories:', error);
    res.status(500).json({
      error: 'Failed to browse directories',
      message: error.message
    });
  }
});

/**
 * @route POST /api/system/icecast/validate-custom-path
 * @description Validate and save custom Icecast installation path
 * @access Public
 */
router.post('/icecast/validate-custom-path', async (req, res) => {
  try {
    const { path: customPath } = req.body;
    const validation = await icecastService.validateCustomPath(customPath);
    res.json(validation);
  } catch (error) {
    console.error('Error validating custom path:', error);
    res.status(500).json({
      error: 'Failed to validate custom path',
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
router.post('/icecast/stop', async (req, res, next) => {
  try {
    const result = await icecastService.stop();
    res.json(result);
  } catch (error) {
    next(error); // Pass to error middleware
  }
});

/**
 * @route POST /api/system/icecast/restart
 * @description Restart Icecast service
 * @access Public
 */
router.post('/icecast/restart', async (req, res, next) => {
  try {
    const result = await icecastService.restart();
    res.json(result);
  } catch (error) {
    next(error); // Pass to error middleware
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
 * @route GET /api/system/icecast/security-check
 * @description Check for security vulnerabilities in Icecast configuration
 * @access Public
 */
router.get('/icecast/security-check', async (req, res) => {
  try {
    const securityCheck = await icecastService.checkSecurityVulnerabilities();
    res.json(securityCheck);
  } catch (error) {
    console.error('Error checking Icecast security:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check Icecast security',
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

/**
 * @route GET /api/system/icecast/health
 * @description Get comprehensive Icecast health status
 * @access Public
 */
router.get('/icecast/health', async (req, res, next) => {
  try {
    const health = await icecastService.getHealthStatus();
    const statusCode = health.overall === 'healthy' ? 200 :
                      health.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: health.overall,
      timestamp: new Date().toISOString(),
      checks: health.checks,
      details: health.details
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/system/update-check
 * @description Check for LANStreamer updates
 * @access Public
 */
router.get('/update-check', async (req, res, next) => {
  try {
    const { updateService } = await import('../services/UpdateService.js');
    const updateInfo = await updateService.getUpdateInfo();

    // Ensure we return the current version for the frontend
    res.json({
      success: true,
      current: updateInfo.current || await updateService.getCurrentVersion(),
      ...updateInfo
    });
  } catch (error) {
    console.error('Update check error:', error);
    // Fallback response with just the current version
    try {
      const { updateService } = await import('../services/UpdateService.js');
      const currentVersion = await updateService.getCurrentVersion();
      res.json({
        success: true,
        current: currentVersion,
        latest: null,
        updateAvailable: false,
        error: error.message
      });
    } catch (fallbackError) {
      next(error);
    }
  }
});

/**
 * @route POST /api/system/update-check/force
 * @description Force check for updates (bypass cache)
 * @access Public
 */
router.post('/update-check/force', async (req, res, next) => {
  try {
    const { updateService } = await import('../services/UpdateService.js');
    const updateInfo = await updateService.checkForUpdates();
    res.json({
      success: true,
      ...updateInfo,
      forced: true
    });
  } catch (error) {
    next(error);
  }
});

// Add error handling middleware
router.use(errorMiddleware);

export default router;
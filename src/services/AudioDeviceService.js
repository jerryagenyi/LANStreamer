import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

class AudioDeviceService {
  constructor() {
    this.platform = os.platform();
    this.cachedDevices = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  /**
   * Retrieves a list of available audio input devices.
   * Uses cached results if available and not expired.
   * @returns {Array<{id: string, name: string, type: string}>} A list of audio devices.
   */
  async getAudioDevices() {
    // Return cached results if still valid
    if (this.cachedDevices && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      logger.audio('Returning cached audio devices', { count: this.cachedDevices.length });
      return this.cachedDevices;
    }

    // Detect fresh devices
    const devices = await this.detectDevices();
    
    // Cache the results
    this.cachedDevices = devices;
    this.cacheExpiry = Date.now() + this.cacheTimeout;
    
    return devices;
  }

  /**
   * Detects available audio input devices using FFmpeg.
   * @returns {Array<{id: string, name: string, type: string}>} A list of detected audio devices.
   */
  async detectDevices() {
    try {
      logger.audio('Starting audio device detection', { platform: this.platform });

      let devices = [];
      
      switch (this.platform) {
        case 'win32':
          devices = await this.detectWindowsDevices();
          break;
        case 'darwin':
          devices = await this.detectMacOSDevices();
          break;
        case 'linux':
          devices = await this.detectLinuxDevices();
          break;
        default:
          logger.audio('Unsupported platform for audio device detection', { platform: this.platform });
          return this.getFallbackDevices();
      }

      logger.audio('Audio device detection completed', { 
        platform: this.platform, 
        devicesFound: devices.length 
      });

      return devices;

    } catch (error) {
      logger.audio('Audio device detection failed', { 
        error: error.message, 
        platform: this.platform 
      });
      
      // Return fallback devices on error
      return this.getFallbackDevices();
    }
  }

  /**
   * Detects audio devices on Windows using DirectShow.
   * @returns {Array<{id: string, name: string, type: string}>} List of Windows audio devices.
   */
  async detectWindowsDevices() {
    try {
      const command = 'ffmpeg -list_devices true -f dshow -i dummy 2>&1';
      logger.audio('Executing FFmpeg command', { command });
      
      const { stdout, stderr } = await execAsync(command);
      
      // FFmpeg outputs device list to stdout when using 2>&1 redirection
      const output = stdout;
      logger.audio('FFmpeg command completed', { 
        stdoutLength: stdout.length, 
        stderrLength: stderr.length,
        hasOutput: output.length > 0,
        outputPreview: output.substring(0, 500) // First 500 chars for debugging
      });
      
      return this.parseWindowsDevices(output);
      
    } catch (error) {
      logger.audio('Windows device detection failed', { 
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      });
      throw error;
    }
  }

  /**
   * Detects audio devices on macOS using AVFoundation.
   * @returns {Array<{id: string, name: string, type: string}>} List of macOS audio devices.
   */
  async detectMacOSDevices() {
    try {
      const command = 'ffmpeg -f avfoundation -list_devices true -i "" 2>&1';
      const { stdout, stderr } = await execAsync(command);
      
      // FFmpeg outputs device list to stderr, not stdout
      const output = stderr;
      
      return this.parseMacOSDevices(output);
      
    } catch (error) {
      logger.audio('macOS device detection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Detects audio devices on Linux using ALSA.
   * @returns {Array<{id: string, name: string, type: string}>} List of Linux audio devices.
   */
  async detectLinuxDevices() {
    try {
      const command = 'ffmpeg -f alsa -list_devices true -i dummy 2>&1';
      const { stdout, stderr } = await execAsync(command);
      
      // FFmpeg outputs device list to stderr, not stdout
      const output = stderr;
      
      return this.parseLinuxDevices(output);
      
    } catch (error) {
      logger.audio('Linux device detection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Parses Windows DirectShow device output.
   * @param {string} output - FFmpeg stderr output
   * @returns {Array<{id: string, name: string, type: string}>} Parsed devices
   */
  parseWindowsDevices(output) {
    const devices = [];
    const lines = output.split('\n');
    
    logger.audio('Parsing Windows devices output', { outputLength: output.length, lineCount: lines.length });
    
    for (const line of lines) {
      // Look for DirectShow audio devices - updated regex to match actual FFmpeg output
      const match = line.match(/\[dshow @ .*\] "([^"]+)" \(audio\)/);
      if (match) {
        const deviceName = match[1];
        logger.audio('Found audio device', { deviceName });
        devices.push({
          id: this.sanitizeDeviceId(deviceName),
          name: deviceName,
          type: 'audio',
          platform: 'windows'
        });
      }
    }
    
    logger.audio('Windows device parsing complete', { devicesFound: devices.length });
    return devices;
  }

  /**
   * Parses macOS AVFoundation device output.
   * @param {string} output - FFmpeg stderr output
   * @returns {Array<{id: string, name: string, type: string}>} Parsed devices
   */
  parseMacOSDevices(output) {
    const devices = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for AVFoundation audio devices
      const match = line.match(/\[AVFoundation.*\] \[(\d+)\] "([^"]+)"/);
      if (match) {
        const deviceId = match[1];
        const deviceName = match[2];
        devices.push({
          id: deviceId,
          name: deviceName,
          type: 'audio',
          platform: 'macos'
        });
      }
    }
    
    return devices;
  }

  /**
   * Parses Linux ALSA device output.
   * @param {string} output - FFmpeg stderr output
   * @returns {Array<{id: string, name: string, type: string}>} Parsed devices
   */
  parseLinuxDevices(output) {
    const devices = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for ALSA audio devices
      const match = line.match(/\[alsa @ .*\] card (\d+): "([^"]+)"/);
      if (match) {
        const cardId = match[1];
        const deviceName = match[2];
        devices.push({
          id: `hw:${cardId}`,
          name: deviceName,
          type: 'audio',
          platform: 'linux'
        });
      }
    }
    
    return devices;
  }

  /**
   * Sanitizes device names to create valid IDs.
   * @param {string} deviceName - Raw device name
   * @returns {string} Sanitized device ID
   */
  sanitizeDeviceId(deviceName) {
    return deviceName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Returns fallback devices when detection fails.
   * @returns {Array<{id: string, name: string, type: string}>} Fallback devices
   */
  getFallbackDevices() {
    logger.audio('Using fallback audio devices');
    
    return [
      { 
        id: 'default-microphone', 
        name: 'Default Microphone', 
        type: 'audio',
        platform: this.platform,
        fallback: true
      },
      { 
        id: 'default-line-in', 
        name: 'Default Line In', 
        type: 'audio',
        platform: this.platform,
        fallback: true
      }
    ];
  }

  /**
   * Clears the device cache to force fresh detection.
   */
  clearCache() {
    this.cachedDevices = null;
    this.cacheExpiry = null;
    logger.audio('Audio device cache cleared');
  }

  /**
   * Tests if a specific audio device is accessible.
   * @param {string} deviceId - Device ID to test
   * @returns {boolean} True if device is accessible
   */
  async testDevice(deviceId) {
    try {
      const devices = await this.getAudioDevices();
      const device = devices.find(d => d.id === deviceId);
      
      if (!device) {
        return false;
      }

      // Test device accessibility with a short FFmpeg command
      let testCommand;
      
      switch (this.platform) {
        case 'win32':
          testCommand = `ffmpeg -f dshow -i audio="${device.name}" -f null - -t 1`;
          break;
        case 'darwin':
          testCommand = `ffmpeg -f avfoundation -i "${device.id}" -f null - -t 1`;
          break;
        case 'linux':
          testCommand = `ffmpeg -f alsa -i "${device.id}" -f null - -t 1`;
          break;
        default:
          return false;
      }

      await execAsync(testCommand);
      return true;
      
    } catch (error) {
      logger.audio('Device test failed', { deviceId, error: error.message });
      return false;
    }
  }
}

export default new AudioDeviceService();
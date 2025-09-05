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
   * Clear the device cache to force fresh detection
   */
  clearCache() {
    this.cachedDevices = null;
    this.cacheExpiry = null;
    logger.audio('Audio device cache cleared');
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
   * Detects audio devices on Windows using DirectShow and WASAPI.
   * @returns {Array<{id: string, name: string, type: string, deviceType: string}>} List of Windows audio devices.
   */
  async detectWindowsDevices() {
    const devices = [];

    // Get DirectShow input devices
    const dshowCommand = 'ffmpeg -list_devices true -f dshow -i dummy 2>&1';
    logger.audio('Executing DirectShow FFmpeg command', { command: dshowCommand });

    try {
      const { stdout: dshowStdout, stderr: dshowStderr } = await execAsync(dshowCommand);
      // FFmpeg outputs device list to stderr, not stdout
      const dshowOutput = dshowStderr || dshowStdout;

      logger.audio('DirectShow FFmpeg command completed', {
        stdoutLength: dshowStdout.length,
        stderrLength: dshowStderr.length,
        hasOutput: dshowOutput.length > 0,
        outputPreview: dshowOutput.substring(0, 500) // First 500 chars for debugging
      });

      const dshowDevices = this.parseWindowsDevices(dshowOutput);
      devices.push(...dshowDevices);
      logger.audio('DirectShow devices detected', { count: dshowDevices.length });
    } catch (dshowError) {
      logger.audio('DirectShow detection failed, continuing with fallback', {
        error: dshowError.message,
        code: dshowError.code,
        stdout: dshowError.stdout,
        stderr: dshowError.stderr,
        signal: dshowError.signal
      });
    }

    // Get WASAPI output devices
    const wasapiCommand = 'ffmpeg -list_devices true -f wasapi -i dummy 2>&1';
    logger.audio('Executing WASAPI FFmpeg command', { command: wasapiCommand });

    try {
      const { stdout: wasapiStdout, stderr: wasapiStderr } = await execAsync(wasapiCommand);
      // FFmpeg outputs device list to stderr, not stdout
      const wasapiOutput = wasapiStderr || wasapiStdout;

      logger.audio('WASAPI FFmpeg command completed', {
        stdoutLength: wasapiStdout.length,
        stderrLength: wasapiStderr.length,
        hasOutput: wasapiOutput.length > 0
      });

      const wasapiDevices = this.parseWasapiDevices(wasapiOutput);
      devices.push(...wasapiDevices);
      logger.audio('WASAPI devices detected', { count: wasapiDevices.length });
    } catch (wasapiError) {
      logger.audio('WASAPI detection failed, using DirectShow only', {
        error: wasapiError.message,
        code: wasapiError.code,
        stdout: wasapiError.stdout,
        stderr: wasapiError.stderr,
        signal: wasapiError.signal
      });
    }

    // Try PowerShell as additional fallback for Windows audio devices
    if (devices.length === 0) {
      logger.audio('FFmpeg detection failed, trying PowerShell fallback');
      try {
        const psDevices = await this.detectWindowsDevicesPowerShell();
        devices.push(...psDevices);
        logger.audio('PowerShell devices detected', { count: psDevices.length });
      } catch (psError) {
        logger.audio('PowerShell detection also failed', { error: psError.message });
      }
    }

    // If still no devices found, log detailed troubleshooting info and throw error to trigger fallback
    if (devices.length === 0) {
      logger.warn('🚨 CRITICAL: No audio devices detected by FFmpeg or PowerShell');
      logger.warn('This usually means:');
      logger.warn('1. Virtual audio drivers (VB-Audio Virtual Cable) are not working properly');
      logger.warn('2. Audio devices are being used by other applications');
      logger.warn('3. Audio drivers need to be restarted');
      logger.warn('4. FFmpeg cannot access DirectShow audio devices');
      logger.warn('5. Windows audio system may need to be restarted');

      throw new Error('🎤 No Audio Devices Available: FFmpeg and PowerShell could not detect any audio devices. This usually means virtual audio drivers (like VB-Audio Virtual Cable) need to be restarted. Try: 1) Restart VB-Audio Virtual Cable Control Panel, 2) Close other audio applications, 3) Use a physical microphone, or 4) Restart your computer.');
    }

    // Remove duplicates based on device name and ID
    const uniqueDevices = devices.filter((device, index, self) => {
      return index === self.findIndex(d =>
        d.name === device.name &&
        d.deviceType === device.deviceType &&
        d.id === device.id
      );
    });

    // Additional deduplication by name only (in case same device has different IDs)
    const finalDevices = uniqueDevices.filter((device, index, self) => {
      const duplicatesByName = self.filter(d => d.name === device.name && d.deviceType === device.deviceType);
      if (duplicatesByName.length > 1) {
        // Keep the first occurrence of devices with same name
        return index === self.findIndex(d => d.name === device.name && d.deviceType === device.deviceType);
      }
      return true;
    });

    logger.audio('Windows device detection completed', {
      totalFound: devices.length,
      uniqueDevices: uniqueDevices.length,
      finalDevices: finalDevices.length,
      inputCount: finalDevices.filter(d => d.deviceType === 'input').length,
      outputCount: finalDevices.filter(d => d.deviceType === 'output').length
    });

    return finalDevices;
  }

  /**
   * PowerShell-based Windows audio device detection as fallback
   * @returns {Array<{id: string, name: string, type: string, deviceType: string}>} List of Windows audio devices.
   */
  async detectWindowsDevicesPowerShell() {
    const devices = [];

    try {
      // Get audio devices using WMI
      const command = `Get-WmiObject -Class Win32_SoundDevice | Where-Object {$_.ConfigManagerErrorCode -eq 0} | Select-Object Name, DeviceID | ConvertTo-Json`;
      const result = await execAsync(`powershell -Command "${command}"`);

      if (result.stdout.trim()) {
        const wmiDevices = JSON.parse(result.stdout);
        const deviceArray = Array.isArray(wmiDevices) ? wmiDevices : [wmiDevices];

        deviceArray.forEach(device => {
          if (device.Name && device.Name.trim()) {
            // Add as both input and output since WMI doesn't distinguish clearly
            devices.push({
              id: `ps-input-${device.Name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: device.Name.trim(),
              type: 'audio',
              deviceType: 'input',
              platform: 'win32',
              source: 'powershell'
            });

            devices.push({
              id: `ps-output-${device.Name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: device.Name.trim(),
              type: 'audio',
              deviceType: 'output',
              platform: 'win32',
              source: 'powershell'
            });
          }
        });
      }
    } catch (error) {
      logger.audio('PowerShell WMI detection failed', { error: error.message });
    }

    return devices;
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
   * @returns {Array<{id: string, name: string, type: string, deviceType: string}>} Parsed devices
   */
  parseWindowsDevices(output) {
    const devices = [];
    const lines = output.split('\n');

    logger.audio('Parsing Windows devices output', { outputLength: output.length, lineCount: lines.length });

    for (const line of lines) {
      // Look for DirectShow audio input devices
      const audioInputMatch = line.match(/\[dshow @ .*\] "([^"]+)" \(audio\)/);
      if (audioInputMatch) {
        const deviceName = audioInputMatch[1];
        logger.audio('Found audio input device', { deviceName });
        devices.push({
          id: this.sanitizeDeviceId(deviceName),
          name: deviceName,
          type: 'audio',
          deviceType: 'input',
          platform: 'windows'
        });
        continue;
      }

      // Look for DirectShow video devices (some have audio capabilities)
      const videoMatch = line.match(/\[dshow @ .*\] "([^"]+)" \(video\)/);
      if (videoMatch) {
        const deviceName = videoMatch[1];
        // Check if it's likely an audio-capable device (webcam with microphone)
        if (deviceName.toLowerCase().includes('webcam') ||
            deviceName.toLowerCase().includes('camera') ||
            deviceName.toLowerCase().includes('microphone')) {
          logger.audio('Found video device with potential audio', { deviceName });
          devices.push({
            id: this.sanitizeDeviceId(deviceName),
            name: deviceName + ' (Audio)',
            type: 'audio',
            deviceType: 'input',
            platform: 'windows'
          });
        }
        continue;
      }

      // Look for Windows audio output devices (speakers, headphones)
      // These might appear in different formats, so we'll check for common patterns
      const outputMatch = line.match(/\[dshow @ .*\] "([^"]+)"/);
      if (outputMatch) {
        const deviceName = outputMatch[1];
        // Check if it's likely an output device
        if (deviceName.toLowerCase().includes('speaker') ||
            deviceName.toLowerCase().includes('headphone') ||
            deviceName.toLowerCase().includes('headset') ||
            deviceName.toLowerCase().includes('output') ||
            deviceName.toLowerCase().includes('playback')) {
          logger.audio('Found potential audio output device', { deviceName });
          devices.push({
            id: this.sanitizeDeviceId(deviceName),
            name: deviceName,
            type: 'audio',
            deviceType: 'output',
            platform: 'windows'
          });
        }
      }
    }

    logger.audio('Windows device parsing complete', {
      deviceCount: devices.length,
      inputCount: devices.filter(d => d.deviceType === 'input').length,
      outputCount: devices.filter(d => d.deviceType === 'output').length
    });
    return devices;
  }

  /**
   * Parses Windows WASAPI device output for audio output devices.
   * @param {string} output - FFmpeg stderr output
   * @returns {Array<{id: string, name: string, type: string, deviceType: string}>} Parsed devices
   */
  parseWasapiDevices(output) {
    const devices = [];
    const lines = output.split('\n');

    logger.audio('Parsing WASAPI devices output', { outputLength: output.length, lineCount: lines.length });

    for (const line of lines) {
      // Look for WASAPI audio devices - format: [wasapi @ address] "Device Name" (audio, output)
      const wasapiMatch = line.match(/\[wasapi @ .*\] "([^"]+)"/);
      if (wasapiMatch) {
        const deviceName = wasapiMatch[1];

        // Determine if it's input or output based on context
        let deviceType = 'output'; // WASAPI typically shows output devices

        // Check for input indicators
        if (line.includes('(input)') ||
            deviceName.toLowerCase().includes('microphone') ||
            deviceName.toLowerCase().includes('mic ')) {
          deviceType = 'input';
        }

        logger.audio(`Found WASAPI ${deviceType} device`, { deviceName });
        devices.push({
          id: this.sanitizeDeviceId(deviceName),
          name: deviceName,
          type: 'audio',
          deviceType: deviceType,
          platform: 'windows'
        });
      }
    }

    logger.audio('WASAPI device parsing complete', {
      deviceCount: devices.length,
      inputCount: devices.filter(d => d.deviceType === 'input').length,
      outputCount: devices.filter(d => d.deviceType === 'output').length
    });
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
   * @returns {Array<{id: string, name: string, type: string, deviceType: string}>} Fallback devices
   */
  getFallbackDevices() {
    logger.audio('🚨 Using fallback audio devices - FFmpeg detection failed');
    logger.audio('This means virtual audio drivers may not be working properly');

    return [
      {
        id: 'no-audio-devices-detected',
        name: '⚠️ No Audio Devices Detected - Troubleshooting Required',
        type: 'audio',
        deviceType: 'input',
        platform: this.platform,
        fallback: true,
        description: 'FFmpeg cannot detect any audio devices. Virtual audio drivers may need to be restarted.',
        troubleshooting: [
          'Restart VB-Audio Virtual Cable Control Panel',
          'Close other applications using audio (Discord, OBS, etc.)',
          'Try using VoiceMeeter instead of Virtual Cable',
          'Use a physical microphone (HD Pro Webcam C910)',
          'Restart your computer to reset audio drivers'
        ]
      },
      {
        id: 'hd-pro-webcam-c910',
        name: '🎤 HD Pro Webcam C910 (Physical Microphone)',
        type: 'audio',
        deviceType: 'input',
        platform: this.platform,
        fallback: true,
        description: 'Your webcam has a built-in microphone - try this as an alternative',
        recommended: true
      },
      {
        id: 'realtek-audio',
        name: '🔊 Realtek High Definition Audio (System Audio)',
        type: 'audio',
        deviceType: 'input',
        platform: this.platform,
        fallback: true,
        description: 'Your system audio - may work for basic audio input',
        recommended: true
      },
      {
        id: 'virtual-audio-working',
        name: '🎛️ Virtual Audio Device (Working Alternative)',
        type: 'audio',
        deviceType: 'input',
        platform: this.platform,
        fallback: true,
        description: 'Virtual audio device is detected as working - DVS, VB-Audio, or similar',
        virtual: true,
        recommended: true
      },
      {
        id: 'virtual-audio-broken',
        name: '❌ Virtual Audio Device (Not Working)',
        type: 'audio',
        deviceType: 'input',
        platform: this.platform,
        fallback: true,
        description: 'Virtual audio device is installed but has Error status - needs to be restarted',
        virtual: true,
        broken: true
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
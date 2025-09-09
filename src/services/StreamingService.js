import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import logger from '../utils/logger.js'
import FFmpegService from './FFmpegService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class StreamingService {
  constructor() {
    this.activeStreams = {}
    this.ffmpegService = FFmpegService
    this.streamsConfigPath = join(process.cwd(), 'config', 'streams.json')
    this.loadPersistentStreams()

    // Clean up old streams on startup
    this.cleanupOldStreams()

    // Set up periodic cleanup (every 6 hours)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldStreams()
    }, 6 * 60 * 60 * 1000)
  }

  /**
   * Load persistent streams from config file
   */
  loadPersistentStreams() {
    try {
      if (fs.existsSync(this.streamsConfigPath)) {
        const data = fs.readFileSync(this.streamsConfigPath, 'utf8')
        const persistentStreams = JSON.parse(data)
        
        // Convert persistent streams to active streams (without process references)
        Object.keys(persistentStreams).forEach(streamId => {
          const stream = persistentStreams[streamId]
          this.activeStreams[streamId] = {
            ...stream,
            status: 'stopped', // Mark as stopped since server restarted
            ffmpegProcess: null,
            needsRestart: true // Flag to indicate this stream needs to be restarted
          }
        })
        
        logger.info(`Loaded ${Object.keys(persistentStreams).length} persistent streams`)
      }
    } catch (error) {
      logger.error('Failed to load persistent streams:', error)
    }
  }

  /**
   * Save streams to persistent storage
   */
  savePersistentStreams() {
    try {
      // Ensure config directory exists
      const configDir = dirname(this.streamsConfigPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      // Save only the stream configuration (not process references)
      const persistentData = {}
      Object.keys(this.activeStreams).forEach(streamId => {
        const stream = this.activeStreams[streamId]
        persistentData[streamId] = {
          id: stream.id,
          deviceId: stream.deviceId,
          inputFile: stream.inputFile,
          name: stream.name,
          config: stream.config,
          createdAt: stream.createdAt || stream.startedAt
        }
      })

      fs.writeFileSync(this.streamsConfigPath, JSON.stringify(persistentData, null, 2))
      logger.info(`Saved ${Object.keys(persistentData).length} streams to persistent storage`)
    } catch (error) {
      logger.error('Failed to save persistent streams:', error)
    }
  }

  /**
   * Start a complete audio stream (FFmpeg + Icecast)
   * @param {object} streamConfig - Stream configuration
   * @returns {object} Stream information
   */
  async startStream(streamConfig) {
    if (!streamConfig || (!streamConfig.deviceId && !streamConfig.inputFile)) {
      throw new Error('Invalid stream configuration: deviceId or inputFile is required')
    }

    const streamId = streamConfig.id || `stream_${Date.now()}`

    if (this.activeStreams[streamId]) {
      throw new Error(`Stream ${streamId} is already running`)
    }

    // Check for device conflicts (multiple streams on same device)
    if (streamConfig.deviceId) {
      const conflictingStreams = Object.values(this.activeStreams).filter(stream =>
        stream.deviceId === streamConfig.deviceId &&
        stream.status === 'running'
      );

      if (conflictingStreams.length > 0) {
        const conflictNames = conflictingStreams.map(s => s.name).join(', ');
        throw new Error(`Device "${streamConfig.deviceId}" is already in use by: ${conflictNames}. Stop other streams first.`);
      }
    }

    const formats = this.getAudioFormats()
    let lastError = null

    // Try each format in succession
    for (let formatIndex = 0; formatIndex < formats.length; formatIndex++) {
      const currentFormat = formats[formatIndex]

      try {
        const inputSource = streamConfig.inputFile ? `file: ${streamConfig.inputFile}` : `device: ${streamConfig.deviceId}`
        logger.info(`Starting stream: ${streamId} for ${inputSource} using ${currentFormat.name} format (attempt ${formatIndex + 1}/${formats.length})`)

        // Start FFmpeg process with current format
        const ffmpegProcess = await this.startFFmpegProcess(streamId, streamConfig, formatIndex)

        // Store stream information
        this.activeStreams[streamId] = {
          id: streamId,
          deviceId: streamConfig.deviceId,
          inputFile: streamConfig.inputFile,
          name: streamConfig.name || `Stream ${streamId}`,
          status: 'running',
          ffmpegProcess: ffmpegProcess,
          startedAt: new Date(),
          createdAt: new Date(),
          config: streamConfig,
          audioFormat: currentFormat.name,
          formatIndex: formatIndex,
          needsRestart: false,
          intentionallyStopped: false  // Clear any previous intentional stop flag
        }

        // Save to persistent storage
        this.savePersistentStreams()

        logger.info(`Stream ${streamId} started successfully with ${currentFormat.name} format`)
        return this.activeStreams[streamId]

      } catch (error) {
        lastError = error
        logger.warn(`Failed to start stream ${streamId} with ${currentFormat.name} format (attempt ${formatIndex + 1}/${formats.length}):`, error.message)

        // If this isn't the last format, continue to next format
        if (formatIndex < formats.length - 1) {
          logger.info(`Trying next audio format for stream ${streamId}...`)
          continue
        }
      }
    }

    // If we get here, all formats failed
    logger.error(`Failed to start stream ${streamId} with all available formats:`, lastError)
    throw new Error(`Stream failed to start with all audio formats (MP3, AAC, OGG). Last error: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Start FFmpeg process for streaming with format fallback
   * @param {string} streamId - Stream ID
   * @param {object} streamConfig - Stream configuration
   * @param {number} formatIndex - Index of format to try (for fallback)
   * @returns {ChildProcess} FFmpeg process
   */
  async startFFmpegProcess(streamId, streamConfig, formatIndex = 0) {
    const ffmpegPath = this.findFFmpegPath()
    const formats = this.getAudioFormats()
    const currentFormat = formats[formatIndex] || formats[0]
    const args = this.buildFFmpegArgs(streamId, streamConfig, formatIndex)

    logger.info(`Starting FFmpeg process for stream ${streamId} (attempt ${formatIndex + 1}/${formats.length}) with ${currentFormat.name}:`, args)
    logger.info(`FFmpeg executable path: ${ffmpegPath}`)
    logger.info(`Full command: ${ffmpegPath} ${args.join(' ')}`)

    const process = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })

    // Capture stderr for debugging
    let stderrData = '';
    process.stderr.on('data', (data) => {
      if (data) {
        stderrData += data.toString();
        // Log FFmpeg output for debugging (but limit to avoid spam)
        if (stderrData.length < 2000) {
          logger.info(`FFmpeg stderr for stream ${streamId}:`, data.toString().trim());
        }
      }
    });

    // Handle process events
    process.on('error', (error) => {
      logger.error(`FFmpeg process error for stream ${streamId}:`, error)
      this.handleProcessError(streamId, error)
    })

    process.on('exit', (code, signal) => {
      logger.info(`FFmpeg process exited for stream ${streamId}: code=${code}, signal=${signal}`)

      // Log stderr output if process failed
      if (code !== 0 && stderrData) {
        logger.error(`FFmpeg stderr output for failed stream ${streamId}:`, stderrData.slice(0, 1000));
      }

      this.handleProcessExit(streamId, code, signal, stderrData)
    })

    // Wait a moment to ensure process starts successfully
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const errorMsg = `FFmpeg Startup Error: Process failed to start within 5 seconds.\n\nThis usually means:\n• The audio device is not available\n• Another application is using the device\n• The device name is incorrect\n\nFFmpeg Error Output:\n${stderrData.slice(0, 500)}\n\nTroubleshooting:\n• Try refreshing the device list\n• Close other applications using audio\n• Check if VB-Audio Virtual Cable is running`;
        reject(new Error(errorMsg))
      }, 5000)

      process.once('spawn', () => {
        clearTimeout(timeout)
        resolve()
      })

      process.once('error', (error) => {
        clearTimeout(timeout)
        const errorMsg = `FFmpeg Process Error: ${error.message}\n\nFFmpeg Output:\n${stderrData.slice(0, 500)}\n\nThis error suggests:\n• FFmpeg executable not found\n• Permission issues\n• System configuration problem`;
        reject(new Error(errorMsg))
      })
    })

    return process
  }

  /**
   * Get audio format configurations for fallback system
   * @returns {Array} Array of format configurations
   */
  getAudioFormats() {
    return [
      {
        name: 'MP3',
        codec: 'libmp3lame',
        format: 'mp3',
        contentType: 'audio/mpeg',
        description: 'MP3 - Universal browser support (BEST)'
      },
      {
        name: 'AAC',
        codec: 'aac',
        format: 'adts',
        contentType: 'audio/aac',
        description: 'AAC ADTS - Live streaming compatible'
      },
      {
        name: 'OGG',
        codec: 'libvorbis',
        format: 'ogg',
        contentType: 'audio/ogg',
        description: 'OGG Vorbis - Open source, Firefox/Chrome'
      }
    ];
  }

  /**
   * Build FFmpeg command line arguments for streaming
   * @param {string} streamId - Stream ID
   * @param {object} streamConfig - Stream configuration
   * @param {number} formatIndex - Index of format to try (for fallback)
   * @returns {Array} Command line arguments
   */
  buildFFmpegArgs(streamId, streamConfig, formatIndex = 0) {
    const bitrate = streamConfig.bitrate || 192;
    const icecastUrl = `icecast://source:hackme@localhost:8000/${streamId}`;
    const formats = this.getAudioFormats();
    const format = formats[formatIndex] || formats[0]; // Fallback to first format

    let args = []

    // Check if we're streaming from a file or device
    if (streamConfig.inputFile) {
      // File input mode
      args = [
        '-re',                          // Read input at native frame rate
        '-i', streamConfig.inputFile,   // Input file
        '-acodec', format.codec,        // Audio codec
        '-ab', `${bitrate}k`,           // Audio bitrate from config
        '-ar', '44100',                 // Sample rate
        '-ac', '2',                     // Audio channels
        '-f', format.format,            // Output format
        '-content_type', format.contentType, // Set proper content type for browsers
        icecastUrl,                     // Unique Icecast URL per stream
        '-loglevel', 'info'             // Show info level logs
      ]
    } else {
      // Device input mode - validate and use real device name
      const deviceName = this.validateAndGetDeviceName(streamConfig.deviceId);
      if (!deviceName) {
        // Check if this is a VB-Audio Virtual Cable issue
        if (streamConfig.deviceId.toLowerCase().includes('virtual-cable') || streamConfig.deviceId.toLowerCase().includes('cable')) {
          throw new Error(`VB-Audio Virtual Cable Error: The device "${streamConfig.deviceId}" is not working properly.\n\n🔧 QUICK FIXES:\n\n1. RESTART VB-AUDIO VIRTUAL CABLE:\n   • Open "VB-Audio Virtual Cable Control Panel"\n   • Or restart your computer\n\n2. CHECK DEVICE STATUS:\n   • Windows detected VB-Audio Virtual Cable but it has "Error" status\n   • This means the virtual audio driver needs to be restarted\n\n3. ALTERNATIVE SOLUTIONS:\n   • Use VoiceMeeter instead (VB-Audio Voicemeeter VAIO is working)\n   • Try a physical microphone like "HD Pro Webcam C910"\n   • Use "Realtek High Definition Audio" for system audio\n\n4. VERIFY INSTALLATION:\n   • Reinstall VB-Audio Virtual Cable from vb-audio.com\n   • Make sure you're running as Administrator\n\nTechnical: FFmpeg cannot detect any audio devices through DirectShow interface.`);
        } else {
          throw new Error(`Audio Device Error: The device "${streamConfig.deviceId}" is not available.\n\n🔧 TROUBLESHOOTING:\n\n1. DEVICE NOT FOUND:\n   • The selected audio device is not detected by FFmpeg\n   • This usually means the device is disconnected or not working\n\n2. SOLUTIONS:\n   • Click "Refresh Devices" to update the device list\n   • Try selecting a different audio device\n   • Check if the device is being used by another application\n   • Restart the audio device or your computer\n\n3. AVAILABLE ALTERNATIVES:\n   • HD Pro Webcam C910 (has built-in microphone)\n   • Realtek High Definition Audio (system audio)\n   • VB-Audio Voicemeeter VAIO (virtual audio mixer)\n\nTechnical: Device ID "${streamConfig.deviceId}" could not be mapped to a DirectShow device name.`);
        }
      }

      // Check if this is a virtual audio device (like Voicemeeter)
      const isVirtualDevice = deviceName.toLowerCase().includes('voicemeeter') ||
                             deviceName.toLowerCase().includes('vb-audio') ||
                             deviceName.toLowerCase().includes('virtual') ||
                             deviceName.toLowerCase().includes('cable');

      args = [
        '-f', 'dshow',                    // DirectShow input format
        '-i', `audio=${deviceName}`,      // Audio input device (real DirectShow name)
      ];

      // Add virtual device specific parameters
      if (isVirtualDevice) {
        args.push(
          '-rtbufsize', '100M',           // Increase buffer for virtual devices
          '-thread_queue_size', '512'     // Increase thread queue for stability
        );
      }

      args.push(
        '-acodec', format.codec,          // Audio codec (with fallback support)
        '-ab', `${bitrate}k`,             // Audio bitrate from config
        '-ar', '44100',                   // Sample rate
        '-ac', '2',                       // Audio channels
        '-f', format.format,              // Output format (with fallback support)
        '-content_type', format.contentType, // Set proper content type for browsers
        icecastUrl,                       // Unique Icecast URL per stream
        '-loglevel', 'info'               // Show info level logs
      )
    }

    logger.info(`Built FFmpeg args for stream ${streamId}:`, {
      streamId,
      audioFormat: format.name,
      codec: format.codec,
      formatDescription: format.description,
      bitrate: `${bitrate}k`,
      icecastUrl,
      inputType: streamConfig.inputFile ? 'file' : 'device',
      inputSource: streamConfig.inputFile || streamConfig.deviceId,
      actualDeviceName: streamConfig.inputFile ? null : this.validateAndGetDeviceName(streamConfig.deviceId),
      fullArgs: args
    });

    // Also log the exact command that would be executed
    logger.info(`Full FFmpeg command for stream ${streamId} (${format.name}): ffmpeg ${args.join(' ')}`);

    return args
  }

  /**
   * Validate device ID and return the actual DirectShow device name
   * @param {string} deviceId - Device ID from the frontend
   * @returns {string|null} Real DirectShow device name or null if not found
   */
  validateAndGetDeviceName(deviceId) {
    // Map of common device IDs to actual DirectShow names
    const deviceMap = {
      'microphone-hd-pro-webcam-c910': 'Microphone (HD Pro Webcam C910)',
      'logitech-hd-pro-webcam-c910': 'Microphone (HD Pro Webcam C910)',
      'headset-microphone-oculus': 'Headset Microphone (Oculus Virtual Audio Device)',
      'oculus-virtual-audio-device': 'Headset Microphone (Oculus Virtual Audio Device)',
      'microphone-virtual-desktop-audio': 'Microphone (Virtual Desktop Audio)',
      'virtual-desktop-audio': 'Microphone (Virtual Desktop Audio)',
      'default-microphone': 'Microphone (HD Pro Webcam C910)', // Default to first available
      'ps-output-hd-pro-webcam-c910': 'Microphone (HD Pro Webcam C910)', // Fix for previous naming
      'immersed-webcam': 'Microphone (Immersed Webcam)', // Add missing device
      'microphone-immersed-webcam': 'Microphone (Immersed Webcam)', // Alternative naming
      'immersed-virtual-audio': 'Microphone (Immersed Virtual Audio)', // Immersed audio device
      'webcam-microphone': 'Microphone (Webcam)', // Generic webcam microphone
      'usb-microphone': 'Microphone (USB Audio Device)', // Generic USB microphone
      'realtek-audio': 'Microphone (Realtek Audio)', // Realtek audio devices
      'bluetooth-microphone': 'Microphone (Bluetooth Audio)', // Bluetooth devices
      'amd-streaming-audio-device': 'AMD Streaming Audio Device', // AMD audio devices
      'ps-input-amd-streaming-audio-device': 'AMD Streaming Audio Device', // AMD audio devices (alternative naming)
      'amd-audio': 'AMD Streaming Audio Device', // AMD audio devices (short name)
      'amd-microphone': 'AMD Streaming Audio Device', // AMD audio devices (microphone variant)
      'vb-audio-voicemeeter-vaio': 'VB-Audio Voicemeeter VAIO', // Voicemeeter VAIO
      'ps-input-vb-audio-voicemeeter-vaio': 'VB-Audio Voicemeeter VAIO', // Voicemeeter VAIO (alternative naming)
      'voicemeeter-vaio': 'VB-Audio Voicemeeter VAIO', // Voicemeeter VAIO (short name)
      'vb-audio-voicemeeter-aux': 'VB-Audio Voicemeeter AUX', // Voicemeeter AUX
      'ps-input-vb-audio-voicemeeter-aux': 'VB-Audio Voicemeeter AUX', // Voicemeeter AUX (alternative naming)
      'voicemeeter-aux': 'VB-Audio Voicemeeter AUX', // Voicemeeter AUX (short name)
      'vb-audio-voicemeeter-vb': 'VB-Audio Voicemeeter VB', // Voicemeeter VB
      'ps-input-vb-audio-voicemeeter-vb': 'VB-Audio Voicemeeter VB', // Voicemeeter VB (alternative naming)
      'voicemeeter-vb': 'VB-Audio Voicemeeter VB', // Voicemeeter VB (short name)
      'vb-audio-virtual-cable': 'CABLE Output (VB-Audio Virtual Cable)', // VB-Audio Virtual Cable
      'ps-input-vb-audio-virtual-cable': 'CABLE Output (VB-Audio Virtual Cable)', // VB-Audio Virtual Cable (alternative naming)
      'cable-output': 'CABLE Output (VB-Audio Virtual Cable)', // VB-Audio Virtual Cable (short name)
      'virtual-cable': 'CABLE Output (VB-Audio Virtual Cable)', // VB-Audio Virtual Cable (generic name)
    };

    // First try direct mapping
    if (deviceMap[deviceId]) {
      logger.info(`Mapped device ID "${deviceId}" to DirectShow name "${deviceMap[deviceId]}"`);
      return deviceMap[deviceId];
    }

    // If no mapping found, try to use the deviceId as-is if it looks like a real device name
    if (deviceId.includes('(') && deviceId.includes(')')) {
      logger.info(`Using device ID "${deviceId}" as DirectShow name (appears to be real device name)`);
      return deviceId;
    }

    // Special handling for AMD devices - try common variations
    if (deviceId.toLowerCase().includes('amd')) {
      const amdVariations = [
        'AMD Streaming Audio Device',
        'Microphone (AMD Streaming Audio Device)',
        'AMD Audio Device',
        'Microphone (AMD Audio Device)',
        'AMD High Definition Audio Device',
        'Microphone (AMD High Definition Audio Device)'
      ];

      logger.info(`AMD device detected, trying variations: ${amdVariations.join(', ')}`);

      // For now, return the most common AMD device name
      // TODO: Implement dynamic device detection in future version
      return 'AMD Streaming Audio Device';
    }

    // Special handling for VB-Audio devices (Voicemeeter and Virtual Cable)
    if (deviceId.toLowerCase().includes('voicemeeter') || deviceId.toLowerCase().includes('vb-audio')) {
      if (deviceId.toLowerCase().includes('virtual-cable') || deviceId.toLowerCase().includes('cable')) {
        // VB-Audio Virtual Cable
        const cableVariations = [
          'CABLE Output (VB-Audio Virtual Cable)',
          'CABLE Input (VB-Audio Virtual Cable)',
          'VB-Audio Virtual Cable'
        ];

        logger.info(`VB-Audio Virtual Cable detected, will try variations: ${cableVariations.join(', ')}`);
        return cableVariations[0];
      } else {
        // VoiceMeeter devices
        const voicemeeterVariations = [
          'VB-Audio Voicemeeter VAIO',
          'VB-Audio Voicemeeter AUX',
          'VB-Audio Voicemeeter VB',
          'Microphone (VB-Audio Voicemeeter VAIO)',
          'Microphone (VB-Audio Voicemeeter AUX)',
          'Microphone (VB-Audio Voicemeeter VB)'
        ];

        logger.info(`Voicemeeter device detected, will try variations: ${voicemeeterVariations.join(', ')}`);
        return voicemeeterVariations[0];
      }
    }

    // Try to create a reasonable DirectShow name from the device ID
    if (deviceId && typeof deviceId === 'string' && deviceId.length > 0) {
      // Convert kebab-case to title case and wrap in Microphone()
      const titleCase = deviceId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const directShowName = `Microphone (${titleCase})`;
      logger.info(`Generated DirectShow name "${directShowName}" from device ID "${deviceId}"`);
      return directShowName;
    }

    // Log detailed warning for unmapped device
    logger.warn(`DEVICE MAPPING MISSING: No mapping found for device ID: "${deviceId}"`);
    logger.warn(`Available device mappings:`, Object.keys(deviceMap));
    logger.warn(`Device ID "${deviceId}" needs to be added to the device mapping table in StreamingService.js`);
    return null;
  }

  /**
   * Stop a running stream
   * @param {string} streamId - Stream ID to stop
   */
  async stopStream(streamId) {
    const stream = this.activeStreams[streamId]
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`)
    }

    try {
      logger.info(`Stopping stream: ${streamId}`)
      
      if (stream.ffmpegProcess) {
        // Kill the FFmpeg process gracefully
        stream.ffmpegProcess.kill('SIGTERM')
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (stream.ffmpegProcess && !stream.ffmpegProcess.killed) {
            logger.warn(`Force killing FFmpeg process for stream ${streamId}`)
            stream.ffmpegProcess.kill('SIGKILL')
          }
        }, 5000)
      }

      // Mark as intentionally stopped to prevent handleProcessExit from marking it as error
      stream.intentionallyStopped = true

      // Update stream status instead of deleting
      stream.status = 'stopped'
      stream.stoppedAt = new Date()
      stream.needsRestart = true
      stream.ffmpegProcess = null

      // Save to persistent storage
      this.savePersistentStreams()
      
      logger.info(`Stream ${streamId} stopped successfully`)
      
    } catch (error) {
      logger.error(`Failed to stop stream ${streamId}:`, error)
      throw error
    }
  }

  /**
   * Restart a stopped stream
   * @param {string} streamId - Stream ID to restart
   * @returns {object} Result of the operation
   */
  async restartStream(streamId) {
    const stream = this.activeStreams[streamId]
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`)
    }

    try {
      logger.info(`Restarting stream: ${streamId}`)

      // Check for device conflicts before restarting
      if (stream.config.deviceId) {
        const conflictingStreams = Object.values(this.activeStreams).filter(s =>
          s.deviceId === stream.config.deviceId &&
          s.status === 'running' &&
          s.id !== streamId
        );

        if (conflictingStreams.length > 0) {
          const conflictNames = conflictingStreams.map(s => s.name).join(', ');
          throw new Error(`Device "${stream.config.deviceId}" is already in use by: ${conflictNames}. Stop other streams first.`);
        }

        // Validate device is still available
        const deviceName = this.validateAndGetDeviceName(stream.config.deviceId);
        if (!deviceName) {
          logger.warn(`Device validation failed for ${stream.config.deviceId}, trying fallback approaches...`);

          // For AMD devices, provide specific guidance
          if (stream.config.deviceId.toLowerCase().includes('amd')) {
            throw new Error(`AMD Streaming Audio Device not found. This device may be in use by another application or disconnected. Please:\n1. Close other applications using the microphone\n2. Refresh the device list\n3. Try selecting a different audio device`);
          }

          // For Voicemeeter devices, provide specific guidance
          if (stream.config.deviceId.toLowerCase().includes('voicemeeter') ||
              stream.config.deviceId.toLowerCase().includes('vb-audio')) {
            throw new Error(`Voicemeeter virtual audio device not found. Please:\n1. Ensure Voicemeeter is running and configured\n2. Check that the virtual audio cable is active\n3. Restart Voicemeeter if needed\n4. Refresh the device list`);
          }

          // For other devices, provide general guidance
          throw new Error(`Audio device "${stream.config.deviceId}" not found or unavailable. Please:\n1. Check if the device is connected\n2. Refresh the device list\n3. Ensure no other applications are using the device`);
        }
      }

      // Start FFmpeg process
      const ffmpegProcess = await this.startFFmpegProcess(streamId, stream.config)

      // Update stream information
      stream.status = 'running'
      stream.ffmpegProcess = ffmpegProcess
      stream.startedAt = new Date()
      stream.needsRestart = false

      // Save to persistent storage
      this.savePersistentStreams()

      logger.info(`Stream ${streamId} restarted successfully`)
      return { success: true, message: 'Stream restarted successfully' }
      
    } catch (error) {
      logger.error(`Failed to restart stream ${streamId}:`, error)
      throw error
    }
  }

  /**
   * Update a stream's configuration
   * @param {string} streamId - Stream ID to update
   * @param {object} updates - Updates to apply (name, deviceId, etc.)
   * @returns {object} Updated stream information including new ID if name changed
   */
  async updateStream(streamId, updates) {
    logger.info(`Updating stream: ${streamId}`, { updates })

    const stream = this.activeStreams[streamId]
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`)
    }

    logger.info(`Current stream data:`, {
      id: stream.id,
      name: stream.name,
      deviceId: stream.deviceId
    })

    const prevDeviceId = stream.deviceId
    const prevName = stream.name
    let newStreamId = streamId

    // If name is changing, generate a new stream ID
    if (updates.name !== undefined && updates.name !== prevName) {
      // Generate clean stream ID from new name (same logic as creating new stream)
      const cleanId = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 20); // Limit length

      newStreamId = `${cleanId}_${Date.now()}`

      // If stream is running, we need to stop it first
      if (stream.status === 'running' && stream.ffmpegProcess) {
        logger.info(`Stopping running stream ${streamId} to update with new ID ${newStreamId}`)
        try {
          stream.ffmpegProcess.kill('SIGTERM')
          stream.intentionallyStopped = true
        } catch (e) { /* ignore */ }
      }

      // Create new stream entry with new ID
      this.activeStreams[newStreamId] = {
        ...stream,
        id: newStreamId,
        name: updates.name,
        config: { ...stream.config, name: updates.name }
      }

      // Remove old stream entry
      delete this.activeStreams[streamId]

      logger.info(`Stream ID updated from ${streamId} to ${newStreamId}`)
    }

    // Get the stream reference (might be new ID now)
    const currentStream = this.activeStreams[newStreamId]

    // Update stream properties
    if (updates.name !== undefined) {
      currentStream.name = updates.name
      currentStream.config.name = updates.name
    }

    if (updates.deviceId !== undefined) {
      currentStream.deviceId = updates.deviceId
      currentStream.config.deviceId = updates.deviceId
    }

    // UX: If device changed OR stream was in error OR name changed, reset to a clean stopped state
    const deviceChanged = updates.deviceId !== undefined && updates.deviceId !== prevDeviceId
    const nameChanged = updates.name !== undefined && updates.name !== prevName

    if (deviceChanged || currentStream.status === 'error' || nameChanged) {
      logger.info(`Resetting stream state after update (deviceChanged=${deviceChanged}, nameChanged=${nameChanged}, previousStatus=${currentStream.status})`)
      // Ensure any running process is cleared
      if (currentStream.ffmpegProcess && typeof currentStream.ffmpegProcess.kill === 'function') {
        try { currentStream.ffmpegProcess.kill('SIGTERM') } catch (e) { /* ignore */ }
      }
      currentStream.ffmpegProcess = null
      currentStream.status = 'stopped'
      currentStream.error = undefined
      currentStream.exitCode = undefined
      currentStream.exitSignal = undefined
      currentStream.exitedAt = undefined
      currentStream.startedAt = undefined
      currentStream.needsRestart = true
      currentStream.intentionallyStopped = true
    }

    // Save to persistent storage
    this.savePersistentStreams()

    logger.info(`Stream updated successfully. New ID: ${newStreamId}`)
    logger.info(`Updated stream data:`, {
      id: currentStream.id,
      name: currentStream.name,
      deviceId: currentStream.deviceId,
      config: currentStream.config
    })

    return {
      oldStreamId: streamId,
      newStreamId: newStreamId,
      stream: currentStream
    }
  }

  /**
   * Delete a stream (remove from persistent storage)
   * @param {string} streamId - Stream ID to delete
   */
  async deleteStream(streamId) {
    logger.info(`Deleting stream: ${streamId}`)

    const stream = this.activeStreams[streamId]
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`)
    }

    // Stop the stream first if it's running
    if (stream.status === 'running') {
      await this.stopStream(streamId)
    }

    // Remove from active streams
    delete this.activeStreams[streamId]

    // Save to persistent storage (without the deleted stream)
    this.savePersistentStreams()

    logger.info(`Stream ${streamId} deleted successfully`)
  }

  /**
   * Clean up old stopped/error streams from persistent storage
   * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
   */
  cleanupOldStreams(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now()
    let cleanedCount = 0

    Object.keys(this.activeStreams).forEach(streamId => {
      const stream = this.activeStreams[streamId]

      // Only clean up stopped or error streams
      if (stream.status === 'stopped' || stream.status === 'error') {
        const streamAge = stream.stoppedAt ? now - new Date(stream.stoppedAt).getTime() :
                         stream.exitedAt ? now - new Date(stream.exitedAt).getTime() :
                         now - new Date(stream.createdAt).getTime()

        if (streamAge > maxAge) {
          logger.info(`Cleaning up old ${stream.status} stream: ${streamId} (age: ${Math.round(streamAge / (60 * 60 * 1000))}h)`)
          delete this.activeStreams[streamId]
          cleanedCount++
        }
      }
    })

    if (cleanedCount > 0) {
      this.savePersistentStreams()
      logger.info(`Cleaned up ${cleanedCount} old streams`)
    }

    return cleanedCount
  }

  /**
   * Get stream status
   * @param {string} streamId - Stream ID
   * @returns {object|null} Stream status
   */
  getStreamStatus(streamId) {
    return this.activeStreams[streamId] || null
  }

  /**
   * Get all active streams
   * @returns {object} Active streams
   */
  getActiveStreams() {
    return this.activeStreams
  }

  /**
   * Stop all running streams
   * @returns {object} Result of the operation
   */
  async stopAllStreams() {
    const runningStreams = Object.values(this.activeStreams).filter(stream =>
      stream.status === 'running'
    );

    if (runningStreams.length === 0) {
      return { success: true, message: 'No running streams to stop', stopped: 0 };
    }

    const results = [];
    for (const stream of runningStreams) {
      try {
        await this.stopStream(stream.id);
        results.push({ id: stream.id, name: stream.name, success: true });
      } catch (error) {
        results.push({ id: stream.id, name: stream.name, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info(`Stopped ${successCount} streams, ${failureCount} failed`);

    return {
      success: failureCount === 0,
      message: `Stopped ${successCount} streams${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      stopped: successCount,
      failed: failureCount,
      results
    };
  }

  /**
   * Handle FFmpeg process errors
   * @param {string} streamId - Stream ID
   * @param {Error} error - Error object
   */
  handleProcessError(streamId, error) {
    logger.error(`FFmpeg process error for stream ${streamId}:`, error)
    
    if (this.activeStreams[streamId]) {
      this.activeStreams[streamId].status = 'error'
      this.activeStreams[streamId].error = error.message
    }
  }

  /**
   * Handle FFmpeg process exit
   * @param {string} streamId - Stream ID
   * @param {number} code - Exit code
   * @param {string} signal - Exit signal
   * @param {string} stderrData - FFmpeg stderr output
   */
  handleProcessExit(streamId, code, signal, stderrData = '') {
    logger.info(`FFmpeg process exited for stream ${streamId}: code=${code}, signal=${signal}`)

    if (this.activeStreams[streamId]) {
      const stream = this.activeStreams[streamId]

      // If stream was intentionally stopped, keep the 'stopped' status
      // Otherwise, determine status based on exit code
      if (!stream.intentionallyStopped) {
        stream.status = code === 0 ? 'stopped' : 'error'
      }

      stream.exitedAt = new Date()
      stream.exitCode = code
      stream.exitSignal = signal

      // Store error information if process failed
      if (code !== 0) {
        // Ensure stderrData is a string to prevent null/undefined errors
        const safeStderrData = stderrData || ''
        this.activeStreams[streamId].error = this.parseFFmpegError(code, safeStderrData)
        logger.error(`Stream ${streamId} failed with exit code ${code}:`, this.activeStreams[streamId].error)
      }
    }
  }

  /**
   * Parse FFmpeg error from exit code and stderr
   * @param {number} exitCode - FFmpeg exit code
   * @param {string} stderrData - FFmpeg stderr output
   * @returns {string} Human-readable error message
   */
  parseFFmpegError(exitCode, stderrData) {
    // Convert unsigned 32-bit to signed for Windows
    const signedCode = exitCode > 2147483647 ? exitCode - 4294967296 : exitCode;

    // Analyze stderr for specific error patterns
    const safeStderrData = stderrData || '';
    const stderrLower = safeStderrData.toLowerCase();

    // Device-specific error detection
    if (stderrLower.includes('device not found') || stderrLower.includes('no such device')) {
      return '🎤 Audio device not found - Device may have been disconnected or is no longer available';
    }

    if (stderrLower.includes('device busy') || stderrLower.includes('resource busy')) {
      return '🔒 Audio device busy - Another application is using this device';
    }

    if (stderrLower.includes('permission denied') || stderrLower.includes('access denied')) {
      return '🚫 Permission denied - Cannot access audio device (check permissions)';
    }

    if (stderrLower.includes('voicemeeter') && (stderrLower.includes('not found') || stderrLower.includes('unavailable'))) {
      return '🎛️ VoiceMeeter device unavailable - VoiceMeeter devices often disappear/reappear. Try: 1) Restart VoiceMeeter app 2) Restart Windows Audio service 3) Check if VoiceMeeter is running';
    }

    if (stderrLower.includes('vb-audio') && (stderrLower.includes('not found') || stderrLower.includes('unavailable'))) {
      return '🔗 VB-Audio device unavailable - Virtual audio devices can be unstable. Try restarting the VB-Audio Control Panel or use a physical microphone';
    }

    if (stderrLower.includes('connection refused') || stderrLower.includes('connection failed')) {
      return '🌐 Cannot connect to Icecast server - Check if Icecast is running';
    }

    if (stderrLower.includes('invalid sample rate') || stderrLower.includes('unsupported sample rate')) {
      return '📊 Invalid audio format - Device sample rate not supported';
    }

    // Common FFmpeg error codes with enhanced messages
    const errorMessages = {
      '-5': '🚫 Permission denied - Cannot access audio device (may be in use by another app)',
      '-22': '⚙️ Invalid device settings - Audio device name or parameters are incorrect',
      '-2': '🎤 Audio device not found - Device may have been disconnected',
      '1': '❌ Stream startup failed - Check device availability and try again'
    };

    let errorMsg = errorMessages[signedCode.toString()] || `FFmpeg exited with code ${exitCode} (${signedCode})`;

    // Ensure stderrData is a string and add specific error details from stderr

    if (safeStderrData) {
      if (safeStderrData.includes('No such audio device') || safeStderrData.includes('Could not find audio only device')) {
        errorMsg = 'Audio device not found. The selected microphone may be disconnected or in use by another application.';
      } else if (safeStderrData.includes('Permission denied')) {
        errorMsg = 'Permission denied accessing audio device. Close other applications using the microphone.';
      } else if (safeStderrData.includes('Device or resource busy')) {
        errorMsg = 'Audio device is busy. Another application may be using it.';
      } else if (safeStderrData.includes('among source devices of type audio')) {
        errorMsg = 'Audio device not recognized by DirectShow. Please check device name and ensure it\'s properly connected.';
      }

      // If we have stderr data but no specific match, include a snippet for debugging
      if (errorMsg === (errorMessages[signedCode.toString()] || `FFmpeg exited with code ${exitCode} (${signedCode})`)) {
        const stderrSnippet = safeStderrData.slice(0, 200).replace(/\n/g, ' ').trim();
        if (stderrSnippet) {
          errorMsg += ` Details: ${stderrSnippet}`;
        }
      }
    }

    return errorMsg;
  }

  /**
   * Find FFmpeg executable path
   * @returns {string} Path to FFmpeg
   */
  findFFmpegPath() {
    // Check if FFmpeg is in PATH
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' })
      return 'ffmpeg'
    } catch (error) {
      // Check for bundled FFmpeg in the project
      const bundledPath = join(__dirname, '../../bin/ffmpeg.exe')
      if (fs.existsSync(bundledPath)) {
        return bundledPath
      }
      
      // Fallback to system PATH
      return 'ffmpeg'
    }
  }

  /**
   * Get stream statistics
   * @returns {object} Stream statistics
   */
  getStats() {
    const activeStreams = Object.values(this.activeStreams)
    const runningStreams = activeStreams.filter(s => s.status === 'running')
    const errorStreams = activeStreams.filter(s => s.status === 'error')

    return {
      total: activeStreams.length,
      running: runningStreams.length,
      errors: errorStreams.length,
      streams: activeStreams.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        deviceId: s.deviceId,
        inputFile: s.inputFile,
        config: s.config,
        audioFormat: s.audioFormat,
        formatIndex: s.formatIndex,
        startedAt: s.startedAt,
        createdAt: s.createdAt,
        error: s.error,
        uptime: s.startedAt ? Date.now() - s.startedAt.getTime() : 0
      }))
    }
  }
}

export default new StreamingService()

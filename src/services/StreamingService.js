import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import logger from '../utils/logger.js'
import errorDiagnostics from '../utils/errorDiagnostics.js'
import FFmpegService from './FFmpegService.js'
import IcecastService from './IcecastService.js'
import AudioDeviceService from './AudioDeviceService.js'
import config from '../config/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class StreamingService {
  constructor() {
    this.activeStreams = {}
    this.ffmpegService = FFmpegService
    this.streamsConfigPath = join(process.cwd(), 'config', 'streams.json')
    this.lastIcecastStatus = 'unknown'
    this.icecastDownSince = null // Track when Icecast went down
    this.ICECAST_GRACE_PERIOD_SECONDS = 30 // Wait 30 seconds before stopping streams
    this.loadPersistentStreams()

    // Clean up old streams on startup
    this.cleanupOldStreams()

    // Set up periodic cleanup (every 6 hours)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldStreams()
    }, 6 * 60 * 60 * 1000)

    // DISABLED: Auto-monitoring that stops streams (too aggressive, causes false positives)
    // this.startIcecastMonitoring()
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

    // SIMPLIFIED: Just check if Icecast process is running (don't require admin interface)
    try {
      const isRunning = await IcecastService.isIcecastRunning()
      if (!isRunning) {
        throw new Error(`🧊 Icecast server is not running - Cannot start stream without Icecast.

✅ QUICK FIX:
1. Start the Icecast server from the dashboard
2. Then try starting the stream again`)
      }
    } catch (icecastError) {
      // Re-throw with more context
      throw new Error(`Icecast dependency check failed: ${icecastError.message}`)
    }

    // Capacity check: ensure config is loaded so sourceLimit is valid; avoid NaN in remaining
    await IcecastService.ensureInitialized()
    const rawLimit = IcecastService.getSourceLimit()
    const sourceLimit = (typeof rawLimit === 'number' && !Number.isNaN(rawLimit)) ? rawLimit : 2
    const activeCount = Object.values(this.activeStreams).filter(s => s.status === 'running').length
    const remaining = Math.max(0, sourceLimit - activeCount)
    const configPath = IcecastService.paths?.config
    // Log message includes values so grep / log scans show capacity in one place (no need to read next-line JSON)
    logger.info(
      `Stream capacity check: sourceLimit=${sourceLimit} activeCount=${activeCount} remaining=${remaining} configPath=${configPath ?? 'n/a'} aboutToStart=${streamConfig.name || streamConfig.id}`,
      { sourceLimit, activeCount, remaining, configPath, aboutToStart: streamConfig.name || streamConfig.id }
    )

    if (remaining <= 0) {
      const err = new Error(
        `Stream limit reached. Icecast allows ${sourceLimit} concurrent stream(s); ${activeCount} already running. ` +
        `Edit <sources> in icecast.xml and restart Icecast, or stop a stream first. Config: ${configPath || 'unknown'}`
      )
      err.capacity = { sourceLimit, activeCount, remaining: 0, configPath }
      throw err
    }

    const streamId = streamConfig.id || `stream_${Date.now()}`

    if (this.activeStreams[streamId]) {
      throw new Error(`Stream ${streamId} is already running`)
    }

    // Unique stream names: no duplicate display names
    const name = (streamConfig.name || '').trim()
    if (name && this.streamNameExists(name, null)) {
      throw new Error(`A stream named "${streamConfig.name}" already exists. Use a unique name.`)
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

    // Validate device accessibility before attempting to start stream
    if (streamConfig.deviceId && !streamConfig.inputFile) {
      try {
        logger.info(`Testing device accessibility for ${streamConfig.deviceId} before starting stream...`)
        const isAccessible = await AudioDeviceService.testDevice(streamConfig.deviceId)
        if (!isAccessible) {
          const deviceName = this.validateAndGetDeviceName(streamConfig.deviceId)
          throw new Error(`Audio device "${deviceName || streamConfig.deviceId}" is not accessible.\n\n🔧 TROUBLESHOOTING:\n\n1. DEVICE TEST FAILED:\n   • FFmpeg cannot access this audio device\n   • Device may be in use by another application\n   • Device driver may have issues\n\n2. SOLUTIONS:\n   • Close other applications using the microphone (Zoom, Teams, Discord, etc.)\n   • Try selecting a different audio device\n   • Restart the audio device or your computer\n   • Check Windows Sound settings to verify device is working\n\n3. COMMON CAUSES:\n   • Another application has exclusive access to the device\n   • Device driver needs updating\n   • Windows privacy settings blocking microphone access\n   • Virtual audio device (VB-Audio/VoiceMeeter) needs restarting`)
        }
        logger.info(`Device ${streamConfig.deviceId} passed accessibility test`)
      } catch (deviceTestError) {
        // If testDevice throws an error (not just returns false), use that error
        if (deviceTestError.message && !deviceTestError.message.includes('Audio device')) {
          throw deviceTestError
        }
        // Otherwise, re-throw the accessibility error we created
        throw deviceTestError
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

        // Get device name for error reporting (validate before starting)
        const deviceName = streamConfig.inputFile ? null : this.validateAndGetDeviceName(streamConfig.deviceId)

        // Start FFmpeg process with current format
        const ffmpegProcess = await this.startFFmpegProcess(streamId, streamConfig, formatIndex)

        // Store stream information
        this.activeStreams[streamId] = {
          id: streamId,
          deviceId: streamConfig.deviceId,
          deviceName: deviceName,  // Store actual DirectShow device name for error messages
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
          intentionallyStopped: false,  // Clear any previous intentional stop flag
          lastStderr: '',  // Store stderr for error diagnostics
          exitCode: null,
          exitSignal: null
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
    const err = new Error(`Stream failed to start with all audio formats (MP3, AAC, OGG). Last error: ${lastError?.message || 'Unknown error'}`)
    if (lastError?.capacity) err.capacity = lastError.capacity
    if (lastError?.shortMessage) err.shortMessage = lastError.shortMessage
    throw err
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
      detached: false,
      shell: true  // Required on Windows to resolve 'ffmpeg' from PATH
    })

    // Capture stderr for debugging and error diagnostics
    let stderrData = '';
    process.stderr.on('data', (data) => {
      if (data) {
        const chunk = data.toString();
        stderrData += chunk;

        // Store in stream object for later error diagnostics
        if (this.activeStreams[streamId]) {
          this.activeStreams[streamId].lastStderr = stderrData.slice(-2000); // Keep last 2000 chars
        }

        // Log FFmpeg output for debugging (but limit to avoid spam)
        if (stderrData.length < 2000) {
          logger.info(`FFmpeg stderr for stream ${streamId}:`, chunk.trim());
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

      // Log stderr output if process failed (show more for debugging)
      if (code !== 0 && stderrData) {
        logger.error(`FFmpeg stderr output for failed stream ${streamId}:`, stderrData.slice(0, 3000));
      }

      this.handleProcessExit(streamId, code, signal, stderrData)
    })

    // Wait for process to spawn, then give it a grace period to actually start
    await new Promise((resolve, reject) => {
      let spawnTimeout = null
      let graceTimeout = null
      let hasSpawned = false
      let hasResolved = false

      // Timeout for spawn event (10 seconds)
      spawnTimeout = setTimeout(() => {
        if (!hasSpawned && !hasResolved) {
          const errorMsg = `FFmpeg Startup Error: Process failed to spawn within 10 seconds.\n\nThis usually means:\n• FFmpeg executable not found\n• Permission issues\n• System configuration problem\n\nFFmpeg Error Output:\n${stderrData.slice(0, 500)}`;
          reject(new Error(errorMsg))
        }
      }, 10000)

      // Check if process exited immediately after spawn (crash detection)
      const checkForImmediateCrash = () => {
        if (hasSpawned && !hasResolved) {
          // Give FFmpeg 2 seconds to connect to device and start streaming
          graceTimeout = setTimeout(() => {
            if (hasResolved) return // Already resolved, don't do anything
            
            // If process is still running after grace period, consider it started successfully
            if (process.exitCode === null && !process.killed) {
              hasResolved = true
              resolve()
            } else {
              // Process exited during grace period - this is an immediate crash
              // Use error diagnostics for user-friendly error messages
              const errorOutput = stderrData.slice(0, 2000) || 'No error output available'
              const exitCode = process.exitCode || 'unknown'
              // Use actual port from icecast.xml
              const actualPort = IcecastService.getActualPort() || 8000;
              const diagnosis = errorDiagnostics.diagnose(stderrData, exitCode, {
                deviceId: streamConfig.deviceId,
                deviceName: streamConfig.deviceName,
                icecastPort: actualPort,
                streamId
              })
              
              const errorMsg = `FFmpeg crashed immediately after startup (exit code: ${exitCode}).\n\n${diagnosis.title}\n\n${diagnosis.description}\n\n🔧 Quick fixes:\n${diagnosis.solutions.join('\n')}\n\nFFmpeg Error Output:\n${errorOutput}`;
              const err = new Error(errorMsg);
              err.shortMessage = diagnosis.title;
              if (diagnosis.category === 'mount_point') {
                const rawLimit = IcecastService.getSourceLimit()
                const sourceLimit = (typeof rawLimit === 'number' && !Number.isNaN(rawLimit)) ? rawLimit : 2
                const activeCount = Object.values(this.activeStreams).filter(s => s.status === 'running').length
                err.capacity = { sourceLimit, activeCount, remaining: Math.max(0, sourceLimit - activeCount), configPath: IcecastService.paths?.config }
              }
              hasResolved = true
              reject(err)
            }
          }, 2000) // 2 second grace period
        }
      }

      process.once('spawn', () => {
        hasSpawned = true
        clearTimeout(spawnTimeout)
        // Start grace period check
        checkForImmediateCrash()
      })

      process.once('error', (error) => {
        if (hasResolved) return
        clearTimeout(spawnTimeout)
        clearTimeout(graceTimeout)
        hasResolved = true
        const errorMsg = `FFmpeg Process Error: ${error.message}\n\nThis error suggests:\n• FFmpeg executable not found\n• Permission issues\n• System configuration problem`;
        reject(new Error(errorMsg))
      })

      // Track if process exits during startup (before grace period completes)
      process.once('exit', (code) => {
        if (hasResolved) return // Already resolved, don't do anything
        
        if (hasSpawned && code !== 0) {
          clearTimeout(spawnTimeout)
          clearTimeout(graceTimeout)
          
          // Use error diagnostics for user-friendly error messages
          const errorOutput = stderrData.slice(0, 2000) || 'No error output available'
          // Use actual port from icecast.xml
          const actualPort = IcecastService.getActualPort() || 8000;
          const diagnosis = errorDiagnostics.diagnose(stderrData, code, {
            deviceId: streamConfig.deviceId,
            deviceName: streamConfig.deviceName,
            icecastPort: actualPort,
            streamId
          })
          
          // Format the error message with diagnosis
          const errorMsg = `FFmpeg crashed during startup (exit code: ${code}).\n\n${diagnosis.title}\n\n${diagnosis.description}\n\n🔧 Quick fixes:\n${diagnosis.solutions.join('\n')}\n\nFFmpeg Error Output:\n${errorOutput}`;
          const err = new Error(errorMsg);
          err.shortMessage = diagnosis.title;
          if (diagnosis.category === 'mount_point') {
            const rawLimit = IcecastService.getSourceLimit()
            const sourceLimit = (typeof rawLimit === 'number' && !Number.isNaN(rawLimit)) ? rawLimit : 2
            const activeCount = Object.values(this.activeStreams).filter(s => s.status === 'running').length
            err.capacity = { sourceLimit, activeCount, remaining: Math.max(0, sourceLimit - activeCount), configPath: IcecastService.paths?.config }
          }
          hasResolved = true
          reject(err)
        }
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

    // Read Icecast config from icecast.xml at runtime (source of truth)
    // Source connections (FFmpeg → Icecast) must use localhost; getHostname() is for public URLs only
    const icecastHost = 'localhost';
    const icecastPort = IcecastService.getActualPort();
    const icecastSourcePassword = IcecastService.getSourcePassword();
    const icecastUrl = `icecast://source:${icecastSourcePassword}@${icecastHost}:${icecastPort}/${streamId}`;
    const formats = this.getAudioFormats();
    const format = formats[formatIndex] || formats[0]; // Fallback to first format

    let args = []

    // Check if we're streaming from a file or device
    if (streamConfig.inputFile) {
      // File input mode - SIMPLIFIED
      args = [
        '-re',                          // Read input at native frame rate
        '-i', streamConfig.inputFile,   // Input file
        '-acodec', format.codec,        // Audio codec
        '-b:a', `${bitrate}k`,          // Audio bitrate (use -b:a for compatibility)
        '-ar', '44100',                 // Sample rate
        '-ac', '2',                     // Audio channels
        '-f', format.format,            // Output format
        icecastUrl,                     // Unique Icecast URL per stream
        '-loglevel', 'info'             // Show info level logs
      ]
      
      // Only add content_type for MP3
      if (format.name === 'MP3') {
        args.splice(-2, 0, '-content_type', format.contentType); // Insert before icecastUrl
      }
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

      // SIMPLIFIED: Use minimal FFmpeg command that works (based on manual setup scripts)
      // Don't add extra parameters that might cause crashes
      // IMPORTANT: Use quotes around device name for DirectShow (handles spaces and special chars)
      args = [
        '-f', 'dshow',                    // DirectShow input format
        '-i', `audio="${deviceName}"`,     // Audio input device (real DirectShow name, quoted for safety)
        '-acodec', format.codec,           // Audio codec (with fallback support)
        '-b:a', `${bitrate}k`,            // Audio bitrate (use -b:a instead of -ab for compatibility)
        '-ar', '44100',                    // Sample rate
        '-ac', '2',                        // Audio channels
        '-f', format.format,               // Output format (with fallback support)
        icecastUrl,                        // Unique Icecast URL per stream
        '-loglevel', 'info'                // Show info level logs
      ]
      
      // Only add content_type for MP3 (it's not always supported for other formats)
      if (format.name === 'MP3') {
        args.splice(-2, 0, '-content_type', format.contentType); // Insert before icecastUrl
      }
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
    // FIRST: Try to look up the device in AudioDeviceService cache
    // This is the most reliable way to get the exact DirectShow name
    const devices = AudioDeviceService.cachedDevices;
    
    if (devices && devices.length > 0) {
      const cachedDevice = devices.find(d => d.id === deviceId);
      if (cachedDevice && cachedDevice.name) {
        logger.info(`Found device in cache: "${deviceId}" -> "${cachedDevice.name}"`);
        return cachedDevice.name;
      } else {
        logger.warn(`Device ID "${deviceId}" not found in ${devices.length} cached devices`);
        // Log available devices for debugging
        logger.info(`Available device IDs: ${devices.slice(0, 5).map(d => d.id).join(', ')}...`);
      }
    } else {
      logger.warn('AudioDeviceService cache is empty');
    }

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
      'microphone-usbaudio1-0': 'Microphone (USBAudio1.0)', // USB Audio 1.0 device
      'microphone-usbaudio': 'Microphone (USBAudio1.0)', // USB Audio generic
      'usbaudio1-0': 'Microphone (USBAudio1.0)', // USB Audio 1.0 short
      'usbaudio1.0': 'Microphone (USBAudio1.0)', // USB Audio 1.0 with dot
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
      // VB-Audio Virtual Cable variants (multiple cables installed)
      'cable-output-2-vb-audio-virtual-cable': 'CABLE Output (2- VB-Audio Virtual Cable)',
      'cable-output-vb-audio-virtual-cable': 'CABLE Output (VB-Audio Virtual Cable)',
      'cable-a-output-vb-audio-virtual-cable-a': 'CABLE-A Output (VB-Audio Virtual Cable A)',
      'cable-b-output-vb-audio-virtual-cable-b': 'CABLE-B Output (VB-Audio Virtual Cable B)',
      'cable-c-output-vb-audio-cable-c': 'CABLE-C Output (VB-Audio Cable C)',
      'cable-d-output-vb-audio-cable-d': 'CABLE-D Output (VB-Audio Cable D)',
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
      // Remove "microphone-" prefix if present
      let cleanId = deviceId.replace(/^microphone-/, '');
      
      // Convert kebab-case to title case, preserving numbers and dots
      const titleCase = cleanId
        .split('-')
        .map((word, index) => {
          // Preserve numbers and dots (like "1.0" or "1-0")
          if (/^\d+\.?\d*$/.test(word)) {
            return word.replace(/-/g, '.'); // Convert "1-0" to "1.0"
          }
          // Capitalize first letter
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
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
      const newName = (updates.name || '').trim()
      if (newName && this.streamNameExists(newName, streamId)) {
        throw new Error(`A stream named "${updates.name}" already exists. Use a unique name.`)
      }
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
   * Check if a stream with the given display name already exists (case-insensitive, trimmed).
   * @param {string} name - Display name to check
   * @param {string|null} excludeStreamId - Stream ID to exclude (e.g. current stream when editing)
   * @returns {boolean}
   */
  streamNameExists(name, excludeStreamId) {
    const normalized = (name || '').trim().toLowerCase()
    if (!normalized) return false
    return Object.values(this.activeStreams).some(stream =>
      stream.id !== excludeStreamId && (stream.name || '').trim().toLowerCase() === normalized
    )
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
   * Start all persisted streams that are currently stopped or in error.
   * @returns {object} { success, message, started, failed, results }
   */
  async startAllStoppedStreams() {
    const stoppedStreams = Object.values(this.activeStreams).filter(stream =>
      stream.status === 'stopped' || stream.status === 'error'
    );

    if (stoppedStreams.length === 0) {
      return { success: true, message: 'No stopped streams to start', started: 0, failed: 0, results: [] };
    }

    const results = [];
    for (const stream of stoppedStreams) {
      try {
        await this.restartStream(stream.id);
        results.push({ id: stream.id, name: stream.name, success: true });
      } catch (error) {
        results.push({ id: stream.id, name: stream.name, success: false, error: error.message });
      }
    }

    const startedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    logger.info(`Started ${startedCount} streams, ${failedCount} failed`);

    return {
      success: failedCount === 0,
      message: `Started ${startedCount} streams${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      started: startedCount,
      failed: failedCount,
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

      // Check if this is an immediate crash (within 3 seconds of start)
      const startTime = stream.startedAt?.getTime() || Date.now()
      const runTime = Date.now() - startTime
      const isImmediateCrash = runTime < 3000 && code !== 0

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
        
        // Add context for immediate crashes
        if (isImmediateCrash) {
          logger.warn(`Stream ${streamId} crashed immediately after startup (${runTime}ms), likely a device/codec issue`)
        }
        
        // Get device info before parsing error
        const deviceName = stream.deviceName || stream.deviceId || 'Unknown device'
        this.activeStreams[streamId].error = this.parseFFmpegError(code, safeStderrData, deviceName)
        logger.error(`Stream ${streamId} failed with exit code ${code}:`, this.activeStreams[streamId].error)
      }
    }
  }

  /**
   * Parse FFmpeg error from exit code and stderr
   * Uses the centralized error diagnostics system for user-friendly messages
   * @param {number} exitCode - FFmpeg exit code
   * @param {string} stderrData - FFmpeg stderr output
   * @param {string} deviceName - Optional device name for better error messages
   * @returns {string} Human-readable error message
   */
  parseFFmpegError(exitCode, stderrData, deviceName = null) {
    // Analyze stderr for specific error patterns
    const safeStderrData = stderrData || '';

    // Get device info - use provided name or try to find it
    let deviceInfo = deviceName || 'Unknown device'
    if (!deviceName && this.activeStreams) {
      // Fallback: try to find device from any recent stream with this exit code
      const stream = Object.values(this.activeStreams).find(s => s.exitCode === exitCode)
      if (stream) {
        deviceInfo = stream.deviceName || stream.deviceId || stream.name || 'Unknown'
      }
    }

    // Use centralized error diagnostics
    // Use actual port from icecast.xml
    const actualPort = IcecastService.getActualPort() || config.icecast.port;
    const diagnosis = errorDiagnostics.diagnose(safeStderrData, exitCode, {
      deviceId: deviceInfo,
      deviceName: deviceInfo,
      icecastPort: actualPort
    })

    // Format the message
    return errorDiagnostics.formatMessage(diagnosis)
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
   * Monitor Icecast server status and stop streams if Icecast goes down
   */
  startIcecastMonitoring() {
    // Check Icecast status every 10 seconds
    this.icecastMonitorInterval = setInterval(async () => {
      try {
        const icecastStatus = await IcecastService.getStatus()
        // Treat "starting" and "running" as operational (starting means Icecast is up but admin interface might not be fully ready)
        const isOperational = icecastStatus.running || 
                             icecastStatus.status === 'running' || 
                             icecastStatus.status === 'starting'
        const currentStatus = isOperational ? 'running' : 'stopped'

        // Handle Icecast status changes
        if (currentStatus === 'running') {
          // Icecast is up - clear the down tracking
          if (this.icecastDownSince !== null) {
            const downDuration = Date.now() - this.icecastDownSince
            logger.info(`✅ Icecast server is back up after being down for ${Math.floor(downDuration / 1000)} seconds`)
            this.icecastDownSince = null
          }
          this.lastIcecastStatus = currentStatus
        } else {
          // Icecast is down
          if (this.icecastDownSince === null) {
            // First time we detect Icecast is down
            this.icecastDownSince = Date.now()
            logger.warn(`🧊 Icecast server went down at ${new Date(this.icecastDownSince).toLocaleTimeString()}`)
            logger.info(`⏳ Waiting ${this.ICECAST_GRACE_PERIOD_SECONDS} seconds before stopping streams (in case Icecast is restarting)...`)
          } else {
            // Icecast has been down for a while - check if we should stop streams
            const downDuration = Date.now() - this.icecastDownSince
            const downDurationSeconds = Math.floor(downDuration / 1000)

            if (downDurationSeconds >= this.ICECAST_GRACE_PERIOD_SECONDS) {
              // Grace period exceeded - stop all streams
              logger.warn(`⚠️ Icecast has been down for ${downDurationSeconds}s (exceeded ${this.ICECAST_GRACE_PERIOD_SECONDS}s grace period). Stopping all dependent streams.`)

              // Stop all running streams
              const runningStreams = Object.values(this.activeStreams).filter(s => s.status === 'running')
              if (runningStreams.length > 0) {
                logger.info(`Stopping ${runningStreams.length} streams due to prolonged Icecast downtime...`)

                for (const stream of runningStreams) {
                  try {
                    await this.stopStream(stream.id)
                    logger.info(`Stream ${stream.id} stopped due to Icecast being down for ${downDurationSeconds}s`)

                    // Update stream with dependency error info
                    this.activeStreams[stream.id].error = `⚠️ Stream stopped: Icecast server has been down for ${downDurationSeconds}s

📊 DEPENDENCY CHAIN BROKEN:
   Audio Device → FFmpeg → ❌ Icecast (DOWN for ${downDurationSeconds}s) → Listeners

💡 TO RESUME:
1. Start Icecast server
2. Restart this stream from the dashboard`
                  } catch (err) {
                    logger.error(`Failed to stop stream ${stream.id} after Icecast shutdown:`, err)
                  }
                }
              }
            } else {
              // Within grace period - just log a reminder
              if (downDurationSeconds % 10 === 0) { // Log every 10 seconds
                logger.info(`⏳ Icecast still down (${downDurationSeconds}s/${this.ICECAST_GRACE_PERIOD_SECONDS}s grace period remaining). Streams still running, waiting for Icecast to recover...`)
              }
            }
          }

          this.lastIcecastStatus = currentStatus
        }
      } catch (error) {
        logger.warn('Failed to check Icecast status during monitoring:', error.message)
      }
    }, 10000) // Check every 10 seconds

    logger.info(`Icecast monitoring started - streams will auto-stop if Icecast is down for more than ${this.ICECAST_GRACE_PERIOD_SECONDS} seconds`)
  }

  /**
   * Get stream statistics
   * @returns {object} Stream statistics
   */
  getStats() {
    const activeStreams = Object.values(this.activeStreams)

    // Verify actual process status - detect dead processes that show as 'running'
    const verifiedStreams = activeStreams.map(s => {
      // If status is 'running' but process has died or exited, update to 'error'
      if (s.status === 'running' && s.ffmpegProcess) {
        const isActuallyRunning = s.ffmpegProcess.exitCode === null &&
                                   !s.ffmpegProcess.killed

        if (!isActuallyRunning) {
          // Process died but status wasn't updated
          const exitCode = s.ffmpegProcess.exitCode
          const signal = s.ffmpegProcess.signalCode
          
          // Check if this was an immediate crash (within 3 seconds of start)
          const startTime = s.startedAt?.getTime() || Date.now()
          const runTime = Date.now() - startTime
          const isImmediateCrash = runTime < 3000

          // Only update status if process has been running for more than 1 second
          // This prevents false positives during startup
          if (runTime > 1000 || exitCode !== null) {
            logger.warn(`Stream ${s.id} shows 'running' but FFmpeg process is dead (exitCode=${exitCode}, signal=${signal}, runtime=${runTime}ms). Updating status to 'error'.`)

            s.status = 'error'
            s.exitedAt = s.ffmpegProcess.exitAt || new Date()
            s.exitCode = exitCode
            s.exitSignal = signal

            // Generate error message
            if (exitCode !== null) {
              const deviceName = s.deviceName || s.deviceId || s.name || null
              s.error = this.parseFFmpegError(exitCode, s.lastStderr || 'FFmpeg process exited without error output', deviceName)
            } else {
              s.error = 'FFmpeg process terminated unexpectedly (no exit code). This may indicate a system-level issue.'
            }

            // Clear the dead process reference
            s.ffmpegProcess = null
          } else {
            // Process died very quickly - might still be starting, give it more time
            logger.debug(`Stream ${s.id} process exited very quickly (${runTime}ms), may still be starting up`)
          }
        }
      }

      return s
    })

    // Count based on verified status
    const runningStreams = verifiedStreams.filter(s => s.status === 'running')
    const errorStreams = verifiedStreams.filter(s => s.status === 'error')

    return {
      total: verifiedStreams.length,
      running: runningStreams.length,
      errors: errorStreams.length,
      streams: verifiedStreams.map(s => ({
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

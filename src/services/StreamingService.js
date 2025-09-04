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

    try {
      const inputSource = streamConfig.inputFile ? `file: ${streamConfig.inputFile}` : `device: ${streamConfig.deviceId}`
      logger.info(`Starting complete stream: ${streamId} for ${inputSource}`)

      // Start FFmpeg process
      const ffmpegProcess = await this.startFFmpegProcess(streamId, streamConfig)

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
        needsRestart: false,
        intentionallyStopped: false  // Clear any previous intentional stop flag
      }

      // Save to persistent storage
      this.savePersistentStreams()

      logger.info(`Stream ${streamId} started successfully`)
      return this.activeStreams[streamId]
      
    } catch (error) {
      logger.error(`Failed to start stream ${streamId}:`, error)
      throw error
    }
  }

  /**
   * Start FFmpeg process for streaming
   * @param {string} streamId - Stream ID
   * @param {object} streamConfig - Stream configuration
   * @returns {ChildProcess} FFmpeg process
   */
  async startFFmpegProcess(streamId, streamConfig) {
    const ffmpegPath = this.findFFmpegPath()
    const args = this.buildFFmpegArgs(streamId, streamConfig)

    logger.info(`Starting FFmpeg process for stream ${streamId} with args:`, args)
    logger.info(`FFmpeg executable path: ${ffmpegPath}`)
    logger.info(`Full command: ${ffmpegPath} ${args.join(' ')}`)

    const process = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })

    // Capture stderr for debugging
    let stderrData = '';
    process.stderr.on('data', (data) => {
      stderrData += data.toString();
      // Log FFmpeg output for debugging (but limit to avoid spam)
      if (stderrData.length < 2000) {
        logger.info(`FFmpeg stderr for stream ${streamId}:`, data.toString().trim());
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
        reject(new Error(`FFmpeg process failed to start within 5 seconds. Stderr: ${stderrData.slice(0, 500)}`))
      }, 5000)

      process.once('spawn', () => {
        clearTimeout(timeout)
        resolve()
      })

      process.once('error', (error) => {
        clearTimeout(timeout)
        reject(new Error(`FFmpeg spawn error: ${error.message}. Stderr: ${stderrData.slice(0, 500)}`))
      })
    })

    return process
  }

  /**
   * Build FFmpeg command line arguments for streaming
   * @param {string} streamId - Stream ID
   * @param {object} streamConfig - Stream configuration
   * @returns {Array} Command line arguments
   */
  buildFFmpegArgs(streamId, streamConfig) {
    const bitrate = streamConfig.bitrate || 192;
    const icecastUrl = `icecast://source:hackme@localhost:8000/${streamId}`;

    let args = []

    // Check if we're streaming from a file or device
    if (streamConfig.inputFile) {
      // File input mode
      args = [
        '-re',                          // Read input at native frame rate
        '-i', streamConfig.inputFile,   // Input file
        '-acodec', 'mp3',               // Audio codec
        '-ab', `${bitrate}k`,           // Audio bitrate from config
        '-ar', '44100',                 // Sample rate
        '-ac', '2',                     // Audio channels
        '-f', 'mp3',                    // Output format
        icecastUrl,                     // Unique Icecast URL per stream
        '-loglevel', 'info'             // Show info level logs
      ]
    } else {
      // Device input mode - validate and use real device name
      const deviceName = this.validateAndGetDeviceName(streamConfig.deviceId);
      if (!deviceName) {
        throw new Error(`Invalid or unavailable audio device: ${streamConfig.deviceId}`);
      }

      args = [
        '-f', 'dshow',                    // DirectShow input format
        '-i', `audio=${deviceName}`,      // Audio input device (real DirectShow name)
        '-acodec', 'mp3',                 // Audio codec
        '-ab', `${bitrate}k`,             // Audio bitrate from config
        '-ar', '44100',                   // Sample rate
        '-ac', '2',                       // Audio channels
        '-f', 'mp3',                      // Output format
        icecastUrl,                       // Unique Icecast URL per stream
        '-loglevel', 'info'               // Show info level logs
      ]
    }

    logger.info(`Built FFmpeg args for stream ${streamId}:`, {
      streamId,
      bitrate: `${bitrate}k`,
      icecastUrl,
      inputType: streamConfig.inputFile ? 'file' : 'device',
      inputSource: streamConfig.inputFile || streamConfig.deviceId,
      actualDeviceName: streamConfig.inputFile ? null : this.validateAndGetDeviceName(streamConfig.deviceId),
      fullArgs: args
    });

    // Also log the exact command that would be executed
    logger.info(`Full FFmpeg command for stream ${streamId}: ffmpeg ${args.join(' ')}`);

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
      'ps-output-hd-pro-webcam-c910': 'Microphone (HD Pro Webcam C910)' // Fix for previous naming
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

    // Log warning for unmapped device
    logger.warn(`No mapping found for device ID: ${deviceId}. Available mappings:`, Object.keys(deviceMap));
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
   */
  async updateStream(streamId, updates) {
    logger.info(`Updating stream: ${streamId}`)

    const stream = this.activeStreams[streamId]
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`)
    }

    // Update stream properties
    if (updates.name !== undefined) {
      stream.name = updates.name
      stream.config.name = updates.name
    }

    if (updates.deviceId !== undefined) {
      stream.deviceId = updates.deviceId
      stream.config.deviceId = updates.deviceId
    }

    // Save to persistent storage
    this.savePersistentStreams()

    logger.info(`Stream ${streamId} updated successfully`)
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
        this.activeStreams[streamId].error = this.parseFFmpegError(code, stderrData)
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

    // Common FFmpeg error codes
    const errorMessages = {
      '-5': 'Permission denied - Cannot access audio device. Check device permissions and ensure no other application is using it.',
      '-22': 'Invalid argument - Audio device name or parameters are incorrect.',
      '-2': 'No such file or directory - Audio device not found.',
      '1': 'General error - Check FFmpeg command and device availability.'
    };

    let errorMsg = errorMessages[signedCode.toString()] || `FFmpeg exited with code ${exitCode} (${signedCode})`;

    // Add specific error details from stderr
    if (stderrData) {
      if (stderrData.includes('No such audio device') || stderrData.includes('Could not find audio only device')) {
        errorMsg = 'Audio device not found. The selected microphone may be disconnected or in use by another application.';
      } else if (stderrData.includes('Permission denied')) {
        errorMsg = 'Permission denied accessing audio device. Close other applications using the microphone.';
      } else if (stderrData.includes('Device or resource busy')) {
        errorMsg = 'Audio device is busy. Another application may be using it.';
      } else if (stderrData.includes('among source devices of type audio')) {
        errorMsg = 'Audio device not recognized by DirectShow. Please check device name and ensure it\'s properly connected.';
      }

      // If we have stderr data but no specific match, include a snippet for debugging
      if (errorMsg === (errorMessages[signedCode.toString()] || `FFmpeg exited with code ${exitCode} (${signedCode})`)) {
        const stderrSnippet = stderrData.slice(0, 200).replace(/\n/g, ' ').trim();
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
        uptime: s.startedAt ? Date.now() - s.startedAt.getTime() : 0
      }))
    }
  }
}

export default new StreamingService()

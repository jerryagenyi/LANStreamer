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
        needsRestart: false
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
    
    const process = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })

    // Handle process events
    process.on('error', (error) => {
      logger.error(`FFmpeg process error for stream ${streamId}:`, error)
      this.handleProcessError(streamId, error)
    })

    process.on('exit', (code, signal) => {
      logger.info(`FFmpeg process exited for stream ${streamId}: code=${code}, signal=${signal}`)
      this.handleProcessExit(streamId, code, signal)
    })

    // Wait a moment to ensure process starts successfully
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`FFmpeg process failed to start within 5 seconds`))
      }, 5000)

      process.once('spawn', () => {
        clearTimeout(timeout)
        resolve()
      })

      process.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
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
      // Device input mode
      args = [
        '-f', 'dshow',                    // DirectShow input format
        '-i', `audio="${streamConfig.deviceId}"`, // Audio input device
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
      inputSource: streamConfig.inputFile || streamConfig.deviceId
    });

    return args
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
   * Stop all active streams
   */
  async stopAllStreams() {
    const streamIds = Object.keys(this.activeStreams)
    logger.info(`Stopping all ${streamIds.length} active streams`)
    
    const stopPromises = streamIds.map(streamId => this.stopStream(streamId))
    await Promise.allSettled(stopPromises)
    
    logger.info('All streams stopped')
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
   */
  handleProcessExit(streamId, code, signal) {
    logger.info(`FFmpeg process exited for stream ${streamId}: code=${code}, signal=${signal}`)
    
    if (this.activeStreams[streamId]) {
      this.activeStreams[streamId].status = 'stopped'
      this.activeStreams[streamId].exitedAt = new Date()
      this.activeStreams[streamId].exitCode = code
      this.activeStreams[streamId].exitSignal = signal
    }
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

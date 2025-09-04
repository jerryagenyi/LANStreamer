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
        config: streamConfig
      }

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
    let args = []

    // Check if we're streaming from a file or device
    if (streamConfig.inputFile) {
      // File input mode
      args = [
        '-re',                          // Read input at native frame rate
        '-i', streamConfig.inputFile,   // Input file
        '-acodec', 'mp3',               // Audio codec
        '-ab', '128k',                  // Audio bitrate
        '-ar', '44100',                 // Sample rate
        '-ac', '2',                     // Audio channels
        '-f', 'mp3',                    // Output format
        `icecast://source:hackme@localhost:8000/stream`, // Icecast URL
        '-loglevel', 'info'             // Show info level logs
      ]
    } else {
      // Device input mode (original)
      args = [
        '-f', 'dshow',                    // DirectShow input format
        '-i', `audio="${streamConfig.deviceId}"`, // Audio input device
        '-acodec', 'mp3',                 // Audio codec
        '-ab', '128k',                    // Audio bitrate
        '-ar', '44100',                   // Sample rate
        '-ac', '2',                       // Audio channels
        '-f', 'mp3',                      // Output format
        `icecast://source:hackme@localhost:8000/stream`, // Icecast URL
        '-loglevel', 'info'               // Show info level logs
      ]
    }

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

      // Remove from active streams
      delete this.activeStreams[streamId]
      
      logger.info(`Stream ${streamId} stopped successfully`)
      
    } catch (error) {
      logger.error(`Failed to stop stream ${streamId}:`, error)
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

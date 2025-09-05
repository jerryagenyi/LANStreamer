import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import logger from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class FFmpegService {
  constructor() {
    this.activeStreams = {}
    this.ffmpegPath = this.findFFmpegPath()
  }

  /**
   * Find the FFmpeg executable path
   * @returns {string} Path to FFmpeg executable
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
   * Returns the current list of active streams.
   * @returns {Object} A dictionary of active streams.
   */
  getActiveStreams() {
    return this.activeStreams
  }

  /**
   * Start a real FFmpeg stream process.
   * @param {object} streamConfig - The configuration for the stream.
   */
  startStream(streamConfig) {
    if (!streamConfig || !streamConfig.id) {
      throw new Error('Invalid stream configuration.')
    }

    if (this.activeStreams[streamConfig.id]) {
      throw new Error(`Stream ${streamConfig.id} is already running.`)
    }

    try {
      logger.info(`Starting FFmpeg stream: ${streamConfig.id}`)
      
      // Build FFmpeg command arguments
      const args = this.buildFFmpegArgs(streamConfig)
      
      // Spawn the FFmpeg process
      const process = spawn(this.ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      })

      // Handle process events
      process.on('error', (error) => {
        logger.error(`FFmpeg process error for stream ${streamConfig.id}:`, error)
        this.handleProcessError(streamConfig.id, error)
      })

      process.on('exit', (code, signal) => {
        logger.info(`FFmpeg process exited for stream ${streamConfig.id}: code=${code}, signal=${signal}`)
        this.handleProcessExit(streamConfig.id, code, signal)
      })

      // Store stream information
      this.activeStreams[streamConfig.id] = {
        status: 'running',
        config: streamConfig,
        process: process,
        startedAt: new Date(),
        pid: process.pid
      }

      logger.info(`FFmpeg stream ${streamConfig.id} started successfully with PID ${process.pid}`)
      
    } catch (error) {
      logger.error(`Failed to start FFmpeg stream ${streamConfig.id}:`, error)
      throw error
    }
  }

  /**
   * Build FFmpeg command line arguments
   * @param {object} streamConfig - Stream configuration
   * @returns {Array} Array of command line arguments
   */
  buildFFmpegArgs(streamConfig) {
    const args = [
      '-f', 'dshow',                    // DirectShow input format
      '-i', `audio="${streamConfig.deviceId}"`, // Audio input device
      '-acodec', 'aac',                 // Audio codec (AAC for better browser support)
      '-ab', '128k',                    // Audio bitrate
      '-ar', '44100',                   // Sample rate
      '-ac', '2',                       // Audio channels
      '-f', 'adts',                     // Output format (ADTS AAC)
      '-',                              // Output to stdout
      '-loglevel', 'error'              // Only show errors
    ]

    return args
  }

  /**
   * Stop an FFmpeg stream process.
   * @param {string} streamId - The ID of the stream to stop.
   */
  stopStream(streamId) {
    const stream = this.activeStreams[streamId]
    if (!stream) {
      throw new Error(`Stream ${streamId} not found.`)
    }

    try {
      logger.info(`Stopping FFmpeg stream: ${streamId}`)
      
      if (stream.process) {
        // Kill the process gracefully first
        stream.process.kill('SIGTERM')
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (stream.process && !stream.process.killed) {
            logger.warn(`Force killing FFmpeg process for stream ${streamId}`)
            stream.process.kill('SIGKILL')
          }
        }, 5000)
      }

      // Remove from active streams
      delete this.activeStreams[streamId]
      
      logger.info(`FFmpeg stream ${streamId} stopped successfully`)
      
    } catch (error) {
      logger.error(`Failed to stop FFmpeg stream ${streamId}:`, error)
      throw error
    }
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
   * Get stream status
   * @param {string} streamId - Stream ID
   * @returns {object|null} Stream status or null if not found
   */
  getStreamStatus(streamId) {
    return this.activeStreams[streamId] || null
  }

  /**
   * Stop all active streams
   */
  stopAllStreams() {
    const streamIds = Object.keys(this.activeStreams)
    logger.info(`Stopping all ${streamIds.length} active streams`)
    
    streamIds.forEach(streamId => {
      try {
        this.stopStream(streamId)
      } catch (error) {
        logger.error(`Failed to stop stream ${streamId}:`, error)
      }
    })
  }
}

export default new FFmpegService();
const { spawn, exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs-extra')
const path = require('path')

const config = require('../config')
const logger = require('../utils/logger')
const { AppError } = require('../middleware/errorHandler')
const { validateFFmpegParams } = require('../middleware/validation')

const execAsync = promisify(exec)

class FFmpegService {
  constructor() {
    this.streams = new Map()
    this.processes = new Map()
    this.ffmpegPath = config.ffmpeg.path
    this.maxConcurrentStreams = config.ffmpeg.maxConcurrentStreams
  }

  async initialize() {
    logger.ffmpeg('Initializing FFmpeg Service')
    
    // Test FFmpeg installation
    await this.testInstallation()
    
    // Load existing streams
    await this.loadStreams()
    
    logger.ffmpeg('FFmpeg Service initialized')
  }

  async testInstallation() {
    try {
      const { stdout } = await execAsync(`${this.ffmpegPath} -version`)
      const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/)
      const version = versionMatch ? versionMatch[1] : 'unknown'
      
      logger.ffmpeg('FFmpeg installation verified', { version })
      return {
        installed: true,
        version,
        path: this.ffmpegPath
      }
    } catch (error) {
      logger.error('FFmpeg installation test failed:', error)
      throw new AppError('FFmpeg is not installed or not accessible', 500)
    }
  }

  async checkInstallation() {
    try {
      const result = await this.testInstallation()
      return {
        installed: true,
        ...result
      }
    } catch (error) {
      return {
        installed: false,
        error: error.message,
        downloadUrl: 'https://ffmpeg.org/download.html'
      }
    }
  }

  async getInfo() {
    try {
      const [version, codecs, formats] = await Promise.all([
        this.getVersion(),
        this.getSupportedCodecs(),
        this.getSupportedFormats()
      ])

      return {
        version,
        path: this.ffmpegPath,
        codecs: codecs.slice(0, 10), // Limit for response size
        formats: formats.slice(0, 10),
        activeStreams: this.streams.size,
        maxConcurrentStreams: this.maxConcurrentStreams
      }
    } catch (error) {
      logger.error('Failed to get FFmpeg info:', error)
      throw new AppError('Failed to retrieve FFmpeg information', 500)
    }
  }

  async getVersion() {
    try {
      const { stdout } = await execAsync(`${this.ffmpegPath} -version`)
      const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/)
      return versionMatch ? versionMatch[1] : 'unknown'
    } catch (error) {
      return 'unknown'
    }
  }

  async getSupportedCodecs() {
    try {
      const { stdout } = await execAsync(`${this.ffmpegPath} -codecs`)
      const lines = stdout.split('\n')
      const codecs = []
      
      for (const line of lines) {
        if (line.match(/^\s*[DEV\.]*\s+\w+/)) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 2) {
            codecs.push({
              name: parts[1],
              description: parts.slice(2).join(' ')
            })
          }
        }
      }
      
      return codecs
    } catch (error) {
      logger.debug('Could not get FFmpeg codecs:', error.message)
      return []
    }
  }

  async getSupportedFormats() {
    try {
      const { stdout } = await execAsync(`${this.ffmpegPath} -formats`)
      const lines = stdout.split('\n')
      const formats = []
      
      for (const line of lines) {
        if (line.match(/^\s*[DE\.]*\s+\w+/)) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 2) {
            formats.push({
              name: parts[1],
              description: parts.slice(2).join(' ')
            })
          }
        }
      }
      
      return formats
    } catch (error) {
      logger.debug('Could not get FFmpeg formats:', error.message)
      return []
    }
  }

  async loadStreams() {
    try {
      const streamsFile = config.database.streamsDbPath
      if (await fs.pathExists(streamsFile)) {
        const streamsData = await fs.readJson(streamsFile)
        for (const stream of streamsData) {
          this.streams.set(stream.id, stream)
        }
        logger.ffmpeg(`Loaded ${streamsData.length} streams from database`)
      }
    } catch (error) {
      logger.warn('Could not load streams:', error.message)
    }
  }

  async saveStreams() {
    try {
      const streamsArray = Array.from(this.streams.values())
      await fs.writeJson(config.database.streamsDbPath, streamsArray, { spaces: 2 })
    } catch (error) {
      logger.error('Could not save streams:', error)
    }
  }

  async getAllStreams() {
    return Array.from(this.streams.values())
  }

  async getStream(id) {
    return this.streams.get(id) || null
  }

  async createStream(streamConfig) {
    if (this.streams.size >= this.maxConcurrentStreams) {
      throw new AppError('Maximum number of streams reached', 409)
    }

    // Validate stream configuration
    this.validateStreamConfig(streamConfig)

    // Generate FFmpeg command
    const ffmpegCommand = this.generateFFmpegCommand(streamConfig)
    
    const stream = {
      ...streamConfig,
      ffmpegCommand,
      status: 'stopped',
      pid: null,
      startedAt: null,
      listeners: 0,
      errors: []
    }

    this.streams.set(stream.id, stream)
    await this.saveStreams()

    logger.ffmpeg('Stream created', { 
      streamId: stream.id, 
      name: stream.name,
      channel: stream.channel 
    })

    return stream
  }

  async updateStream(id, updateData) {
    const stream = this.streams.get(id)
    if (!stream) {
      throw new AppError('Stream not found', 404)
    }

    if (stream.status === 'running') {
      throw new AppError('Cannot update running stream', 409)
    }

    this.validateStreamConfig(updateData)

    const updatedStream = {
      ...stream,
      ...updateData,
      ffmpegCommand: this.generateFFmpegCommand({ ...stream, ...updateData })
    }

    this.streams.set(id, updatedStream)
    await this.saveStreams()

    logger.ffmpeg('Stream updated', { streamId: id })
    return updatedStream
  }

  async deleteStream(id) {
    const stream = this.streams.get(id)
    if (!stream) {
      throw new AppError('Stream not found', 404)
    }

    if (stream.status === 'running') {
      await this.stopStream(id)
    }

    this.streams.delete(id)
    await this.saveStreams()

    logger.ffmpeg('Stream deleted', { streamId: id })
    return true
  }

  async startStream(id) {
    const stream = this.streams.get(id)
    if (!stream) {
      throw new AppError('Stream not found', 404)
    }

    if (stream.status === 'running') {
      throw new AppError('Stream is already running', 409)
    }

    try {
      const process = this.spawnFFmpegProcess(stream)
      
      stream.status = 'running'
      stream.pid = process.pid
      stream.startedAt = new Date().toISOString()
      stream.errors = []

      this.processes.set(id, process)
      this.streams.set(id, stream)
      await this.saveStreams()

      logger.ffmpeg('Stream started', { 
        streamId: id, 
        pid: process.pid,
        name: stream.name 
      })

      return stream
    } catch (error) {
      stream.status = 'error'
      stream.errors.push({
        timestamp: new Date().toISOString(),
        message: error.message
      })
      this.streams.set(id, stream)
      
      logger.error('Failed to start stream:', error)
      throw new AppError(`Failed to start stream: ${error.message}`, 500)
    }
  }

  async stopStream(id) {
    const stream = this.streams.get(id)
    if (!stream) {
      throw new AppError('Stream not found', 404)
    }

    const process = this.processes.get(id)
    if (process && !process.killed) {
      process.kill('SIGTERM')
      
      // Force kill after 5 seconds if not terminated
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL')
        }
      }, 5000)
    }

    stream.status = 'stopped'
    stream.pid = null
    stream.startedAt = null

    this.processes.delete(id)
    this.streams.set(id, stream)
    await this.saveStreams()

    logger.ffmpeg('Stream stopped', { streamId: id, name: stream.name })
    return stream
  }

  async restartStream(id) {
    await this.stopStream(id)
    
    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return await this.startStream(id)
  }

  spawnFFmpegProcess(stream) {
    const args = stream.ffmpegCommand.split(' ').slice(1) // Remove 'ffmpeg' from command
    
    logger.ffmpeg('Starting FFmpeg process', { 
      streamId: stream.id,
      command: stream.ffmpegCommand 
    })

    const process = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    // Handle process output
    process.stdout.on('data', (data) => {
      logger.ffmpeg('FFmpeg stdout', { 
        streamId: stream.id, 
        output: data.toString().trim() 
      })
    })

    process.stderr.on('data', (data) => {
      const output = data.toString().trim()
      logger.ffmpeg('FFmpeg stderr', { 
        streamId: stream.id, 
        output 
      })
      
      // Check for errors in stderr
      if (output.includes('error') || output.includes('failed')) {
        const currentStream = this.streams.get(stream.id)
        if (currentStream) {
          currentStream.errors.push({
            timestamp: new Date().toISOString(),
            message: output
          })
          this.streams.set(stream.id, currentStream)
        }
      }
    })

    // Handle process exit
    process.on('exit', (code, signal) => {
      logger.ffmpeg('FFmpeg process exited', { 
        streamId: stream.id, 
        code, 
        signal 
      })

      const currentStream = this.streams.get(stream.id)
      if (currentStream) {
        currentStream.status = code === 0 ? 'stopped' : 'error'
        currentStream.pid = null
        currentStream.startedAt = null
        
        if (code !== 0) {
          currentStream.errors.push({
            timestamp: new Date().toISOString(),
            message: `Process exited with code ${code}`
          })
        }
        
        this.streams.set(stream.id, currentStream)
        this.saveStreams()
      }

      this.processes.delete(stream.id)
    })

    process.on('error', (error) => {
      logger.error('FFmpeg process error:', error)
      
      const currentStream = this.streams.get(stream.id)
      if (currentStream) {
        currentStream.status = 'error'
        currentStream.errors.push({
          timestamp: new Date().toISOString(),
          message: error.message
        })
        this.streams.set(stream.id, currentStream)
      }
    })

    return process
  }

  generateFFmpegCommand(stream) {
    const {
      channel,
      name,
      bitrate = config.audio.defaultBitrate,
      sampleRate = config.audio.defaultSampleRate,
      codec = 'mp3'
    } = stream

    // Basic validation
    validateFFmpegParams(`${channel} ${name} ${bitrate} ${sampleRate} ${codec}`)

    const icecastUrl = `icecast://source:${config.icecast.sourcePassword}@${config.icecast.host}:${config.icecast.port}/${name}`
    
    // Construct FFmpeg command based on platform and configuration
    let command = `${this.ffmpegPath}`
    
    if (config.development.simulateHardware) {
      // Use virtual audio device for development
      if (process.platform === 'win32') {
        command += ` -f dshow -i audio="${config.development.virtualAudioDevice}"`
      } else if (process.platform === 'darwin') {
        command += ` -f avfoundation -i ":0"`
      } else {
        command += ` -f pulse -i default`
      }
    } else {
      // Use real audio device
      if (process.platform === 'win32') {
        command += ` -f dshow -i audio="${stream.deviceName}"`
      } else if (process.platform === 'darwin') {
        command += ` -f avfoundation -i "${stream.deviceName}"`
      } else {
        command += ` -f pulse -i "${stream.deviceName}"`
      }
    }
    
    command += ` -map 0:${channel - 1}` // Map specific channel (0-indexed)
    command += ` -acodec ${codec}`
    command += ` -b:a ${bitrate}`
    command += ` -ar ${sampleRate}`
    command += ` -ac 1` // Mono output
    command += ` -f ${codec}`
    command += ` -content_type audio/${codec}`
    command += ` -ice_name "${stream.description || stream.name}"`
    command += ` -ice_description "${stream.description || `Audio stream for ${stream.language}`}"`
    command += ` -ice_genre "Speech"`
    command += ` "${icecastUrl}"`

    return command
  }

  validateStreamConfig(config) {
    const required = ['name', 'channel', 'language']
    for (const field of required) {
      if (!config[field]) {
        throw new AppError(`Missing required field: ${field}`, 400)
      }
    }

    if (config.channel < 1 || config.channel > 32) {
      throw new AppError('Channel must be between 1 and 32', 400)
    }

    if (config.bitrate && !config.bitrate.match(/^\d+k$/)) {
      throw new AppError('Invalid bitrate format. Use format like "128k"', 400)
    }
  }

  async getStatus() {
    const activeStreams = Array.from(this.streams.values()).filter(s => s.status === 'running')
    
    return {
      status: 'healthy',
      activeStreams: activeStreams.length,
      totalStreams: this.streams.size,
      maxConcurrentStreams: this.maxConcurrentStreams,
      version: await this.getVersion(),
      processes: Array.from(this.processes.keys())
    }
  }

  async getStreamStats() {
    const streams = Array.from(this.streams.values())
    
    return {
      total: streams.length,
      running: streams.filter(s => s.status === 'running').length,
      stopped: streams.filter(s => s.status === 'stopped').length,
      error: streams.filter(s => s.status === 'error').length,
      byLanguage: this.groupStreamsByLanguage(streams),
      byChannel: this.groupStreamsByChannel(streams)
    }
  }

  groupStreamsByLanguage(streams) {
    return streams.reduce((acc, stream) => {
      acc[stream.language] = (acc[stream.language] || 0) + 1
      return acc
    }, {})
  }

  groupStreamsByChannel(streams) {
    return streams.reduce((acc, stream) => {
      acc[stream.channel] = (acc[stream.channel] || 0) + 1
      return acc
    }, {})
  }

  async configure(newConfig) {
    try {
      if (newConfig.path) {
        this.ffmpegPath = newConfig.path
        await this.testInstallation()
      }
      
      if (newConfig.maxConcurrentStreams) {
        this.maxConcurrentStreams = newConfig.maxConcurrentStreams
      }

      logger.ffmpeg('FFmpeg configuration updated', newConfig)
      
      return {
        success: true,
        config: {
          path: this.ffmpegPath,
          maxConcurrentStreams: this.maxConcurrentStreams
        }
      }
    } catch (error) {
      logger.error('FFmpeg configuration failed:', error)
      throw new AppError(`FFmpeg configuration failed: ${error.message}`, 500)
    }
  }

  async cleanup() {
    logger.ffmpeg('Cleaning up FFmpeg Service')
    
    // Stop all running streams
    const runningStreams = Array.from(this.streams.values()).filter(s => s.status === 'running')
    for (const stream of runningStreams) {
      try {
        await this.stopStream(stream.id)
      } catch (error) {
        logger.error(`Failed to stop stream ${stream.id}:`, error)
      }
    }
    
    // Save final state
    await this.saveStreams()
  }
}

module.exports = FFmpegService

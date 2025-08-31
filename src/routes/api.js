const express = require('express')
const router = express.Router()
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticate, authorize } = require('../middleware/auth')
const { sanitizeInput } = require('../middleware/validation')
const logger = require('../utils/logger')

// Import settings routes (will need to convert to CommonJS)
const settingsRoutes = require('./settings')

/**
 * API Health Check
 */
router.get('/health', asyncHandler(async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../../package.json').version,
    environment: process.env.NODE_ENV || 'development',
    services: {}
  }

  // Check service health
  try {
    const { system, icecast, ffmpeg, audioDevice } = req.services

    // System service health
    if (system && system.getSystemInfo) {
      const systemInfo = await system.getSystemInfo()
      healthCheck.services.system = {
        status: 'healthy',
        cpu: systemInfo.cpu,
        memory: systemInfo.memory,
        network: systemInfo.network
      }
    }

    // Icecast service health
    if (icecast && icecast.getStatus) {
      const icecastStatus = await icecast.getStatus()
      healthCheck.services.icecast = {
        status: icecastStatus.running ? 'healthy' : 'stopped',
        version: icecastStatus.version,
        uptime: icecastStatus.uptime
      }
    }

    // FFmpeg service health
    if (ffmpeg && ffmpeg.getStatus) {
      const ffmpegStatus = await ffmpeg.getStatus()
      healthCheck.services.ffmpeg = {
        status: 'healthy',
        version: ffmpegStatus.version,
        activeStreams: ffmpegStatus.activeStreams
      }
    }

    // Audio device service health
    if (audioDevice && audioDevice.getDevices) {
      const devices = await audioDevice.getDevices()
      healthCheck.services.audioDevice = {
        status: 'healthy',
        devicesCount: devices.length,
        connectedDevices: devices.filter(d => d.connected).length
      }
    }

  } catch (error) {
    logger.error('Health check error:', error)
    healthCheck.services.error = error.message
  }

  res.json({
    success: true,
    data: healthCheck
  })
}))

/**
 * API Information
 */
router.get('/info', asyncHandler(async (req, res) => {
  const packageInfo = require('../../package.json')
  
  res.json({
    success: true,
    data: {
      name: packageInfo.name,
      version: packageInfo.version,
      description: packageInfo.description,
      author: packageInfo.author,
      license: packageInfo.license,
      repository: packageInfo.repository,
      features: [
        'Multi-channel audio streaming',
        'Real-time stream management',
        'Web-based administration',
        'FFmpeg integration',
        'Icecast server management',
        'Audio device detection',
        'OBS Studio integration',
        'QR code generation',
        'Live monitoring'
      ],
      endpoints: {
        auth: '/api/auth',
        streams: '/api/streams',
        system: '/api/system',
        setup: '/api/setup'
      }
    }
  })
}))

/**
 * API Statistics
 */
router.get('/stats', authenticate, authorize('admin', 'operator'), asyncHandler(async (req, res) => {
  const stats = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requests: {
      total: req.app.locals.requestCount || 0,
      errors: req.app.locals.errorCount || 0
    },
    streams: {},
    system: {},
    clients: {}
  }

  try {
    const { system, icecast, ffmpeg } = req.services

    // Get stream statistics
    if (ffmpeg && ffmpeg.getStreamStats) {
      stats.streams = await ffmpeg.getStreamStats()
    }

    // Get system statistics
    if (system && system.getStats) {
      stats.system = await system.getStats()
    }

    // Get client statistics
    if (icecast && icecast.getClientStats) {
      stats.clients = await icecast.getClientStats()
    }

  } catch (error) {
    logger.error('Stats collection error:', error)
    stats.error = error.message
  }

  res.json({
    success: true,
    data: stats
  })
}))

/**
 * API Configuration
 */
router.get('/config', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const config = require('../config')
  
  // Remove sensitive information
  const safeConfig = {
    server: {
      port: config.server.port,
      host: config.server.host,
      env: config.server.env
    },
    icecast: {
      host: config.icecast.host,
      port: config.icecast.port
    },
    ffmpeg: {
      logLevel: config.ffmpeg.logLevel,
      maxConcurrentStreams: config.ffmpeg.maxConcurrentStreams
    },
    audio: config.audio,
    network: {
      streamBaseUrl: config.network.streamBaseUrl,
      clientPort: config.network.clientPort,
      enableCors: config.network.enableCors
    },
    logging: {
      level: config.logging.level,
      filePath: config.logging.filePath
    },
    monitoring: config.monitoring
  }

  res.json({
    success: true,
    data: safeConfig
  })
}))

/**
 * Request logging middleware
 */
router.use((req, res, next) => {
  // Increment request counter
  req.app.locals.requestCount = (req.app.locals.requestCount || 0) + 1
  
  // Log API requests
  logger.info('API Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous'
  })
  
  next()
})

/**
 * Error counting middleware
 */
router.use((err, req, res, next) => {
  // Increment error counter
  req.app.locals.errorCount = (req.app.locals.errorCount || 0) + 1
  next(err)
})

// Settings routes
router.use('/settings', settingsRoutes)

module.exports = router

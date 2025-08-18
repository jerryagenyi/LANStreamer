const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const path = require('path')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')

const config = require('./config')
const logger = require('./utils/logger')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')
const authMiddleware = require('./middleware/auth')
const validationMiddleware = require('./middleware/validation')

// Import routes
const apiRoutes = require('./routes/api')
const authRoutes = require('./routes/auth')
const streamRoutes = require('./routes/streams')
const systemRoutes = require('./routes/system')
const setupRoutes = require('./routes/setup')

// Import services
const SystemService = require('./services/SystemService')
const IcecastService = require('./services/IcecastService')
const FFmpegService = require('./services/FFmpegService')
const AudioDeviceService = require('./services/AudioDeviceService')
const WebSocketService = require('./services/WebSocketService')

class LANStreamerServer {
  constructor() {
    this.app = express()
    this.server = http.createServer(this.app)
    this.io = socketIo(this.server, {
      cors: {
        origin: config.network.enableCors ? "*" : false,
        methods: ["GET", "POST"]
      }
    })
    
    this.services = {}
    this.isShuttingDown = false
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing LANStreamer Server...')
      
      // Initialize services
      await this.initializeServices()
      
      // Setup middleware
      this.setupMiddleware()
      
      // Setup routes
      this.setupRoutes()
      
      // Setup error handling
      this.setupErrorHandling()
      
      // Setup WebSocket
      this.setupWebSocket()
      
      // Setup graceful shutdown
      this.setupGracefulShutdown()
      
      logger.info('✅ Server initialization complete')
    } catch (error) {
      logger.error('❌ Server initialization failed:', error)
      process.exit(1)
    }
  }

  async initializeServices() {
    logger.info('🔧 Initializing services...')
    
    this.services.system = new SystemService()
    this.services.icecast = new IcecastService()
    this.services.ffmpeg = new FFmpegService()
    this.services.audioDevice = new AudioDeviceService()
    this.services.webSocket = new WebSocketService(this.io)
    
    // Initialize each service
    for (const [name, service] of Object.entries(this.services)) {
      try {
        if (service.initialize) {
          await service.initialize()
          logger.info(`✅ ${name} service initialized`)
        }
      } catch (error) {
        logger.error(`❌ Failed to initialize ${name} service:`, error)
        throw error
      }
    }
  }

  setupMiddleware() {
    logger.info('🔧 Setting up middleware...')
    
    // Security middleware
    if (config.security.enableHelmet) {
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
          }
        }
      }))
    }
    
    // Compression
    if (config.security.enableCompression) {
      this.app.use(compression())
    }
    
    // CORS
    if (config.network.enableCors) {
      this.app.use(cors())
    }
    
    // Rate limiting
    if (config.network.enableRateLimiting) {
      const limiter = rateLimit({
        windowMs: config.network.rateLimitWindowMs,
        max: config.network.rateLimitMaxRequests,
        message: 'Too many requests from this IP, please try again later.'
      })
      this.app.use('/api/', limiter)
    }
    
    // Logging
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }))
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    
    // Static files
    this.app.use(express.static(path.join(__dirname, '../frontend/dist')))
    
    // Make services available to routes
    this.app.use((req, res, next) => {
      req.services = this.services
      next()
    })
  }

  setupRoutes() {
    logger.info('🔧 Setting up routes...')
    
    // API routes
    this.app.use('/api', apiRoutes)
    this.app.use('/api/auth', authRoutes)
    this.app.use('/api/streams', streamRoutes)
    this.app.use('/api/system', systemRoutes)
    this.app.use('/api/setup', setupRoutes)
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../package.json').version
      })
    })
    
    // Serve frontend for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
    })
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler)
    
    // Global error handler
    this.app.use(errorHandler)
  }

  setupWebSocket() {
    logger.info('🔧 Setting up WebSocket...')
    this.services.webSocket.setupEventHandlers()
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return
      this.isShuttingDown = true
      
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`)
      
      // Stop accepting new connections
      this.server.close(async () => {
        try {
          // Cleanup services
          for (const [name, service] of Object.entries(this.services)) {
            if (service.cleanup) {
              await service.cleanup()
              logger.info(`✅ ${name} service cleaned up`)
            }
          }
          
          logger.info('✅ Graceful shutdown complete')
          process.exit(0)
        } catch (error) {
          logger.error('❌ Error during shutdown:', error)
          process.exit(1)
        }
      })
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('❌ Forced shutdown after timeout')
        process.exit(1)
      }, 30000)
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  }

  async start() {
    await this.initialize()
    
    this.server.listen(config.server.port, config.server.host, () => {
      logger.info(`🎵 LANStreamer Server running on http://${config.server.host}:${config.server.port}`)
      logger.info(`🌐 Environment: ${config.server.env}`)
      logger.info(`📡 WebSocket server ready`)
      
      if (config.development.simulateHardware) {
        logger.info('🔧 Running in hardware simulation mode')
      }
    })
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new LANStreamerServer()
  server.start().catch(error => {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  })
}

module.exports = LANStreamerServer

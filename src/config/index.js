/**
 * LANStreamer Configuration Management
 *
 * This file centralizes all application configuration, loading from environment variables
 * and providing default values. It organizes configuration into logical sections:
 * - Server settings (port, host, environment)
 * - Security configuration (JWT, passwords, encryption)
 * - External service settings (Icecast, FFmpeg)
 * - Audio and network configuration
 * - Logging and monitoring settings
 * - Development and testing options
 *
 * The configuration is validated in production to ensure required values are set.
 */

const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config()

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    sessionSecret: process.env.SESSION_SECRET || 'session-secret',
    enableHelmet: process.env.ENABLE_HELMET === 'true',
    enableCompression: process.env.ENABLE_COMPRESSION === 'true'
  },

  // Icecast Configuration
  icecast: {
    host: process.env.ICECAST_HOST || 'localhost',
    port: parseInt(process.env.ICECAST_PORT) || 8000,
    adminPassword: process.env.ICECAST_ADMIN_PASSWORD || 'hackme',
    sourcePassword: process.env.ICECAST_SOURCE_PASSWORD || 'hackme',
    configPath: process.env.ICECAST_CONFIG_PATH || '/usr/local/etc/icecast.xml'
  },

  // FFmpeg Configuration
  ffmpeg: {
    path: process.env.FFMPEG_PATH || 'ffmpeg',
    logLevel: process.env.FFMPEG_LOG_LEVEL || 'info',
    maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS) || 16
  },

  // Audio Configuration
  audio: {
    defaultBitrate: process.env.DEFAULT_BITRATE || '128k',
    defaultSampleRate: parseInt(process.env.DEFAULT_SAMPLE_RATE) || 44100,
    defaultChannels: parseInt(process.env.DEFAULT_CHANNELS) || 2,
    bufferSize: parseInt(process.env.AUDIO_BUFFER_SIZE) || 1024
  },

  // Network Configuration
  network: {
    streamBaseUrl: process.env.STREAM_BASE_URL || 'http://localhost:8000',
    clientPort: parseInt(process.env.CLIENT_PORT) || 8080,
    websocketPort: parseInt(process.env.WEBSOCKET_PORT) || 3001,
    enableCors: process.env.ENABLE_CORS === 'true',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  },

  // Development Configuration
  development: {
    simulateHardware: process.env.SIMULATE_HARDWARE === 'true',
    virtualAudioDevice: process.env.VIRTUAL_AUDIO_DEVICE || 'VB-Cable'
  },

  // External Integrations
  integrations: {
    obsStudioPath: process.env.OBS_STUDIO_PATH || '',
    enableObsIntegration: process.env.ENABLE_OBS_INTEGRATION === 'true'
  },

  // Database Configuration
  database: {
    configDbPath: process.env.CONFIG_DB_PATH || './data/config.json',
    streamsDbPath: process.env.STREAMS_DB_PATH || './data/streams.json'
  },

  // Monitoring Configuration
  monitoring: {
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS === 'true',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    metricsEnabled: process.env.METRICS_ENABLED === 'true'
  },

  // File Upload Configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  },

  // Backup Configuration
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: parseInt(process.env.BACKUP_INTERVAL) || 3600000,
    path: process.env.BACKUP_PATH || './backups'
  }
}

// Validate required configuration
const validateConfig = () => {
  const required = [
    'security.jwtSecret',
    'icecast.adminPassword',
    'icecast.sourcePassword'
  ]

  for (const key of required) {
    const value = key.split('.').reduce((obj, k) => obj[k], config)
    if (!value || value.includes('default') || value.includes('change')) {
      console.warn(`⚠️  Warning: ${key} is using default value. Please update in production.`)
    }
  }
}

// Validate configuration in production
if (config.server.env === 'production') {
  validateConfig()
}

module.exports = config

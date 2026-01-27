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

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables (only for non-Icecast configs)
dotenv.config()

/**
 * Get Icecast port from device-config.json (synced from icecast.xml)
 * This is the single source of truth - reads from cache, not env vars
 */
function getIcecastPortFromDeviceConfig() {
  try {
    const deviceConfigPath = path.join(process.cwd(), 'config', 'device-config.json')
    if (fs.existsSync(deviceConfigPath)) {
      const deviceConfig = JSON.parse(fs.readFileSync(deviceConfigPath, 'utf8'))
      if (deviceConfig.port) {
        return deviceConfig.port
      }
    }
  } catch (error) {
    // Silently fail - will use default
  }
  // Fallback default (only used if device-config.json doesn't exist yet)
  // This default is overwritten once IcecastService initializes and reads icecast.xml
  return 8000
}

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

  // Icecast Configuration - MINIMAL FALLBACK ONLY
  // All Icecast config is read from icecast.xml at runtime via IcecastService
  // These defaults are ONLY used if IcecastService hasn't initialized yet (rare edge case)
  // Use IcecastService.getActualPort(), getSourcePassword(), getAdminPassword(), getHostname()
  icecast: {
    port: getIcecastPortFromDeviceConfig(), // Fallback only - use IcecastService.getActualPort() instead
    // Passwords and hostname are NOT stored here - always read from icecast.xml at runtime
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
    // streamBaseUrl is built dynamically at runtime using IcecastService.getActualPort()
    // Cannot set here as IcecastService may not be initialized yet
    streamBaseUrl: null, // Set at runtime via IcecastService
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
    'security.jwtSecret'
    // Note: Icecast passwords are read from icecast.xml at runtime, not validated here
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

export default config

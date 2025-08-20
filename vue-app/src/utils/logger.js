const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const path = require('path')
const fs = require('fs-extra')
const config = require('../config')

// Ensure log directory exists
const logDir = path.resolve(config.logging.filePath)
fs.ensureDirSync(logDir)

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }
    
    return log
  })
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`
    if (stack) {
      log += `\n${stack}`
    }
    return log
  })
)

// Create transports
const transports = []

// Console transport
transports.push(
  new winston.transports.Console({
    level: config.server.env === 'development' ? 'debug' : config.logging.level,
    format: config.server.env === 'development' ? consoleFormat : logFormat,
    handleExceptions: true,
    handleRejections: true
  })
)

// File transport for all logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'lanstreamer-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    level: config.logging.level,
    format: logFormat,
    handleExceptions: true,
    handleRejections: true
  })
)

// Error-only file transport
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    level: 'error',
    format: logFormat,
    handleExceptions: true,
    handleRejections: true
  })
)

// Stream-specific file transport
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'streams-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    level: 'info',
    format: logFormat,
    filter: (info) => {
      return info.category === 'stream' || info.service === 'ffmpeg' || info.service === 'icecast'
    }
  })
)

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false
})

// Add custom methods for specific categories
logger.stream = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'stream' })
}

logger.ffmpeg = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'ffmpeg' })
}

logger.icecast = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'icecast' })
}

logger.system = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'system' })
}

logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, category: 'security' })
}

logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'performance' })
}

// Log uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Export logger
module.exports = logger

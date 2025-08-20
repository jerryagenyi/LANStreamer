const logger = require('../utils/logger')
const config = require('../config')

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.timestamp = new Date().toISOString()
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = new AppError(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered'
    error = new AppError(message, 400)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = new AppError(message, 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = new AppError(message, 401)
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = new AppError(message, 401)
  }

  // FFmpeg errors
  if (err.code === 'FFMPEG_ERROR') {
    const message = `FFmpeg error: ${err.message}`
    error = new AppError(message, 500)
  }

  // Icecast errors
  if (err.code === 'ICECAST_ERROR') {
    const message = `Icecast error: ${err.message}`
    error = new AppError(message, 500)
  }

  // Audio device errors
  if (err.code === 'AUDIO_DEVICE_ERROR') {
    const message = `Audio device error: ${err.message}`
    error = new AppError(message, 500)
  }

  // System errors
  if (err.code === 'SYSTEM_ERROR') {
    const message = `System error: ${err.message}`
    error = new AppError(message, 500)
  }

  // File system errors
  if (err.code === 'ENOENT') {
    const message = 'File or directory not found'
    error = new AppError(message, 404)
  }

  if (err.code === 'EACCES') {
    const message = 'Permission denied'
    error = new AppError(message, 403)
  }

  // Network errors
  if (err.code === 'ECONNREFUSED') {
    const message = 'Connection refused'
    error = new AppError(message, 503)
  }

  if (err.code === 'ETIMEDOUT') {
    const message = 'Connection timeout'
    error = new AppError(message, 504)
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal Server Error'

  // Send error response
  const errorResponse = {
    success: false,
    error: {
      message,
      timestamp: new Date().toISOString(),
      ...(config.server.env === 'development' && {
        stack: err.stack,
        details: error
      })
    }
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`
  const error = new AppError(message, 404)
  next(error)
}

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Validation error handler
 */
const validationErrorHandler = (errors) => {
  const message = errors.map(error => error.msg).join(', ')
  return new AppError(message, 400)
}

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler
}

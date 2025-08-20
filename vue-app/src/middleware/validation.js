const Joi = require('joi')
const { validationResult } = require('express-validator')
const { AppError, validationErrorHandler } = require('./errorHandler')

/**
 * Joi validation schemas
 */
const schemas = {
  // Stream configuration validation
  streamConfig: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    language: Joi.string().min(2).max(10).required(),
    channel: Joi.number().integer().min(1).max(32).required(),
    bitrate: Joi.string().pattern(/^\d+k$/).default('128k'),
    sampleRate: Joi.number().valid(22050, 44100, 48000).default(44100),
    codec: Joi.string().valid('mp3', 'aac', 'ogg').default('mp3'),
    autoStart: Joi.boolean().default(false),
    metadata: Joi.object({
      title: Joi.string().max(200).optional(),
      artist: Joi.string().max(200).optional(),
      genre: Joi.string().max(100).optional()
    }).optional()
  }),

  // System configuration validation
  systemConfig: Joi.object({
    icecast: Joi.object({
      host: Joi.string().hostname().default('localhost'),
      port: Joi.number().port().default(8000),
      adminPassword: Joi.string().min(6).required(),
      sourcePassword: Joi.string().min(6).required(),
      maxClients: Joi.number().integer().min(1).max(1000).default(100)
    }).required(),
    ffmpeg: Joi.object({
      path: Joi.string().required(),
      logLevel: Joi.string().valid('quiet', 'panic', 'fatal', 'error', 'warning', 'info', 'verbose', 'debug').default('info'),
      maxConcurrentStreams: Joi.number().integer().min(1).max(32).default(16)
    }).required(),
    network: Joi.object({
      streamBaseUrl: Joi.string().uri().required(),
      enableCors: Joi.boolean().default(true),
      rateLimitEnabled: Joi.boolean().default(true)
    }).optional()
  }),

  // Audio device configuration validation
  audioDevice: Joi.object({
    deviceId: Joi.string().required(),
    deviceName: Joi.string().required(),
    channels: Joi.array().items(
      Joi.object({
        index: Joi.number().integer().min(1).required(),
        name: Joi.string().max(100).required(),
        language: Joi.string().min(2).max(10).required(),
        enabled: Joi.boolean().default(true)
      })
    ).min(1).required()
  }),

  // User authentication validation
  userAuth: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('admin', 'operator', 'viewer').default('viewer')
  }),

  // OBS integration validation
  obsConfig: Joi.object({
    enabled: Joi.boolean().required(),
    rtmpUrl: Joi.string().uri().when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    streamKey: Joi.string().when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    platform: Joi.string().valid('youtube', 'twitch', 'facebook', 'custom').when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  // Stream control validation
  streamControl: Joi.object({
    action: Joi.string().valid('start', 'stop', 'restart').required(),
    streamId: Joi.string().uuid().required()
  }),

  // Bulk stream control validation
  bulkStreamControl: Joi.object({
    action: Joi.string().valid('start', 'stop', 'restart').required(),
    streamIds: Joi.array().items(Joi.string().uuid()).min(1).optional()
  }),

  // Log query validation
  logQuery: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
    service: Joi.string().valid('ffmpeg', 'icecast', 'system', 'stream').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  })
}

/**
 * Joi validation middleware factory
 */
const validateSchema = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    })

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ')
      return next(new AppError(errorMessage, 400))
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value
    next()
  }
}

/**
 * Express-validator result handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(validationErrorHandler(errors.array()))
  }
  next()
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize)
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value)
      }
      return sanitized
    }
    
    return obj
  }

  if (req.body) {
    req.body = sanitize(req.body)
  }
  
  if (req.query) {
    req.query = sanitize(req.query)
  }
  
  if (req.params) {
    req.params = sanitize(req.params)
  }

  next()
}

/**
 * Validate FFmpeg parameters to prevent command injection
 */
const validateFFmpegParams = (params) => {
  const dangerousPatterns = [
    /[;&|`$(){}[\]]/,  // Shell metacharacters
    /\.\./,            // Directory traversal
    /\/dev\//,         // Device files
    /\/proc\//,        // Process files
    /\/sys\//,         // System files
    /rm\s/,            // Remove commands
    /del\s/,           // Delete commands
    /format\s/,        // Format commands
    /exec/,            // Execute commands
    /eval/,            // Eval commands
    /system/           // System commands
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(params)) {
      throw new AppError('Invalid FFmpeg parameters detected', 400)
    }
  }

  return true
}

/**
 * Validate file paths to prevent directory traversal
 */
const validateFilePath = (filePath) => {
  const normalizedPath = require('path').normalize(filePath)
  
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    throw new AppError('Invalid file path', 400)
  }
  
  return true
}

/**
 * Validate network configuration
 */
const validateNetworkConfig = (config) => {
  const { host, port } = config
  
  // Validate host
  const hostPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$|^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!hostPattern.test(host)) {
    throw new AppError('Invalid host format', 400)
  }
  
  // Validate port
  if (port < 1 || port > 65535) {
    throw new AppError('Port must be between 1 and 65535', 400)
  }
  
  // Check for reserved ports
  const reservedPorts = [22, 23, 25, 53, 80, 110, 143, 443, 993, 995]
  if (reservedPorts.includes(port)) {
    throw new AppError('Cannot use reserved port', 400)
  }
  
  return true
}

module.exports = {
  schemas,
  validateSchema,
  handleValidationErrors,
  sanitizeInput,
  validateFFmpegParams,
  validateFilePath,
  validateNetworkConfig
}

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { AppError } = require('./errorHandler')
const config = require('../config')
const logger = require('../utils/logger')

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, config.security.jwtSecret, {
    expiresIn: config.security.jwtExpiresIn
  })
}

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.security.jwtSecret)
}

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Compare password
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    let token

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }
    // Get token from cookie
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }

    if (!token) {
      logger.security('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url
      })
      return next(new AppError('Access denied. No token provided.', 401))
    }

    try {
      const decoded = verifyToken(token)
      req.user = decoded
      
      logger.security('Authentication successful', {
        userId: decoded.id,
        role: decoded.role,
        ip: req.ip
      })
      
      next()
    } catch (error) {
      logger.security('Authentication failed: Invalid token', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      })
      return next(new AppError('Invalid token.', 401))
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Authentication required.', 401))
    }

    if (!roles.includes(req.user.role)) {
      logger.security('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        url: req.url
      })
      return next(new AppError('Access denied. Insufficient permissions.', 403))
    }

    next()
  }
}

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }

    if (token) {
      try {
        const decoded = verifyToken(token)
        req.user = decoded
      } catch (error) {
        // Token is invalid but we don't throw error for optional auth
        logger.debug('Optional auth: Invalid token provided')
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Rate limiting for authentication attempts
 */
const authRateLimit = new Map()

const checkAuthRateLimit = (req, res, next) => {
  const ip = req.ip
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  if (!authRateLimit.has(ip)) {
    authRateLimit.set(ip, { attempts: 1, resetTime: now + windowMs })
    return next()
  }

  const record = authRateLimit.get(ip)

  if (now > record.resetTime) {
    // Reset the record
    authRateLimit.set(ip, { attempts: 1, resetTime: now + windowMs })
    return next()
  }

  if (record.attempts >= maxAttempts) {
    logger.security('Authentication rate limit exceeded', {
      ip,
      attempts: record.attempts,
      resetTime: new Date(record.resetTime)
    })
    return next(new AppError('Too many authentication attempts. Please try again later.', 429))
  }

  record.attempts++
  next()
}

/**
 * Clear auth rate limit on successful authentication
 */
const clearAuthRateLimit = (ip) => {
  authRateLimit.delete(ip)
}

/**
 * Admin authentication for setup and configuration
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const { password } = req.body

    if (!password) {
      return next(new AppError('Admin password required', 401))
    }

    // In a real application, you'd compare against a hashed password
    // For simplicity, we're using direct comparison here
    if (password !== config.security.adminPassword) {
      logger.security('Admin authentication failed: Invalid password', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      })
      return next(new AppError('Invalid admin password', 401))
    }

    // Generate admin token
    const token = generateToken({
      id: 'admin',
      role: 'admin',
      type: 'admin'
    })

    req.adminToken = token
    req.user = { id: 'admin', role: 'admin' }

    logger.security('Admin authentication successful', {
      ip: req.ip
    })

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticate,
  authorize,
  optionalAuth,
  checkAuthRateLimit,
  clearAuthRateLimit,
  authenticateAdmin
}

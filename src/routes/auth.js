const express = require('express')
const router = express.Router()
const { asyncHandler } = require('../middleware/errorHandler')
const { 
  generateToken, 
  authenticateAdmin, 
  authenticate,
  checkAuthRateLimit,
  clearAuthRateLimit
} = require('../middleware/auth')
const { validateSchema, sanitizeInput } = require('../middleware/validation')
const logger = require('../utils/logger')

/**
 * Admin Login
 * POST /api/auth/admin/login
 */
router.post('/admin/login', 
  sanitizeInput,
  checkAuthRateLimit,
  validateSchema(require('../middleware/validation').schemas.userAuth),
  asyncHandler(async (req, res) => {
    const { password } = req.body
    const config = require('../config')

    // Simple admin authentication (in production, use proper user management)
    if (password !== config.security.adminPassword) {
      logger.security('Admin login failed: Invalid password', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      })
      
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid admin credentials',
          code: 'INVALID_CREDENTIALS'
        }
      })
    }

    // Generate admin token
    const token = generateToken({
      id: 'admin',
      role: 'admin',
      type: 'admin',
      loginTime: new Date().toISOString()
    })

    // Clear rate limit on successful login
    clearAuthRateLimit(req.ip)

    logger.security('Admin login successful', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: 'admin',
          role: 'admin',
          permissions: ['read', 'write', 'admin']
        },
        expiresIn: config.security.jwtExpiresIn
      }
    })
  })
)

/**
 * Verify Token
 * GET /api/auth/verify
 */
router.get('/verify', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      valid: true,
      timestamp: new Date().toISOString()
    }
  })
}))

/**
 * Refresh Token
 * POST /api/auth/refresh
 */
router.post('/refresh', authenticate, asyncHandler(async (req, res) => {
  const config = require('../config')
  
  // Generate new token with same payload
  const newToken = generateToken({
    id: req.user.id,
    role: req.user.role,
    type: req.user.type,
    refreshTime: new Date().toISOString()
  })

  logger.security('Token refreshed', {
    userId: req.user.id,
    role: req.user.role,
    ip: req.ip
  })

  res.json({
    success: true,
    data: {
      token: newToken,
      expiresIn: config.security.jwtExpiresIn
    }
  })
}))

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just log the logout event
  
  logger.security('User logged out', {
    userId: req.user.id,
    role: req.user.role,
    ip: req.ip
  })

  res.json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  })
}))

/**
 * Get Current User Info
 * GET /api/auth/me
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const userInfo = {
    id: req.user.id,
    role: req.user.role,
    type: req.user.type,
    loginTime: req.user.loginTime,
    permissions: []
  }

  // Set permissions based on role
  switch (req.user.role) {
    case 'admin':
      userInfo.permissions = ['read', 'write', 'admin', 'system', 'config']
      break
    case 'operator':
      userInfo.permissions = ['read', 'write', 'streams']
      break
    case 'viewer':
      userInfo.permissions = ['read']
      break
    default:
      userInfo.permissions = []
  }

  res.json({
    success: true,
    data: userInfo
  })
}))

/**
 * Change Admin Password
 * POST /api/auth/admin/change-password
 */
router.post('/admin/change-password', 
  authenticate,
  sanitizeInput,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body
    const config = require('../config')

    // Verify current password
    if (currentPassword !== config.security.adminPassword) {
      logger.security('Password change failed: Invalid current password', {
        userId: req.user.id,
        ip: req.ip
      })
      
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid current password',
          code: 'INVALID_CURRENT_PASSWORD'
        }
      })
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'New password must be at least 6 characters long',
          code: 'INVALID_NEW_PASSWORD'
        }
      })
    }

    // In a real application, you would update the password in a database
    // For now, we'll just log the change (password would need to be updated in config)
    logger.security('Admin password change requested', {
      userId: req.user.id,
      ip: req.ip,
      note: 'Password change requires manual config update'
    })

    res.json({
      success: true,
      data: {
        message: 'Password change request logged. Please update configuration manually.',
        note: 'In production, this would update the stored password hash.'
      }
    })
  })
)

/**
 * Get Authentication Status
 * GET /api/auth/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  let authStatus = {
    authenticated: false,
    user: null,
    timestamp: new Date().toISOString()
  }

  // Check if user is authenticated (optional auth)
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (token) {
    try {
      const jwt = require('jsonwebtoken')
      const config = require('../config')
      const decoded = jwt.verify(token, config.security.jwtSecret)
      
      authStatus.authenticated = true
      authStatus.user = {
        id: decoded.id,
        role: decoded.role,
        type: decoded.type
      }
    } catch (error) {
      // Token is invalid, but we don't throw error for status check
      authStatus.tokenError = 'Invalid or expired token'
    }
  }

  res.json({
    success: true,
    data: authStatus
  })
}))

module.exports = router

const express = require('express')
const router = express.Router()
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticate, authorize, optionalAuth } = require('../middleware/auth')
const { validateSchema, sanitizeInput } = require('../middleware/validation')
const logger = require('../utils/logger')

/**
 * Get system information
 * GET /api/system/info
 */
router.get('/info', optionalAuth, asyncHandler(async (req, res) => {
  const { system } = req.services
  
  const systemInfo = await system.getSystemInfo()
  
  // Filter sensitive information for non-admin users
  if (!req.user || req.user.role !== 'admin') {
    const { internalIp, ...publicInfo } = systemInfo
    res.json({
      success: true,
      data: publicInfo
    })
  } else {
    res.json({
      success: true,
      data: systemInfo
    })
  }
}))

/**
 * Get system status
 * GET /api/system/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const { system, icecast, ffmpeg, audioDevice } = req.services
  
  const status = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    services: {}
  }

  try {
    // System status
    const systemStatus = await system.getStatus()
    status.services.system = systemStatus

    // Icecast status
    const icecastStatus = await icecast.getStatus()
    status.services.icecast = icecastStatus

    // FFmpeg status
    const ffmpegStatus = await ffmpeg.getStatus()
    status.services.ffmpeg = ffmpegStatus

    // Audio device status
    const audioStatus = await audioDevice.getStatus()
    status.services.audioDevice = audioStatus

    // Determine overall status
    const serviceStatuses = Object.values(status.services)
    if (serviceStatuses.some(s => s.status === 'error')) {
      status.overall = 'error'
    } else if (serviceStatuses.some(s => s.status === 'warning')) {
      status.overall = 'warning'
    }

  } catch (error) {
    logger.error('System status check failed:', error)
    status.overall = 'error'
    status.error = error.message
  }

  res.json({
    success: true,
    data: status
  })
}))

/**
 * Get system metrics
 * GET /api/system/metrics
 */
router.get('/metrics', authenticate, authorize('admin', 'operator'), asyncHandler(async (req, res) => {
  const { system } = req.services
  
  const metrics = await system.getMetrics()
  
  res.json({
    success: true,
    data: metrics
  })
}))

/**
 * Get system logs
 * GET /api/system/logs
 */
router.get('/logs', 
  authenticate, 
  authorize('admin'),
  validateSchema(require('../middleware/validation').schemas.logQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { system } = req.services
    const { level, service, startDate, endDate, limit, offset } = req.query
    
    const logs = await system.getLogs({
      level,
      service,
      startDate,
      endDate,
      limit,
      offset
    })
    
    res.json({
      success: true,
      data: logs
    })
  })
)

/**
 * Get network information
 * GET /api/system/network
 */
router.get('/network', optionalAuth, asyncHandler(async (req, res) => {
  const { system } = req.services
  
  const networkInfo = await system.getNetworkInfo()
  
  res.json({
    success: true,
    data: networkInfo
  })
}))

/**
 * Get audio devices
 * GET /api/system/audio-devices
 */
router.get('/audio-devices', authenticate, authorize('admin', 'operator'), asyncHandler(async (req, res) => {
  const { audioDevice } = req.services
  
  const devices = await audioDevice.getDevices()
  
  res.json({
    success: true,
    data: devices
  })
}))

/**
 * Test audio device
 * POST /api/system/audio-devices/:deviceId/test
 */
router.post('/audio-devices/:deviceId/test',
  authenticate,
  authorize('admin', 'operator'),
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params
    const { audioDevice } = req.services
    
    const testResult = await audioDevice.testDevice(deviceId)
    
    logger.system('Audio device test performed', {
      deviceId,
      result: testResult.success,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: testResult
    })
  })
)

/**
 * Get Icecast status and configuration
 * GET /api/system/icecast
 */
router.get('/icecast', authenticate, authorize('admin', 'operator'), asyncHandler(async (req, res) => {
  const { icecast } = req.services
  
  const icecastInfo = await icecast.getDetailedStatus()
  
  res.json({
    success: true,
    data: icecastInfo
  })
}))

/**
 * Start Icecast server
 * POST /api/system/icecast/start
 */
router.post('/icecast/start',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { icecast } = req.services
    
    const result = await icecast.start()
    
    logger.system('Icecast server start requested', {
      success: result.success,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: result
    })
  })
)

/**
 * Stop Icecast server
 * POST /api/system/icecast/stop
 */
router.post('/icecast/stop',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { icecast } = req.services
    
    const result = await icecast.stop()
    
    logger.system('Icecast server stop requested', {
      success: result.success,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: result
    })
  })
)

/**
 * Restart Icecast server
 * POST /api/system/icecast/restart
 */
router.post('/icecast/restart',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { icecast } = req.services
    
    const result = await icecast.restart()
    
    logger.system('Icecast server restart requested', {
      success: result.success,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: result
    })
  })
)

/**
 * Get FFmpeg information
 * GET /api/system/ffmpeg
 */
router.get('/ffmpeg', authenticate, authorize('admin', 'operator'), asyncHandler(async (req, res) => {
  const { ffmpeg } = req.services
  
  const ffmpegInfo = await ffmpeg.getInfo()
  
  res.json({
    success: true,
    data: ffmpegInfo
  })
}))

/**
 * Test FFmpeg installation
 * POST /api/system/ffmpeg/test
 */
router.post('/ffmpeg/test',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { ffmpeg } = req.services
    
    const testResult = await ffmpeg.testInstallation()
    
    logger.system('FFmpeg installation test performed', {
      success: testResult.success,
      version: testResult.version,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: testResult
    })
  })
)

/**
 * Generate QR code for stream access
 * GET /api/system/qr-code
 */
router.get('/qr-code', optionalAuth, asyncHandler(async (req, res) => {
  const { url } = req.query
  const QRCode = require('qrcode')
  const config = require('../config')
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'URL parameter is required',
        code: 'MISSING_URL'
      }
    })
  }

  try {
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    
    res.json({
      success: true,
      data: {
        url,
        qrCode: qrCodeDataURL,
        format: 'data:image/png;base64'
      }
    })
  } catch (error) {
    logger.error('QR code generation failed:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate QR code',
        code: 'QR_GENERATION_FAILED'
      }
    })
  }
}))

/**
 * System restart
 * POST /api/system/restart
 */
router.post('/restart',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { system } = req.services
    
    logger.system('System restart requested', {
      performedBy: req.user.id,
      timestamp: new Date().toISOString()
    })
    
    // Send response before restarting
    res.json({
      success: true,
      data: {
        message: 'System restart initiated',
        estimatedDowntime: '30-60 seconds'
      }
    })
    
    // Restart system after a short delay
    setTimeout(async () => {
      await system.restart()
    }, 2000)
  })
)

module.exports = router

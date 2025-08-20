const express = require('express')
const router = express.Router()
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticateAdmin, authenticate, authorize } = require('../middleware/auth')
const { validateSchema, sanitizeInput } = require('../middleware/validation')
const logger = require('../utils/logger')

/**
 * Check if system is already set up
 * GET /api/setup/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const { system } = req.services
  
  const setupStatus = await system.getSetupStatus()
  
  res.json({
    success: true,
    data: setupStatus
  })
}))

/**
 * Start setup wizard
 * POST /api/setup/start
 */
router.post('/start',
  sanitizeInput,
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { system } = req.services
    
    logger.system('Setup wizard started', {
      initiatedBy: req.user.id,
      timestamp: new Date().toISOString()
    })
    
    const setupSession = await system.startSetup()
    
    res.json({
      success: true,
      data: {
        sessionId: setupSession.id,
        token: req.adminToken,
        steps: setupSession.steps,
        currentStep: setupSession.currentStep
      }
    })
  })
)

/**
 * System validation step
 * POST /api/setup/validate-system
 */
router.post('/validate-system',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { system } = req.services
    
    const validation = await system.validateSystemRequirements()
    
    logger.system('System validation performed', {
      result: validation.passed,
      issues: validation.issues?.length || 0,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: validation
    })
  })
)

/**
 * Check dependencies
 * POST /api/setup/check-dependencies
 */
router.post('/check-dependencies',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { system, icecast, ffmpeg } = req.services
    
    const dependencies = {
      icecast: await icecast.checkInstallation(),
      ffmpeg: await ffmpeg.checkInstallation(),
      system: await system.checkDependencies()
    }
    
    const allInstalled = Object.values(dependencies).every(dep => dep.installed)
    
    logger.system('Dependencies checked', {
      icecastInstalled: dependencies.icecast.installed,
      ffmpegInstalled: dependencies.ffmpeg.installed,
      allInstalled,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: {
        dependencies,
        allInstalled,
        summary: {
          total: Object.keys(dependencies).length,
          installed: Object.values(dependencies).filter(d => d.installed).length,
          missing: Object.values(dependencies).filter(d => !d.installed).length
        }
      }
    })
  })
)

/**
 * Configure Icecast
 * POST /api/setup/configure-icecast
 */
router.post('/configure-icecast',
  authenticate,
  authorize('admin'),
  sanitizeInput,
  asyncHandler(async (req, res) => {
    const { icecast } = req.services
    const { adminPassword, sourcePassword, port, maxClients } = req.body
    
    const config = {
      adminPassword,
      sourcePassword,
      port: port || 8000,
      maxClients: maxClients || 100
    }
    
    const result = await icecast.configure(config)
    
    logger.system('Icecast configuration updated', {
      port: config.port,
      maxClients: config.maxClients,
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
 * Configure FFmpeg
 * POST /api/setup/configure-ffmpeg
 */
router.post('/configure-ffmpeg',
  authenticate,
  authorize('admin'),
  sanitizeInput,
  asyncHandler(async (req, res) => {
    const { ffmpeg } = req.services
    const { path, logLevel, maxConcurrentStreams } = req.body
    
    const config = {
      path: path || 'ffmpeg',
      logLevel: logLevel || 'info',
      maxConcurrentStreams: maxConcurrentStreams || 16
    }
    
    const result = await ffmpeg.configure(config)
    
    logger.system('FFmpeg configuration updated', {
      path: config.path,
      logLevel: config.logLevel,
      maxConcurrentStreams: config.maxConcurrentStreams,
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
 * Detect audio devices
 * POST /api/setup/detect-audio-devices
 */
router.post('/detect-audio-devices',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { audioDevice } = req.services
    
    const devices = await audioDevice.detectDevices()
    
    logger.system('Audio device detection performed', {
      devicesFound: devices.length,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: {
        devices,
        count: devices.length,
        recommended: devices.find(d => d.name.toLowerCase().includes('xr18')) || devices[0]
      }
    })
  })
)

/**
 * Configure audio device
 * POST /api/setup/configure-audio-device
 */
router.post('/configure-audio-device',
  authenticate,
  authorize('admin'),
  sanitizeInput,
  validateSchema(require('../middleware/validation').schemas.audioDevice),
  asyncHandler(async (req, res) => {
    const { audioDevice } = req.services
    const deviceConfig = req.body
    
    const result = await audioDevice.configure(deviceConfig)
    
    logger.system('Audio device configured', {
      deviceId: deviceConfig.deviceId,
      deviceName: deviceConfig.deviceName,
      channelCount: deviceConfig.channels.length,
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
 * Test audio configuration
 * POST /api/setup/test-audio
 */
router.post('/test-audio',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { audioDevice, ffmpeg } = req.services
    const { deviceId, channel } = req.body
    
    const testResult = await audioDevice.testAudioInput(deviceId, channel)
    
    logger.system('Audio input test performed', {
      deviceId,
      channel,
      success: testResult.success,
      audioLevel: testResult.audioLevel,
      performedBy: req.user.id
    })
    
    res.json({
      success: true,
      data: testResult
    })
  })
)

/**
 * Configure network settings
 * POST /api/setup/configure-network
 */
router.post('/configure-network',
  authenticate,
  authorize('admin'),
  sanitizeInput,
  asyncHandler(async (req, res) => {
    const { system } = req.services
    const { streamBaseUrl, enableCors, rateLimitEnabled } = req.body
    
    const networkConfig = {
      streamBaseUrl,
      enableCors: enableCors !== false,
      rateLimitEnabled: rateLimitEnabled !== false
    }
    
    const result = await system.configureNetwork(networkConfig)
    
    logger.system('Network configuration updated', {
      streamBaseUrl: networkConfig.streamBaseUrl,
      enableCors: networkConfig.enableCors,
      rateLimitEnabled: networkConfig.rateLimitEnabled,
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
 * Complete setup
 * POST /api/setup/complete
 */
router.post('/complete',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { system } = req.services
    
    const result = await system.completeSetup()
    
    logger.system('Setup wizard completed', {
      success: result.success,
      completedBy: req.user.id,
      timestamp: new Date().toISOString()
    })
    
    res.json({
      success: true,
      data: {
        message: 'Setup completed successfully',
        setupComplete: true,
        nextSteps: [
          'Create your first audio stream',
          'Test the streaming functionality',
          'Share the client URL with users'
        ],
        clientUrl: `${require('../config').network.streamBaseUrl}:${require('../config').network.clientPort}`
      }
    })
  })
)

/**
 * Reset setup (for development/testing)
 * POST /api/setup/reset
 */
router.post('/reset',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { system } = req.services
    
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Setup reset is not allowed in production',
          code: 'RESET_NOT_ALLOWED'
        }
      })
    }
    
    const result = await system.resetSetup()
    
    logger.system('Setup reset performed', {
      success: result.success,
      performedBy: req.user.id,
      timestamp: new Date().toISOString()
    })
    
    res.json({
      success: true,
      data: {
        message: 'Setup has been reset',
        setupComplete: false
      }
    })
  })
)

module.exports = router

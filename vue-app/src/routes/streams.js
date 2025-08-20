const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticate, authorize, optionalAuth } = require('../middleware/auth')
const { validateSchema, sanitizeInput } = require('../middleware/validation')
const logger = require('../utils/logger')

/**
 * Get all streams
 * GET /api/streams
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { ffmpeg } = req.services
  
  const streams = await ffmpeg.getAllStreams()
  
  // Filter sensitive information for non-admin users
  const filteredStreams = streams.map(stream => {
    if (!req.user || req.user.role !== 'admin') {
      const { ffmpegCommand, ...publicStream } = stream
      return publicStream
    }
    return stream
  })

  res.json({
    success: true,
    data: filteredStreams
  })
}))

/**
 * Get stream by ID
 * GET /api/streams/:id
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { ffmpeg } = req.services
  
  const stream = await ffmpeg.getStream(id)
  
  if (!stream) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Stream not found',
        code: 'STREAM_NOT_FOUND'
      }
    })
  }

  // Filter sensitive information for non-admin users
  if (!req.user || req.user.role !== 'admin') {
    const { ffmpegCommand, ...publicStream } = stream
    return res.json({
      success: true,
      data: publicStream
    })
  }

  res.json({
    success: true,
    data: stream
  })
}))

/**
 * Create new stream
 * POST /api/streams
 */
router.post('/', 
  authenticate,
  authorize('admin', 'operator'),
  sanitizeInput,
  validateSchema(require('../middleware/validation').schemas.streamConfig),
  asyncHandler(async (req, res) => {
    const { ffmpeg, icecast } = req.services
    const streamConfig = req.body

    // Generate unique stream ID
    const streamId = uuidv4()
    
    // Create stream configuration
    const stream = {
      id: streamId,
      ...streamConfig,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
      url: `${require('../config').network.streamBaseUrl}/${streamConfig.name}`,
      listeners: 0
    }

    // Validate that channel is not already in use
    const existingStreams = await ffmpeg.getAllStreams()
    const channelInUse = existingStreams.find(s => s.channel === streamConfig.channel && s.status === 'running')
    
    if (channelInUse) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Channel ${streamConfig.channel} is already in use by stream "${channelInUse.name}"`,
          code: 'CHANNEL_IN_USE'
        }
      })
    }

    // Create the stream
    await ffmpeg.createStream(stream)

    logger.stream('Stream created', {
      streamId,
      name: streamConfig.name,
      channel: streamConfig.channel,
      createdBy: req.user.id
    })

    res.status(201).json({
      success: true,
      data: stream
    })
  })
)

/**
 * Update stream configuration
 * PUT /api/streams/:id
 */
router.put('/:id',
  authenticate,
  authorize('admin', 'operator'),
  sanitizeInput,
  validateSchema(require('../middleware/validation').schemas.streamConfig),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { ffmpeg } = req.services
    const updateData = req.body

    const existingStream = await ffmpeg.getStream(id)
    if (!existingStream) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Stream not found',
          code: 'STREAM_NOT_FOUND'
        }
      })
    }

    // Don't allow updating running streams
    if (existingStream.status === 'running') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cannot update running stream. Stop the stream first.',
          code: 'STREAM_RUNNING'
        }
      })
    }

    // Check if new channel conflicts with existing streams
    if (updateData.channel !== existingStream.channel) {
      const existingStreams = await ffmpeg.getAllStreams()
      const channelInUse = existingStreams.find(s => 
        s.id !== id && 
        s.channel === updateData.channel && 
        s.status === 'running'
      )
      
      if (channelInUse) {
        return res.status(409).json({
          success: false,
          error: {
            message: `Channel ${updateData.channel} is already in use`,
            code: 'CHANNEL_IN_USE'
          }
        })
      }
    }

    const updatedStream = {
      ...existingStream,
      ...updateData,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id,
      url: `${require('../config').network.streamBaseUrl}/${updateData.name}`
    }

    await ffmpeg.updateStream(id, updatedStream)

    logger.stream('Stream updated', {
      streamId: id,
      changes: updateData,
      updatedBy: req.user.id
    })

    res.json({
      success: true,
      data: updatedStream
    })
  })
)

/**
 * Delete stream
 * DELETE /api/streams/:id
 */
router.delete('/:id',
  authenticate,
  authorize('admin', 'operator'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { ffmpeg } = req.services

    const stream = await ffmpeg.getStream(id)
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Stream not found',
          code: 'STREAM_NOT_FOUND'
        }
      })
    }

    // Stop stream if running
    if (stream.status === 'running') {
      await ffmpeg.stopStream(id)
    }

    await ffmpeg.deleteStream(id)

    logger.stream('Stream deleted', {
      streamId: id,
      name: stream.name,
      deletedBy: req.user.id
    })

    res.json({
      success: true,
      data: {
        message: 'Stream deleted successfully'
      }
    })
  })
)

/**
 * Start stream
 * POST /api/streams/:id/start
 */
router.post('/:id/start',
  authenticate,
  authorize('admin', 'operator'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { ffmpeg, icecast } = req.services

    const stream = await ffmpeg.getStream(id)
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Stream not found',
          code: 'STREAM_NOT_FOUND'
        }
      })
    }

    if (stream.status === 'running') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Stream is already running',
          code: 'STREAM_ALREADY_RUNNING'
        }
      })
    }

    // Check if Icecast is running
    const icecastStatus = await icecast.getStatus()
    if (!icecastStatus.running) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Icecast server is not running',
          code: 'ICECAST_NOT_RUNNING'
        }
      })
    }

    await ffmpeg.startStream(id)

    logger.stream('Stream started', {
      streamId: id,
      name: stream.name,
      startedBy: req.user.id
    })

    res.json({
      success: true,
      data: {
        message: 'Stream started successfully',
        streamId: id,
        url: stream.url
      }
    })
  })
)

/**
 * Stop stream
 * POST /api/streams/:id/stop
 */
router.post('/:id/stop',
  authenticate,
  authorize('admin', 'operator'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { ffmpeg } = req.services

    const stream = await ffmpeg.getStream(id)
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Stream not found',
          code: 'STREAM_NOT_FOUND'
        }
      })
    }

    if (stream.status !== 'running') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Stream is not running',
          code: 'STREAM_NOT_RUNNING'
        }
      })
    }

    await ffmpeg.stopStream(id)

    logger.stream('Stream stopped', {
      streamId: id,
      name: stream.name,
      stoppedBy: req.user.id
    })

    res.json({
      success: true,
      data: {
        message: 'Stream stopped successfully',
        streamId: id
      }
    })
  })
)

/**
 * Restart stream
 * POST /api/streams/:id/restart
 */
router.post('/:id/restart',
  authenticate,
  authorize('admin', 'operator'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { ffmpeg } = req.services

    const stream = await ffmpeg.getStream(id)
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Stream not found',
          code: 'STREAM_NOT_FOUND'
        }
      })
    }

    await ffmpeg.restartStream(id)

    logger.stream('Stream restarted', {
      streamId: id,
      name: stream.name,
      restartedBy: req.user.id
    })

    res.json({
      success: true,
      data: {
        message: 'Stream restarted successfully',
        streamId: id
      }
    })
  })
)

/**
 * Bulk stream operations
 * POST /api/streams/bulk
 */
router.post('/bulk',
  authenticate,
  authorize('admin', 'operator'),
  sanitizeInput,
  validateSchema(require('../middleware/validation').schemas.bulkStreamControl),
  asyncHandler(async (req, res) => {
    const { action, streamIds } = req.body
    const { ffmpeg } = req.services

    const results = []
    const allStreams = await ffmpeg.getAllStreams()
    const targetStreams = streamIds ? 
      allStreams.filter(s => streamIds.includes(s.id)) : 
      allStreams

    for (const stream of targetStreams) {
      try {
        switch (action) {
          case 'start':
            if (stream.status !== 'running') {
              await ffmpeg.startStream(stream.id)
              results.push({ id: stream.id, status: 'started', success: true })
            } else {
              results.push({ id: stream.id, status: 'already_running', success: true })
            }
            break
          case 'stop':
            if (stream.status === 'running') {
              await ffmpeg.stopStream(stream.id)
              results.push({ id: stream.id, status: 'stopped', success: true })
            } else {
              results.push({ id: stream.id, status: 'already_stopped', success: true })
            }
            break
          case 'restart':
            await ffmpeg.restartStream(stream.id)
            results.push({ id: stream.id, status: 'restarted', success: true })
            break
        }
      } catch (error) {
        results.push({ 
          id: stream.id, 
          status: 'error', 
          success: false, 
          error: error.message 
        })
      }
    }

    logger.stream('Bulk stream operation', {
      action,
      streamCount: targetStreams.length,
      results: results.filter(r => r.success).length,
      errors: results.filter(r => !r.success).length,
      performedBy: req.user.id
    })

    res.json({
      success: true,
      data: {
        action,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }
    })
  })
)

module.exports = router

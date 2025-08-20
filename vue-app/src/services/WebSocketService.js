const logger = require('../utils/logger')

class WebSocketService {
  constructor(io) {
    this.io = io
    this.connectedClients = new Map()
    this.rooms = new Set(['admin', 'operators', 'viewers'])
    this.updateInterval = null
  }

  setupEventHandlers() {
    logger.system('Setting up WebSocket event handlers')

    this.io.on('connection', (socket) => {
      this.handleConnection(socket)
    })

    // Start periodic updates
    this.startPeriodicUpdates()
  }

  handleConnection(socket) {
    const clientId = socket.id
    const clientInfo = {
      id: clientId,
      connectedAt: new Date().toISOString(),
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      authenticated: false,
      role: 'viewer',
      rooms: []
    }

    this.connectedClients.set(clientId, clientInfo)

    logger.system('WebSocket client connected', {
      clientId,
      ip: clientInfo.ip,
      totalClients: this.connectedClients.size
    })

    // Send welcome message
    socket.emit('connected', {
      clientId,
      timestamp: new Date().toISOString(),
      serverInfo: {
        name: 'LANStreamer',
        version: require('../../package.json').version
      }
    })

    // Handle authentication
    socket.on('authenticate', (data) => {
      this.handleAuthentication(socket, data)
    })

    // Handle room joining
    socket.on('join-room', (roomName) => {
      this.handleJoinRoom(socket, roomName)
    })

    // Handle room leaving
    socket.on('leave-room', (roomName) => {
      this.handleLeaveRoom(socket, roomName)
    })

    // Handle stream subscription
    socket.on('subscribe-stream', (streamId) => {
      this.handleStreamSubscription(socket, streamId)
    })

    // Handle stream unsubscription
    socket.on('unsubscribe-stream', (streamId) => {
      this.handleStreamUnsubscription(socket, streamId)
    })

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() })
    })

    // Handle client requests for data
    socket.on('request-system-status', () => {
      this.sendSystemStatus(socket)
    })

    socket.on('request-stream-list', () => {
      this.sendStreamList(socket)
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason)
    })

    // Handle errors
    socket.on('error', (error) => {
      logger.error('WebSocket error:', error)
    })
  }

  handleAuthentication(socket, data) {
    const clientInfo = this.connectedClients.get(socket.id)
    if (!clientInfo) return

    try {
      // In a real implementation, verify the JWT token
      const { token, role } = data
      
      // Simulate token verification
      if (token && token.length > 10) {
        clientInfo.authenticated = true
        clientInfo.role = role || 'viewer'
        clientInfo.authenticatedAt = new Date().toISOString()

        this.connectedClients.set(socket.id, clientInfo)

        socket.emit('authenticated', {
          success: true,
          role: clientInfo.role,
          permissions: this.getRolePermissions(clientInfo.role)
        })

        // Join appropriate room based on role
        this.joinRoomByRole(socket, clientInfo.role)

        logger.system('WebSocket client authenticated', {
          clientId: socket.id,
          role: clientInfo.role
        })
      } else {
        socket.emit('authentication-failed', {
          error: 'Invalid token'
        })
      }
    } catch (error) {
      logger.error('WebSocket authentication error:', error)
      socket.emit('authentication-failed', {
        error: 'Authentication failed'
      })
    }
  }

  handleJoinRoom(socket, roomName) {
    const clientInfo = this.connectedClients.get(socket.id)
    if (!clientInfo) return

    if (!this.rooms.has(roomName)) {
      socket.emit('room-error', {
        error: `Room '${roomName}' does not exist`
      })
      return
    }

    // Check permissions
    if (!this.canJoinRoom(clientInfo.role, roomName)) {
      socket.emit('room-error', {
        error: `Insufficient permissions to join room '${roomName}'`
      })
      return
    }

    socket.join(roomName)
    clientInfo.rooms.push(roomName)
    this.connectedClients.set(socket.id, clientInfo)

    socket.emit('room-joined', {
      room: roomName,
      timestamp: new Date().toISOString()
    })

    logger.system('Client joined room', {
      clientId: socket.id,
      room: roomName,
      role: clientInfo.role
    })
  }

  handleLeaveRoom(socket, roomName) {
    const clientInfo = this.connectedClients.get(socket.id)
    if (!clientInfo) return

    socket.leave(roomName)
    clientInfo.rooms = clientInfo.rooms.filter(room => room !== roomName)
    this.connectedClients.set(socket.id, clientInfo)

    socket.emit('room-left', {
      room: roomName,
      timestamp: new Date().toISOString()
    })

    logger.system('Client left room', {
      clientId: socket.id,
      room: roomName
    })
  }

  handleStreamSubscription(socket, streamId) {
    const clientInfo = this.connectedClients.get(socket.id)
    if (!clientInfo) return

    const streamRoom = `stream-${streamId}`
    socket.join(streamRoom)

    if (!clientInfo.subscribedStreams) {
      clientInfo.subscribedStreams = []
    }
    clientInfo.subscribedStreams.push(streamId)
    this.connectedClients.set(socket.id, clientInfo)

    socket.emit('stream-subscribed', {
      streamId,
      timestamp: new Date().toISOString()
    })

    logger.system('Client subscribed to stream', {
      clientId: socket.id,
      streamId
    })
  }

  handleStreamUnsubscription(socket, streamId) {
    const clientInfo = this.connectedClients.get(socket.id)
    if (!clientInfo) return

    const streamRoom = `stream-${streamId}`
    socket.leave(streamRoom)

    if (clientInfo.subscribedStreams) {
      clientInfo.subscribedStreams = clientInfo.subscribedStreams.filter(id => id !== streamId)
      this.connectedClients.set(socket.id, clientInfo)
    }

    socket.emit('stream-unsubscribed', {
      streamId,
      timestamp: new Date().toISOString()
    })

    logger.system('Client unsubscribed from stream', {
      clientId: socket.id,
      streamId
    })
  }

  handleDisconnection(socket, reason) {
    const clientInfo = this.connectedClients.get(socket.id)
    
    if (clientInfo) {
      logger.system('WebSocket client disconnected', {
        clientId: socket.id,
        reason,
        connectedDuration: Date.now() - new Date(clientInfo.connectedAt).getTime(),
        totalClients: this.connectedClients.size - 1
      })
    }

    this.connectedClients.delete(socket.id)
  }

  joinRoomByRole(socket, role) {
    let roomName
    switch (role) {
      case 'admin':
        roomName = 'admin'
        break
      case 'operator':
        roomName = 'operators'
        break
      default:
        roomName = 'viewers'
    }

    this.handleJoinRoom(socket, roomName)
  }

  canJoinRoom(role, roomName) {
    switch (roomName) {
      case 'admin':
        return role === 'admin'
      case 'operators':
        return role === 'admin' || role === 'operator'
      case 'viewers':
        return true
      default:
        return false
    }
  }

  getRolePermissions(role) {
    switch (role) {
      case 'admin':
        return ['read', 'write', 'admin', 'system', 'config']
      case 'operator':
        return ['read', 'write', 'streams']
      case 'viewer':
        return ['read']
      default:
        return []
    }
  }

  // Broadcasting methods
  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    })
  }

  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    })
  }

  broadcastToAdmins(event, data) {
    this.broadcastToRoom('admin', event, data)
  }

  broadcastToOperators(event, data) {
    this.broadcastToRoom('operators', event, data)
  }

  broadcastStreamUpdate(streamId, data) {
    this.io.to(`stream-${streamId}`).emit('stream-update', {
      streamId,
      ...data,
      timestamp: new Date().toISOString()
    })
  }

  // Data sending methods
  async sendSystemStatus(socket) {
    try {
      // This would typically get data from other services
      const systemStatus = {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }

      socket.emit('system-status', systemStatus)
    } catch (error) {
      logger.error('Failed to send system status:', error)
    }
  }

  async sendStreamList(socket) {
    try {
      // This would typically get data from FFmpegService
      const streams = []

      socket.emit('stream-list', {
        streams,
        count: streams.length,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to send stream list:', error)
    }
  }

  startPeriodicUpdates() {
    // Send periodic updates to connected clients
    this.updateInterval = setInterval(() => {
      this.sendPeriodicUpdates()
    }, 30000) // Every 30 seconds

    logger.system('WebSocket periodic updates started')
  }

  async sendPeriodicUpdates() {
    try {
      // Send system status to admin room
      this.broadcastToRoom('admin', 'periodic-system-update', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connectedClients: this.connectedClients.size
      })

      // Send stream status to all rooms
      this.broadcastToAll('periodic-stream-update', {
        activeStreams: 0, // This would come from FFmpegService
        totalListeners: 0 // This would come from IcecastService
      })
    } catch (error) {
      logger.error('Failed to send periodic updates:', error)
    }
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.values())
  }

  getClientCount() {
    return this.connectedClients.size
  }

  getClientsByRole(role) {
    return Array.from(this.connectedClients.values()).filter(client => client.role === role)
  }

  cleanup() {
    logger.system('Cleaning up WebSocket Service')
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    // Disconnect all clients
    this.io.disconnectSockets()
  }
}

module.exports = WebSocketService

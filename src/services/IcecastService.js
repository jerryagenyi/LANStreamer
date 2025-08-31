import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs-extra'
import path from 'path'
import xml2js from 'xml2js'
import fetch from 'node-fetch'

import config from '../config/index.js'
import logger from '../utils/logger.js'

const execAsync = promisify(exec)

class IcecastService {
  constructor() {
    this.process = null
    this.configPath = config.icecast.configPath
    this.isRunning = false
    this.stats = {
      startTime: null,
      connections: 0,
      sources: 0
    }
  }

  async initialize() {
    logger.icecast('Initializing Icecast Service')
    
    // Check if Icecast is installed
    await this.checkInstallation()
    
    // Ensure config directory exists
    await this.ensureConfigDirectory()
    
    // Check if Icecast is already running
    await this.checkRunningStatus()
    
    logger.icecast('Icecast Service initialized')
  }

  async checkInstallation() {
    try {
      const { stdout } = await execAsync('icecast2 -v')
      const versionMatch = stdout.match(/Icecast ([^\s]+)/)
      const version = versionMatch ? versionMatch[1] : 'unknown'
      
      logger.icecast('Icecast installation verified', { version })
      return {
        installed: true,
        version,
        path: 'icecast2'
      }
    } catch (error) {
      // Try alternative command names
      try {
        const { stdout } = await execAsync('icecast -v')
        const versionMatch = stdout.match(/Icecast ([^\s]+)/)
        const version = versionMatch ? versionMatch[1] : 'unknown'
        
        logger.icecast('Icecast installation verified', { version })
        return {
          installed: true,
          version,
          path: 'icecast'
        }
      } catch (altError) {
        logger.warn('Icecast installation not found')
        throw new AppError('Icecast is not installed or not accessible', 500)
      }
    }
  }

  async ensureConfigDirectory() {
    const configDir = path.dirname(this.configPath)
    await fs.ensureDir(configDir)
  }

  async checkRunningStatus() {
    try {
      const response = await fetch(`http://${config.icecast.host}:${config.icecast.port}/admin/stats.xml`, {
        timeout: 5000
      })
      
      if (response.ok) {
        this.isRunning = true
        logger.icecast('Icecast server is already running')
      }
    } catch (error) {
      this.isRunning = false
      logger.icecast('Icecast server is not running')
    }
  }

  async getStatus() {
    try {
      // First check if Icecast is installed
      const installationCheck = await this.checkInstallation();
      
      if (!installationCheck.installed) {
        return {
          installed: false,
          running: false,
          status: 'not-installed',
          uptime: 0,
          version: null,
          port: config.icecast.port
        }
      }
      
      if (!this.isRunning) {
        return {
          installed: true,
          running: false,
          status: 'stopped',
          uptime: 0,
          version: installationCheck.version,
          port: config.icecast.port
        }
      }

      const response = await fetch(`http://${config.icecast.host}:${config.icecast.port}/admin/stats.xml`, {
        timeout: 5000,
        headers: {
          'Authorization': `Basic ${Buffer.from(`admin:${config.icecast.adminPassword}`).toString('base64')}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const xmlData = await response.text()
      const parser = new xml2js.Parser()
      const result = await parser.parseStringPromise(xmlData)
      
      const stats = result.icestats
      
      return {
        installed: true,
        running: true,
        status: 'running',
        port: config.icecast.port,
        uptime: parseInt(stats.server_start_iso8601) ? 
          Date.now() - new Date(stats.server_start_iso8601).getTime() : 0,
        version: stats.server_id || 'unknown',
        connections: parseInt(stats.clients) || 0,
        sources: parseInt(stats.sources) || 0,
        listeners: parseInt(stats.listeners) || 0,
        host: config.icecast.host,
        port: config.icecast.port
      }
    } catch (error) {
      logger.error('Failed to get Icecast status:', error)
      this.isRunning = false
      return {
        running: false,
        status: 'error',
        error: error.message
      }
    }
  }

  async getDetailedStatus() {
    try {
      const [status, mountpoints] = await Promise.all([
        this.getStatus(),
        this.getMountpoints()
      ])

      return {
        ...status,
        mountpoints,
        config: {
          host: config.icecast.host,
          port: config.icecast.port,
          configPath: this.configPath
        }
      }
    } catch (error) {
      logger.error('Failed to get detailed Icecast status:', error)
      throw new AppError('Failed to retrieve Icecast status', 500)
    }
  }

  async getMountpoints() {
    try {
      const response = await fetch(`http://${config.icecast.host}:${config.icecast.port}/admin/listmounts.xml`, {
        timeout: 5000,
        headers: {
          'Authorization': `Basic ${Buffer.from(`admin:${config.icecast.adminPassword}`).toString('base64')}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const xmlData = await response.text()
      const parser = new xml2js.Parser()
      const result = await parser.parseStringPromise(xmlData)
      
      const mountpoints = []
      if (result.icestats && result.icestats.source) {
        const sources = Array.isArray(result.icestats.source) ? 
          result.icestats.source : [result.icestats.source]
        
        for (const source of sources) {
          mountpoints.push({
            mount: source.$.mount,
            listeners: parseInt(source.listeners) || 0,
            connected: parseInt(source.Connected) || 0,
            content_type: source.content_type || 'unknown',
            stream_start: source.stream_start || null,
            title: source.title || '',
            url: `http://${config.icecast.host}:${config.icecast.port}${source.$.mount}`
          })
        }
      }

      return mountpoints
    } catch (error) {
      logger.debug('Could not get mountpoints:', error.message)
      return []
    }
  }

  async start() {
    try {
      if (this.isRunning) {
        return {
          success: true,
          message: 'Icecast is already running',
          status: 'running'
        }
      }

      // Generate config file if it doesn't exist
      await this.generateConfigFile()

      // Start Icecast process
      const icecastCommand = await this.getIcecastCommand()
      
      logger.icecast('Starting Icecast server', { command: icecastCommand })
      
      this.process = spawn(icecastCommand, ['-c', this.configPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      })

      // Handle process output
      this.process.stdout.on('data', (data) => {
        logger.icecast('Icecast stdout', { output: data.toString().trim() })
      })

      this.process.stderr.on('data', (data) => {
        logger.icecast('Icecast stderr', { output: data.toString().trim() })
      })

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        logger.icecast('Icecast process exited', { code, signal })
        this.isRunning = false
        this.process = null
      })

      this.process.on('error', (error) => {
        logger.error('Icecast process error:', error)
        this.isRunning = false
        this.process = null
      })

      // Wait a moment and check if it started successfully
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const status = await this.getStatus()
      if (status.running) {
        this.isRunning = true
        this.stats.startTime = Date.now()
        
        logger.icecast('Icecast server started successfully')
        return {
          success: true,
          message: 'Icecast server started successfully',
          status: 'running',
          pid: this.process.pid
        }
      } else {
        throw new Error('Icecast failed to start')
      }

    } catch (error) {
      logger.error('Failed to start Icecast:', error)
      throw new AppError(`Failed to start Icecast: ${error.message}`, 500)
    }
  }

  async stop() {
    try {
      if (!this.isRunning || !this.process) {
        return {
          success: true,
          message: 'Icecast is not running',
          status: 'stopped'
        }
      }

      logger.icecast('Stopping Icecast server')
      
      this.process.kill('SIGTERM')
      
      // Force kill after 10 seconds if not terminated
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL')
        }
      }, 10000)

      // Wait for process to exit
      await new Promise((resolve) => {
        if (this.process) {
          this.process.on('exit', resolve)
        } else {
          resolve()
        }
      })

      this.isRunning = false
      this.process = null
      this.stats.startTime = null

      logger.icecast('Icecast server stopped')
      return {
        success: true,
        message: 'Icecast server stopped successfully',
        status: 'stopped'
      }

    } catch (error) {
      logger.error('Failed to stop Icecast:', error)
      throw new AppError(`Failed to stop Icecast: ${error.message}`, 500)
    }
  }

  async restart() {
    logger.icecast('Restarting Icecast server')
    
    await this.stop()
    await new Promise(resolve => setTimeout(resolve, 2000))
    return await this.start()
  }

  async getIcecastCommand() {
    try {
      // Try icecast2 first
      await execAsync('which icecast2')
      return 'icecast2'
    } catch (error) {
      try {
        // Try icecast
        await execAsync('which icecast')
        return 'icecast'
      } catch (altError) {
        throw new Error('Icecast executable not found')
      }
    }
  }

  async generateConfigFile() {
    const configTemplate = `<?xml version="1.0"?>
<icecast>
    <location>LANStreamer Server</location>
    <admin>admin@localhost</admin>
    <limits>
        <clients>100</clients>
        <sources>32</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>
    <authentication>
        <source-password>${config.icecast.sourcePassword}</source-password>
        <relay-password>${config.icecast.sourcePassword}</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>${config.icecast.adminPassword}</admin-password>
    </authentication>
    <hostname>${config.icecast.host}</hostname>
    <listen-socket>
        <port>${config.icecast.port}</port>
    </listen-socket>
    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*" />
        <header name="Access-Control-Allow-Headers" value="Origin, Accept, X-Requested-With, Content-Type" />
        <header name="Access-Control-Allow-Methods" value="GET, POST, OPTIONS, HEAD" />
    </http-headers>
    <fileserve>1</fileserve>
    <paths>
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" destination="/status.xsl"/>
    </paths>
    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>
</icecast>`

    await fs.writeFile(this.configPath, configTemplate)
    logger.icecast('Icecast config file generated', { path: this.configPath })
  }

  async configure(newConfig) {
    try {
      // Update configuration
      if (newConfig.adminPassword) {
        config.icecast.adminPassword = newConfig.adminPassword
      }
      if (newConfig.sourcePassword) {
        config.icecast.sourcePassword = newConfig.sourcePassword
      }
      if (newConfig.port) {
        config.icecast.port = newConfig.port
      }

      // Regenerate config file
      await this.generateConfigFile()

      // Restart if running
      if (this.isRunning) {
        await this.restart()
      }

      logger.icecast('Icecast configuration updated', newConfig)
      
      return {
        success: true,
        message: 'Icecast configuration updated successfully',
        config: {
          host: config.icecast.host,
          port: config.icecast.port,
          configPath: this.configPath
        }
      }
    } catch (error) {
      logger.error('Icecast configuration failed:', error)
      throw new AppError(`Icecast configuration failed: ${error.message}`, 500)
    }
  }

  async getClientStats() {
    try {
      const status = await this.getStatus()
      const mountpoints = await this.getMountpoints()
      
      return {
        totalConnections: status.connections || 0,
        totalListeners: status.listeners || 0,
        activeSources: status.sources || 0,
        mountpoints: mountpoints.map(mp => ({
          mount: mp.mount,
          listeners: mp.listeners,
          url: mp.url
        }))
      }
    } catch (error) {
      logger.error('Failed to get client stats:', error)
      return {
        totalConnections: 0,
        totalListeners: 0,
        activeSources: 0,
        mountpoints: []
      }
    }
  }

  async cleanup() {
    logger.icecast('Cleaning up Icecast Service')
    
    if (this.isRunning && this.process) {
      await this.stop()
    }
  }
}

export default IcecastService

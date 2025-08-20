const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const si = require('systeminformation')
const ping = require('ping')
const portfinder = require('portfinder')

const config = require('../config')
const logger = require('../utils/logger')
const { AppError } = require('../middleware/errorHandler')

const execAsync = promisify(exec)

class SystemService {
  constructor() {
    this.setupStatus = {
      isComplete: false,
      currentStep: 0,
      steps: [
        'System Validation',
        'Dependency Check',
        'Icecast Configuration',
        'FFmpeg Configuration',
        'Audio Device Setup',
        'Network Configuration',
        'Final Testing'
      ]
    }
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0
    }
  }

  async initialize() {
    logger.system('Initializing System Service')
    
    // Ensure required directories exist
    await this.ensureDirectories()
    
    // Load setup status
    await this.loadSetupStatus()
    
    // Start metrics collection
    this.startMetricsCollection()
    
    logger.system('System Service initialized')
  }

  async ensureDirectories() {
    const directories = [
      config.logging.filePath,
      config.database.configDbPath.replace('/config.json', ''),
      config.upload.uploadPath,
      config.backup.path
    ]

    for (const dir of directories) {
      await fs.ensureDir(dir)
    }
  }

  async loadSetupStatus() {
    try {
      const statusFile = path.join(config.database.configDbPath.replace('/config.json', ''), 'setup.json')
      if (await fs.pathExists(statusFile)) {
        this.setupStatus = await fs.readJson(statusFile)
      }
    } catch (error) {
      logger.warn('Could not load setup status:', error.message)
    }
  }

  async saveSetupStatus() {
    try {
      const statusFile = path.join(config.database.configDbPath.replace('/config.json', ''), 'setup.json')
      await fs.writeJson(statusFile, this.setupStatus, { spaces: 2 })
    } catch (error) {
      logger.error('Could not save setup status:', error)
    }
  }

  async getSystemInfo() {
    try {
      const [cpu, mem, osInfo, network] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.networkInterfaces()
      ])

      const networkInterfaces = os.networkInterfaces()
      const primaryInterface = this.getPrimaryNetworkInterface(networkInterfaces)

      return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        nodeVersion: process.version,
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          speed: cpu.speed,
          cores: cpu.cores
        },
        memory: {
          total: mem.total,
          free: mem.free,
          used: mem.used,
          active: mem.active,
          available: mem.available
        },
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          kernel: osInfo.kernel,
          arch: osInfo.arch
        },
        network: {
          interfaces: network.filter(iface => !iface.internal),
          primaryInterface,
          externalIp: await this.getExternalIp()
        }
      }
    } catch (error) {
      logger.error('Failed to get system info:', error)
      throw new AppError('Failed to retrieve system information', 500)
    }
  }

  getPrimaryNetworkInterface(interfaces) {
    for (const [name, addresses] of Object.entries(interfaces)) {
      for (const addr of addresses) {
        if (!addr.internal && addr.family === 'IPv4') {
          return {
            name,
            address: addr.address,
            netmask: addr.netmask,
            mac: addr.mac
          }
        }
      }
    }
    return null
  }

  async getExternalIp() {
    try {
      const { stdout } = await execAsync('curl -s https://api.ipify.org')
      return stdout.trim()
    } catch (error) {
      logger.debug('Could not get external IP:', error.message)
      return null
    }
  }

  async getStatus() {
    try {
      const [cpu, mem, load] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.load()
      ])

      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cpu: {
          usage: cpu.currentload,
          cores: cpu.cpus.map(core => core.load)
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usage: (mem.used / mem.total) * 100
        },
        load: {
          avg1: load.avgload,
          avg5: load.avgload5,
          avg15: load.avgload15
        }
      }

      // Determine status based on resource usage
      if (status.cpu.usage > 90 || status.memory.usage > 90) {
        status.status = 'warning'
      }
      if (status.cpu.usage > 95 || status.memory.usage > 95) {
        status.status = 'error'
      }

      return status
    } catch (error) {
      logger.error('Failed to get system status:', error)
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async getMetrics() {
    const uptime = Date.now() - this.metrics.startTime
    
    return {
      uptime,
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      requestsPerMinute: (this.metrics.requestCount / (uptime / 60000)).toFixed(2),
      errorRate: this.metrics.errorCount > 0 ? 
        ((this.metrics.errorCount / this.metrics.requestCount) * 100).toFixed(2) : 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  }

  async getNetworkInfo() {
    try {
      const interfaces = await si.networkInterfaces()
      const stats = await si.networkStats()
      
      return {
        interfaces: interfaces.filter(iface => !iface.internal),
        stats: stats.map(stat => ({
          iface: stat.iface,
          operstate: stat.operstate,
          rx_bytes: stat.rx_bytes,
          tx_bytes: stat.tx_bytes,
          rx_sec: stat.rx_sec,
          tx_sec: stat.tx_sec
        })),
        connectivity: await this.checkConnectivity()
      }
    } catch (error) {
      logger.error('Failed to get network info:', error)
      throw new AppError('Failed to retrieve network information', 500)
    }
  }

  async checkConnectivity() {
    const hosts = ['8.8.8.8', 'google.com', 'github.com']
    const results = []

    for (const host of hosts) {
      try {
        const result = await ping.promise.probe(host, { timeout: 5 })
        results.push({
          host,
          alive: result.alive,
          time: result.time,
          min: result.min,
          max: result.max,
          avg: result.avg
        })
      } catch (error) {
        results.push({
          host,
          alive: false,
          error: error.message
        })
      }
    }

    return {
      online: results.some(r => r.alive),
      results
    }
  }

  async validateSystemRequirements() {
    const validation = {
      passed: true,
      issues: [],
      requirements: {}
    }

    try {
      // Check Node.js version
      const nodeVersion = process.version
      const requiredNodeVersion = '16.0.0'
      validation.requirements.nodeVersion = {
        current: nodeVersion,
        required: `>=${requiredNodeVersion}`,
        passed: this.compareVersions(nodeVersion.slice(1), requiredNodeVersion) >= 0
      }

      // Check available memory
      const totalMemory = os.totalmem()
      const requiredMemory = 4 * 1024 * 1024 * 1024 // 4GB
      validation.requirements.memory = {
        current: `${(totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB`,
        required: '4GB',
        passed: totalMemory >= requiredMemory
      }

      // Check available disk space
      const diskSpace = await si.fsSize()
      const systemDisk = diskSpace.find(disk => disk.mount === '/' || disk.mount === 'C:')
      const requiredSpace = 1 * 1024 * 1024 * 1024 // 1GB
      validation.requirements.diskSpace = {
        current: `${(systemDisk.available / 1024 / 1024 / 1024).toFixed(1)}GB`,
        required: '1GB',
        passed: systemDisk.available >= requiredSpace
      }

      // Check port availability
      const requiredPorts = [config.server.port, config.icecast.port, config.network.clientPort]
      validation.requirements.ports = {
        required: requiredPorts,
        available: [],
        passed: true
      }

      for (const port of requiredPorts) {
        try {
          const availablePort = await portfinder.getPortPromise({ port })
          const isAvailable = availablePort === port
          validation.requirements.ports.available.push({ port, available: isAvailable })
          if (!isAvailable) {
            validation.requirements.ports.passed = false
          }
        } catch (error) {
          validation.requirements.ports.available.push({ port, available: false, error: error.message })
          validation.requirements.ports.passed = false
        }
      }

      // Check network connectivity
      const connectivity = await this.checkConnectivity()
      validation.requirements.network = {
        online: connectivity.online,
        passed: connectivity.online
      }

      // Collect all issues
      Object.entries(validation.requirements).forEach(([key, req]) => {
        if (!req.passed) {
          validation.passed = false
          validation.issues.push(`${key}: ${req.current || 'Failed'} (required: ${req.required || 'Available'})`)
        }
      })

    } catch (error) {
      logger.error('System validation failed:', error)
      validation.passed = false
      validation.issues.push(`Validation error: ${error.message}`)
    }

    return validation
  }

  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number)
    const v2parts = version2.split('.').map(Number)
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0
      const v2part = v2parts[i] || 0
      
      if (v1part > v2part) return 1
      if (v1part < v2part) return -1
    }
    return 0
  }

  startMetricsCollection() {
    // Increment request counter
    setInterval(() => {
      this.metrics.requestCount++
    }, 1000)
  }

  async getSetupStatus() {
    return {
      ...this.setupStatus,
      timestamp: new Date().toISOString()
    }
  }

  async startSetup() {
    this.setupStatus.isComplete = false
    this.setupStatus.currentStep = 0
    await this.saveSetupStatus()
    
    return {
      id: Date.now().toString(),
      ...this.setupStatus
    }
  }

  async completeSetup() {
    this.setupStatus.isComplete = true
    this.setupStatus.currentStep = this.setupStatus.steps.length
    this.setupStatus.completedAt = new Date().toISOString()
    await this.saveSetupStatus()
    
    return {
      success: true,
      setupComplete: true
    }
  }

  async resetSetup() {
    this.setupStatus.isComplete = false
    this.setupStatus.currentStep = 0
    delete this.setupStatus.completedAt
    await this.saveSetupStatus()
    
    return {
      success: true,
      setupComplete: false
    }
  }

  async cleanup() {
    logger.system('Cleaning up System Service')
    // Cleanup logic here
  }
}

module.exports = SystemService

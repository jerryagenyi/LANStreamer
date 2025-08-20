const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs-extra')
const path = require('path')

const config = require('../config')
const logger = require('../utils/logger')
const { AppError } = require('../middleware/errorHandler')

const execAsync = promisify(exec)

class AudioDeviceService {
  constructor() {
    this.devices = []
    this.selectedDevice = null
    this.channelMapping = []
    this.platform = process.platform
  }

  async initialize() {
    logger.system('Initializing Audio Device Service')
    
    // Load saved configuration
    await this.loadConfiguration()
    
    // Detect available devices
    await this.detectDevices()
    
    logger.system('Audio Device Service initialized')
  }

  async loadConfiguration() {
    try {
      const configFile = path.join(config.database.configDbPath.replace('/config.json', ''), 'audio-config.json')
      if (await fs.pathExists(configFile)) {
        const audioConfig = await fs.readJson(configFile)
        this.selectedDevice = audioConfig.selectedDevice
        this.channelMapping = audioConfig.channelMapping || []
        logger.system('Audio configuration loaded')
      }
    } catch (error) {
      logger.warn('Could not load audio configuration:', error.message)
    }
  }

  async saveConfiguration() {
    try {
      const configFile = path.join(config.database.configDbPath.replace('/config.json', ''), 'audio-config.json')
      const audioConfig = {
        selectedDevice: this.selectedDevice,
        channelMapping: this.channelMapping,
        lastUpdated: new Date().toISOString()
      }
      await fs.writeJson(configFile, audioConfig, { spaces: 2 })
      logger.system('Audio configuration saved')
    } catch (error) {
      logger.error('Could not save audio configuration:', error)
    }
  }

  async detectDevices() {
    try {
      let devices = []
      
      if (config.development.simulateHardware) {
        devices = this.getSimulatedDevices()
      } else {
        switch (this.platform) {
          case 'win32':
            devices = await this.detectWindowsDevices()
            break
          case 'darwin':
            devices = await this.detectMacDevices()
            break
          case 'linux':
            devices = await this.detectLinuxDevices()
            break
          default:
            logger.warn(`Unsupported platform: ${this.platform}`)
            devices = []
        }
      }

      this.devices = devices
      logger.system(`Detected ${devices.length} audio devices`)
      return devices
    } catch (error) {
      logger.error('Audio device detection failed:', error)
      this.devices = []
      return []
    }
  }

  getSimulatedDevices() {
    return [
      {
        id: 'virtual-xr18',
        name: 'Virtual Behringer XR18',
        type: 'USB Audio Interface',
        channels: 18,
        sampleRates: [44100, 48000],
        connected: true,
        recommended: true,
        virtual: true
      },
      {
        id: 'virtual-scarlett',
        name: 'Virtual Focusrite Scarlett 18i20',
        type: 'USB Audio Interface',
        channels: 20,
        sampleRates: [44100, 48000, 96000],
        connected: true,
        recommended: false,
        virtual: true
      },
      {
        id: 'virtual-cable',
        name: config.development.virtualAudioDevice,
        type: 'Virtual Audio Cable',
        channels: 2,
        sampleRates: [44100, 48000],
        connected: true,
        recommended: false,
        virtual: true
      }
    ]
  }

  async detectWindowsDevices() {
    try {
      // Use FFmpeg to list DirectShow audio devices
      const { stdout } = await execAsync('ffmpeg -list_devices true -f dshow -i dummy 2>&1')
      const devices = []
      
      const lines = stdout.split('\n')
      let inAudioSection = false
      
      for (const line of lines) {
        if (line.includes('DirectShow audio devices')) {
          inAudioSection = true
          continue
        }
        
        if (inAudioSection && line.includes('DirectShow video devices')) {
          break
        }
        
        if (inAudioSection && line.includes('"')) {
          const match = line.match(/"([^"]+)"/)
          if (match) {
            const deviceName = match[1]
            devices.push({
              id: `dshow-${devices.length}`,
              name: deviceName,
              type: this.getDeviceType(deviceName),
              channels: this.estimateChannels(deviceName),
              sampleRates: [44100, 48000],
              connected: true,
              recommended: deviceName.toLowerCase().includes('xr18'),
              virtual: false
            })
          }
        }
      }
      
      return devices
    } catch (error) {
      logger.debug('Windows device detection failed:', error.message)
      return []
    }
  }

  async detectMacDevices() {
    try {
      // Use system_profiler to get audio devices
      const { stdout } = await execAsync('system_profiler SPAudioDataType -json')
      const data = JSON.parse(stdout)
      const devices = []
      
      if (data.SPAudioDataType) {
        for (const item of data.SPAudioDataType) {
          if (item._items) {
            for (const device of item._items) {
              devices.push({
                id: `coreaudio-${devices.length}`,
                name: device._name,
                type: this.getDeviceType(device._name),
                channels: this.estimateChannels(device._name),
                sampleRates: [44100, 48000],
                connected: true,
                recommended: device._name.toLowerCase().includes('xr18'),
                virtual: false
              })
            }
          }
        }
      }
      
      return devices
    } catch (error) {
      logger.debug('macOS device detection failed:', error.message)
      return []
    }
  }

  async detectLinuxDevices() {
    try {
      // Use pactl to list PulseAudio sources
      const { stdout } = await execAsync('pactl list sources short')
      const devices = []
      
      const lines = stdout.split('\n')
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split('\t')
          if (parts.length >= 2) {
            const deviceName = parts[1]
            devices.push({
              id: `pulse-${devices.length}`,
              name: deviceName,
              type: this.getDeviceType(deviceName),
              channels: this.estimateChannels(deviceName),
              sampleRates: [44100, 48000],
              connected: true,
              recommended: deviceName.toLowerCase().includes('xr18'),
              virtual: false
            })
          }
        }
      }
      
      return devices
    } catch (error) {
      logger.debug('Linux device detection failed:', error.message)
      return []
    }
  }

  getDeviceType(deviceName) {
    const name = deviceName.toLowerCase()
    
    if (name.includes('xr18') || name.includes('x air')) {
      return 'Behringer XR18'
    }
    if (name.includes('scarlett')) {
      return 'Focusrite Scarlett'
    }
    if (name.includes('usb')) {
      return 'USB Audio Interface'
    }
    if (name.includes('virtual') || name.includes('cable')) {
      return 'Virtual Audio Device'
    }
    if (name.includes('microphone') || name.includes('mic')) {
      return 'Microphone'
    }
    if (name.includes('line')) {
      return 'Line Input'
    }
    
    return 'Audio Device'
  }

  estimateChannels(deviceName) {
    const name = deviceName.toLowerCase()
    
    if (name.includes('xr18')) return 18
    if (name.includes('18i20')) return 20
    if (name.includes('8i6')) return 8
    if (name.includes('2i2')) return 2
    if (name.includes('stereo')) return 2
    if (name.includes('mono')) return 1
    
    // Default estimation based on device type
    if (name.includes('interface')) return 8
    if (name.includes('mixer')) return 16
    
    return 2 // Default to stereo
  }

  async getDevices() {
    if (this.devices.length === 0) {
      await this.detectDevices()
    }
    return this.devices
  }

  async getStatus() {
    const devices = await this.getDevices()
    const connectedDevices = devices.filter(d => d.connected)
    
    return {
      status: connectedDevices.length > 0 ? 'healthy' : 'warning',
      totalDevices: devices.length,
      connectedDevices: connectedDevices.length,
      selectedDevice: this.selectedDevice,
      channelMappings: this.channelMapping.length,
      recommendedDevice: devices.find(d => d.recommended)
    }
  }

  async configure(deviceConfig) {
    try {
      const { deviceId, deviceName, channels } = deviceConfig
      
      // Validate device exists
      const device = this.devices.find(d => d.id === deviceId)
      if (!device) {
        throw new AppError('Selected device not found', 404)
      }

      // Validate channel configuration
      if (!channels || !Array.isArray(channels)) {
        throw new AppError('Invalid channel configuration', 400)
      }

      // Check for duplicate channel assignments
      const channelNumbers = channels.map(c => c.index)
      const duplicates = channelNumbers.filter((item, index) => channelNumbers.indexOf(item) !== index)
      if (duplicates.length > 0) {
        throw new AppError(`Duplicate channel assignments: ${duplicates.join(', ')}`, 400)
      }

      this.selectedDevice = {
        id: deviceId,
        name: deviceName,
        configuredAt: new Date().toISOString()
      }

      this.channelMapping = channels.map(channel => ({
        index: channel.index,
        name: channel.name,
        language: channel.language,
        enabled: channel.enabled !== false
      }))

      await this.saveConfiguration()

      logger.system('Audio device configured', {
        deviceId,
        deviceName,
        channelCount: channels.length
      })

      return {
        success: true,
        device: this.selectedDevice,
        channels: this.channelMapping
      }
    } catch (error) {
      logger.error('Audio device configuration failed:', error)
      throw error
    }
  }

  async testDevice(deviceId) {
    try {
      const device = this.devices.find(d => d.id === deviceId)
      if (!device) {
        throw new AppError('Device not found', 404)
      }

      // Simulate device test (in a real implementation, this would test actual audio input)
      const testResult = {
        success: true,
        device: device.name,
        connected: device.connected,
        channels: device.channels,
        sampleRate: device.sampleRates[0],
        latency: Math.random() * 10 + 5, // Simulated latency in ms
        signalLevel: Math.random() * 100, // Simulated signal level
        timestamp: new Date().toISOString()
      }

      if (config.development.simulateHardware) {
        testResult.note = 'Hardware simulation mode - test results are simulated'
      }

      logger.system('Audio device test completed', {
        deviceId,
        success: testResult.success,
        latency: testResult.latency
      })

      return testResult
    } catch (error) {
      logger.error('Audio device test failed:', error)
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async testAudioInput(deviceId, channel) {
    try {
      const device = this.devices.find(d => d.id === deviceId)
      if (!device) {
        throw new AppError('Device not found', 404)
      }

      if (channel < 1 || channel > device.channels) {
        throw new AppError(`Invalid channel ${channel}. Device has ${device.channels} channels.`, 400)
      }

      // Simulate audio input test
      const audioLevel = Math.random() * 100 // Simulated audio level
      const hasSignal = audioLevel > 10
      
      const testResult = {
        success: true,
        device: device.name,
        channel,
        audioLevel,
        hasSignal,
        peakLevel: audioLevel + Math.random() * 10,
        rmsLevel: audioLevel * 0.7,
        clipping: audioLevel > 95,
        timestamp: new Date().toISOString()
      }

      if (config.development.simulateHardware) {
        testResult.note = 'Hardware simulation mode - audio levels are simulated'
      }

      logger.system('Audio input test completed', {
        deviceId,
        channel,
        audioLevel: testResult.audioLevel,
        hasSignal: testResult.hasSignal
      })

      return testResult
    } catch (error) {
      logger.error('Audio input test failed:', error)
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async getChannelMapping() {
    return this.channelMapping
  }

  async updateChannelMapping(channelId, updates) {
    const channel = this.channelMapping.find(c => c.index === channelId)
    if (!channel) {
      throw new AppError('Channel not found', 404)
    }

    Object.assign(channel, updates)
    await this.saveConfiguration()

    logger.system('Channel mapping updated', { channelId, updates })
    return channel
  }

  async getRecommendedDevice() {
    const devices = await this.getDevices()
    return devices.find(d => d.recommended) || devices[0] || null
  }

  async checkXAirEditConnection() {
    // Simulate checking for X AIR EDIT application
    // In a real implementation, this would check for the actual application
    
    const isRunning = config.development.simulateHardware ? true : Math.random() > 0.5
    
    return {
      running: isRunning,
      version: isRunning ? '1.7.0' : null,
      connected: isRunning,
      deviceConnected: isRunning && this.selectedDevice !== null,
      timestamp: new Date().toISOString()
    }
  }

  async cleanup() {
    logger.system('Cleaning up Audio Device Service')
    await this.saveConfiguration()
  }
}

module.exports = AudioDeviceService

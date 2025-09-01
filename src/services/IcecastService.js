import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs-extra'
import path from 'path'
import xml2js from 'xml2js'
import fetch from 'node-fetch'

import config from '../config/index.js'
import logger from '../utils/logger.js'

// Define AppError locally since it's not exported from errorHandler
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

const execAsync = promisify(exec)

class IcecastService {
  constructor() {
    this.process = null
    
    // Use configured paths or fallback to null
    this.exePath = config.icecast.paths.exePath || null
    this.configPath = config.icecast.paths.configPath || config.icecast.configPath || null
    this.accessLogPath = config.icecast.paths.accessLogPath || null
    this.errorLogPath = config.icecast.paths.errorLogPath || null
    
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
      // Step 1: Check for manually configured paths first (highest priority)
      if (this.exePath && this.configPath) {
        try {
          await fs.access(this.exePath, fs.constants.X_OK);
          await fs.access(this.configPath, fs.constants.R_OK);

          // Verify version
          const { stdout } = await execAsync(`"${this.exePath}" -v`);
          const versionMatch = stdout.match(/Icecast ([^\s]+)/);
          const version = versionMatch ? versionMatch[1] : 'unknown';

          logger.icecast('Icecast installation verified via manual paths', { 
            version, 
            exePath: this.exePath, 
            configPath: this.configPath,
            accessLogPath: this.accessLogPath,
            errorLogPath: this.errorLogPath
          });
          
          return {
            installed: true,
            version,
            path: this.exePath,
            configPath: this.configPath,
            accessLogPath: this.accessLogPath,
            errorLogPath: this.errorLogPath,
            platform: process.platform
          };
        } catch (error) {
          logger.icecast('Manual path check failed. Falling back to automatic search.', { error: error.message });
          // Reset paths to null so automatic search can proceed
          this.exePath = null;
          this.configPath = null;
          this.accessLogPath = null;
          this.errorLogPath = null;
        }
      }

      // Step 2: Check for legacy customPath (deprecated but still supported)
      if (config.icecast.customPath) {
        const icecastPath = config.icecast.customPath;
        const exeName = process.platform === 'win32' ? 'icecast.exe' : 'icecast';
        const fullPath = path.join(icecastPath, exeName);

        try {
          await fs.access(fullPath, fs.constants.X_OK);
          const { stdout } = await execAsync(`"${fullPath}" -v`);
          const versionMatch = stdout.match(/Icecast ([^\s]+)/);
          const version = versionMatch ? versionMatch[1] : 'unknown';

          logger.icecast('Icecast installation verified via legacy custom path', { version, path: fullPath });
          return {
            installed: true,
            version,
            path: fullPath,
            platform: process.platform
          };
        } catch (error) {
          logger.icecast(`Legacy custom path check failed: ${fullPath}. Attempting default search.`, { error: error.message });
        }
      }

      // Step 2: Search for the executable in common system-wide locations based on the platform
      let commonPaths;
      let exeName = 'icecast';

      if (process.platform === 'win32') {
        exeName = 'icecast.exe';
        commonPaths = [
          path.join(process.env.ProgramFiles, 'Icecast', exeName),
          path.join(process.env['ProgramFiles(x86)'], 'Icecast', exeName),
          path.join(process.env.ProgramFiles, 'Icecast2', exeName),
          path.join(process.env['ProgramFiles(x86)'], 'Icecast2', exeName),
          'C:\\icecast\\icecast.exe',
          'C:\\icecast2\\icecast.exe',
          // Add bin subdirectories where executables are typically stored
          'C:\\Program Files\\Icecast\\bin\\icecast.exe',
          'C:\\Program Files (x86)\\Icecast\\bin\\icecast.exe',
          'C:\\Program Files\\Icecast2\\bin\\icecast.exe',
          'C:\\Program Files (x86)\\Icecast2\\bin\\icecast.exe'
        ];
      } else if (process.platform === 'darwin') { // macOS
        commonPaths = [
          '/Applications/Icecast/icecast',
          '/usr/local/bin/icecast',
          '/opt/local/bin/icecast',
          '/usr/bin/icecast'
        ];
      } else if (['linux', 'freebsd', 'openbsd'].includes(process.platform)) { // Unix-like
        commonPaths = [
          '/usr/local/bin/icecast',
          '/usr/bin/icecast',
          '/opt/icecast/icecast',
          '/bin/icecast'
        ];
      } else {
        // Platform not supported or no common paths to check
        logger.icecast('Platform not supported for automatic installation check', { platform: process.platform });
        return {
          installed: false,
          version: null,
          path: null,
          platform: process.platform
        };
      }

      // Check if executable exists in common paths
      for (const icecastPath of commonPaths) {
        try {
          await fs.access(icecastPath);
          
          // Try to get version
          try {
            const { stdout } = await execAsync(`"${icecastPath}" -v`);
            const versionMatch = stdout.match(/Icecast ([^\s]+)/);
            const version = versionMatch ? versionMatch[1] : 'unknown';

            // Set paths for this installation
            this.exePath = icecastPath;
            
            // Try to find config and log files in common locations
            if (process.platform === 'win32') {
              const baseDir = path.dirname(icecastPath);
              const parentDir = path.dirname(baseDir); // Go up from 'bin' to main directory
              
              // Check for config file
              const possibleConfigPaths = [
                path.join(parentDir, 'icecast.xml'),
                path.join(parentDir, 'etc', 'icecast.xml'),
                path.join(parentDir, 'conf', 'icecast.xml')
              ];
              
              for (const configPath of possibleConfigPaths) {
                try {
                  await fs.access(configPath);
                  this.configPath = configPath;
                  break;
                } catch (e) {
                  continue;
                }
              }
              
              // Set log paths
              if (this.configPath) {
                const logDir = path.join(path.dirname(this.configPath), 'log');
                this.accessLogPath = path.join(logDir, 'access.log');
                this.errorLogPath = path.join(logDir, 'error.log');
              }
            }

            logger.icecast(`Icecast installation verified on ${process.platform}`, { 
              version, 
              path: icecastPath,
              configPath: this.configPath,
              accessLogPath: this.accessLogPath,
              errorLogPath: this.errorLogPath
            });
            
            return {
              installed: true,
              version,
              path: icecastPath,
              configPath: this.configPath,
              accessLogPath: this.accessLogPath,
              errorLogPath: this.errorLogPath,
              platform: process.platform
            };
          } catch (versionError) {
            // Executable exists but version check failed
            logger.icecast('Icecast executable found but version check failed', { path: icecastPath, error: versionError.message });
            return {
              installed: true,
              version: 'unknown',
              path: icecastPath,
              platform: process.platform
            };
          }
        } catch (accessError) {
          continue; // Path not found, continue to the next one
        }
      }

      // Step 3: Check if the executable is in the system's PATH
      try {
        const { stdout } = await execAsync(`${exeName} -v`);
        const versionMatch = stdout.match(/Icecast ([^\s]+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        
        // Set executable path
        this.exePath = exeName;
        
        logger.icecast(`Icecast installation verified in PATH`, { version });
        return {
          installed: true,
          version,
          path: exeName,
          platform: process.platform
        };
      } catch (pathError) {
        // Installation not found
        logger.icecast('Icecast executable not found in common paths or system PATH.');
        return {
          installed: false,
          version: null,
          path: null,
          platform: process.platform
        };
      }
    } catch (error) {
      logger.error('Failed to perform Icecast installation check:', error);
      return {
        installed: false,
        version: null,
        path: null,
        platform: process.platform,
        error: error.message
      };
    }
  }

  async ensureConfigDirectory() {
    try {
      const configDir = path.dirname(this.configPath)
      logger.icecast('Ensuring config directory exists', { configDir })
      await fs.ensureDir(configDir)
      logger.icecast('Config directory ready', { configDir })
    } catch (error) {
      logger.error('Failed to create config directory:', error)
      throw new Error(`Failed to create config directory: ${error.message}`)
    }
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
      let installationCheck;
      try {
        installationCheck = await this.checkInstallation();
      } catch (installError) {
        // Installation check failed - treat as not installed
        logger.warn('Icecast installation check failed:', installError.message)
        return {
          installed: false,
          running: false,
          status: 'not-installed',
          uptime: 0,
          version: null,
          port: config.icecast.port,
          error: installError.message
        }
      }
      
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

  async searchForIcecastInstallations() {
    logger.icecast('Searching for Icecast installations...');
    
    const results = {
      installed: false,
      installationPath: null,
      files: {
        executable: false,
        batchFile: false,
        config: false,
        logDir: false,
        accessLog: false,
        errorLog: false
      },
      searchedPaths: [],
      suggestions: []
    }
    
    // Windows-specific search paths (prioritize Program Files installations)
    let searchPaths = [];
    
    if (process.platform === 'win32') {
      searchPaths = [
        'C:\\Program Files (x86)\\Icecast',
        'C:\\Program Files\\Icecast',
        'C:\\Program Files (x86)\\Icecast2',
        'C:\\Program Files\\Icecast2',
        'C:\\icecast',
        'C:\\icecast2'
      ];
      
      // Add environment-based paths
      if (process.env.ProgramFiles) {
        searchPaths.push(path.join(process.env.ProgramFiles, 'Icecast'));
      }
      if (process.env['ProgramFiles(x86)']) {
        searchPaths.push(path.join(process.env['ProgramFiles(x86)'], 'Icecast'));
      }
      if (process.env.LOCALAPPDATA) {
        searchPaths.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Icecast'));
      }
    } else if (process.platform === 'darwin') { // macOS
      searchPaths = [
        '/Applications/Icecast',
        '/usr/local/bin',
        '/opt/local/bin',
        '/usr/bin'
      ];
    } else { // Linux/Unix
      searchPaths = [
        '/usr/local/bin',
        '/usr/bin',
        '/opt/icecast',
        '/bin'
      ];
    }
    
    results.searchedPaths = searchPaths;
    
    // Check each search path for a complete Icecast installation
    for (const searchPath of searchPaths) {
      try {
        logger.icecast(`Checking path: ${searchPath}`);
        
        if (await this.directoryExists(searchPath)) {
          logger.icecast(`Directory exists: ${searchPath}`);
          
          // For Windows, validate the complete installation structure
          if (process.platform === 'win32') {
            const files = await this.validateIcecastFiles(searchPath);
            logger.icecast(`File validation results for ${searchPath}:`, files);
            
            // Check if we have at least the essential files
            if (files.executable && files.config) {
              results.installed = true;
              results.installationPath = searchPath;
              results.files = files;
              
              // Set configuration path if found
              if (files.config) {
                this.configPath = path.join(searchPath, 'icecast.xml');
              }
              
              logger.icecast(`Valid Icecast installation found at: ${searchPath}`);
              break;
            }
          } else {
            // For Unix-like systems, just check if the executable exists
            const exeName = 'icecast';
            const icecastExe = path.join(searchPath, exeName);
            
            if (await this.fileExists(icecastExe)) {
              results.installed = true;
              results.installationPath = searchPath;
              results.files.executable = true;
              
              logger.icecast(`Icecast executable found at: ${icecastExe}`);
              break;
            }
          }
        } else {
          logger.icecast(`Directory does not exist: ${searchPath}`);
        }
      } catch (error) {
        logger.error(`Error checking path ${searchPath}:`, error);
      }
    }
    
    // If not found in standard locations, check if it's in PATH
    if (!results.installed) {
      try {
        const exeName = process.platform === 'win32' ? 'icecast.exe' : 'icecast';
        if (process.platform === 'win32') {
          const { stdout } = await execAsync(`where ${exeName}`);
          const pathResult = stdout.trim().split('\n')[0];
          if (pathResult) {
            results.installed = true;
            results.installationPath = path.dirname(pathResult);
            results.files.executable = true;
            logger.icecast(`Icecast found in PATH: ${pathResult}`);
          }
        } else {
          const { stdout } = await execAsync(`which ${exeName}`);
          if (stdout.trim()) {
            results.installed = true;
            results.installationPath = path.dirname(stdout.trim());
            results.files.executable = true;
            logger.icecast(`Icecast found in PATH: ${stdout.trim()}`);
          }
        }
      } catch (error) {
        // Not in PATH
      }
    }
    
    // Check Windows services as fallback
    if (!results.installed && process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('sc query "Icecast"');
        if (stdout.includes('SERVICE_NAME: Icecast')) {
          results.installed = true;
          results.installationPath = 'service';
          logger.icecast('Icecast Windows service detected');
        }
      } catch (error) {
        // Service not found
      }
    }
    
    // Generate suggestions if not found
    if (!results.installed) {
      if (process.platform === 'win32') {
        results.suggestions = [
          'Download Icecast from https://icecast.org/download/',
          'Install Icecast to C:\\Program Files (x86)\\Icecast',
          'Ensure the installation includes icecast.exe in the bin folder',
          'Check that icecast.xml config file exists in the root folder',
          'Set ICECAST_EXE_PATH in .env to point to your installation'
        ];
      } else if (process.platform === 'darwin') {
        results.suggestions = [
          'Install via Homebrew: brew install icecast',
          'Check if icecast command is available in Terminal',
          'Download from https://icecast.org/download/'
        ];
      } else {
        results.suggestions = [
          'Install via package manager: sudo apt install icecast2 (Ubuntu/Debian)',
          'Install via package manager: sudo dnf install icecast (Fedora)',
          'Check if icecast or icecast2 commands are available'
        ];
      }
    }
    
    return results;
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

      logger.icecast('Starting Icecast - checking config file')
      
      // Check if we have a valid config path
      if (!this.configPath) {
        throw new AppError('No Icecast configuration file path available. Please set ICECAST_CONFIG_PATH in your .env file.', 500)
      }
      
      // Check if config file exists, generate only if needed
      try {
        await fs.access(this.configPath)
        logger.icecast('Using existing config file', { path: this.configPath })
      } catch (error) {
        logger.icecast('Config file not found, generating new one', { path: this.configPath })
        await this.generateConfigFile()
      }

      logger.icecast('Starting Icecast - getting Icecast command')
      // Get Icecast command
      const icecastCommand = await this.getIcecastCommand()
      
      logger.icecast('Starting Icecast server', { command: icecastCommand })
      
      if (icecastCommand === 'service') {
        // Windows service - try to start the service
        if (process.platform === 'win32') {
          try {
            await execAsync('net start Icecast')
            logger.icecast('Icecast Windows service started')
            
            // Wait for service to be ready
            await new Promise(resolve => setTimeout(resolve, 5000))
            
            const status = await this.getStatus()
            if (status.running) {
              this.isRunning = true
              this.stats.startTime = Date.now()
              
              return {
                success: true,
                message: 'Icecast Windows service started successfully',
                status: 'running',
                service: true
              }
            } else {
              throw new Error('Icecast service failed to start')
            }
          } catch (serviceError) {
            logger.error('Failed to start Icecast Windows service:', serviceError)
            throw new AppError(`Failed to start Icecast service: ${serviceError.message}`, 500)
          }
        }
      } else {
        // Direct process execution
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

        // Wait for process to start and check status
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
          // Try to get more detailed error information
          if (this.process && this.process.exitCode !== null) {
            throw new Error(`Icecast failed to start with exit code: ${this.process.exitCode}`)
          } else {
            throw new Error('Icecast failed to start - process may have crashed')
          }
        }
      }

    } catch (error) {
      logger.error('Failed to start Icecast:', error)
      throw new AppError(`Failed to start Icecast: ${error.message}`, 500)
    }
  }

  async stop() {
    try {
      if (!this.isRunning) {
        return {
          success: true,
          message: 'Icecast is not running',
          status: 'stopped'
        }
      }

      logger.icecast('Stopping Icecast server')
      
      if (this.process) {
        // Direct process - kill it
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
      } else if (process.platform === 'win32') {
        // Windows service - try to stop the service
        try {
          await execAsync('net stop Icecast')
          logger.icecast('Icecast Windows service stopped')
        } catch (serviceError) {
          logger.warn('Failed to stop Icecast Windows service, may already be stopped:', serviceError.message)
        }
      }

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
      // Step 1: Check for manually configured paths first (highest priority)
      if (this.exePath) {
        try {
          await fs.access(this.exePath, fs.constants.X_OK);
          logger.icecast('Using manually configured Icecast executable path', { path: this.exePath });
          return this.exePath;
        } catch (error) {
          logger.icecast('Manual executable path check failed. Falling back to automatic search.', { error: error.message });
        }
      }

      // Step 2: Check for legacy customPath (deprecated but still supported)
      if (config.icecast.customPath) {
        const icecastPath = config.icecast.customPath;
        const exeName = process.platform === 'win32' ? 'icecast.exe' : 'icecast';
        const fullPath = path.join(icecastPath, exeName);

        try {
          await fs.access(fullPath);
          return fullPath;
        } catch (error) {
          logger.icecast(`Legacy custom path check failed: ${fullPath}. Attempting default search.`, { error: error.message });
        }
      }

      // Step 2: Search for the executable in common system-wide locations based on the platform
      let commonPaths;
      let exeName = 'icecast';

      if (process.platform === 'win32') {
        exeName = 'icecast.exe';
        commonPaths = [
          path.join(process.env.ProgramFiles, 'Icecast', exeName),
          path.join(process.env['ProgramFiles(x86)'], 'Icecast', exeName),
          path.join(process.env.ProgramFiles, 'Icecast2', exeName),
          path.join(process.env['ProgramFiles(x86)'], 'Icecast2', exeName),
          'C:\\icecast\\icecast.exe',
          'C:\\icecast2\\icecast.exe',
          // Add explicit paths for common installations
          'C:\\Program Files\\Icecast\\icecast.exe',
          'C:\\Program Files (x86)\\Icecast\\icecast.exe',
          'C:\\Program Files\\Icecast2\\icecast.exe',
          'C:\\Program Files (x86)\\Icecast2\\icecast.exe',
          // Add bin subdirectories where executables are typically stored
          'C:\\Program Files\\Icecast\\bin\\icecast.exe',
          'C:\\Program Files (x86)\\Icecast\\bin\\icecast.exe',
          'C:\\Program Files\\Icecast2\\bin\\icecast.exe',
          'C:\\Program Files (x86)\\Icecast2\\bin\\icecast.exe'
        ];
      } else if (process.platform === 'darwin') { // macOS
        commonPaths = [
          '/Applications/Icecast/icecast',
          '/usr/local/bin/icecast',
          '/opt/local/bin/icecast',
          '/usr/bin/icecast'
        ];
      } else if (['linux', 'freebsd', 'openbsd'].includes(process.platform)) { // Unix-like
        commonPaths = [
          '/usr/local/bin/icecast',
          '/usr/bin/icecast',
          '/opt/icecast/icecast',
          '/bin/icecast'
        ];
      } else {
        throw new Error(`Platform not supported: ${process.platform}`);
      }

      // Check if executable exists in common paths
      for (const icecastPath of commonPaths) {
        try {
          await fs.access(icecastPath);
          return icecastPath;
        } catch (error) {
          continue; // Path not found, continue to the next one
        }
      }

      // Step 3: Check if the executable is in the system's PATH
      try {
        if (process.platform === 'win32') {
          await execAsync(`where ${exeName}`);
        } else {
          await execAsync(`which ${exeName}`);
        }
        return exeName;
      } catch (pathError) {
        // Try alternative names
        try {
          if (process.platform === 'win32') {
            await execAsync('where icecast2');
            return 'icecast2';
          } else {
            await execAsync('which icecast2');
            return 'icecast2';
          }
        } catch (altError) {
          // Check if running as Windows service
          if (process.platform === 'win32') {
            try {
              const { stdout } = await execAsync('sc query "Icecast"');
              if (stdout.includes('RUNNING')) {
                return 'service';
              }
            } catch (serviceError) {
              // Service not found
            }
          }
        }
      }
      
      throw new Error(`Icecast executable not found on ${process.platform}`);
    } catch (error) {
      logger.error('Failed to find Icecast executable:', error);
      throw new Error(`Icecast executable not found: ${error.message}`);
    }
  }

  async generateConfigFile() {
    try {
      logger.icecast('Generating Icecast config file', { configPath: this.configPath })
      
      // Use Windows-style paths for Windows platform
      const isWindows = process.platform === 'win32';
      const baseDir = isWindows ? path.dirname(this.configPath).replace(/\\/g, '/') : path.dirname(this.configPath);
      
      // Use configured log paths if available, otherwise generate default paths
      let logDir, webRoot, adminRoot;
      
      if (this.accessLogPath && this.errorLogPath) {
        // Use configured log directory
        logDir = path.dirname(this.accessLogPath).replace(/\\/g, '/');
        webRoot = isWindows ? path.join(path.dirname(this.configPath), 'web').replace(/\\/g, '/') : path.join(path.dirname(this.configPath), 'web');
        adminRoot = isWindows ? path.join(path.dirname(this.configPath), 'admin').replace(/\\/g, '/') : path.join(path.dirname(this.configPath), 'admin');
      } else {
        // Generate default paths
        logDir = isWindows ? path.join(path.dirname(this.configPath), 'logs').replace(/\\/g, '/') : path.join(path.dirname(this.configPath), 'logs');
        webRoot = isWindows ? path.join(path.dirname(this.configPath), 'web').replace(/\\/g, '/') : path.join(path.dirname(this.configPath), 'web');
        adminRoot = isWindows ? path.join(path.dirname(this.configPath), 'admin').replace(/\\/g, '/') : path.join(path.dirname(this.configPath), 'admin');
      }
      
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
        <basedir>${baseDir}</basedir>
        <logdir>${logDir}</logdir>
        <webroot>${webRoot}</webroot>
        <adminroot>${adminRoot}</adminroot>
        <alias source="/" destination="/status.xsl"/>
    </paths>
    <logging>
        <accesslog>${this.accessLogPath ? path.basename(this.accessLogPath) : 'access.log'}</accesslog>
        <errorlog>${this.errorLogPath ? path.basename(this.errorLogPath) : 'error.log'}</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>
</icecast>`

      await fs.writeFile(this.configPath, configTemplate)
      logger.icecast('Icecast config file generated successfully', { path: this.configPath })
    } catch (error) {
      logger.error('Failed to generate Icecast config file:', error)
      throw new Error(`Failed to generate config file: ${error.message}`)
    }
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

  /**
   * Helper function to check if a file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper function to check if a directory exists
   */
  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Validate all required Icecast files exist for Windows installation
   */
  async validateIcecastFiles(installationPath) {
    const files = {
      executable: await this.fileExists(path.join(installationPath, 'bin', 'icecast.exe')),
      batchFile: await this.fileExists(path.join(installationPath, 'icecast.bat')),
      config: await this.fileExists(path.join(installationPath, 'icecast.xml')),
      logDir: await this.directoryExists(path.join(installationPath, 'logs')),
      accessLog: await this.fileExists(path.join(installationPath, 'logs', 'access.log')),
      errorLog: await this.fileExists(path.join(installationPath, 'logs', 'error.log'))
    };

    return files;
  }

  /**
   * Check if Icecast process is running (enhanced for Windows)
   */
  async isIcecastRunning() {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq icecast.exe" /FO CSV');
        return stdout.includes('icecast.exe');
      } else {
        const { stdout } = await execAsync('ps aux | grep icecast | grep -v grep');
        return stdout.trim().length > 0;
      }
    } catch (error) {
      logger.error('Error checking if Icecast is running:', error);
      return false;
    }
  }

  /**
   * Get Icecast process ID (enhanced for Windows)
   */
  async getIcecastProcessId() {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq icecast.exe" /FO CSV');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const processLine = lines[1].split(',');
          if (processLine.length > 1) {
            return processLine[1].replace(/"/g, ''); // Remove quotes
          }
        }
      } else {
        const { stdout } = await execAsync('pgrep icecast');
        return stdout.trim();
      }
    } catch (error) {
      logger.error('Error getting Icecast process ID:', error);
    }
    return null;
  }

  /**
   * Validate Icecast configuration file
   */
  async validateConfiguration() {
    if (!this.configPath) {
      // Try to find config path if not set
      const searchResults = await this.searchForIcecastInstallations();
      if (searchResults.found && searchResults.installations.length > 0) {
        // Look for a Windows installation with config file
        const windowsInstall = searchResults.installations.find(install => 
          install.platform === 'win32' && install.path.includes('Program Files')
        );
        if (windowsInstall) {
          const basePath = path.dirname(windowsInstall.path);
          this.configPath = path.join(basePath, 'icecast.xml');
        }
      }
      
      if (!this.configPath) {
        throw new Error('Icecast configuration file path not found');
      }
    }

    if (!await this.fileExists(this.configPath)) {
      throw new Error('Icecast configuration file not found');
    }

    try {
      const configContent = await fs.readFile(this.configPath, 'utf8');
      
      // Basic validation - check for required elements
      const required = ['<hostname>', '<port>', '<source-password>', '<admin-password>'];
      const missing = required.filter(element => !configContent.includes(element));
      
      if (missing.length > 0) {
        return {
          valid: false,
          errors: missing.map(el => `Missing required element: ${el}`)
        };
      }

      // Check for the log directory fix (paths starting with ./)
      const hasFixedPaths = configContent.includes('./logs/') || configContent.includes('.\\logs\\');
      
      return {
        valid: true,
        hasFixedPaths,
        message: hasFixedPaths ? 'Configuration includes log path fix' : 'Configuration valid'
      };

    } catch (error) {
      throw new Error(`Failed to validate configuration: ${error.message}`);
    }
  }
}

export default IcecastService

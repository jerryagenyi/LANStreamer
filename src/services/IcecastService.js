import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs-extra'
import path from 'path'
import xml2js from 'xml2js'
import fetch from 'node-fetch'

import config from '../config/index.js'
import logger from '../utils/logger.js'
import {
  IcecastError,
  ErrorCodes,
  ErrorFactory,
  ErrorHandler
} from '../utils/errors.js'

const execAsync = promisify(exec)

class IcecastService {
  constructor() {
    // Service lifecycle state
    this.state = 'uninitialized'
    this.initPromise = null

    // Process management
    this.process = null
    this.isRunning = false

    // Paths (resolved during initialization)
    this.paths = {
      exe: null,
      config: null,
      accessLog: null,
      errorLog: null
    }

    // Runtime statistics
    this.stats = {
      startTime: null,
      connections: 0,
      sources: 0
    }
  }

  /**
   * Initialize the Icecast service
   * This method is idempotent and can be called multiple times safely
   */
  async initialize() {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.state === 'initialized') {
      return;
    }

    // Start initialization
    this.initPromise = this._doInitialization();

    try {
      await this.initPromise;
      this.state = 'initialized';
      logger.icecast('Icecast Service initialized successfully');
    } catch (error) {
      this.state = 'error';
      this.initPromise = null; // Allow retry
      throw error;
    }
  }

  /**
   * Internal initialization logic
   */
  async _doInitialization() {
    return ErrorHandler.handle(async () => {
      logger.icecast('Initializing Icecast Service');

      // Step 1: Try device config first (fastest path)
      let installation = await this.loadDeviceConfig();

      // Step 2: Validate saved path still works
      if (installation && await this.validateSavedPath(installation.paths.exe)) {
        logger.icecast('Using validated device config', {
          path: installation.paths.exe,
          source: installation.source
        });
        this.paths = installation.paths;
      } else {
        // Step 3: Saved path invalid or doesn't exist, detect fresh
        if (installation) {
          logger.icecast('Saved path invalid, detecting fresh installation...');
        }

        installation = await this.detectInstallation();
        this.paths = installation.paths;

        // Step 4: Save new path for next time
        await this.saveDeviceConfig(installation);
      }

      // Step 2: Ensure config directory exists
      if (this.paths.config) {
        await this.ensureConfigDirectory();
      }

      // Step 3: Check if already running
      await this.checkRunningStatus();

    }, { operation: 'initialize', service: 'icecast' });
  }

  /**
   * Ensure service is initialized before operations
   */
  async ensureInitialized() {
    if (this.state === 'uninitialized') {
      await this.initialize();
    } else if (this.state === 'error') {
      throw ErrorFactory.icecast(
        'Service is in error state. Please check logs and restart.',
        ErrorCodes.ICECAST_NOT_INSTALLED
      );
    }
  }

  /**
   * Detect Icecast installation using simplified strategy pattern
   */
  async detectInstallation() {
    return ErrorHandler.handle(async () => {
      const strategies = [
        () => this._checkEnvironmentPaths(),
        () => this._checkStandardPaths(),
        () => this._checkSystemPath(),
        () => this._checkLegacyPaths()
      ];

      for (const strategy of strategies) {
        try {
          const result = await strategy();
          if (result && result.isValid) {
            logger.icecast('Installation detected', {
              strategy: strategy.name,
              paths: result.paths
            });
            return result;
          }
        } catch (error) {
          logger.debug(`Detection strategy failed: ${error.message}`);
          continue;
        }
      }

      throw ErrorFactory.icecast(
        'Icecast installation not found. Please install Icecast or set ICECAST_EXE_PATH environment variable.',
        ErrorCodes.ICECAST_NOT_INSTALLED,
        {
          suggestion: 'Visit https://icecast.org/download/ to download Icecast',
          environmentVariable: 'Set ICECAST_EXE_PATH to point to your Icecast executable'
        }
      );
    }, { operation: 'detectInstallation' });
  }

  /**
   * Check environment variable paths (highest priority)
   */
  async _checkEnvironmentPaths() {
    const exePath = config.icecast.paths.exePath;
    const configPath = config.icecast.paths.configPath || config.icecast.configPath;

    if (!exePath || !configPath) {
      return null;
    }

    try {
      await fs.access(exePath, fs.constants.X_OK);
      await fs.access(configPath, fs.constants.R_OK);

      const version = await this._getIcecastVersion(exePath);

      return {
        isValid: true,
        paths: {
          exe: exePath,
          config: configPath,
          accessLog: config.icecast.paths.accessLogPath,
          errorLog: config.icecast.paths.errorLogPath
        },
            version, 
        source: 'environment'
      };
    } catch (error) {
      throw ErrorFactory.fileSystem(
        `Environment paths are invalid: ${error.message}`,
        ErrorCodes.FILE_ACCESS_DENIED,
        { exePath, configPath }
      );
    }
  }

  /**
   * Check standard installation paths
   */
  async _checkStandardPaths() {
    const standardPaths = this._getStandardInstallationPaths();

    for (const pathSet of standardPaths) {
      try {
        await fs.access(pathSet.exe, fs.constants.X_OK);

        // Try to find config file
        const configPath = await this._findConfigFile(path.dirname(pathSet.exe));

        const version = await this._getIcecastVersion(pathSet.exe);
          
          return {
          isValid: true,
          paths: {
            exe: pathSet.exe,
            config: configPath,
            accessLog: pathSet.accessLog,
            errorLog: pathSet.errorLog
          },
            version,
          source: 'standard'
        };
      } catch (error) {
        continue; // Try next path
      }
    }

    return null;
  }

  /**
   * Get platform-specific standard installation paths
   */
  _getStandardInstallationPaths() {
    if (process.platform === 'win32') {
      return [
        {
          exe: path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Icecast', 'bin', 'icecast.exe'),
          accessLog: path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Icecast', 'logs', 'access.log'),
          errorLog: path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Icecast', 'logs', 'error.log')
        },
        {
          exe: path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Icecast', 'bin', 'icecast.exe'),
          accessLog: path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Icecast', 'logs', 'access.log'),
          errorLog: path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Icecast', 'logs', 'error.log')
        }
      ];
    } else if (process.platform === 'darwin') {
      return [
        { exe: '/usr/local/bin/icecast' },
        { exe: '/opt/local/bin/icecast' },
        { exe: '/usr/bin/icecast' }
      ];
    } else {
      return [
        { exe: '/usr/local/bin/icecast' },
        { exe: '/usr/bin/icecast' },
        { exe: '/opt/icecast/icecast' }
      ];
    }
  }

  /**
   * Check system PATH for Icecast
   */
  async _checkSystemPath() {
    const exeName = process.platform === 'win32' ? 'icecast.exe' : 'icecast';

    try {
      const version = await this._getIcecastVersion(exeName);

      return {
        isValid: true,
        paths: {
          exe: exeName,
          config: null, // Will need to be generated
          accessLog: null,
          errorLog: null
        },
        version,
        source: 'system-path'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check legacy configuration paths
   */
  async _checkLegacyPaths() {
    if (!config.icecast.customPath) {
      return null;
    }

    const exeName = process.platform === 'win32' ? 'icecast.exe' : 'icecast';
    const exePath = path.join(config.icecast.customPath, exeName);

    try {
      await fs.access(exePath, fs.constants.X_OK);
      const version = await this._getIcecastVersion(exePath);

      return {
        isValid: true,
        paths: {
          exe: exePath,
          config: null,
          accessLog: null,
          errorLog: null
        },
        version,
        source: 'legacy'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Icecast version from executable
   */
  async _getIcecastVersion(exePath) {
    try {
      const { stdout } = await execAsync(`"${exePath}" -v`);
      const versionMatch = stdout.match(/Icecast ([^\s]+)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch (error) {
      throw ErrorFactory.process(
        `Failed to get Icecast version: ${error.message}`,
        ErrorCodes.PROCESS_SPAWN_FAILED,
        { exePath }
      );
    }
  }

  /**
   * Find configuration file in installation directory
   */
  async _findConfigFile(installDir) {
    const possiblePaths = [
      path.join(installDir, '..', 'icecast.xml'),
      path.join(installDir, '..', 'etc', 'icecast.xml'),
      path.join(installDir, '..', 'conf', 'icecast.xml'),
      path.join(installDir, 'icecast.xml')
    ];

    for (const configPath of possiblePaths) {
      try {
        await fs.access(configPath, fs.constants.R_OK);
        return configPath;
      } catch (error) {
        continue;
      }
    }

    return null; // Config will be generated if needed
  }

  /**
   * Legacy method - keeping for backward compatibility but simplified
   * @deprecated Use detectInstallation() instead
   */
  async checkInstallation() {
    try {
      const installation = await this.detectInstallation();

      return {
        installed: installation.isValid,
        version: installation.version,
        path: installation.paths.exe,
        configPath: installation.paths.config,
        accessLogPath: installation.paths.accessLog,
        errorLogPath: installation.paths.errorLog,
            platform: process.platform
          };
        } catch (error) {
      logger.warn('Installation check failed:', error.message);
      return {
        installed: false,
        version: null,
        path: null,
        configPath: null,
        accessLogPath: null,
        errorLogPath: null,
        platform: process.platform,
        error: error.message
      };
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
      
      // Check if Icecast process is actually running (even if not started by us)
      const processRunning = await this.isIcecastRunning();
      
      if (!processRunning) {
        this.isRunning = false; // Sync our internal state
        return {
          installed: true,
          running: false,
          status: 'stopped',
          uptime: 0,
          version: installationCheck.version,
          port: config.icecast.port
        }
      } else {
        // Process is running - sync our internal state
        this.isRunning = true;
      }

      // Try to get stats from admin interface, but don't fail if server is still starting up
      let response;
      try {
        response = await fetch(`http://${config.icecast.host}:${config.icecast.port}/admin/stats.xml`, {
        timeout: 5000,
        headers: {
          'Authorization': `Basic ${Buffer.from(`admin:${config.icecast.adminPassword}`).toString('base64')}`
        }
      })

      if (!response.ok) {
          // If HTTP request fails but process is running, server might still be starting up
          logger.warn(`HTTP request failed with status ${response.status}, but process is running - server may still be starting up`)
          return {
            installed: true,
            running: true, // Process is running, so consider it running
            status: 'starting', // Indicate it's starting up
            uptime: 0,
            version: installationCheck.version,
            port: config.icecast.port
          }
        }
      } catch (error) {
        // If fetch fails but process is running, server might still be starting up
        logger.warn(`HTTP request failed: ${error.message}, but process is running - server may still be starting up`)
        return {
          installed: true,
          running: true, // Process is running, so consider it running
          status: 'starting', // Indicate it's starting up
          uptime: 0,
          version: installationCheck.version,
          port: config.icecast.port
        }
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
              logger.icecast(`Log directory check for ${path.join(searchPath, 'logs')}:`, files.logDir);
            
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

  /**
   * Start the Icecast server
   */
  async start() {
    return ErrorHandler.handle(async () => {
      // Ensure service is properly initialized
      await this.ensureInitialized();

      // Check if already running
      if (this.isRunning) {
        return {
          success: true,
          message: 'Icecast is already running',
          status: 'running'
        };
      }

      logger.icecast('Starting Icecast server');

      // Ensure we have a valid config path
      if (!this.paths.config) {
        throw ErrorFactory.icecast(
          'No configuration file path available. Please check your Icecast installation.',
          ErrorCodes.ICECAST_CONFIG_INVALID,
          {
            suggestion: 'Set ICECAST_CONFIG_PATH environment variable or ensure Icecast is properly installed'
          }
        );
      }

      // Ensure config file exists
      await this._ensureConfigFile();

      // Get the command to execute
      const icecastCommand = await this._getIcecastCommand();

      logger.icecast('Starting Icecast server', { command: icecastCommand });

      // Execute based on command type
      if (icecastCommand === 'service') {
        return await this._startAsService();
      } else {
        return await this._startAsProcess(icecastCommand);
      }

    }, { operation: 'start', service: 'icecast' });
  }

  /**
   * Ensure configuration file exists
   */
  async _ensureConfigFile() {
    try {
      await fs.access(this.paths.config, fs.constants.R_OK);
      logger.icecast('Using existing config file', { path: this.paths.config });
      } catch (error) {
      logger.icecast('Config file not found, generating new one', { path: this.paths.config });
      await this.generateConfigFile();
    }
  }

  /**
   * Start Icecast as Windows service
   */
  async _startAsService() {
    if (process.platform !== 'win32') {
      throw ErrorFactory.icecast(
        'Service mode is only supported on Windows',
        ErrorCodes.ICECAST_START_FAILED
      );
    }

    try {
      await execAsync('net start Icecast');
      logger.icecast('Icecast Windows service started');
            
            // Wait for service to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
            
      // Verify service started
      const status = await this.getStatus();
            if (status.running) {
        this.isRunning = true;
        this.stats.startTime = Date.now();
              
              return {
                success: true,
                message: 'Icecast Windows service started successfully',
                status: 'running',
                service: true
        };
            } else {
        throw ErrorFactory.icecast(
          'Icecast service started but is not responding',
          ErrorCodes.ICECAST_START_FAILED
        );
      }
    } catch (error) {
      if (error instanceof IcecastError) {
        throw error;
      }

      throw ErrorFactory.icecast(
        `Failed to start Icecast service: ${error.message}`,
        ErrorCodes.ICECAST_START_FAILED,
        { originalError: error.message }
      );
    }
  }
  /**
   * Start Icecast as direct process
   */
  async _startAsProcess(icecastCommand) {
    try {
      let command, args;

      if (icecastCommand.endsWith('.bat')) {
        // For batch files, use cmd.exe to execute them
        command = 'cmd.exe';
        args = ['/c', icecastCommand, '-c', this.paths.config];
        logger.icecast('Executing Icecast batch file', { command, args });
      } else {
        // For executable files, run directly
        command = icecastCommand;
        args = ['-c', this.paths.config];
        logger.icecast('Executing Icecast executable', { command, args });
      }

      this.process = spawn(command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false
      });

      // Set up process event handlers
      this._setupProcessHandlers();

      // Wait for process to start and verify
      await new Promise(resolve => setTimeout(resolve, 8000));

      const status = await this.getStatus();
      if (status.running || status.status === 'starting') {
        this.isRunning = true;
        this.stats.startTime = Date.now();

        logger.icecast('Icecast server started successfully');
          return {
            success: true,
            message: 'Icecast server started successfully',
            status: 'running',
            pid: this.process.pid
        };
        } else {
        // Process failed to start properly
        const exitCode = this.process?.exitCode;
        if (exitCode !== null) {
          throw ErrorFactory.icecast(
            `Icecast failed to start with exit code: ${exitCode}`,
            ErrorCodes.ICECAST_START_FAILED,
            { exitCode, command, args }
          );
          } else {
          throw ErrorFactory.icecast(
            'Icecast failed to start - process may have crashed',
            ErrorCodes.ICECAST_START_FAILED,
            { command, args }
          );
        }
      }
    } catch (error) {
      if (error instanceof IcecastError) {
        throw error;
      }

      throw ErrorFactory.icecast(
        `Failed to start Icecast process: ${error.message}`,
        ErrorCodes.PROCESS_SPAWN_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Set up process event handlers
   */
  _setupProcessHandlers() {
    if (!this.process) return;

    this.process.stdout.on('data', (data) => {
      logger.icecast('Icecast stdout', { output: data.toString().trim() });
    });

    this.process.stderr.on('data', (data) => {
      logger.icecast('Icecast stderr', { output: data.toString().trim() });
    });

    this.process.on('exit', (code, signal) => {
      logger.icecast('Icecast process exited', { code, signal });
      this.isRunning = false;
      this.process = null;
    });

    this.process.on('error', (error) => {
      logger.error('Icecast process error:', error);
      this.isRunning = false;
      this.process = null;
    });
  }

  /**
   * Stop the Icecast server
   */
  async stop() {
    return ErrorHandler.handle(async () => {
      // Check if any icecast process is actually running
      const processRunning = await this.isIcecastRunning();

      if (!processRunning) {
        this.isRunning = false; // Sync our state
        return {
          success: true,
          message: 'Icecast is not running',
          status: 'stopped'
        };
      }

      logger.icecast('Stopping Icecast server');
      
      if (this.process) {
        await this._stopDirectProcess();
      } else {
        await this._stopExternalProcess();
      }

      // Update state
      this.isRunning = false;
      this.process = null;
      this.stats.startTime = null;

      logger.icecast('Icecast server stopped successfully');
      return {
        success: true,
        message: 'Icecast server stopped successfully',
        status: 'stopped'
      };

    }, { operation: 'stop', service: 'icecast' });
  }

  /**
   * Stop direct process managed by this service
   */
  async _stopDirectProcess() {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
          if (this.process && !this.process.killed) {
          logger.warn('Process did not terminate gracefully, force killing');
          this.process.kill('SIGKILL');
        }
      }, 10000);

      this.process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.process.on('error', (error) => {
        clearTimeout(timeout);
        reject(ErrorFactory.process(
          `Failed to stop process: ${error.message}`,
          ErrorCodes.PROCESS_KILL_FAILED
        ));
      });

      // Send termination signal
      this.process.kill('SIGTERM');
    });
  }

  /**
   * Stop external Icecast process (service or system process)
   */
  async _stopExternalProcess() {
    if (process.platform === 'win32') {
      await this._stopWindowsProcess();
          } else {
      await this._stopUnixProcess();
    }
  }

  /**
   * Stop Icecast on Windows (service or process)
   */
  async _stopWindowsProcess() {
    const errors = [];

    // Try Windows service first
    try {
      await execAsync('net stop Icecast');
      logger.icecast('Icecast Windows service stopped');
      return;
        } catch (serviceError) {
      errors.push(`Service stop failed: ${serviceError.message}`);
      logger.debug('Windows service stop failed, trying process kill');
    }

    // Force kill any remaining icecast.exe processes
    try {
      await execAsync('taskkill /IM icecast.exe /F');
      logger.icecast('Force killed icecast.exe processes');
      return;
    } catch (killError) {
      errors.push(`Process kill failed: ${killError.message}`);
    }

    // If both methods failed, throw error
    throw ErrorFactory.process(
      'Failed to stop Icecast on Windows',
      ErrorCodes.ICECAST_STOP_FAILED,
      { attempts: errors }
    );
  }

  /**
   * Stop Icecast on Unix-like systems
   */
  async _stopUnixProcess() {
    try {
      // Try to find and kill icecast processes
      const { stdout } = await execAsync('pgrep icecast');
      const pids = stdout.trim().split('\n').filter(pid => pid);

      if (pids.length === 0) {
        logger.icecast('No Icecast processes found');
        return;
      }

      // Kill processes gracefully first
      for (const pid of pids) {
        try {
          await execAsync(`kill -TERM ${pid}`);
        } catch (error) {
          logger.debug(`Failed to send TERM signal to PID ${pid}`);
        }
      }

      // Wait a moment for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Force kill if still running
      for (const pid of pids) {
        try {
          await execAsync(`kill -KILL ${pid}`);
        } catch (error) {
          // Process may have already exited
        }
      }

      logger.icecast('Icecast processes stopped');
    } catch (error) {
      throw ErrorFactory.process(
        `Failed to stop Icecast on ${process.platform}: ${error.message}`,
        ErrorCodes.ICECAST_STOP_FAILED
      );
    }
  }

  /**
   * Restart the Icecast server
   */
  async restart() {
    return ErrorHandler.handle(async () => {
      logger.icecast('Restarting Icecast server');

      // Stop the server first
      logger.icecast('Restart: Stopping server...');
      await this.stop();

      // Smart cleanup - wait for ACTUAL shutdown instead of guessing timing
      logger.icecast('Restart: Waiting for clean shutdown...');
      // Smart timing - wait for actual shutdown, not arbitrary time
      const maxWait = 10000; // 10 second safety net
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const stillRunning = await this.isIcecastRunning();
        if (!stillRunning) {
          logger.icecast('Shutdown confirmed', { 
            waitTime: `${Date.now() - startTime}ms`,
            message: 'Proceeding immediately - no guessing!'
          });
          break; // Proceed immediately when process stops!
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
      }

      // Verify no processes are still running
      await this._ensureCleanShutdown();

      // Start the server
      logger.icecast('Restart: Starting server...');
      const result = await this.start();

      // Verify the server actually started - simplified check
      if (result.success) {
        logger.icecast('Restart: Completed successfully', {
          status: result.status,
          pid: result.pid
        });
      return {
        success: true,
          message: 'Icecast server restarted successfully',
          status: result.status,
          pid: result.pid
        };
      } else {
        // Log detailed information for debugging
        logger.error('Restart failed - start method returned failure', {
          result,
          startSuccess: result.success,
          startStatus: result.status,
          startMessage: result.message
        });

        throw ErrorFactory.icecast(
          `Server failed to start after restart: ${result.message || 'Start method returned failure'}`,
          ErrorCodes.ICECAST_START_FAILED,
          { restartAttempt: true, startResult: result }
        );
      }
    }, { operation: 'restart', service: 'icecast' });
  }

  /**
   * Ensure clean shutdown before restart
   */
  async _ensureCleanShutdown() {
    const stillRunning = await this.isIcecastRunning();
    if (!stillRunning) {
      return;
    }

    logger.warn('Restart: Icecast process still detected after stop, forcing cleanup...');

    if (process.platform === 'win32') {
      try {
        await execAsync('taskkill /IM icecast.exe /F');
        await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
        logger.warn('Force kill failed during restart cleanup:', error.message);
      }
    } else {
      try {
        await execAsync('pkill -KILL icecast');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        logger.warn('Force kill failed during restart cleanup:', error.message);
      }
    }

    // Final check
    const finalCheck = await this.isIcecastRunning();
    if (finalCheck) {
      throw ErrorFactory.process(
        'Unable to completely stop Icecast processes before restart',
        ErrorCodes.PROCESS_KILL_FAILED
      );
    }
  }

  /**
   * Get comprehensive health status for monitoring
   */
  async getHealthStatus() {
    return ErrorHandler.handle(async () => {
      const health = {
        overall: 'healthy',
        checks: {
          installation: { status: 'unknown', message: '', details: {} },
          process: { status: 'unknown', message: '', details: {} },
          network: { status: 'unknown', message: '', details: {} },
          configuration: { status: 'unknown', message: '', details: {} }
        },
        details: {
          platform: process.platform,
          serviceState: this.state,
          timestamp: new Date().toISOString()
        }
      };

      try {
        // Check installation
        if (this.state === 'initialized' && this.paths.exe) {
          health.checks.installation = {
            status: 'healthy',
            message: 'Icecast installation detected',
            details: {
              exePath: this.paths.exe,
              configPath: this.paths.config,
              source: 'initialized'
            }
          };
        } else {
          try {
            const installation = await this.detectInstallation();
            health.checks.installation = {
              status: 'healthy',
              message: 'Icecast installation detected',
              details: {
                exePath: installation.paths.exe,
                version: installation.version,
                source: installation.source
              }
            };
          } catch (error) {
            health.checks.installation = {
              status: 'unhealthy',
              message: 'Icecast installation not found',
              details: { error: error.message }
            };
          }
        }

        // Check process status
        try {
          const processRunning = await this.isIcecastRunning();
          if (processRunning) {
            health.checks.process = {
              status: 'healthy',
              message: 'Icecast process is running',
              details: {
                managedProcess: !!this.process,
                pid: this.process?.pid,
                startTime: this.stats.startTime
              }
            };
          } else {
            health.checks.process = {
              status: 'unhealthy',
              message: 'Icecast process is not running',
              details: { managedProcess: false }
            };
          }
        } catch (error) {
          health.checks.process = {
            status: 'unhealthy',
            message: 'Failed to check process status',
            details: { error: error.message }
          };
        }

        // Check network accessibility (if process is running)
        if (health.checks.process.status === 'healthy') {
          try {
            const response = await fetch(
              `http://${config.icecast.host}:${config.icecast.port}/admin/stats.xml`,
              { timeout: 3000 }
            );

            if (response.ok) {
              health.checks.network = {
                status: 'healthy',
                message: 'Admin interface accessible',
                details: {
                  host: config.icecast.host,
                  port: config.icecast.port,
                  responseStatus: response.status
                }
              };
            } else {
              health.checks.network = {
                status: 'degraded',
                message: `Admin interface returned ${response.status}`,
                details: {
                  host: config.icecast.host,
                  port: config.icecast.port,
                  responseStatus: response.status
                }
              };
            }
          } catch (error) {
            health.checks.network = {
              status: 'unhealthy',
              message: 'Admin interface not accessible',
              details: {
                host: config.icecast.host,
                port: config.icecast.port,
                error: error.message
              }
            };
          }
        } else {
          health.checks.network = {
            status: 'unhealthy',
            message: 'Cannot check network - process not running',
            details: {}
          };
        }

        // Check configuration
        if (this.paths?.config) {
          try {
            await fs.access(this.paths.config, fs.constants.R_OK);
            health.checks.configuration = {
              status: 'healthy',
              message: 'Configuration file accessible',
              details: { configPath: this.paths.config }
            };
          } catch (error) {
            health.checks.configuration = {
              status: 'unhealthy',
              message: 'Configuration file not accessible',
              details: {
                configPath: this.paths.config,
                error: error.message
              }
            };
          }
        } else {
          health.checks.configuration = {
            status: 'degraded',
            message: 'No configuration file path available',
            details: {}
          };
        }

        // Determine overall health
        const statuses = Object.values(health.checks).map(check => check.status);
        const hasUnhealthy = statuses.includes('unhealthy');
        const hasDegraded = statuses.includes('degraded');

        if (hasUnhealthy) {
          health.overall = 'unhealthy';
        } else if (hasDegraded) {
          health.overall = 'degraded';
        } else {
          health.overall = 'healthy';
        }

      } catch (error) {
        health.overall = 'unhealthy';
        health.details.error = error.message;
      }

      return health;
    }, { operation: 'getHealthStatus' });
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
        // Priority order: batch files first (easier to run), then executables
        commonPaths = [
          // Batch files (highest priority - these tend to work better on Windows)
          path.join(process.env['ProgramFiles(x86)'], 'Icecast', 'icecast.bat'),
          path.join(process.env.ProgramFiles, 'Icecast', 'icecast.bat'),
          'C:\\Program Files (x86)\\Icecast\\icecast.bat',
          'C:\\Program Files\\Icecast\\icecast.bat',
          'C:\\icecast\\icecast.bat',
          'C:\\icecast2\\icecast.bat',
          
          // Executable files (fallback) - NOTE: icecast.exe is always in the bin subdirectory
          path.join(process.env.ProgramFiles, 'Icecast', 'bin', 'icecast.exe'),
          path.join(process.env['ProgramFiles(x86)'], 'Icecast', 'bin', 'icecast.exe'),
          path.join(process.env.ProgramFiles, 'Icecast2', 'bin', 'icecast.exe'),
          path.join(process.env['ProgramFiles(x86)'], 'Icecast2', 'bin', 'icecast.exe'),
          'C:\\icecast\\bin\\icecast.exe',
          'C:\\icecast2\\bin\\icecast.exe',
          // Add explicit paths for common installations (all in bin subdirectory)
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

  /**
   * Get the Icecast command to execute (new simplified version)
   */
  async _getIcecastCommand() {
    return ErrorHandler.handle(async () => {
      // Use the path from our initialization
      if (this.paths.exe) {
        try {
          await fs.access(this.paths.exe, fs.constants.X_OK);
          logger.icecast('Using detected Icecast path', { path: this.paths.exe });
          return this.paths.exe;
        } catch (error) {
          throw ErrorFactory.fileSystem(
            `Icecast executable is not accessible: ${this.paths.exe}`,
            ErrorCodes.FILE_ACCESS_DENIED,
            { path: this.paths.exe }
          );
        }
      }

      // Check if running as Windows service
      if (process.platform === 'win32') {
        try {
          const { stdout } = await execAsync('sc query "Icecast"');
          if (stdout.includes('RUNNING')) {
            logger.icecast('Detected Icecast Windows service');
            return 'service';
          }
        } catch (serviceError) {
          // Service not found, continue
        }
      }

      throw ErrorFactory.icecast(
        'No Icecast executable found. Please ensure Icecast is properly installed.',
        ErrorCodes.ICECAST_NOT_INSTALLED,
        {
          suggestion: 'Run the service initialization to detect Icecast installation',
          platform: process.platform
        }
      );
    }, { operation: 'getIcecastCommand' });
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
    const logsDir = path.join(installationPath, 'logs');
    const logDirExists = await this.directoryExists(logsDir);
    
    logger.icecast(`Checking logs directory: ${logsDir}, exists: ${logDirExists}`);
    
    // Check for any existing log files (they may not exist until first run)
    let accessLogExists = false;
    let errorLogExists = false;
    
    if (logDirExists) {
      accessLogExists = await this.fileExists(path.join(logsDir, 'access.log'));
      errorLogExists = await this.fileExists(path.join(logsDir, 'error.log'));
      
      // If log directory exists, consider logs "available" (they'll be created when Icecast runs)
      accessLogExists = accessLogExists || logDirExists;
      errorLogExists = errorLogExists || logDirExists;
    }
    
    const files = {
      executable: await this.fileExists(path.join(installationPath, 'bin', 'icecast.exe')),
      batchFile: await this.fileExists(path.join(installationPath, 'icecast.bat')),
      config: await this.fileExists(path.join(installationPath, 'icecast.xml')),
      logDir: logDirExists,
      accessLog: accessLogExists,
      errorLog: errorLogExists
    };

    logger.icecast(`File validation complete:`, files);
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

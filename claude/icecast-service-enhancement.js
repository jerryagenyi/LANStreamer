// Add these methods to your existing IcecastService class

import fs from 'fs/promises';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import os from 'os';

class IcecastService {
    constructor() {
        // Default Icecast installation paths for Windows
        this.DEFAULT_PATHS = [
            'C:\\Program Files (x86)\\Icecast',
            'C:\\Program Files\\Icecast',
            'C:\\Icecast'
        ];
        
        // Store active processes
        this.activeProcesses = new Map();
        
        // Store detected installation path
        this.installationPath = null;
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
     * Validate all required Icecast files exist
     */
    async validateIcecastFiles(installationPath) {
        const files = {
            executable: await this.fileExists(path.join(installationPath, 'bin', 'icecast.exe')),
            batchFile: await this.fileExists(path.join(installationPath, 'icecast.bat')),
            config: await this.fileExists(path.join(installationPath, 'icecast.xml')),
            logDir: await this.directoryExists(path.join(installationPath, 'log')),
            accessLog: await this.fileExists(path.join(installationPath, 'log', 'access.log')),
            errorLog: await this.fileExists(path.join(installationPath, 'log', 'error.log'))
        };

        return files;
    }

    /**
     * Search for Icecast installations on the system
     */
    async searchForIcecastInstallations() {
        console.log('Searching for Icecast installations...');
        
        const results = {
            found: false,
            installations: [],
            installationPath: null,
            searchedPaths: this.DEFAULT_PATHS,
            suggestions: []
        };

        // Check default installation paths
        for (const searchPath of this.DEFAULT_PATHS) {
            try {
                console.log(`Checking path: ${searchPath}`);
                
                if (await this.directoryExists(searchPath)) {
                    console.log(`Directory exists: ${searchPath}`);
                    
                    // Validate the installation
                    const files = await this.validateIcecastFiles(searchPath);
                    console.log(`File validation results for ${searchPath}:`, files);
                    
                    const installation = {
                        path: searchPath,
                        files,
                        valid: files.executable && files.batchFile && files.config
                    };
                    
                    results.installations.push(installation);
                    
                    if (installation.valid) {
                        results.found = true;
                        results.installationPath = searchPath;
                        this.installationPath = searchPath;
                        console.log(`Valid Icecast installation found at: ${searchPath}`);
                        break;
                    }
                } else {
                    console.log(`Directory does not exist: ${searchPath}`);
                }
            } catch (error) {
                console.error(`Error checking path ${searchPath}:`, error);
            }
        }

        // Add suggestions if not found
        if (!results.found) {
            results.suggestions = [
                'Download Icecast from https://icecast.org/download/',
                'Install Icecast to one of the default locations',
                'Ensure the installation includes the batch file and configuration',
                'Check that the log directory has proper permissions'
            ];
        }

        return results;
    }

    /**
     * Enhanced status check that includes installation detection
     */
    async getStatus() {
        console.log('Getting Icecast status...');
        
        // First check if we have a detected installation
        if (!this.installationPath) {
            const searchResults = await this.searchForIcecastInstallations();
            if (!searchResults.found) {
                return {
                    installed: false,
                    running: false,
                    status: 'not_installed',
                    message: 'Icecast server not found on this system'
                };
            }
        }

        // Check if process is running
        const isRunning = await this.isIcecastRunning();
        const processId = isRunning ? await this.getIcecastProcessId() : null;

        const status = {
            installed: true,
            running: isRunning,
            status: isRunning ? 'running' : 'stopped',
            installationPath: this.installationPath,
            processId: processId,
            platform: os.platform(),
            host: 'localhost',
            port: 8000, // Default Icecast port
            uptime: 0, // Would need to be calculated from process start time
            listeners: 0,
            sources: 0,
            connections: 0
        };

        // If running, try to get more detailed info from Icecast admin interface
        if (isRunning) {
            try {
                const detailedStatus = await this.getDetailedStatusFromServer();
                Object.assign(status, detailedStatus);
            } catch (error) {
                console.log('Could not get detailed status from server:', error.message);
            }
        }

        return status;
    }

    /**
     * Check if Icecast process is running
     */
    async isIcecastRunning() {
        try {
            if (os.platform() === 'win32') {
                const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq icecast.exe" /FO CSV');
                return stdout.includes('icecast.exe');
            } else {
                const { stdout } = await execAsync('ps aux | grep icecast | grep -v grep');
                return stdout.trim().length > 0;
            }
        } catch (error) {
            console.error('Error checking if Icecast is running:', error);
            return false;
        }
    }

    /**
     * Get Icecast process ID
     */
    async getIcecastProcessId() {
        try {
            if (os.platform() === 'win32') {
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
            console.error('Error getting Icecast process ID:', error);
        }
        return null;
    }

    /**
     * Start Icecast server using the batch file
     */
    async start() {
        if (!this.installationPath) {
            const searchResults = await this.searchForIcecastInstallations();
            if (!searchResults.found) {
                throw new Error('Icecast installation not found');
            }
        }

        const batchFilePath = path.join(this.installationPath, 'icecast.bat');
        
        if (!await this.fileExists(batchFilePath)) {
            throw new Error(`Icecast batch file not found at: ${batchFilePath}`);
        }

        // Check if already running
        if (await this.isIcecastRunning()) {
            throw new Error('Icecast is already running');
        }

        return new Promise((resolve, reject) => {
            console.log(`Starting Icecast using batch file: ${batchFilePath}`);
            
            // Start the batch file in the background
            const child = spawn('cmd.exe', ['/c', batchFilePath], {
                cwd: this.installationPath,
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore']
            });

            // Store the process reference
            this.activeProcesses.set('icecast', child);

            child.on('error', (error) => {
                console.error('Error starting Icecast:', error);
                this.activeProcesses.delete('icecast');
                reject(new Error(`Failed to start Icecast: ${error.message}`));
            });

            // Give it a moment to start
            setTimeout(async () => {
                try {
                    const isRunning = await this.isIcecastRunning();
                    if (isRunning) {
                        const processId = await this.getIcecastProcessId();
                        console.log('Icecast started successfully, PID:', processId);
                        resolve({ 
                            success: true, 
                            processId: processId,
                            message: 'Icecast started successfully'
                        });
                    } else {
                        this.activeProcesses.delete('icecast');
                        reject(new Error('Icecast process did not start properly'));
                    }
                } catch (error) {
                    this.activeProcesses.delete('icecast');
                    reject(error);
                }
            }, 3000); // Wait 3 seconds for startup
        });
    }

    /**
     * Stop Icecast server
     */
    async stop() {
        try {
            const processId = await this.getIcecastProcessId();
            
            if (!processId) {
                throw new Error('Icecast process not found');
            }

            console.log(`Stopping Icecast process with PID: ${processId}`);

            if (os.platform() === 'win32') {
                await execAsync(`taskkill /PID ${processId} /F`);
            } else {
                await execAsync(`kill -15 ${processId}`); // SIGTERM first, then SIGKILL if needed
                
                // Wait a bit, then force kill if still running
                setTimeout(async () => {
                    if (await this.isIcecastRunning()) {
                        await execAsync(`kill -9 ${processId}`);
                    }
                }, 5000);
            }

            // Clean up our process reference
            this.activeProcesses.delete('icecast');

            // Wait a moment and verify it stopped
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const stillRunning = await this.isIcecastRunning();
            if (stillRunning) {
                throw new Error('Icecast process did not stop properly');
            }

            console.log('Icecast stopped successfully');
            return { 
                success: true,
                message: 'Icecast stopped successfully'
            };

        } catch (error) {
            console.error('Error stopping Icecast:', error);
            throw new Error(`Failed to stop Icecast: ${error.message}`);
        }
    }

    /**
     * Restart Icecast server
     */
    async restart() {
        console.log('Restarting Icecast...');
        
        try {
            // Stop if running
            if (await this.isIcecastRunning()) {
                await this.stop();
                // Wait a bit before starting
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Start
            const result = await this.start();
            
            return {
                success: true,
                message: 'Icecast restarted successfully',
                ...result
            };

        } catch (error) {
            console.error('Error restarting Icecast:', error);
            throw new Error(`Failed to restart Icecast: ${error.message}`);
        }
    }

    /**
     * Get detailed status from Icecast admin interface
     */
    async getDetailedStatusFromServer() {
        // This would make HTTP requests to the Icecast admin interface
        // For now, return basic info
        return {
            listeners: 0,
            sources: 0,
            connections: 0,
            uptime: 0
        };
    }

    /**
     * Check installation and validate configuration
     */
    async checkInstallation() {
        const searchResults = await this.searchForIcecastInstallations();
        
        if (!searchResults.found) {
            return {
                installed: false,
                valid: false,
                message: 'Icecast installation not found',
                searchResults
            };
        }

        const installation = searchResults.installations.find(inst => inst.valid);
        
        return {
            installed: true,
            valid: installation.valid,
            installationPath: installation.path,
            files: installation.files,
            message: installation.valid ? 'Icecast installation is valid' : 'Icecast installation has missing components'
        };
    }

    /**
     * Validate Icecast configuration file
     */
    async validateConfiguration() {
        if (!this.installationPath) {
            throw new Error('Icecast installation path not found');
        }

        const configPath = path.join(this.installationPath, 'icecast.xml');
        
        if (!await this.fileExists(configPath)) {
            throw new Error('Icecast configuration file not found');
        }

        try {
            const configContent = await fs.readFile(configPath, 'utf8');
            
            // Basic validation - check for required elements
            const required = ['<hostname>', '<port>', '<password>', '<admin-password>'];
            const missing = required.filter(element => !configContent.includes(element));
            
            if (missing.length > 0) {
                return {
                    valid: false,
                    errors: missing.map(el => `Missing required element: ${el}`)
                };
            }

            // Check for the log directory fix (paths starting with ./)
            const hasFixedPaths = configContent.includes('./log/') || configContent.includes('.\\log\\');
            
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

export default IcecastService;
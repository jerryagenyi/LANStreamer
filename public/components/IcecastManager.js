/**
 * Enhanced Icecast Server Manager Component
 * Handles Windows-specific Icecast detection, status monitoring, and control operations
 * 
 * DEPENDENCIES & INTEGRATION:
 * ===========================
 * Backend API Endpoints:
 * - GET /api/system/icecast/search-installations - Search for Icecast installations
 * - GET /api/system/icecast-status - Get current server status and statistics
 * - POST /api/system/icecast/start - Start Icecast server process
 * - POST /api/system/icecast/stop - Stop Icecast server gracefully
 * - POST /api/system/icecast/restart - Restart server with full cycle
 * - GET /api/system/icecast/validate-config - Validate configuration files
 * 
 * Windows System Commands:
 * - tasklist | findstr /I icecast.exe - Check if process is running
 * - taskkill /IM icecast.exe /F - Force kill icecast.exe process by name
 * - netstat -ano | findstr :8000 - Check if port 8000 is active
 * - tasklist /FI "IMAGENAME eq icecast.exe" /FO TABLE - Get PID and details for icecast.exe
 * - taskkill /PID {PID} /F - Force kill process by ID
 * - sc query "Icecast" - Check Windows service status
 * - net start/stop Icecast - Control Windows service
 * 
 * Icecast Installation Files:
 * - C:\Program Files (x86)\Icecast\bin\icecast.exe - Main executable (ALWAYS in bin subfolder)
 * - C:\Program Files (x86)\Icecast\icecast.xml - Configuration file
 * - C:\Program Files (x86)\Icecast\icecast.bat - Windows batch file (calls bin\icecast.exe)
 * - C:\Program Files (x86)\Icecast\logs\ - Log directory
 * - C:\Program Files (x86)\Icecast\web\ - Web interface files
 * - C:\Program Files (x86)\Icecast\admin\ - Admin interface files
 * 
 * IMPORTANT: icecast.exe is NEVER at the root - it's always in the bin\ subdirectory
 * The icecast.bat file is the standard way to start Icecast as it correctly references bin\icecast.exe
 * 
 * Network Services:
 * - http://localhost:8000/admin/ - Icecast admin interface
 * - Port 8000 - Default Icecast listening port
 * - HTTP status endpoints for health monitoring
 * 
 * File System Access:
 * - Program Files directories (x86 and x64)
 * - Configuration file parsing (XML)
 * - Log file access and monitoring
 * - Directory structure validation
 * 
 * WORKFLOW:
 * =========
 * 1. INSTALLATION DETECTION:
 *    - Search predefined paths for Icecast installation
 *    - Validate required files (exe, xml, bat, directories)
 *    - Check file permissions and accessibility
 *    - Store installation path for future operations
 * 
 * 2. STATUS MONITORING:
 *    - Check if icecast.exe process is running (tasklist)
 *    - Verify port 8000 is active (netstat)
 *    - Test admin interface accessibility (HTTP GET)
 *    - Monitor Windows service status (sc query)
 *    - Track uptime, listeners, and connections
 * 
 * 3. PROCESS MANAGEMENT:
 *    - Start: Execute icecast.bat with proper working directory
 *    - Stop: Send termination signal to process ID
 *    - Restart: Stop then start with status verification
 *    - Force Kill: Use taskkill for unresponsive processes
 *    - Process ID tracking for precise control
 * 
 * 4. CONFIGURATION VALIDATION:
 *    - Parse icecast.xml for syntax errors
 *    - Validate log and web directory paths
 *    - Check file permissions and accessibility
 *    - Detect configuration conflicts and issues
 *    - Provide detailed error reporting
 * 
 * 5. HEALTH MONITORING:
 *    - Determine overall system health status
 *    - Monitor process, port, and admin interface
 *    - Track error rates and recovery attempts
 *    - Automatic health checks every 10 seconds
 *    - Graceful degradation on failures
 * 
 * 6. ERROR RECOVERY:
 *    - Automatic restart on process crashes
 *    - Configuration validation before startup
 *    - Fallback to manual process control
 *    - User notification of issues and resolutions
 *    - Logging of all operations and errors
 * 
 * AUTONOMOUS CAPABILITIES:
 * ========================
 * - Self-detection of external Icecast instances
 * - Automatic health monitoring and recovery
 * - Configuration validation and error reporting
 * - Process lifecycle management without user intervention
 * - Integration with Windows services and process management
 * - Real-time status updates and health assessment
 */
class IcecastManager {
    constructor(containerId) {
        console.log('IcecastManager constructor called with containerId:', containerId);
        this.containerId = containerId;
        this.status = {
            installed: false,
            running: false,
            status: 'unknown',
            version: null,
            platform: null,
            uptime: 0,
            listeners: 0,
            sources: 0,
            connections: 0,
            host: null,
            port: null,
            installationPath: null,
            processId: null,
            configValid: false,
            files: {
                executable: false,
                batchFile: false,
                config: false,
                logDir: false,
                accessLog: false,
                errorLog: false
            }
        };
        this.isLoading = false;
        this.statusCheckInterval = null;
        this.autoRefresh = true;
        this.installationDetailsExpanded = false; // Track expanded state
        this.defaultPaths = [
            'C:\\Program Files (x86)\\Icecast',
            'C:\\Program Files\\Icecast',
            'C:\\Icecast'
        ];
        
        console.log('IcecastManager initializing...');
        this.init();
    }

    async init() {
        try {
            await this.detectIcecastInstallation();
            if (this.status.installed) {
                await this.checkStatus();
                // Force a render after checking status to ensure button states are correct
                this.render();
            }
        } catch (error) {
            console.warn('Failed to detect Icecast installation or check status:', error);
        }
        
        this.render();
        this.setupEventListeners();
        
        // Start auto-refresh - always run to detect installation changes
        if (this.autoRefresh) {
            this.startAutoRefresh();
        }
        
        // Make this instance globally accessible for the onclick handler
        window.icecastManager = this;
    }

    toggleInstallationDetails() {
        this.installationDetailsExpanded = !this.installationDetailsExpanded;
        this.render();
    }

    async detectIcecastInstallation() {
        try {
            this.isLoading = true;
            const response = await fetch('/api/system/icecast/search-installations');
            const data = await response.json();
            
            this.status = {
                ...this.status,
                ...data
            };
            
            if (data.installed) {
                console.log('Icecast installation detected at:', data.installationPath);
                console.log('File validation results:', data.files);
                console.log('Log directory status:', data.files.logDir);
            } else {
                console.log('Icecast not detected. Searched paths:', data.searchedPaths);
            }
            
        } catch (error) {
            console.error('Failed to detect Icecast installation:', error);
            this.status.status = 'error';
            this.status.error = error.message;
        } finally {
            this.isLoading = false;
        }
    }

    async checkStatus() {
        try {
            this.isLoading = true;

            // Always check security vulnerabilities, even if installation status is unclear
            const securityResponse = await fetch('/api/system/icecast/security-check');
            const securityData = await securityResponse.json();

            // Only check Icecast status if installed
            if (this.status.installed) {
                const statusResponse = await fetch('/api/system/icecast-status');
                const statusData = await statusResponse.json();

                this.status = {
                    ...this.status,
                    ...statusData,
                    security: securityData
                };
            } else {
                console.log('Icecast not installed, skipping server status check but checking security');
                this.status.security = securityData;
            }

            // Update status indicators
            this.updateStatusIndicators();

        } catch (error) {
            console.error('Failed to check Icecast status:', error);
            this.status.status = 'error';
            this.status.error = error.message;
        } finally {
            this.isLoading = false;
        }
    }

    async validateConfiguration() {
        if (!this.status.installed) {
            this.showNotification('Icecast is not installed', 'error');
            return;
        }

        try {
            this.isLoading = true;
            const response = await fetch('/api/system/icecast/validate-config');
            const data = await response.json();
            
            if (data.valid) {
                // Check for hostname warnings
                if (data.warnings && data.warnings.length > 0) {
                    this.showNotification(`Configuration valid but has warnings: ${data.warnings.join(', ')}`, 'warning');
                    this.status.configValid = true;
                    this.status.hostnameWarning = data.warnings[0]; // Store first warning
                } else {
                    this.showNotification('Configuration is valid', 'success');
                    this.status.configValid = true;
                    this.status.hostnameWarning = null;
                }
            } else {
                this.showNotification(`Configuration issues found: ${data.errors.join(', ')}`, 'error');
                this.status.configValid = false;
                this.status.hostnameWarning = null;
            }

            this.render();
            
        } catch (error) {
            console.error('Failed to validate configuration:', error);
            this.showNotification('Failed to validate configuration', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async startServer() {
        // SIMPLIFIED VERSION - Backend now handles all validation and timing
        try {
            this.isLoading = true;
            this.updateActionButtons('start');

            const response = await fetch('/api/system/icecast/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showNotification(result.message, 'success');
                await this.checkStatus(); // Simple status refresh
                this.render();
            } else {
                this.showNotification(result.error || 'Failed to start server', 'error');
            }
        } catch (error) {
            console.error('Network error starting Icecast:', error);
            this.showNotification('Network error occurred', 'error');
        } finally {
            this.isLoading = false;
            this.updateActionButtons();
        }
    }

    async stopServer() {
        // Check current status before stopping
        await this.checkStatus();
        if (!this.status.running && !this.status.processId) {
            this.showNotification('Icecast server is not running', 'info');
            return;
        }

        try {
            this.isLoading = true;
            this.updateActionButtons('stop');
            
            const response = await fetch('/api/system/icecast/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    processId: this.status.processId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Wait for server to actually stop and verify status
                await new Promise(resolve => setTimeout(resolve, 3000));
                await this.checkStatus();
                
                // Only update UI if server actually stopped
                if (!this.status.running) {
                    this.status.processId = null;
                    this.render(); // Re-render to update button states
                    this.showNotification('Icecast server stopped successfully', 'success');
                } else {
                    throw new Error('Server reported stopped but is still running');
                }
            } else {
                throw new Error(result.message || 'Failed to stop server');
            }
        } catch (error) {
            console.error('Failed to stop Icecast server:', error);
            this.showNotification(`Failed to stop server: ${error.message}`, 'error');
            // Re-check status to ensure UI is accurate
            await this.checkStatus();
            this.render();
        } finally {
            this.isLoading = false;
            this.updateActionButtons(); // No loading button parameter = normal state
        }
    }

    async restartServer() {
        // SIMPLIFIED VERSION - Backend now handles all validation and timing
        try {
            this.isLoading = true;
            this.updateActionButtons('restart');

            const response = await fetch('/api/system/icecast/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showNotification(result.message, 'success');
                await this.checkStatus(); // Simple status refresh
                this.render();
            } else {
                this.showNotification(result.error || 'Failed to restart server', 'error');
            }
        } catch (error) {
            console.error('Network error restarting Icecast:', error);
            this.showNotification('Network error occurred', 'error');
        } finally {
            this.isLoading = false;
            this.updateActionButtons();
        }
    }

    render() {
        console.log('IcecastManager render() called for container:', this.containerId);
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with ID '${this.containerId}' not found`);
            return;
        }

        const statusColor = this.getStatusColor();
        const statusText = this.getStatusText();
        const statusIcon = this.getStatusIcon();

        container.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-xl font-bold text-white">Icecast Server</h2>
                </div>
                
                <!-- Installation Status -->
                ${this.renderInstallationStatus()}
                
                <!-- Security Warning -->
                ${this.renderSecurityWarning()}

                <!-- Hostname Warning -->
                ${this.renderHostnameWarning()}

                <div class="space-y-5 ${!this.status.installed ? 'opacity-50' : ''}">
                    <!-- Server Status -->
                    <div class="flex items-center gap-4 p-3 bg-[#111111] border border-[var(--border-color)] rounded-xl">
                        <span class="material-symbols-rounded text-2xl ${statusColor.replace('bg-', 'text-')}">${statusIcon}</span>
                        <div class="flex-1">
                            <p class="font-semibold text-white">${this.getServerStatusText()}</p>
                            <p class="text-sm text-gray-400">${this.getServerStatusDescription()}</p>
                        </div>
                        ${this.status.processId ? `<span class="text-xs text-gray-500 font-mono">PID: ${this.status.processId}</span>` : ''}
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex gap-2 pt-4 border-t border-[var(--border-color)]">
                        <button id="start-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-gradient disabled:opacity-50 disabled:cursor-not-allowed" ${!this.status.installed || this.status.running ? 'disabled' : ''}>
                            <span class="material-symbols-rounded text-base">play_arrow</span>
                            Start Server
                        </button>
                        <button id="icecast-stop-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-stop-gradient disabled:opacity-50 disabled:cursor-not-allowed" ${!this.status.installed || !this.status.running ? 'disabled' : ''}>
                            <span class="material-symbols-rounded text-base">stop</span>
                            Stop Server
                        </button>
                        <button id="restart-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed" ${!this.status.installed || !this.status.running ? 'disabled' : ''}>
                            <span class="material-symbols-rounded text-base">restart_alt</span>
                            Restart Server
                        </button>
                    </div>
                    
                    <!-- Server Info -->
                    <div class="border-t border-[var(--border-color)] pt-4 mt-4 text-xs text-gray-500 space-y-1">
                        <p><strong>Installation:</strong> ${this.status.installationPath || 'Not detected'}</p>
                        <p><strong>Host:</strong> ${this.status.host || 'localhost'}</p>
                        <p><strong>Port:</strong> ${this.status.port || '8000'}</p>
                        <p><strong>Uptime:</strong> ${this.formatUptime(this.status.uptime)}</p>
                        <p><strong>Listeners:</strong> ${this.status.listeners || 0}/${this.status.maxListeners || 100}</p>
                        ${this.status.version ? `<p><strong>Version:</strong> ${this.status.version}</p>` : ''}
                        ${this.status.platform ? `<p><strong>Platform:</strong> ${this.status.platform}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Re-setup event listeners after rendering
        this.setupEventListeners();
    }

    renderInstallationStatus() {
        if (!this.status.installed) {
            return `
                <div class="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="material-symbols-rounded text-red-400">error</span>
                        <p class="font-medium text-red-400">Icecast server not found on this system</p>
                    </div>
                    <p class="text-sm text-gray-400 mb-3">Searched the following locations:</p>
                    <ul class="text-xs text-gray-500 space-y-1 ml-4">
                        ${this.defaultPaths.map(path => `<li>• ${path}</li>`).join('')}
                    </ul>
                    <div class="mt-4 flex gap-2">
                        <button id="browse-icecast-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300">
                            <span class="material-symbols-rounded text-sm">folder_open</span>
                            Browse for Icecast
                        </button>

                    </div>
                    <div class="mt-3 text-sm text-gray-400">
                        Need help installing? <a href="docs/guides/icecast-installation.md" target="_blank" class="text-blue-400 hover:text-blue-300 underline">View installation guide</a>
                    </div>
                </div>
            `;
        }

        // When installed, don't show the redundant green section - the status is already shown in the main component
        return '';
    }

    async browseForIcecast() {
        try {
            // Initialize FileBrowser if not already available
            if (typeof FileBrowser === 'undefined') {
                console.error('FileBrowser component not loaded');
                this.showNotification('File browser component not available', 'error');
                return;
            }

            const fileBrowser = new FileBrowser();
            fileBrowser.open((result) => {
                if (result.success) {
                    this.showNotification('Icecast installation found and configured!', 'success');
                    // Refresh the component to show the new installation
                    this.detectIcecastInstallation().then(() => {
                        this.render();
                    });
                } else {
                    this.showNotification(result.error || 'Failed to configure Icecast installation', 'error');
                }
            });
        } catch (error) {
            console.error('Error opening file browser:', error);
            this.showNotification('Error opening file browser: ' + error.message, 'error');
        }
    }

    renderSecurityWarning() {
        // Security warning is now handled at the top of the page
        // No need to show it in the sidebar
        return '';
    }

    renderHostnameWarning() {
        if (!this.status.hostnameWarning) {
            return '';
        }

        return `
            <div class="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-rounded text-yellow-400 mt-0.5">warning</span>
                    <div class="flex-1">
                        <h4 class="font-semibold text-yellow-300 mb-2">Network Access Warning</h4>
                        <p class="text-sm text-yellow-200 mb-3">${this.status.hostnameWarning}</p>
                        <div class="flex gap-2">
                            <button
                                onclick="icecastManager.validateConfiguration()"
                                class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-yellow-300 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 rounded-lg transition-all duration-300"
                            >
                                <span class="material-symbols-rounded text-sm">refresh</span>
                                Recheck Config
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Action buttons
        container.querySelector('#start-btn')?.addEventListener('click', () => this.startServer());
        container.querySelector('#icecast-stop-btn')?.addEventListener('click', () => this.stopServer());
        container.querySelector('#restart-btn')?.addEventListener('click', () => this.restartServer());
        // Browse button for error state
        container.querySelector('#browse-icecast-btn')?.addEventListener('click', () => this.browseForIcecast());
    }

    updateActionButtons(loadingButton = null) {
        const startBtn = document.querySelector('#start-btn');
        const stopBtn = document.querySelector('#icecast-stop-btn');
        const restartBtn = document.querySelector('#restart-btn');
        
        // Always disable all buttons during any operation to prevent race conditions
        if (startBtn) startBtn.disabled = (loadingButton !== null) || !this.status.installed || this.status.running;
        if (stopBtn) stopBtn.disabled = (loadingButton !== null) || !this.status.installed || !this.status.running;
        if (restartBtn) restartBtn.disabled = (loadingButton !== null) || !this.status.installed || !this.status.running;
        
        // Update button text - only show spinner for the specific loading button
        if (startBtn) {
            if (loadingButton === 'start') {
                startBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Starting Server...';
            } else {
                startBtn.innerHTML = '<span class="material-symbols-rounded text-base">play_arrow</span> Start Server';
            }
        }
        
        if (stopBtn) {
            if (loadingButton === 'stop') {
                stopBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Stopping Server...';
            } else {
                stopBtn.innerHTML = '<span class="material-symbols-rounded text-base">stop</span> Stop Server';
            }
        }
        
        if (restartBtn) {
            if (loadingButton === 'restart') {
                restartBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Restarting Server...';
            } else {
                restartBtn.innerHTML = '<span class="material-symbols-rounded text-base">restart_alt</span> Restart Server';
            }
        }
        
        // Add visual feedback for disabled state
        [startBtn, stopBtn, restartBtn].forEach(btn => {
            if (btn) {
                if (btn.disabled) {
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        });
    }

    updateStatusIndicators() {
        // Update any external status indicators
        const statusElements = document.querySelectorAll('[id*="icecast-status"]');
        statusElements.forEach(element => {
            if (element.id.includes('text')) {
                element.textContent = this.getStatusText();
            } else if (element.id.includes('dot')) {
                element.className = `status-dot ${this.status.running ? 'online' : 'offline'}`;
            }
        });
        
        // Update the local status display
        const localStatusDisplay = document.getElementById('icecast-status-display');
        if (localStatusDisplay) {
            localStatusDisplay.textContent = this.getStatusText();
        }
    }

    getStatusColor() {
        if (!this.status.installed) return 'bg-red-600';
        if (this.status.running) return 'bg-green-500';
        if (this.status.status === 'error') return 'bg-red-500';
        return 'bg-yellow-500';
    }

    getStatusText() {
        if (!this.status.installed) return 'Not Installed';
        if (this.status.running) return 'Running';
        if (this.status.status === 'error') return 'Error';
        return 'Stopped';
    }

    getStatusIcon() {
        if (!this.status.installed) return 'error';
        if (this.status.running) return 'router';
        if (this.status.status === 'error') return 'error';
        return 'power_settings_new';
    }

    getServerStatusText() {
        if (!this.status.installed) return 'Icecast Not Installed';
        if (this.status.running) return 'Server Online';
        return 'Server Offline';
    }

    getServerStatusDescription() {
        if (!this.status.installed) return 'Icecast server not found on this system';
        if (this.status.running) return 'Server is running and accepting connections';
        return 'Server is stopped or not responding';
    }

    formatUptime(ms) {
        if (!ms || ms === 0) return '-';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
        
        const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600';
        notification.className += ` ${bgColor} text-white`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-rounded text-lg">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    startAutoRefresh() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }

        this.statusCheckInterval = setInterval(() => {
            if (!this.isLoading) {
                this.checkStatusAndUpdateButtons();
            }
        }, 5000); // Check every 5 seconds for better responsiveness
    }

    async checkStatusAndUpdateButtons() {
        try {
            const wasInstalled = this.status.installed;

            // Always check for installation changes
            await this.detectIcecastInstallation();

            // If installation status changed, re-render completely
            if (wasInstalled !== this.status.installed) {
                console.log(`Icecast installation status changed: ${wasInstalled} → ${this.status.installed}`);
                this.render();
                return;
            }

            // If installed, check server status
            if (this.status.installed) {
                await this.checkStatus();
                this.render(); // Update button states based on new status
            }
        } catch (error) {
            console.warn('Auto status check failed:', error);
        }
    }

    stopAutoRefresh() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Export for use in other components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IcecastManager;
} else {
    window.IcecastManager = IcecastManager;
}
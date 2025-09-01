/**
 * Enhanced Icecast Server Manager Component
 * Handles Windows-specific Icecast detection, status monitoring, and control operations
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
            }
        } catch (error) {
            console.warn('Failed to detect Icecast installation or check status:', error);
        }
        
        this.render();
        this.setupEventListeners();
        
        // Start auto-refresh if installed
        if (this.autoRefresh && this.status.installed) {
            this.startAutoRefresh();
        }
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
        if (!this.status.installed) {
            console.log('Icecast not installed, skipping status check');
            return;
        }

        try {
            this.isLoading = true;
            const response = await fetch('/api/system/icecast-status');
            const data = await response.json();
            
            this.status = {
                ...this.status,
                ...data
            };
            
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
                this.showNotification('Configuration is valid', 'success');
                this.status.configValid = true;
            } else {
                this.showNotification(`Configuration issues found: ${data.errors.join(', ')}`, 'error');
                this.status.configValid = false;
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
        if (!this.status.installed) {
            this.showNotification('Icecast is not installed', 'error');
            return;
        }

        if (!this.status.files.batchFile) {
            this.showNotification('Icecast batch file not found', 'error');
            return;
        }

        try {
            this.isLoading = true;
            this.updateActionButtons();
            
            const response = await fetch('/api/system/icecast/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    installationPath: this.status.installationPath
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.status.running = true;
                this.status.processId = result.processId;
                
                // Wait a moment for server to start
                await new Promise(resolve => setTimeout(resolve, 3000));
                await this.checkStatus();
                this.showNotification('Icecast server started successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to start server');
            }
        } catch (error) {
            console.error('Failed to start Icecast server:', error);
            this.showNotification(`Failed to start server: ${error.message}`, 'error');
        } finally {
            this.isLoading = false;
            this.updateActionButtons();
        }
    }

    async stopServer() {
        if (!this.status.running && !this.status.processId) {
            this.showNotification('Icecast server is not running', 'info');
            return;
        }

        try {
            this.isLoading = true;
            this.updateActionButtons();
            
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
                this.status.running = false;
                this.status.processId = null;
                await this.checkStatus();
                this.showNotification('Icecast server stopped successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to stop server');
            }
        } catch (error) {
            console.error('Failed to stop Icecast server:', error);
            this.showNotification(`Failed to stop server: ${error.message}`, 'error');
        } finally {
            this.isLoading = false;
            this.updateActionButtons();
        }
    }

    async restartServer() {
        if (!this.status.installed) {
            this.showNotification('Icecast is not installed', 'error');
            return;
        }

        try {
            this.isLoading = true;
            this.updateActionButtons();
            
            // Stop first if running
            if (this.status.running || this.status.processId) {
                await this.stopServer();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Then start
            await this.startServer();
            
        } catch (error) {
            console.error('Failed to restart Icecast server:', error);
            this.showNotification(`Failed to restart server: ${error.message}`, 'error');
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
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2">
                            <span class="h-3 w-3 rounded-full ${statusColor}"></span>
                            <span class="text-sm font-medium text-gray-300" id="icecast-status-display">
                                ${statusText}
                            </span>
                        </div>
                        <button id="refresh-status-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-white bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-all duration-300" title="Refresh status">
                            <span class="material-symbols-rounded text-sm">refresh</span>
                        </button>
                        ${!this.status.installed ? `
                        <button id="detect-installation-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300" title="Detect Icecast installation">
                            <span class="material-symbols-rounded text-sm">search</span>
                        </button>
                        ` : ''}
                        ${this.status.installed ? `
                        <button id="validate-config-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-all duration-300" title="Validate configuration">
                            <span class="material-symbols-rounded text-sm">verified</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Installation Status -->
                ${this.renderInstallationStatus()}
                
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
                            Start
                        </button>
                        <button id="stop-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-stop-gradient disabled:opacity-50 disabled:cursor-not-allowed" ${!this.status.installed || !this.status.running ? 'disabled' : ''}>
                            <span class="material-symbols-rounded text-base">stop</span>
                            Stop
                        </button>
                        <button id="restart-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed" ${!this.status.installed ? 'disabled' : ''}>
                            <span class="material-symbols-rounded text-base">restart_alt</span>
                            Restart
                        </button>
                    </div>
                    
                    <!-- Server Info -->
                    <div class="border-t border-[var(--border-color)] pt-4 mt-4 text-xs text-gray-500 space-y-1">
                        <p><strong>Installation:</strong> ${this.status.installationPath || 'Not detected'}</p>
                        <p><strong>Host:</strong> ${this.status.host || 'localhost'}</p>
                        <p><strong>Port:</strong> ${this.status.port || '8000'}</p>
                        <p><strong>Uptime:</strong> ${this.formatUptime(this.status.uptime)}</p>
                        <p><strong>Listeners:</strong> ${this.status.listeners || 0} / 100</p>
                        ${this.status.version ? `<p><strong>Version:</strong> ${this.status.version}</p>` : ''}
                        ${this.status.platform ? `<p><strong>Platform:</strong> ${this.status.platform}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderInstallationStatus() {
        if (!this.status.installed) {
            return `
                <div class="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="material-symbols-rounded text-red-400">error</span>
                        <p class="font-medium text-red-400">Icecast Server Not Detected</p>
                    </div>
                    <p class="text-sm text-gray-400 mb-3">Searched the following locations:</p>
                    <ul class="text-xs text-gray-500 space-y-1 ml-4">
                        ${this.defaultPaths.map(path => `<li>• ${path}</li>`).join('')}
                    </ul>
                    <div class="mt-3">
                        <a href="https://icecast.org/download/" target="_blank" class="text-blue-400 hover:text-blue-300 underline text-sm">
                            Download Icecast Server
                        </a>
                    </div>
                </div>
            `;
        }

        return `
            <div class="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div class="flex items-center gap-3 mb-3">
                    <span class="material-symbols-rounded text-green-400">check_circle</span>
                    <p class="font-medium text-green-400">Icecast Installation Detected</p>
                </div>
                <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="space-y-1">
                        <p class="text-gray-400">Files Status:</p>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-xs ${this.status.files.executable ? 'text-green-400' : 'text-red-400'}">${this.status.files.executable ? 'check' : 'close'}</span>
                            <span class="text-gray-500">Executable</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-xs ${this.status.files.batchFile ? 'text-green-400' : 'text-red-400'}">${this.status.files.batchFile ? 'check' : 'close'}</span>
                            <span class="text-gray-500">Batch File</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-xs ${this.status.files.config ? 'text-green-400' : 'text-red-400'}">${this.status.files.config ? 'check' : 'close'}</span>
                            <span class="text-gray-500">Configuration</span>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <p class="text-gray-400">Directories:</p>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-xs ${this.status.files.logDir ? 'text-green-400' : 'text-red-400'}">${this.status.files.logDir ? 'check' : 'close'}</span>
                            <span class="text-gray-500">Log Directory</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-xs ${this.status.files.accessLog ? 'text-green-400' : 'text-yellow-400'}">${this.status.files.accessLog ? 'check' : 'schedule'}</span>
                            <span class="text-gray-500">Access Log</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-xs ${this.status.files.errorLog ? 'text-green-400' : 'text-yellow-400'}">${this.status.files.errorLog ? 'check' : 'schedule'}</span>
                            <span class="text-gray-500">Error Log</span>
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
        container.querySelector('#stop-btn')?.addEventListener('click', () => this.stopServer());
        container.querySelector('#restart-btn')?.addEventListener('click', () => this.restartServer());
        container.querySelector('#refresh-status-btn')?.addEventListener('click', () => {
            if (this.status.installed) {
                this.checkStatus();
            } else {
                this.detectIcecastInstallation();
            }
        });
        container.querySelector('#detect-installation-btn')?.addEventListener('click', () => this.detectIcecastInstallation());
        container.querySelector('#validate-config-btn')?.addEventListener('click', () => this.validateConfiguration());
    }

    updateActionButtons() {
        const startBtn = document.querySelector('#start-btn');
        const stopBtn = document.querySelector('#stop-btn');
        const restartBtn = document.querySelector('#restart-btn');
        
        if (startBtn) startBtn.disabled = this.isLoading || !this.status.installed || this.status.running;
        if (stopBtn) stopBtn.disabled = this.isLoading || !this.status.installed || !this.status.running;
        if (restartBtn) restartBtn.disabled = this.isLoading || !this.status.installed;
        
        // Update button text during loading
        if (this.isLoading) {
            if (startBtn && startBtn.disabled) startBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Starting...';
            if (stopBtn && stopBtn.disabled) stopBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Stopping...';
            if (restartBtn && restartBtn.disabled) restartBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Restarting...';
        } else {
            if (startBtn) startBtn.innerHTML = '<span class="material-symbols-rounded text-base">play_arrow</span> Start';
            if (stopBtn) stopBtn.innerHTML = '<span class="material-symbols-rounded text-base">stop</span> Stop';
            if (restartBtn) restartBtn.innerHTML = '<span class="material-symbols-rounded text-base">restart_alt</span> Restart';
        }
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
        
        const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        notification.className += ` ${bgColor} text-white`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-rounded text-lg">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
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
            if (!this.isLoading && this.status.installed) {
                this.checkStatus();
            }
        }, 10000); // Check every 10 seconds
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
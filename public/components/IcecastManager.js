/**
 * Icecast Server Manager Component
 * Handles Icecast server detection, status monitoring, and control operations
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
            port: null
        };
        this.isLoading = false;
        this.statusCheckInterval = null;
        this.autoRefresh = true;
        
        console.log('IcecastManager initializing...');
        this.init();
    }

    async init() {
        try {
            await this.checkStatus();
        } catch (error) {
            console.warn('Failed to check initial Icecast status, continuing with component initialization:', error);
            // Continue with initialization even if status check fails
        }
        
        this.render();
        this.setupEventListeners();
        
        // Start auto-refresh
        if (this.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    async checkStatus() {
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

    async searchInstallations() {
        try {
            this.isLoading = true;
            const response = await fetch('/api/system/icecast/search-installations');
            const data = await response.json();
            
            if (data.found) {
                this.showNotification(`Found ${data.installations.length} Icecast installation(s)`, 'success');
                console.log('Icecast installations found:', data.installations);
                
                // Update status to reflect found installation
                this.status.installed = true;
                this.status.installationPath = data.installationPath;
                this.render();
            } else {
                this.showNotification('No Icecast installations found. Check the console for suggestions.', 'info');
                console.log('Icecast search suggestions:', data.suggestions);
            }
        } catch (error) {
            console.error('Failed to search for Icecast installations:', error);
            this.showNotification('Failed to search for installations', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async getDetailedStatus() {
        try {
            const response = await fetch('/api/system/icecast/detailed-status');
            const data = await response.json();
            
            this.status = {
                ...this.status,
                ...data
            };
            
            this.render();
            return data;
        } catch (error) {
            console.error('Failed to get detailed Icecast status:', error);
            throw error;
        }
    }

    async startServer() {
        try {
            this.isLoading = true;
            this.updateActionButtons();
            
            const response = await fetch('/api/system/icecast/start', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Wait a moment for server to start
                await new Promise(resolve => setTimeout(resolve, 2000));
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
        try {
            this.isLoading = true;
            this.updateActionButtons();
            
            const response = await fetch('/api/system/icecast/stop', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
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
        try {
            this.isLoading = true;
            this.updateActionButtons();
            
            const response = await fetch('/api/system/icecast/restart', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Wait for restart to complete
                await new Promise(resolve => setTimeout(resolve, 5000));
                await this.checkStatus();
                this.showNotification('Icecast server restarted successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to restart server');
            }
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
                                ${this.status.installed === false ? 
                                    'Not Installed - <a href="https://github.com/jerryagenyi/LANStreamer/blob/main/docs/guides/icecast-installation.md" target="_blank" class="text-blue-400 hover:text-blue-300 underline">setup guide</a>' : 
                                    statusText
                                }
                            </span>
                        </div>
                        <button id="refresh-status-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-white bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-all duration-300" title="${this.status.installed === false ? 'Check for installation' : 'Refresh status'}">
                            <span class="material-symbols-rounded text-sm">refresh</span>
                        </button>
                        ${this.status.installed === false ? `
                        <button id="search-installations-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300" title="Search for Icecast installations">
                            <span class="material-symbols-rounded text-sm">search</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="space-y-5 ${this.status.installed === false ? 'opacity-50' : ''}">
                    <!-- Server Status -->
                    <div class="flex items-center gap-4 p-3 bg-[#111111] border border-[var(--border-color)] rounded-xl">
                        <span class="material-symbols-rounded text-2xl ${statusColor.replace('bg-', 'text-')}">${statusIcon}</span>
                        <div class="flex-1">
                            <p class="font-semibold text-white">${this.getServerStatusText()}</p>
                            <p class="text-sm text-gray-400">${this.getServerStatusDescription()}</p>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex gap-2 pt-4 border-t border-[var(--border-color)]">
                        <button id="start-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-gradient disabled:opacity-50 disabled:cursor-not-allowed">
                            <span class="material-symbols-rounded text-base">play_arrow</span>
                            Start
                        </button>
                        <button id="stop-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-stop-gradient disabled:opacity-50 disabled:cursor-not-allowed">
                            <span class="material-symbols-rounded text-base">stop</span>
                            Stop
                        </button>
                        <button id="restart-btn" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed">
                            <span class="material-symbols-rounded text-base">restart</span>
                            Restart
                        </button>
                    </div>
                    
                    <!-- Server Info -->
                    <div class="border-t border-[var(--border-color)] pt-4 mt-4 text-xs text-gray-500 space-y-1">
                        <p><strong>Host:</strong> ${this.status.host || '-'}</p>
                        <p><strong>Port:</strong> ${this.status.port || '-'}</p>
                        <p><strong>Uptime:</strong> ${this.formatUptime(this.status.uptime)}</p>
                        <p><strong>Listeners:</strong> ${this.status.listeners || 0} / 100</p>
                        ${this.status.version ? `<p><strong>Version:</strong> ${this.status.version}</p>` : ''}
                        ${this.status.platform ? `<p><strong>Platform:</strong> ${this.status.platform}</p>` : ''}
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
        container.querySelector('#refresh-status-btn')?.addEventListener('click', () => this.checkStatus());
        container.querySelector('#search-installations-btn')?.addEventListener('click', () => this.searchInstallations());
    }

    updateActionButtons() {
        const startBtn = document.querySelector('#start-btn');
        const stopBtn = document.querySelector('#stop-btn');
        const restartBtn = document.querySelector('#restart-btn');
        
        if (startBtn) startBtn.disabled = this.isLoading || this.status.running;
        if (stopBtn) stopBtn.disabled = this.isLoading || !this.status.running;
        if (restartBtn) restartBtn.disabled = this.isLoading || !this.status.running;
        
        // Update button text during loading
        if (this.isLoading) {
            if (startBtn) startBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Starting...';
            if (stopBtn) stopBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Stopping...';
            if (restartBtn) restartBtn.innerHTML = '<span class="material-symbols-rounded text-base animate-spin">refresh</span> Restarting...';
        } else {
            if (startBtn) startBtn.innerHTML = '<span class="material-symbols-rounded text-base">play_arrow</span> Start';
            if (stopBtn) stopBtn.innerHTML = '<span class="material-symbols-rounded text-base">stop</span> Stop';
            if (restartBtn) restartBtn.innerHTML = '<span class="material-symbols-rounded text-base">restart</span> Restart';
        }
    }

    updateStatusIndicators() {
        // Update any external status indicators
        const statusElements = document.querySelectorAll('[id*="icecast-status"]');
        statusElements.forEach(element => {
            if (element.id.includes('text')) {
                if (this.status.installed === false) {
                    element.innerHTML = 'Not Installed - <a href="https://github.com/jerryagenyi/LANStreamer/blob/main/docs/guides/icecast-installation.md" target="_blank" class="text-blue-400 hover:text-blue-300 underline">setup guide</a>';
                } else {
                    element.textContent = this.getStatusText();
                }
            } else if (element.id.includes('dot')) {
                element.className = `status-dot ${this.status.running ? 'online' : 'offline'}`;
            }
        });
        
        // Update the local status display
        const localStatusDisplay = document.getElementById('icecast-status-display');
        if (localStatusDisplay) {
            if (this.status.installed === false) {
                localStatusDisplay.innerHTML = 'Not Installed - <a href="https://github.com/jerryagenyi/LANStreamer/blob/main/docs/guides/icecast-installation.md" target="_blank" class="text-blue-400 hover:text-blue-300 underline">setup guide</a>';
            } else {
                localStatusDisplay.textContent = this.getStatusText();
            }
        }
    }

    getStatusColor() {
        if (this.status.installed === false) return 'bg-red-600';
        if (this.status.running) return 'bg-green-500';
        if (this.status.status === 'error') return 'bg-red-500';
        return 'bg-yellow-500';
    }

    getStatusText() {
        if (this.status.installed === false) return 'Not Installed - <a href="https://github.com/jerryagenyi/LANStreamer/blob/main/docs/guides/icecast-installation.md" target="_blank" class="text-blue-400 hover:text-blue-300 underline">setup guide</a>';
        if (this.status.running) return 'Running';
        if (this.status.status === 'error') return 'Error';
        return 'Stopped';
    }

    getStatusIcon() {
        if (this.status.installed === false) return 'code_off';
        if (this.status.running) return 'router';
        if (this.status.status === 'error') return 'error';
        return 'power_settings_new';
    }

    getServerStatusText() {
        if (this.status.installed === false) return 'Icecast Server Component Not Available';
        if (this.status.running) return 'Server Online';
        return 'Server Offline';
    }

    getServerStatusDescription() {
        if (this.status.installed === false) return 'Icecast server not found on this system';
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
            if (!this.isLoading) {
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

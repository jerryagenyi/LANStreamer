class FooterComponent {
    constructor(containerId = 'footer-container') {
        this.containerId = containerId;
        this.currentVersion = 'v1.1.0'; // Fallback version
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) {
            console.log('🦶 FooterComponent already initialized, skipping...');
            return;
        }

        console.log('🦶 Initializing FooterComponent...');
        await this.loadVersion();
        this.render();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ FooterComponent initialization complete');
    }

    async loadVersion() {
        try {
            console.log('🔄 Loading version info...');
            const response = await fetch('/api/system/update-check');
            const data = await response.json();

            if (data.success && data.current) {
                this.currentVersion = `v${data.current}`;
                console.log('✅ Version loaded:', this.currentVersion);
            } else {
                console.warn('⚠️ Failed to load version from API, using fallback');
            }
        } catch (error) {
            console.error('❌ Failed to load version info:', error);
            // Keep fallback version
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Footer container '${this.containerId}' not found`);
            return;
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });

        container.innerHTML = `
            <footer class="mt-12 border-t border-[var(--border-color)] pt-8 pb-8 px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-gray-500">
                    <div class="flex items-center gap-4">
                        <span id="version-info">LANStreamer ${this.currentVersion}</span>
                        <a href="https://github.com/jerryagenyi/LANStreamer" 
                           target="_blank" 
                           class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                            <span class="material-symbols-rounded text-sm">open_in_new</span>
                            GitHub Repository
                        </a>
                    </div>
                    <div class="flex items-center gap-4">
                        <button id="check-updates-btn" 
                                class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                            <span class="material-symbols-rounded text-sm">system_update</span>
                            Check for Updates
                        </button>
                        <span class="text-gray-600">|</span>
                        <span>© ${currentMonth} ${currentYear} LANStreamer</span>
                    </div>
                </div>
            </footer>
        `;

        console.log('🦶 Footer rendered with version:', this.currentVersion);
    }

    setupEventListeners() {
        const updateBtn = document.getElementById('check-updates-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', async () => {
                console.log('🔄 Manual update check requested');
                
                // Show loading state
                updateBtn.innerHTML = `
                    <span class="material-symbols-rounded text-sm animate-spin">refresh</span>
                    Checking...
                `;
                updateBtn.disabled = true;

                try {
                    // Force update check
                    const response = await fetch('/api/system/update-check/force', {
                        method: 'POST'
                    });
                    const data = await response.json();

                    if (data.success) {
                        if (data.updateAvailable) {
                            this.showUpdateNotification(data);
                        } else {
                            this.showNotification('You have the latest version!', 'success');
                        }
                        
                        // Update version display if changed
                        if (data.current && data.current !== this.currentVersion.replace('v', '')) {
                            this.currentVersion = `v${data.current}`;
                            this.updateVersionDisplay();
                        }
                    } else {
                        this.showNotification('Failed to check for updates', 'error');
                    }
                } catch (error) {
                    console.error('Update check failed:', error);
                    this.showNotification('Update check failed', 'error');
                } finally {
                    // Restore button
                    updateBtn.innerHTML = `
                        <span class="material-symbols-rounded text-sm">system_update</span>
                        Check for Updates
                    `;
                    updateBtn.disabled = false;
                }
            });
        }
    }

    updateVersionDisplay() {
        const versionElement = document.getElementById('version-info');
        if (versionElement) {
            versionElement.textContent = `LANStreamer ${this.currentVersion}`;
            console.log('🔄 Version display updated to:', this.currentVersion);
        }
    }

    showUpdateNotification(updateData) {
        // Use existing notification system if available
        if (window.dashboard && window.dashboard.showNotification) {
            window.dashboard.showNotification(
                `Update available: ${updateData.latest} (current: ${updateData.current})`, 
                'info'
            );
        } else {
            // Fallback notification
            alert(`Update available!\nCurrent: ${updateData.current}\nLatest: ${updateData.latest}`);
        }
    }

    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.dashboard && window.dashboard.showNotification) {
            window.dashboard.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Method to refresh version from API
    async refreshVersion() {
        await this.loadVersion();
        this.updateVersionDisplay();
    }
}

// Export for use by ComponentManager
window.FooterComponent = FooterComponent;

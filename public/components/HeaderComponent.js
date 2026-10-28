class HeaderComponent {
    constructor(containerId = 'header-container') {
        this.containerId = containerId;
        this.isInitialized = false;
        this.currentUser = null;
        this.serverHost = null; // Will be loaded from config for correct LAN IP
        this.updateAvailable = false;
        this.updateInfo = null;
    }

    async init() {
        if (this.isInitialized) {
            console.log('🎯 HeaderComponent already initialized, skipping...');
            return;
        }

        console.log('🎯 Initializing HeaderComponent...');
        await this.loadConfig(); // Load config first to get correct LAN IP
        this.render();
        this.setupEventListeners();
        this.updateBellIcon(); // Sync bell state (default until check completes)
        this.checkForUpdates(); // Auto-check for updates on load
        this.isInitialized = true;
        console.log('✅ HeaderComponent initialization complete');
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/system/config');
            if (response.ok) {
                const config = await response.json();
                if (config.host || config.icecast?.host) {
                    this.serverHost = config.host || config.icecast.host;
                    console.log('🌐 Server host loaded for header:', this.serverHost);
                }
            }
        } catch (error) {
            console.warn('Failed to load config for header:', error);
        }
    }

    async checkForUpdates() {
        try {
            const response = await fetch('/api/system/update-check');
            const data = await response.json();

            if (data.success) {
                this.updateInfo = data;
                if (data.updateAvailable) {
                    this.updateAvailable = true;
                    this.updateBellIcon();
                }
            }
        } catch (error) {
            console.warn('Failed to check for updates:', error);
        }
    }

    updateBellIcon() {
        const bellBtn = document.getElementById('header-update-bell-btn');
        if (!bellBtn) return;

        if (this.updateAvailable) {
            // Show update icon with notification badge
            bellBtn.innerHTML = `
                <span class="material-symbols-rounded text-sm relative">
                    system_update
                    <span class="absolute -top-1 -right-1 flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                </span>
            `;
            bellBtn.classList.add('bg-green-900/30', 'border-green-600/50', 'text-green-400');
            bellBtn.classList.remove('bg-gray-800/50', 'border-gray-600/30', 'text-gray-300');
            bellBtn.title = `Update available: ${this.updateInfo?.latest || ''}`;
        } else {
            // Show update icon without badge
            bellBtn.innerHTML = `
                <span class="material-symbols-rounded text-sm">system_update</span>
            `;
            bellBtn.classList.remove('bg-green-900/30', 'border-green-600/50', 'text-green-400');
            bellBtn.classList.add('bg-gray-800/50', 'border-gray-600/30', 'text-gray-300');
            bellBtn.title = 'Check for Updates';
        }
    }

    showUpdateModal() {
        if (!this.updateInfo || !this.updateAvailable) {
            this.showNotification('No update information available', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-card p-6 max-w-md mx-4">
                <div class="flex items-center gap-3 mb-4">
                    <span class="material-symbols-rounded text-3xl text-green-500">system_update</span>
                    <div>
                        <h3 class="text-lg font-semibold text-white">Update Available!</h3>
                        <p class="text-sm text-gray-400">A new version of LANStreamer is ready</p>
                    </div>
                </div>
                <div class="glass-card-inset rounded-lg p-4 mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-gray-400 text-sm">Current Version</span>
                        <span class="text-white font-medium">${this.updateInfo.current}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-400 text-sm">Latest Version</span>
                        <span class="text-green-400 font-semibold">${this.updateInfo.latest}</span>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button id="update-view-release" class="btn-glass btn-glass-primary flex-1">
                        View Release
                    </button>
                    <button id="update-close-modal" class="btn-glass btn-glass-secondary flex-1">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const viewReleaseBtn = document.getElementById('update-view-release');
        if (viewReleaseBtn && this.updateInfo.releaseUrl) {
            viewReleaseBtn.addEventListener('click', () => {
                const url = this.updateInfo.releaseUrl;
                if (url && (url.startsWith('https://github.com') || url.startsWith('https://api.github.com'))) {
                    window.open(url, '_blank');
                }
            });
        }

        document.getElementById('update-close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Header container '${this.containerId}' not found`);
            return;
        }

        // Use config host for correct LAN IP, fallback to relative path
        const streamsUrl = this.serverHost ? `http://${this.serverHost}:3001/streams` : '/streams';

        container.innerHTML = `
            <header class="header-glass sticky top-0 z-50 flex items-center justify-between whitespace-nowrap px-10 py-4">
                <!-- Logo Section -->
                <div class="flex items-center gap-4 text-white">
                    <a href="http://localhost:3001" class="flex items-center gap-2 text-white hover:text-[var(--primary-color)] transition-colors">
                        <img src="/assets/logo.svg?v=3"
                             alt="LANStreamer"
                             class="h-16 w-auto logo-glow"
                             id="logo-image"
                             data-theme-logo
                             onerror="this.onerror=null; this.src='/assets/lanstreamer-logo.png';">
                        <div id="logo-fallback" style="display: none;" class="flex items-center">
                            <span class="text-xl font-bold tracking-wider">LANStreamer</span>
                        </div>
                    </a>
                </div>

                <!-- Navigation and Actions -->
                <div class="flex items-center gap-3">
                    <!-- Update Icon: shows badge when update available; click opens modal or runs check -->
                    <button id="header-update-bell-btn"
                            class="icon-btn text-gray-300 hover:text-white"
                            title="Check for Updates"
                            aria-label="Check for Updates">
                        <span class="material-symbols-rounded text-sm">system_update</span>
                    </button>

                    <!-- Theme toggle (dark/light) -->
                    <button data-theme-toggle
                            class="theme-toggle"
                            title="Toggle dark/light mode"
                            aria-label="Switch to light mode"
                            aria-pressed="false">
                        <span class="material-symbols-rounded text-sm">light_mode</span>
                    </button>

                    <!-- Listener page share card: one place, three actions -->
                    <div class="flex items-center gap-1 rounded-full px-2 py-1"
                         style="background:var(--tok-surface-2,#12151C);border:1px solid var(--tok-line-strong,#2F2F2F);">
                        <span class="hidden md:inline text-xs mr-1" style="color:var(--tok-text-2,#9AA3B2);">Listen to streams:</span>
                        <a href="${streamsUrl}" target="_blank" id="header-open-listener"
                           class="copy-btn" title="Open listener page" aria-label="Open listener page">
                            <span class="material-symbols-rounded text-base">open_in_new</span>
                        </a>
                        <button type="button" id="header-copy-listener" class="copy-btn" title="Copy listener page URL" aria-label="Copy listener page URL">
                            <span class="material-symbols-rounded text-base">link</span>
                        </button>
                        <button type="button" id="header-qr-listener" class="copy-btn" title="Show QR code to scan" aria-label="Show QR code for listener page">
                            <span class="material-symbols-rounded text-base">qr_code_2</span>
                        </button>
                    </div>

                    </div>
                </div>
            </header>
        `;

        // Share actions all point at the listener page URL
        try {
            const url = this.serverHost ? `http://${this.serverHost}:3001/streams` : `${location.origin}/streams`;
            const copyBtn = document.getElementById('header-copy-listener');
            if (copyBtn) copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(url);
                    copyBtn.title = 'Copied!';
                    setTimeout(() => { copyBtn.title = 'Copy listener page URL'; }, 1500);
                } catch { window.prompt('Copy this link:', url); }
            });
            const qrBtn = document.getElementById('header-qr-listener');
            if (qrBtn) qrBtn.addEventListener('click', () => {
                if (window.LSShare) LSShare.show(url);
            });
        } catch { /* share buttons are non-critical */ }

        console.log('🎯 Header rendered successfully');
    }

    setupEventListeners() {
        // Update Bell Button
        const bellBtn = document.getElementById('header-update-bell-btn');
        if (bellBtn) {
            bellBtn.addEventListener('click', async () => {
                if (this.updateAvailable) {
                    // Show update modal if update is available
                    this.showUpdateModal();
                } else {
                    // Manual check if no update available
                    console.log('🔄 Header update check requested');

                    // Show loading state
                    bellBtn.innerHTML = `
                        <span class="material-symbols-rounded text-sm animate-spin">refresh</span>
                    `;
                    bellBtn.disabled = true;

                    try {
                        const response = await fetch('/api/system/update-check/force', {
                            method: 'POST'
                        });
                        const data = await response.json();

                        if (data.success) {
                            this.updateInfo = data;
                            if (data.updateAvailable) {
                                this.updateAvailable = true;
                                this.updateBellIcon();
                                this.showUpdateModal();
                            } else {
                                this.showNotification('You have the latest version!', 'success');
                            }
                        } else {
                            this.showNotification('Failed to check for updates', 'error');
                        }
                    } catch (error) {
                        console.error('Update check failed:', error);
                        this.showNotification('Update check failed', 'error');
                    } finally {
                        // Restore button if no update
                        if (!this.updateAvailable) {
                            bellBtn.innerHTML = originalContent;
                        }
                        bellBtn.disabled = false;
                    }
                }
            });
        }


        console.log('🎯 Header event listeners setup complete');
    }

    /**
     * Show logout confirmation dialog
     */
    async showLogoutConfirmation() {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="glass-card p-6 max-w-md mx-4">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="material-symbols-rounded text-yellow-500">logout</span>
                        <h3 class="text-lg font-semibold text-white">Confirm Logout</h3>
                    </div>
                    <p class="text-gray-300 mb-6">Are you sure you want to sign out of the admin dashboard?</p>
                    <div class="flex justify-end gap-3">
                        <button id="cancel-logout" class="btn-glass btn-glass-secondary">
                            Cancel
                        </button>
                        <button id="confirm-logout" class="btn-glass btn-glass-danger">
                            Sign Out
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listeners
            document.getElementById('cancel-logout').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });

            document.getElementById('confirm-logout').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            });
        });
    }

    /**
     * Clear all authentication data comprehensively
     */
    clearAllAuthData() {
        // Clear localStorage
        localStorage.removeItem('lanstreamer_token');
        localStorage.removeItem('lanstreamer_user');
        localStorage.removeItem('lanstreamer_session');

        // Clear sessionStorage
        sessionStorage.removeItem('lanstreamer_token');
        sessionStorage.removeItem('lanstreamer_user');
        sessionStorage.removeItem('lanstreamer_session');

        // Clear any auth-related cookies
        document.cookie.split(";").forEach((c) => {
            const eqPos = c.indexOf("=");
            const name = eqPos > -1 ? c.substr(0, eqPos) : c;
            if (name.trim().toLowerCase().includes('lanstreamer') ||
                name.trim().toLowerCase().includes('auth') ||
                name.trim().toLowerCase().includes('token')) {
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            }
        });

        console.log('🧹 All authentication data cleared');
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

    // Method to update user info (for future use)
    updateUserInfo(userInfo) {
        this.currentUser = userInfo;
        // Could update avatar, name, etc. in the future
    }

    // Method to add status indicators (for future use)
    addStatusIndicator(id, content, className = '') {
        const header = document.querySelector(`#${this.containerId} header`);
        if (header) {
            const indicator = document.createElement('div');
            indicator.id = id;
            indicator.className = `status-indicator ${className}`;
            indicator.innerHTML = content;

            // Insert before the user avatar
            const avatar = header.querySelector('.bg-center.bg-no-repeat');
            if (avatar) {
                avatar.parentNode.insertBefore(indicator, avatar);
            }
        }
    }
}

// Export for use by ComponentManager
window.HeaderComponent = HeaderComponent;

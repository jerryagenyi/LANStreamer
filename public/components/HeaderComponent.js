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
        if (window.LSNotifications) LSNotifications.bindBell(); // Notification center owns the bell now
        this.checkForUpdates(); // Feeds update notices into the notification bell
        this.isInitialized = true;
        console.log('🎯 HeaderComponent initialization complete');
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

            if (data.success && data.updateAvailable) {
                this.updateInfo = data;
                this.updateAvailable = true;
                // Update notices are one of the bell's notification sources
                if (window.LSNotifications) {
                    LSNotifications.notify({
                        title: `Update available: v${data.latest} (you have v${data.current})`,
                        message: 'Download it from the GitHub releases page.',
                        type: 'update'
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to check for updates:', error);
        }
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
                    <!-- Notification bell: lights up when there are unread notifications -->
                    <button id="header-bell-btn"
                            class="theme-toggle"
                            title="No notifications"
                            aria-label="No notifications"
                            aria-haspopup="dialog">
                        <span class="material-symbols-rounded text-sm">notifications</span>
                    </button>

                    <!-- Theme toggle (dark/light) -->
                    <button data-theme-toggle
                            class="theme-toggle"
                            title="Toggle dark/light mode"
                            aria-label="Switch to light mode"
                            aria-pressed="false">
                        <span class="material-symbols-rounded text-sm">light_mode</span>
                    </button>

                    <!-- Open listener page (sharing lives in the dashboard sidebar card) -->
                    <a href="${streamsUrl}" target="_blank" rel="noopener" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:13px;" title="Open the listener page">
                        <span class="material-symbols-rounded" style="font-size:15px;">headphones</span>
                        <span class="hidden sm:inline">Open listener page</span>
                    </a>

                    </div>
                </div>
            </header>
        `;

        console.log('🎯 Header rendered successfully');
    }

    setupEventListeners() {
        // Notification bell is wired up by notifications.js (LSNotifications.bindBell)
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

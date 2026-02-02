class HeaderComponent {
    constructor(containerId = 'header-container') {
        this.containerId = containerId;
        this.isInitialized = false;
        this.currentUser = null;
        this.serverHost = null; // Will be loaded from config for correct LAN IP
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

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Header container '${this.containerId}' not found`);
            return;
        }

        // Use config host for correct LAN IP, fallback to relative path
        const streamsUrl = this.serverHost ? `http://${this.serverHost}:3001/streams` : '/streams';

        container.innerHTML = `
            <header class="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-[var(--border-color)] bg-[var(--dark-bg)]/80 px-10 py-4 backdrop-blur-lg">
                <!-- Logo Section -->
                <div class="flex items-center gap-4 text-white">
                    <a href="http://localhost:3001" class="flex items-center gap-2 text-white hover:text-[var(--primary-color)] transition-colors">
                        <img src="/assets/lanstreamer-logo.png"
                             alt="LANStreamer"
                             class="h-16 w-auto"
                             id="logo-image"
                             onerror="this.style.display='none'; document.getElementById('logo-fallback').style.display='flex';">
                        <div id="logo-fallback" style="display: none;" class="flex items-center">
                            <span class="text-xl font-bold tracking-wider">LANStreamer</span>
                        </div>
                    </a>
                </div>

                <!-- Navigation and Actions -->
                <div class="flex items-center gap-3">
                    <!-- Update Check Button -->
                    <button id="header-check-updates-btn"
                            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all duration-300"
                            title="Check for Updates">
                        <span class="material-symbols-rounded text-sm">system_update</span>
                        <span class="hidden sm:inline">Updates</span>
                    </button>

                    <!-- Admin Navigation Links -->
                    <div class="flex items-center gap-2">
                        <a href="${streamsUrl}"
                           target="_blank"
                           class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all duration-300"
                           title="Open Streams Page (for listeners)">
                            <span class="material-symbols-rounded text-sm">radio</span>
                            <span class="hidden sm:inline">Listen to Streams</span>
                        </a>
                        
                        <button id="header-logout-btn"
                               class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all duration-300"
                               title="Logout from Admin Dashboard"
                               aria-label="Sign out of admin dashboard"
                               role="button">
                            <span class="material-symbols-rounded text-sm" aria-hidden="true">logout</span>
                            <span class="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>
        `;

        console.log('🎯 Header rendered successfully');
    }

    setupEventListeners() {
        // Update Check Button
        const updateBtn = document.getElementById('header-check-updates-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', async () => {
                console.log('🔄 Header update check requested');
                
                // Show loading state
                const originalContent = updateBtn.innerHTML;
                updateBtn.innerHTML = `
                    <span class="material-symbols-rounded text-sm animate-spin">refresh</span>
                    <span class="hidden sm:inline">Checking...</span>
                `;
                updateBtn.disabled = true;

                try {
                    // Use existing update notification system if available
                    if (window.updateNotification) {
                        await window.updateNotification.forceUpdateCheck();
                    } else {
                        // Fallback to direct API call
                        const response = await fetch('/api/system/update-check/force', {
                            method: 'POST'
                        });
                        const data = await response.json();

                        if (data.success) {
                            if (data.updateAvailable) {
                                this.showNotification(`Update available: ${data.latest}`, 'info');
                            } else {
                                this.showNotification('You have the latest version!', 'success');
                            }
                        } else {
                            this.showNotification('Failed to check for updates', 'error');
                        }
                    }
                } catch (error) {
                    console.error('Update check failed:', error);
                    this.showNotification('Update check failed', 'error');
                } finally {
                    // Restore button
                    updateBtn.innerHTML = originalContent;
                    updateBtn.disabled = false;
                }
            });
        }

        // Logout Button
        const logoutBtn = document.getElementById('header-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🚪 Logout requested');

                // Show confirmation dialog
                const confirmed = await this.showLogoutConfirmation();
                if (!confirmed) {
                    return;
                }

                // Show loading state
                const originalContent = logoutBtn.innerHTML;
                logoutBtn.innerHTML = '<span class="material-symbols-rounded text-sm animate-spin">refresh</span><span class="hidden sm:inline">Signing Out...</span>';
                logoutBtn.disabled = true;

                try {
                    // Call logout API with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        signal: controller.signal,
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('lanstreamer_token')}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    clearTimeout(timeoutId);
                } catch (error) {
                    console.log('Logout request failed:', error);
                    // Continue with logout even if API fails
                } finally {
                    // Comprehensive token and session clearance
                    this.clearAllAuthData();

                    // Redirect to login page
                    window.location.href = '/login.html';
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
                <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="material-symbols-rounded text-yellow-500">logout</span>
                        <h3 class="text-lg font-semibold text-white">Confirm Logout</h3>
                    </div>
                    <p class="text-gray-300 mb-6">Are you sure you want to sign out of the admin dashboard?</p>
                    <div class="flex justify-end gap-3">
                        <button id="cancel-logout" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button id="confirm-logout" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">
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

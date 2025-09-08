class HeaderComponent {
    constructor(containerId = 'header-container') {
        this.containerId = containerId;
        this.isInitialized = false;
        this.currentUser = null;
    }

    async init() {
        if (this.isInitialized) {
            console.log('🎯 HeaderComponent already initialized, skipping...');
            return;
        }

        console.log('🎯 Initializing HeaderComponent...');
        this.render();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ HeaderComponent initialization complete');
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Header container '${this.containerId}' not found`);
            return;
        }

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
                        <a href="/streams" 
                           target="_blank"
                           class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all duration-300"
                           title="Open Streams Page (for listeners)">
                            <span class="material-symbols-rounded text-sm">radio</span>
                            <span class="hidden sm:inline">Listen to Streams</span>
                        </a>
                        
                        <button id="header-logout-btn"
                               class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all duration-300"
                               title="Logout from Admin Dashboard">
                            <span class="material-symbols-rounded text-sm">logout</span>
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
            logoutBtn.addEventListener('click', async () => {
                console.log('🚪 Logout requested');
                
                try {
                    // Call logout API
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (error) {
                    console.log('Logout request failed:', error);
                } finally {
                    // Clear token and redirect regardless of API response
                    localStorage.removeItem('lanstreamer_token');
                    window.location.href = '/login.html';
                }
            });
        }

        console.log('🎯 Header event listeners setup complete');
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

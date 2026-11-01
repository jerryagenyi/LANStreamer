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
            <footer class="mt-12 border-t pt-8 pb-8 px-4 sm:px-6 lg:px-8" style="border-color:var(--tok-line);">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style="color:var(--tok-text-3);">
                    <div class="flex items-center gap-4">
                        <span id="version-info">LANStreamer ${this.currentVersion}</span>
                        <a href="https://github.com/jerryagenyi/LANStreamer"
                           target="_blank"
                           class="flex items-center gap-1 transition-colors"
                           style="color:var(--tok-accent);">
                            <span class="material-symbols-rounded text-sm">open_in_new</span>
                            GitHub
                        </a>
                        <a href="/docs" target="_blank" class="flex items-center gap-1 transition-colors" style="color:var(--tok-accent);">
                            <span class="material-symbols-rounded text-sm">help</span>
                            Troubleshooting
                        </a>
                    </div>
                    <div class="flex items-center gap-4">
                        <span>Free &amp; open source — no ads, no tracking of listeners</span>
                        <span aria-hidden="true">|</span>
                        <span>© ${currentYear} LANStreamer</span>
                    </div>
                </div>
            </footer>
        `;

        console.log('🦶 Footer rendered with version:', this.currentVersion);
    }

    setupEventListeners() {
        // Update notices now surface through the header notification bell
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

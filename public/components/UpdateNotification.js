/**
 * Update Notification Component
 * Shows update availability and provides update instructions
 */
class UpdateNotification {
    constructor() {
        this.updateInfo = null;
        this.checkInterval = 6 * 60 * 60 * 1000; // 6 hours
        this.lastCheck = null;
        this.init();
    }

    async init() {
        // Check for updates on startup
        await this.checkForUpdates();
        
        // Set up periodic checks
        setInterval(() => {
            this.checkForUpdates();
        }, this.checkInterval);
    }

    async checkForUpdates() {
        try {
            const response = await fetch('/api/system/update-check');
            const data = await response.json();
            
            if (data.success) {
                this.updateInfo = data;
                this.lastCheck = new Date();
                
                if (data.updateAvailable) {
                    this.showUpdateNotification();
                } else {
                    this.hideUpdateNotification();
                }
            }
        } catch (error) {
            console.warn('Failed to check for updates:', error);
        }
    }

    showUpdateNotification() {
        // Remove existing notification
        this.hideUpdateNotification();

        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.className = 'fixed top-4 right-4 z-50 max-w-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg border border-blue-500/30';
        
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0">
                        <span class="material-symbols-rounded text-xl">system_update</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-sm mb-1">Update Available!</h4>
                        <p class="text-xs text-blue-100 mb-2">
                            LANStreamer ${this.updateInfo.latest} is available
                            <br><span class="text-blue-200">(Current: ${this.updateInfo.current})</span>
                        </p>
                        <div class="flex gap-2">
                            <button id="update-run-now" class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">
                                🚀 Update Now
                            </button>
                            <button id="update-show-instructions" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                                Instructions
                            </button>
                            <button id="update-dismiss" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                                Later
                            </button>
                        </div>
                    </div>
                    <button id="update-close" class="flex-shrink-0 text-white/70 hover:text-white">
                        <span class="material-symbols-rounded text-sm">close</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Add event listeners
        document.getElementById('update-run-now').addEventListener('click', () => {
            this.runUpdate();
        });

        document.getElementById('update-show-instructions').addEventListener('click', () => {
            this.showUpdateModal();
        });

        document.getElementById('update-dismiss').addEventListener('click', () => {
            this.hideUpdateNotification();
            // Check again in 6 hours
            setTimeout(() => this.checkForUpdates(), 6 * 60 * 60 * 1000);
        });

        document.getElementById('update-close').addEventListener('click', () => {
            this.hideUpdateNotification();
        });

        // Auto-hide after 30 seconds
        setTimeout(() => {
            if (document.getElementById('update-notification')) {
                this.hideUpdateNotification();
            }
        }, 30000);
    }

    hideUpdateNotification() {
        const notification = document.getElementById('update-notification');
        if (notification) {
            notification.remove();
        }
    }

    runUpdate() {
        this.hideUpdateNotification();

        // Show confirmation dialog
        const confirmed = confirm(
            `🚀 LANStreamer Auto-Updater\n\n` +
            `This will:\n` +
            `✅ Backup your settings and data\n` +
            `✅ Download LANStreamer ${this.updateInfo.latest}\n` +
            `✅ Install the update automatically\n` +
            `✅ Preserve all your configuration\n\n` +
            `The update process will take 1-2 minutes.\n` +
            `Continue with the update?`
        );

        if (confirmed) {
            // Try to run the batch file
            try {
                // Create a temporary link to trigger the batch file
                const link = document.createElement('a');
                link.href = 'Update LANStreamer.bat';
                link.download = 'Update LANStreamer.bat';

                // Show instructions since we can't directly run batch files from browser
                this.showUpdateInstructions();
            } catch (error) {
                console.error('Cannot run batch file directly:', error);
                this.showUpdateInstructions();
            }
        }
    }

    showUpdateInstructions() {
        const modal = document.createElement('div');
        modal.id = 'update-instructions-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';

        modal.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 max-w-lg w-full mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        <span class="material-symbols-rounded text-blue-400">system_update</span>
                        Ready to Update!
                    </h3>
                    <button id="instructions-close" class="text-gray-400 hover:text-white">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                    <h4 class="font-semibold text-green-300 mb-3 flex items-center gap-2">
                        <span class="material-symbols-rounded text-sm">auto_fix_high</span>
                        Simple 2-Step Update
                    </h4>
                    <div class="space-y-3">
                        <div class="flex items-start gap-3">
                            <span class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                            <div>
                                <p class="text-sm text-gray-300 font-medium">Close LANStreamer</p>
                                <p class="text-xs text-green-200">Stop the server first (close this browser tab)</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-3">
                            <span class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                            <div>
                                <p class="text-sm text-gray-300 font-medium">Double-click <code class="bg-gray-700 px-1 rounded">Update LANStreamer.bat</code></p>
                                <p class="text-xs text-green-200">The updater will handle everything automatically</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                    <p class="text-xs text-blue-300">
                        ✅ <strong>Your settings will be preserved</strong><br>
                        ✅ <strong>Automatic backup created</strong><br>
                        ✅ <strong>Takes 1-2 minutes</strong>
                    </p>
                </div>

                <div class="flex justify-end gap-3">
                    <button id="instructions-ok" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        Got it!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('instructions-close').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('instructions-ok').addEventListener('click', () => {
            modal.remove();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showUpdateModal() {
        this.hideUpdateNotification();

        const modal = document.createElement('div');
        modal.id = 'update-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
        
        modal.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        <span class="material-symbols-rounded text-blue-400">system_update</span>
                        Update LANStreamer
                    </h3>
                    <button id="modal-close" class="text-gray-400 hover:text-white">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="mb-6">
                    <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                        <h4 class="font-semibold text-blue-300 mb-2">📦 New Version Available</h4>
                        <p class="text-sm text-gray-300">
                            <strong>Current:</strong> ${this.updateInfo.current}<br>
                            <strong>Latest:</strong> ${this.updateInfo.latest}<br>
                            <strong>Released:</strong> ${new Date(this.updateInfo.publishedAt).toLocaleDateString()}
                        </p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <h4 class="font-semibold text-green-300 mb-2 flex items-center gap-2">
                                <span class="material-symbols-rounded text-sm">auto_fix_high</span>
                                Automatic Update (Recommended)
                            </h4>
                            <ol class="text-sm text-gray-300 space-y-1 mb-3">
                                <li>1. Close LANStreamer (stop the server)</li>
                                <li>2. Double-click <code class="bg-gray-700 px-1 rounded">Update LANStreamer.bat</code> in your installation folder</li>
                                <li>3. Follow the on-screen instructions</li>
                                <li>4. Your settings and data will be preserved automatically</li>
                            </ol>
                            <p class="text-xs text-green-200">✅ This method backs up your data and handles everything automatically.</p>
                        </div>

                        <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <h4 class="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                                <span class="material-symbols-rounded text-sm">flash_on</span>
                                Quick Update
                            </h4>
                            <ol class="text-sm text-gray-300 space-y-1 mb-3">
                                <li>1. Double-click <code class="bg-gray-700 px-1 rounded">Quick Update LANStreamer.bat</code></li>
                                <li>2. Wait for completion</li>
                                <li>3. Restart LANStreamer</li>
                            </ol>
                            <p class="text-xs text-blue-200">⚡ Faster but with less detailed progress information.</p>
                        </div>

                        <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <h4 class="font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                                <span class="material-symbols-rounded text-sm">build</span>
                                Manual Update
                            </h4>
                            <ol class="text-sm text-gray-300 space-y-1 mb-3">
                                <li>1. Backup your <code class="bg-gray-700 px-1 rounded">.env</code>, <code class="bg-gray-700 px-1 rounded">icecast.xml</code>, and <code class="bg-gray-700 px-1 rounded">data/</code> folders</li>
                                <li>2. <a href="${this.updateInfo.releaseUrl}" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Download the latest release</a></li>
                                <li>3. Extract the new files over your installation</li>
                                <li>4. Restore your backed up files</li>
                            </ol>
                            <p class="text-xs text-yellow-200">⚠️ Only use this method if the automatic updater doesn't work.</p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-3">
                    <button id="modal-later" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors">
                        Update Later
                    </button>
                    <a href="${this.updateInfo.releaseUrl}" target="_blank" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        View Release Notes
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('modal-close').addEventListener('click', () => {
            this.hideUpdateModal();
        });

        document.getElementById('modal-later').addEventListener('click', () => {
            this.hideUpdateModal();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideUpdateModal();
            }
        });
    }

    hideUpdateModal() {
        const modal = document.getElementById('update-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Public method to manually check for updates
    async forceUpdateCheck() {
        try {
            const response = await fetch('/api/system/update-check/force', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateInfo = data;
                
                if (data.updateAvailable) {
                    this.showUpdateModal();
                } else {
                    // Show "up to date" message
                    this.showUpToDateMessage();
                }
            }
        } catch (error) {
            console.error('Failed to force update check:', error);
        }
    }

    showUpToDateMessage() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 max-w-sm bg-green-600 text-white rounded-lg shadow-lg p-4';
        
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-rounded">check_circle</span>
                <span class="font-medium">You're up to date!</span>
            </div>
            <p class="text-sm text-green-100 mt-1">LANStreamer ${this.updateInfo.current} is the latest version.</p>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize update notification system
window.updateNotification = new UpdateNotification();

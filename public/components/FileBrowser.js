/**
 * File Browser Component for Icecast Installation Selection
 * Uses manual path input for better reliability and user experience
 */
class FileBrowser {
    constructor() {
        this.onSelectCallback = null;
    }

    /**
     * Open directory picker
     * @param {Function} onSelect - Callback function when directory is selected
     */
    async open(onSelect) {
        this.onSelectCallback = onSelect;
        this.showDirectoryBrowser();
    }

    /**
     * Sanitize and normalize file path
     */
    sanitizePath(path) {
        if (!path || typeof path !== 'string') {
            return '';
        }

        // Remove dangerous characters and normalize path
        let sanitized = path
            .replace(/[<>"|?*]/g, '') // Remove dangerous characters
            .replace(/\.\./g, '') // Remove parent directory traversal
            .trim();

        // Normalize path separators for Windows
        sanitized = sanitized.replace(/\//g, '\\');

        // Remove multiple consecutive backslashes
        sanitized = sanitized.replace(/\\+/g, '\\');

        // Remove leading/trailing backslashes
        sanitized = sanitized.replace(/^\\+|\\+$/g, '');

        // Validate path length
        if (sanitized.length > 260) { // Windows MAX_PATH limit
            throw new Error('Path too long (maximum 260 characters)');
        }

        return sanitized;
    }

    /**
     * Validate selected directory and process result
     */
    async validateSelectedDirectory(directoryPath) {
        try {
            // Sanitize the path before validation
            const sanitizedPath = this.sanitizePath(directoryPath);

            if (!sanitizedPath) {
                throw new Error('Invalid directory path provided');
            }

            console.log('Validating sanitized path:', sanitizedPath);

            const response = await fetch('/api/system/icecast/validate-custom-path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: sanitizedPath })
            });

            const result = await response.json();
            
            if (result.success) {
                if (this.onSelectCallback) {
                    this.onSelectCallback(result);
                }
            } else {
                // Throw error with detailed message to be caught by modal handler
                throw new Error(result.error || 'Invalid Icecast installation directory');
            }
        } catch (error) {
            console.error('Failed to validate directory:', error);
            this.showError('Failed to validate directory: ' + error.message);
        }
    }

    /**
     * Show directory browser modal
     */
    async showDirectoryBrowser() {
        const modal = document.createElement('div');
        modal.id = 'file-browser-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

        modal.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-2xl shadow-2xl shadow-black/50">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-white">Browse for Icecast Directory</h2>
                    <button id="close-browser-btn" class="text-gray-400 hover:text-white transition-colors">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="mb-4">
                    <p class="text-gray-300 text-sm mb-4">
                        Navigate to your Icecast installation directory:
                    </p>

                    <!-- Current Path Display -->
                    <div class="mb-3 p-2 bg-[#111111] border border-[var(--border-color)] rounded-lg">
                        <span class="text-xs text-gray-400">Current Path:</span>
                        <div id="current-path" class="text-white font-mono text-sm">/</div>
                    </div>

                    <!-- Directory Listing -->
                    <div id="directory-listing" class="max-h-64 overflow-y-auto bg-[#111111] border border-[var(--border-color)] rounded-lg">
                        <div class="p-4 text-center text-gray-400">
                            <span class="material-symbols-rounded animate-spin">refresh</span>
                            Loading directories...
                        </div>
                    </div>
                </div>

                <div class="flex gap-3">
                    <button id="manual-input-btn" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                        Manual Input
                    </button>
                    <button id="select-directory-btn" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" disabled>
                        Select This Directory
                    </button>
                    <button id="cancel-browser-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                </div>

                <div id="browser-error" class="mt-3 text-red-400 text-sm hidden"></div>
            </div>
        `;

        document.body.appendChild(modal);

        // Initialize directory browser
        this.currentPath = null;
        this.selectedPath = null;
        await this.loadDirectories();

        // Event listeners
        const closeBtn = modal.querySelector('#close-browser-btn');
        const cancelBtn = modal.querySelector('#cancel-browser-btn');
        const selectBtn = modal.querySelector('#select-directory-btn');
        const manualBtn = modal.querySelector('#manual-input-btn');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        selectBtn.addEventListener('click', async () => {
            if (this.selectedPath) {
                selectBtn.textContent = 'Validating...';
                selectBtn.disabled = true;

                try {
                    await this.validateSelectedDirectory(this.selectedPath);
                    closeModal();
                } catch (error) {
                    this.showBrowserError(error.message);
                } finally {
                    selectBtn.textContent = 'Select This Directory';
                    selectBtn.disabled = false;
                }
            }
        });

        manualBtn.addEventListener('click', () => {
            closeModal();
            this.showManualPathInput();
        });
    }

    /**
     * Load directories from server
     */
    async loadDirectories(browsePath = null) {
        try {
            const response = await fetch('/api/system/icecast/browse-directories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: browsePath })
            });

            if (!response.ok) {
                throw new Error(`Failed to load directories: ${response.statusText}`);
            }

            const data = await response.json();
            this.renderDirectoryListing(data);

        } catch (error) {
            this.showBrowserError(`Failed to load directories: ${error.message}`);
        }
    }

    /**
     * Render directory listing
     */
    renderDirectoryListing(data) {
        const listing = document.getElementById('directory-listing');
        const currentPathEl = document.getElementById('current-path');

        if (data.currentPath) {
            currentPathEl.textContent = data.currentPath;
            this.currentPath = data.currentPath;
        }

        let html = '';

        // Add parent directory option if not at root
        if (data.parentPath) {
            html += `
                <div class="directory-item p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600" data-path="${data.parentPath}" data-type="parent">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-rounded text-blue-400">arrow_upward</span>
                        <span class="text-white">.. (Parent Directory)</span>
                    </div>
                </div>
            `;
        }

        // Add directories
        if (data.directories && data.directories.length > 0) {
            data.directories.forEach(dir => {
                html += `
                    <div class="directory-item p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600" data-path="${dir.path}" data-type="directory">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-yellow-400">folder</span>
                            <span class="text-white">${dir.name}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `
                <div class="p-4 text-center text-gray-400">
                    No directories found
                </div>
            `;
        }

        listing.innerHTML = html;

        // Add click handlers
        listing.querySelectorAll('.directory-item').forEach(item => {
            item.addEventListener('click', async () => {
                const path = item.dataset.path;
                const type = item.dataset.type;

                if (type === 'parent' || type === 'directory') {
                    // Navigate to directory
                    await this.loadDirectories(path);
                    this.selectedPath = path;
                    this.updateSelectButton();
                }
            });

            // Double-click to select
            item.addEventListener('dblclick', () => {
                const path = item.dataset.path;
                this.selectedPath = path;
                document.getElementById('select-directory-btn').click();
            });
        });
    }

    /**
     * Update select button state
     */
    updateSelectButton() {
        const selectBtn = document.getElementById('select-directory-btn');
        if (this.selectedPath) {
            selectBtn.disabled = false;
            selectBtn.textContent = `Select: ${this.selectedPath}`;
        } else {
            selectBtn.disabled = true;
            selectBtn.textContent = 'Select This Directory';
        }
    }

    /**
     * Show browser error
     */
    showBrowserError(message) {
        const errorEl = document.getElementById('browser-error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');

        setTimeout(() => {
            errorEl.classList.add('hidden');
        }, 5000);
    }

    /**
     * Show manual path input modal (fallback)
     */
    showManualPathInput() {
        const modal = document.createElement('div');
        modal.id = 'file-browser-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-white">Select Icecast Directory</h2>
                    <button id="close-browser-btn" class="text-gray-400 hover:text-white transition-colors">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div class="mb-4">
                    <p class="text-gray-300 text-sm mb-4">
                        Please enter the full path to your Icecast installation directory:
                    </p>
                    <input 
                        type="text" 
                        id="manual-path-input" 
                        placeholder="C:\\Program Files (x86)\\Icecast"
                        class="w-full p-3 bg-[#111111] border border-[var(--border-color)] rounded-xl text-white font-mono text-sm"
                    />
                </div>
                
                <div id="path-error" class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm" style="display: none;"></div>
                
                <div class="flex gap-2">
                    <button id="cancel-path-btn" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button id="validate-path-btn" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                        Validate Path
                    </button>
                </div>
                
                <div class="mt-4 text-xs text-gray-500">
                    <p><strong>Common locations:</strong></p>
                    <ul class="mt-1 space-y-1">
                        <li>• C:\\Program Files (x86)\\Icecast</li>
                        <li>• C:\\Program Files\\Icecast</li>
                        <li>• C:\\icecast</li>
                    </ul>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Setup event listeners
        const closeBtn = modal.querySelector('#close-browser-btn');
        const cancelBtn = modal.querySelector('#cancel-path-btn');
        const validateBtn = modal.querySelector('#validate-path-btn');
        const pathInput = modal.querySelector('#manual-path-input');
        
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        validateBtn.addEventListener('click', async () => {
            const path = pathInput.value.trim();
            if (!path) {
                this.showPathError('Please enter a directory path');
                return;
            }
            
            validateBtn.textContent = 'Validating...';
            validateBtn.disabled = true;
            
            try {
                await this.validateSelectedDirectory(path);
                closeModal();
            } catch (error) {
                this.showPathError(error.message);
            } finally {
                validateBtn.textContent = 'Validate Path';
                validateBtn.disabled = false;
            }
        });
        
        // Enter key to validate
        pathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                validateBtn.click();
            }
        });

        // Clear error when user starts typing
        pathInput.addEventListener('input', () => {
            const errorDiv = document.getElementById('path-error');
            if (errorDiv && errorDiv.style.display !== 'none') {
                errorDiv.style.display = 'none';
            }
        });
        
        // Focus the input
        setTimeout(() => pathInput.focus(), 100);
    }

    /**
     * Show error in manual path input
     */
    showPathError(message) {
        const errorDiv = document.getElementById('path-error');
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div class="flex items-start gap-2">
                    <span class="material-symbols-rounded text-red-400 text-sm mt-0.5">error</span>
                    <div class="flex-1">
                        <div class="font-medium text-red-400 mb-1">Validation Failed</div>
                        <div class="text-red-300 text-xs leading-relaxed">${message}</div>
                    </div>
                </div>
            `;
            errorDiv.style.display = 'block';

            // Don't auto-hide the error - let user read the detailed message
            // They can dismiss it by trying again or closing the modal
        }
    }

    /**
     * Show error message (for compatibility)
     */
    showError(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg z-50';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Export for use in other components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileBrowser;
}

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
        this.showManualPathInput();
    }

    /**
     * Validate selected directory and process result
     */
    async validateSelectedDirectory(directoryPath) {
        try {
            const response = await fetch('/api/system/icecast/validate-custom-path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: directoryPath })
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
     * Show manual path input modal
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

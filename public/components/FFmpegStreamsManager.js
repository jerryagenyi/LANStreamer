/**
 * FFmpeg Streams Manager Component
 * Manages FFmpeg audio streams with real-time status updates
 */

const TROUBLESHOOTING_GUIDE_URL = 'https://github.com/jerryagenyi/LANStreamer/blob/main/docs/TROUBLESHOOTING.md';

class FFmpegStreamsManager {
    constructor(containerId = 'ffmpeg-streams') {
        this.activeStreams = [];
        this.audioDevices = [];
        this.isInitialized = false;
        this.statusCheckInterval = null;
        this.uptimeUpdateInterval = null;
        this.containerId = containerId;
        this.container = null;

        // Test tools: hidden by default; toggle shows Test source button in add-stream modal
        this.showTestTools = false;

        // Dynamic Icecast config (fetched from /api/system/config)
        this.icecastPort = 8000; // Default fallback (Icecast standard port)
        this.serverHost = null; // Will be loaded from config - uses getPreferredLANHost() for correct network IP

        // Client-side timer tracking
        this.clientTimers = new Map(); // streamId -> { startTime, isRunning }

        // Don't auto-initialize - let ComponentManager handle it
        // this.init() will be called by ComponentManager when DOM is ready
    }

    /**
     * Run a callback after the next paint so the UI (e.g. list update) is visible before we show a notification.
     * Use for success notifications that follow state-changing actions (delete, stop, start, etc.).
     * Uses a small timeout to ensure DOM updates are visually complete.
     */
    afterNextPaint(callback) {
        // Use setTimeout instead of RAF to ensure DOM is visually updated
        // 100ms is enough for the DOM to paint but short enough to feel responsive
        setTimeout(() => callback(), 100);
    }

    /**
     * Format a stream start/restart error message, appending capacity info when present from the API.
     * @param {Object} data - API response body
     * @param {string} defaultMsg - Fallback message
     * @returns {string}
     */
    formatStreamError(data, defaultMsg) {
        let msg = (data && (data.error || data.message)) || defaultMsg;
        if (data && data.capacity) {
            const c = data.capacity;
            msg += ` — ${c.activeStreams ?? '?'}/${c.sourceLimit ?? '?'} streams in use`;
            if (c.configPath) msg += ` (config: ${c.configPath})`;
        }
        return msg;
    }

    /**
    /**
     * True if the error is a duplicate name or duplicate source (simple modal, no troubleshooting link).
     */
    isDuplicateError(message) {
        if (!message || typeof message !== 'string') return false;
        const m = message.toLowerCase();
        return /already exists/i.test(m) ||
            /streams in use|source limit|already in use|too many sources|mount.*busy/i.test(m);
    }

    /**
     * Show a simple modal for duplicate name/source errors (no troubleshooting link).
     */
    showDuplicateModal(title, message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
        const safeTitle = title.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
        modal.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 max-w-md mx-4 shadow-xl">
                <div class="flex items-center gap-3 mb-4">
                    <span class="material-symbols-rounded text-amber-500 text-2xl">info</span>
                    <h3 class="text-lg font-semibold text-white">${safeTitle}</h3>
                </div>
                <p data-duplicate-message class="text-gray-300 text-sm mb-6"></p>
                <div class="flex justify-end">
                    <button data-duplicate-ok class="px-4 py-2 btn-glass btn-glass-primary text-white rounded-lg">OK</button>
                </div>
            </div>
        `;
        const msgEl = modal.querySelector('[data-duplicate-message]');
        if (msgEl) msgEl.textContent = message || '';
        document.body.appendChild(modal);
        const ok = modal.querySelector('[data-duplicate-ok]');
        const close = () => modal.remove();
        if (ok) ok.addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    }

    /**
     * Show structured stream error (cause + diagnosis). When API returns diagnosis, shows modal with
     * title, first solutions or link, and expandable Details (description + full solutions).
     * @param {Object} data - API error response { message, error, code?, cause?, diagnosis?, capacity? }
     */
    showStreamError(data) {
        const diagnosis = data && data.diagnosis;
        const title = (diagnosis && diagnosis.title) || data?.error || data?.message || 'Stream failed';
        const linkUrl = TROUBLESHOOTING_GUIDE_URL;
        const linkText = 'troubleshooting guide';

        if (diagnosis && (diagnosis.description || (diagnosis.solutions && diagnosis.solutions.length > 0))) {
            // Structured error: show centred modal with title, short solutions, expandable Details
            const escapedTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const firstSolutions = (diagnosis.solutions || []).slice(0, 2);
            const solutionsHtml = firstSolutions.length
                ? '<p class="text-sm mt-2 text-red-100">' + firstSolutions.map(s => `<span class="block mt-1">• ${String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join('') + '</p>'
                : '';
            const detailsId = 'stream-error-details-' + Date.now();
            const descEscaped = (diagnosis.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            const allSolutions = (diagnosis.solutions || []).map(s => `<li class="mt-1">${String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('');
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60';
            modal.innerHTML = `
                <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-[var(--border-color)] flex items-start gap-3">
                        <span class="material-symbols-rounded text-2xl text-red-400 flex-shrink-0">error</span>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-semibold text-white">${escapedTitle}</h3>
                            ${solutionsHtml}
                            <p class="text-sm mt-2 text-red-200/90">
                                See the <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="underline font-medium hover:opacity-90">${linkText}</a> for more steps.
                            </p>
                        </div>
                        <button class="text-gray-400 hover:text-white transition-colors flex-shrink-0" onclick="this.closest('.fixed').remove()" aria-label="Close">
                            <span class="material-symbols-rounded text-xl">close</span>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 pt-0">
                        <details class="group" id="${detailsId}">
                            <summary class="cursor-pointer text-sm font-medium text-gray-300 hover:text-white py-2 flex items-center gap-2">
                                <span class="material-symbols-rounded text-lg transition-transform group-open:rotate-90">expand_more</span>
                                Details &amp; full solutions
                            </summary>
                            <div class="pl-7 mt-2 text-sm text-gray-300 space-y-2">
                                ${diagnosis.description ? `<p class="text-gray-300">${descEscaped}</p>` : ''}
                                ${allSolutions ? `<ul class="list-disc list-inside">${allSolutions}</ul>` : ''}
                            </div>
                        </details>
                        ${data && data.stderrSnippet ? `
                        <details class="group/tech mt-2">
                            <summary class="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-300 py-2 flex items-center gap-2">
                                <span class="material-symbols-rounded text-sm transition-transform group-open/tech:rotate-90">bug_report</span>
                                Technical details (FFmpeg output)
                            </summary>
                            <pre class="pl-7 mt-2 text-xs text-gray-500 bg-black/30 p-3 rounded overflow-x-auto font-mono">${String(data.stderrSnippet).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        </details>
                        ` : ''}
                        ${data && data.capacity ? `<p class="text-xs text-gray-400 mt-3">Streams in use: ${data.capacity.activeStreams ?? '?'}/${data.capacity.sourceLimit ?? '?'}${data.capacity.configPath ? ' (config: ' + data.capacity.configPath + ')' : ''}</p>` : ''}
                    </div>
                </div>
            `;
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
            document.body.appendChild(modal);
            const timeout = 60000;
            setTimeout(() => { if (modal.parentNode) { modal.style.opacity = '0'; setTimeout(() => modal.remove(), 300); } }, timeout);
            return;
        }

        // Backward compat: no diagnosis — toast with message + link
        this.showNotification(title, 'error', { linkUrl, linkText });
    }

    /**
     * Initialize the FFmpeg Streams Manager
     */
    async init() {
        try {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('FFmpeg streams container not found for ID:', this.containerId);
                return;
            }

            // Load config first to get dynamic Icecast port
            await this.loadConfig();

            // Load initial data
            await this.loadStreams();
            await this.loadAudioDevices();
            
            // Render the component
            this.render();
            
            // Start status polling
            this.startStatusPolling();

            // Start real-time uptime updates
            this.startUptimeUpdates();

            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize FFmpeg Streams Manager:', error);
            this.renderError('Failed to initialize FFmpeg Streams Manager');
        }
    }

    /**
     * Load system config to get dynamic Icecast port
     */
    async loadConfig() {
        try {
            const response = await fetch('/api/system/config');
            if (response.ok) {
                const config = await response.json();
                if (config.icecast?.port) {
                    this.icecastPort = config.icecast.port;
                    console.log('📡 Icecast port loaded from config:', this.icecastPort);
                }
                if (config.host) {
                    this.serverHost = config.host;
                    console.log('🌐 Server host loaded from config:', this.serverHost);
                }
            }
        } catch (error) {
            console.warn('Failed to load config, using default Icecast port:', this.icecastPort);
        }
    }


    /**
     * Load active streams from the API
     */
    async loadStreams() {
        try {
            // Add cache-busting parameter to ensure fresh data
            const response = await fetch(`/api/streams/status?t=${Date.now()}`);
            const data = await response.json();

            console.log('🔄 Loaded streams data:', data); // Debug logging

            // The API returns { total, running, errors, streams } format
            if (data.streams) {
                // Update client timers based on stream status changes
                this.updateClientTimers(data.streams);
                this.activeStreams = data.streams;

                // Debug: Log stream names
                console.log('📋 Stream names:', data.streams.map(s => ({ id: s.id, name: s.name })));
            } else {
                this.activeStreams = [];
            }
        } catch (error) {
            console.error('Failed to load streams:', error);
            this.activeStreams = [];
        }
    }

    /**
     * Load available audio devices
     */
    async loadAudioDevices() {
        try {
            const response = await fetch('/api/system/audio-devices');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();

            // Handle both old format (array) and new format (object with devices array)
            const devices = data.devices || data || [];

            // Ensure devices is an array
            if (!Array.isArray(devices)) {
                console.warn('Invalid response format: devices is not an array', data);
                this.audioDevices = [];
                return;
            }

            // Filter out duplicate devices by name and type
            const uniqueDevices = devices.filter((device, index, self) => {
                return index === self.findIndex(d =>
                    d.name === device.name &&
                    d.deviceType === device.deviceType
                );
            });

            this.audioDevices = uniqueDevices;

            console.log(`Loaded ${this.audioDevices.length} unique audio devices`);
        } catch (error) {
            console.error('Failed to load audio devices:', error);
            this.audioDevices = [];
        }
    }

    /**
     * Refresh audio devices (clear cache and reload)
     */
    async refreshAudioDevices() {
        try {
            this.showNotification('Refreshing audio devices...', 'info');

            const response = await fetch('/api/system/audio-devices?refresh=true');
            
            console.log('Refresh devices response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Refresh devices response data:', data);

            // Handle both old format (array) and new format (object with devices array)
            let devices;
            if (Array.isArray(data)) {
                // Old format: direct array
                devices = data;
                console.log('Using old API format (direct array)');
            } else if (data.success && Array.isArray(data.devices)) {
                // New format: object with success flag
                devices = data.devices;
                console.log('Using new API format (object with success flag)');
            } else {
                throw new Error('Invalid response format: expected array or object with devices array');
            }
            
            // Ensure devices is an array
            if (!Array.isArray(devices)) {
                throw new Error('Invalid response format: devices is not an array');
            }

            // Filter out duplicate devices by name and type
            const uniqueDevices = devices.filter((device, index, self) => {
                return index === self.findIndex(d =>
                    d.name === device.name &&
                    d.deviceType === device.deviceType
                );
            });

            this.audioDevices = uniqueDevices;
            this.render(); // Re-render to update device lists
            this.showNotification(`Audio devices refreshed - ${this.audioDevices.length} devices found`, 'success');
        } catch (error) {
            console.error('Failed to refresh audio devices:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                response: error.response
            });
            this.showNotification(`Failed to refresh audio devices: ${error.message}`, 'error');
        }
    }

    /**
     * Start a new stream
     * @param {Object} streamConfig - Stream configuration
     * @param {HTMLElement} modalToClose - Optional modal element to close on success
     */
    async startStream(streamConfig, modalToClose = null) {
        try {
            // First check if Icecast server is running
            const icecastStatus = await this.checkIcecastStatus();
            if (!icecastStatus.running) {
                this.showNotification('Icecast server is not running. Please start the Icecast server first.', 'error');
                // Re-enable modal button if modal was provided
                if (modalToClose) {
                    const submitBtn = modalToClose.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> 🔴 Go Live';
                        submitBtn.disabled = false;
                    }
                }
                return;
            }

            console.log('Starting stream with config:', streamConfig);

            const response = await fetch('/api/streams/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(streamConfig)
            });

            const data = await response.json();
            console.log('Stream start response:', { status: response.status, ok: response.ok, data });

            if (!response.ok) {
                // Close the add stream modal before showing error modal
                if (modalToClose) {
                    modalToClose.remove();
                }
                this.showStreamError(data);
                return;
            }

            if (data.message === 'Stream started successfully') {
                // Close the add stream modal on success
                if (modalToClose) {
                    modalToClose.remove();
                }
                await this.loadStreams();
                this.render();

                // Generate stream URL and show success message after UI has painted
                const displayHost = this.serverHost || window.location.hostname;
                const streamUrl = `http://${displayHost}:${this.icecastPort}/${streamConfig.id || 'stream'}`;
                this.afterNextPaint(() => this.showNotification(`Stream started successfully! Stream is now available in the list below.`, 'success'));
            } else {
                // Close the add stream modal before showing error modal
                if (modalToClose) {
                    modalToClose.remove();
                }
                this.showStreamError(data);
            }
        } catch (error) {
            console.error('Failed to start stream:', error);
            // Re-enable modal button if modal was provided
            if (modalToClose) {
                const submitBtn = modalToClose.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> 🔴 Go Live';
                    submitBtn.disabled = false;
                }
            }
            const msg = error.message || 'Failed to start stream';
            if (this.isDuplicateError(msg)) {
                this.showDuplicateModal('Stream already exists', msg);
            } else {
                this.showNotification(msg, 'error', {
                    linkUrl: TROUBLESHOOTING_GUIDE_URL,
                    linkText: 'troubleshooting guide'
                });
            }
        }
    }

    /**
     * Check if Icecast server is running
     */
    async checkIcecastStatus() {
        try {
            const response = await fetch('/api/system/icecast-status');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to check Icecast status:', error);
            return { running: false };
        }
    }

    /**
     * Stop a stream
     */
    async stopStream(streamId) {
        try {
            const response = await fetch('/api/streams/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: streamId })
            });

            const data = await response.json();
            
            if (data.message === 'Stream stopped successfully') {
                await this.loadStreams();
                this.render();
                setTimeout(() => this.showNotification('Stream stopped successfully', 'success'), 1000);
            } else {
                throw new Error(data.error || 'Failed to stop stream');
            }
        } catch (error) {
            console.error('Failed to stop stream:', error);
            this.showNotification(`Failed to stop stream: ${error.message}`, 'error');
        }
    }

    /**
     * Start a stopped stream (backend uses existing config)
     */
    async restartStream(streamId) {
        try {
            console.log('Restarting stream:', streamId);

            const response = await fetch('/api/streams/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: streamId })
            });

            const data = await response.json();
            console.log('Stream restart response:', { status: response.status, ok: response.ok, data });

            if (!response.ok) {
                this.showStreamError(data);
                return;
            }

            if (data.message === 'Stream restarted successfully') {
                await this.loadStreams();
                this.render();
                setTimeout(() => this.showNotification('Stream started successfully', 'success'), 1000);
            } else {
                this.showStreamError(data);
            }
        } catch (error) {
            console.error('Failed to restart stream:', error);
            const msg = error.message || 'Failed to restart stream';
            if (this.isDuplicateError(msg)) {
                this.showDuplicateModal('Stream already exists', msg);
            } else {
                this.showNotification(msg, 'error', {
                    linkUrl: TROUBLESHOOTING_GUIDE_URL,
                    linkText: 'troubleshooting guide'
                });
            }
        }
    }

    /**
     * Stop all running streams
     */
    async stopAllStreams() {
        try {
            // Safely filter running streams with null checks
            const runningStreams = (this.activeStreams || []).filter(stream =>
                stream && stream.status === 'running'
            );

            if (runningStreams.length === 0) {
                this.showNotification('No running streams to stop', 'info');
                return;
            }

            const confirmMessage = `Stop all ${runningStreams.length} running streams?`;
            if (!confirm(confirmMessage)) {
                return;
            }

            this.showNotification('Stopping all streams...', 'info');

            const response = await fetch('/api/streams/stop-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data && data.success) {
                await this.loadStreams();
                this.render();
                setTimeout(() => this.showNotification(data.message || 'All streams stopped successfully', 'success'), 1000);
            } else {
                throw new Error(data?.message || data?.error || 'Failed to stop all streams');
            }
        } catch (error) {
            console.error('Failed to stop all streams:', error);
            this.showNotification(`Failed to stop all streams: ${error.message}`, 'error');
        }
    }

    /**
     * Start all stopped (or error) streams
     */
    async startAllStreams() {
        try {
            const stoppedStreams = (this.activeStreams || []).filter(stream =>
                stream && (stream.status === 'stopped' || stream.status === 'error')
            );

            if (stoppedStreams.length === 0) {
                this.showNotification('No stopped streams to start', 'info');
                return;
            }

            const confirmMessage = `Start all ${stoppedStreams.length} stopped streams?`;
            if (!confirm(confirmMessage)) {
                return;
            }

            this.showNotification('Starting all streams...', 'info');

            const response = await fetch('/api/streams/start-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            await this.loadStreams();
            this.render();
            const hasSuccess = data.started > 0;
            const hasFailure = data.failed > 0 && data.results && data.results.length > 0;
            let errorMsg = '';
            let firstErrorRaw = '';
            if (hasFailure) {
                const failed = data.results.filter(r => !r.success);
                firstErrorRaw = failed[0]?.error ? String(failed[0].error) : '';
                const names = failed.map(r => r.name || r.id).slice(0, 5);
                const namesText = failed.length > 5 ? `${names.join(', ')} and ${failed.length - 5} more` : names.join(', ');
                const firstError = failed[0].error ? String(failed[0].error).slice(0, 120) : '';
                errorMsg = firstError
                    ? `${data.failed} failed: ${namesText}. First error: ${firstError}${failed[0].error && failed[0].error.length > 120 ? '…' : ''}`
                    : `${data.failed} failed: ${namesText}. Check stream list.`;
            }
            this.afterNextPaint(() => {
                if (hasSuccess) {
                    this.showNotification(data.message || `Started ${data.started} streams`, 'success');
                    if (hasFailure) {
                        if (this.isDuplicateError(firstErrorRaw)) {
                            setTimeout(() => this.showDuplicateModal('Some streams already exist', errorMsg), 150);
                        } else {
                            setTimeout(() => this.showNotification(errorMsg, 'error'), 150);
                        }
                    }
                } else if (hasFailure) {
                    if (this.isDuplicateError(firstErrorRaw)) {
                        this.showDuplicateModal('Some streams already exist', errorMsg);
                    } else {
                        this.showNotification(errorMsg, 'error');
                    }
                }
            });
        } catch (error) {
            console.error('Failed to start all streams:', error);
            this.showNotification(`Failed to start all streams: ${error.message}`, 'error');
        }
    }

    /**
     * Delete a stream (remove from persistent storage)
     */
    async deleteStream(streamId) {
        try {
            const response = await fetch('/api/streams/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: streamId })
            });

            const result = await response.json();

            if (response.ok) {
                const removed = this.activeStreams.find(s => s.id === streamId);
                const displayName = removed?.name || removed?.config?.name || streamId;

                // Remove from local array
                this.activeStreams = this.activeStreams.filter(s => s.id !== streamId);
                this.render();  // Re-render entire component (updates stats and list)

                // Confirm the stream is really gone before announcing it, then
                // let the row removal paint first — a delayed toast.
                setTimeout(async () => {
                    let reallyGone = true;
                    try {
                        const statusRes = await fetch('/api/streams/status');
                        const statusData = await statusRes.json();
                        reallyGone = !(statusData.streams || []).some(s => s.id === streamId);
                    } catch { /* if the check fails, don't suppress the toast */ }

                    if (reallyGone) {
                        this.afterNextPaint(() => this.showNotification(`Stream "${displayName}" deleted`, 'success'));
                    }
                }, 900);
            } else {
                throw new Error(result.error || 'Failed to delete stream');
            }
        } catch (error) {
            console.error('Failed to delete stream:', error);
            this.showNotification(`Failed to delete stream: ${error.message}`, 'error');
        }
    }

    /**
     * Reorder streams (move up/down). Persists order; listener page uses same order and S1/S2/S3 labels.
     */
    async moveStreamUp(index) {
        if (index <= 0) return;
        await this.reorderStreams(index, index - 1);
    }

    async moveStreamDown(index) {
        if (index >= this.activeStreams.length - 1) return;
        await this.reorderStreams(index, index + 1);
    }

    async reorderStreams(fromIndex, toIndex) {
        try {
            const ids = this.activeStreams.map(s => s.id);
            const [moved] = ids.splice(fromIndex, 1);
            ids.splice(toIndex, 0, moved);
            const response = await fetch('/api/streams/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ streamIds: ids })
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to reorder');
            }
            await this.loadStreams();
            this.render();
            this.showNotification('Stream order updated', 'success');
        } catch (error) {
            console.error('Failed to reorder streams:', error);
            this.showNotification(`Failed to reorder: ${error.message}`, 'error');
        }
    }

    /**
     * Edit a stream (show edit modal)
     */
    async editStream(streamId) {
        try {
            const stream = this.activeStreams.find(s => s.id === streamId);
            if (!stream) {
                this.showNotification('Stream not found', 'error');
                return;
            }

            // Load audio devices for the dropdown
            await this.loadAudioDevices();

            // Create edit modal
            this.showEditModal(stream);
        } catch (error) {
            console.error('Failed to edit stream:', error);
            this.showNotification(`Failed to edit stream: ${error.message}`, 'error');
        }
    }

    /**
     * Show edit modal for stream
     */
    showEditModal(stream) {
        // Create modal backdrop
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/30">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-white">Edit Stream</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white transition-colors">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <form id="editStreamForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Stream Name</label>
                        <div class="relative">
                            <input
                                type="text"
                                id="editStreamName"
                                value="${stream.name || ''}"
                                maxlength="50"
                                class="w-full px-3 py-2 input-glass rounded-lg text-white placeholder-gray-400 transition-colors pr-12"
                                placeholder="Enter stream name"
                                required
                            >
                            <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <span id="edit-stream-name-counter" class="text-xs text-gray-400">${(stream.name || '').length}/50</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Audio Source</label>
                        <select
                            id="editStreamDevice"
                            class="w-full px-3 py-2 bg-[#1a1a1a] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:border-[var(--primary-color)] transition-colors"
                            required
                        >
                            <option value="">Select audio device...</option>
                            ${this.audioDevices.map(device => `
                                <option value="${device.id}" ${device.id === stream.deviceId ? 'selected' : ''}>
                                    ${device.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button
                            type="button"
                            onclick="this.closest('.fixed').remove()"
                            class="flex-1 px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/30 text-gray-300 rounded-lg transition-all duration-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="flex-1 btn-glass btn-glass-secondary"
                        >
                            Update Stream
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup character counter for edit stream name
        const editStreamNameInput = document.getElementById('editStreamName');
        const editStreamNameCounter = document.getElementById('edit-stream-name-counter');
        
        if (editStreamNameInput && editStreamNameCounter) {
            const updateCounter = () => {
                const length = editStreamNameInput.value.length;
                editStreamNameCounter.textContent = `${length}/50`;

                // Change color based on character count
                if (length > 45) {
                    editStreamNameCounter.className = 'text-xs text-red-400';
                } else if (length > 40) {
                    editStreamNameCounter.className = 'text-xs text-yellow-400';
                } else {
                    editStreamNameCounter.className = 'text-xs text-gray-400';
                }
            };
            
            editStreamNameInput.addEventListener('input', updateCounter);
            updateCounter(); // Initial update
        }

        // Handle form submission
        const form = modal.querySelector('#editStreamForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                // Show loading state
                submitBtn.innerHTML = '<span class="material-symbols-rounded animate-spin">refresh</span> Updating...';
                submitBtn.disabled = true;

                const name = document.getElementById('editStreamName').value.trim();
                const deviceId = document.getElementById('editStreamDevice').value;

                if (!name || !deviceId) {
                    throw new Error('Please fill in all fields');
                }

                // Basic sanitization - remove potentially dangerous characters
                const sanitizedName = name.replace(/[<>\"'&]/g, '');

                // Update stream via API
                const response = await fetch('/api/streams/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        streamId: stream.id,
                        name: sanitizedName,
                        deviceId: deviceId
                    })
                });

                const result = await response.json();

                console.log('🔄 Stream update result:', result); // Debug logging

                if (response.ok) {
                    modal.remove();

                    // Force a fresh reload of streams
                    console.log('🔄 Reloading streams after update...');
                    await this.loadStreams();
                    this.render();

                    // Check if stream ID changed (name was updated)
                    if (result.newStreamId && result.newStreamId !== result.oldStreamId) {
                        setTimeout(() => this.showNotification('Stream updated with new URL. Device reset — click Start to begin streaming.', 'success'), 1000);
                    } else {
                        setTimeout(() => this.showNotification('Stream updated. Device reset — click Start to begin streaming.', 'success'), 1000);
                    }
                } else {
                    throw new Error(result.error || 'Failed to update stream');
                }
            } catch (error) {
                // Restore button state on error
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                const msg = error.message || 'Failed to update stream';
                if (this.isDuplicateError(msg)) {
                    this.showDuplicateModal('Stream already exists', msg);
                } else {
                    this.showNotification(`Failed to update stream: ${msg}`, 'error');
                }
            }
        });

        // Close modal on escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.remove();
            }
        });

        // Focus on name input
        setTimeout(() => {
            const nameInput = modal.querySelector('#editStreamName');
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
    }

    /**
     * Copy stream URL to clipboard (with fallback for non-HTTPS)
     */
    async copyStreamUrl(url, button) {
        try {
            // Try modern clipboard API first (requires HTTPS or localhost)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback for HTTP: use textarea + execCommand
                const textArea = document.createElement('textarea');
                textArea.value = url;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (!successful) throw new Error('execCommand failed');
            }
            
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="material-symbols-rounded text-sm">check</span>';
            button.classList.add('text-green-400');
            this.showNotification('Stream URL copied!', 'success');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('text-green-400');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            // Show the URL in a prompt as last resort
            prompt('Copy this URL:', url);
        }
    }

    /**
     * Start status polling
     */
    startStatusPolling() {
        // Poll every 5 seconds for status updates
        this.statusCheckInterval = setInterval(async () => {
            if (this.isInitialized) {
                await this.loadStreams();
                this.render();
            }
        }, 5000);
    }

    /**
     * Stop status polling
     */
    stopStatusPolling() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    /**
     * Start real-time uptime updates (every second)
     */
    startUptimeUpdates() {
        this.uptimeUpdateInterval = setInterval(() => {
            if (this.isInitialized) {
                this.updateUptimeDisplays();
            }
        }, 1000);
    }

    /**
     * Stop uptime updates
     */
    stopUptimeUpdates() {
        if (this.uptimeUpdateInterval) {
            clearInterval(this.uptimeUpdateInterval);
            this.uptimeUpdateInterval = null;
        }
    }

    /**
     * Update client-side timers based on server stream status
     */
    updateClientTimers(serverStreams) {
        serverStreams.forEach(stream => {
            const clientTimer = this.clientTimers.get(stream.id);

            if (stream.status === 'running') {
                if (!clientTimer || !clientTimer.isRunning) {
                    // Stream just started or resumed - start client timer
                    this.clientTimers.set(stream.id, {
                        startTime: Date.now(),
                        isRunning: true
                    });
                    console.log(`Started client timer for stream ${stream.id}`);
                }
            } else {
                if (clientTimer && clientTimer.isRunning) {
                    // Stream stopped - stop client timer
                    this.clientTimers.set(stream.id, {
                        ...clientTimer,
                        isRunning: false
                    });
                    console.log(`Stopped client timer for stream ${stream.id}`);
                }
            }
        });

        // Clean up timers for streams that no longer exist
        const serverStreamIds = new Set(serverStreams.map(s => s.id));
        for (const [streamId] of this.clientTimers) {
            if (!serverStreamIds.has(streamId)) {
                this.clientTimers.delete(streamId);
                console.log(`Cleaned up timer for removed stream ${streamId}`);
            }
        }
    }

    /**
     * Update uptime displays using client-side timers
     */
    updateUptimeDisplays() {
        this.clientTimers.forEach((timer, streamId) => {
            const uptimeElement = document.querySelector(`[data-stream-uptime="${streamId}"]`);
            if (uptimeElement && timer.isRunning) {
                const currentUptime = Date.now() - timer.startTime;
                uptimeElement.textContent = `Uptime: ${this.formatUptime(currentUptime)}`;
            }
        });
    }

    /**
     * Render the component
     */
    render() {
        if (!this.container) {
            console.error('Cannot render: container not found');
            return;
        }

        this.container.innerHTML = `
            <div class="glass-card p-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                            <span class="material-symbols-rounded text-[var(--primary-color)]">radio</span>
                            🎤 Audio Streams
                        </h2>
                        <p class="text-gray-400 text-sm mt-1">Stream audio from any input source to your network</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span class="text-xs font-medium text-green-400">${this.getStreamCountStatus()}</span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button id="refresh-devices-btn" class="copy-btn" title="Refresh devices" aria-label="Refresh audio devices">
                                <span class="material-symbols-rounded text-base">refresh</span>
                            </button>
                            ${this.getRunningStreamsCount() > 0 || this.getStoppedStreamsCount() > 0 ? `
                                <button id="start-stop-all-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-300 border ${this.getRunningStreamsCount() > 0 ? 'text-red-300 bg-red-900/30 hover:bg-red-800/40 border-red-700/50' : 'text-green-300 bg-green-900/30 hover:bg-green-800/40 border-green-700/50'}" title="${this.getRunningStreamsCount() > 0 ? 'Stop All Running Streams' : 'Start All Stopped Streams'}">
                                    <span class="material-symbols-rounded text-sm">${this.getRunningStreamsCount() > 0 ? 'stop' : 'play_arrow'}</span>
                                    ${this.getRunningStreamsCount() > 0 ? 'Stop All' : 'Start All'}
                                </button>
                            ` : ''}
                            <button id="add-stream-btn" class="play-btn" title="Start a new stream" aria-label="Start a new stream">
                                <span class="material-symbols-rounded" style="font-variation-settings: 'FILL' 1;">add</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Streams Content -->
                <div class="space-y-4">
                    ${this.renderStreams()}
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    /**
     * Render active streams (including stopped ones)
     */
    renderStreams() {

        if (this.activeStreams.length === 0) {
            return `
                <div class="text-center py-12 px-6">
                    <div class="mb-6">
                        <div class="w-16 h-16 mx-auto mb-4 bg-[var(--primary-color)]/10 rounded-full flex items-center justify-center">
                            <span class="material-symbols-rounded text-3xl text-[var(--primary-color)]">radio</span>
                        </div>
                        <h3 class="text-xl font-semibold text-white mb-2">Ready to Stream!</h3>
                        <p class="text-gray-400 mb-4">No active streams yet. Start streaming audio from any input source.</p>
                    </div>

                    ${(window.LSNotices && LSNotices.isDismissed('quick-start'))
                        ? `<div class="max-w-md mx-auto">${LSNotices.hiddenStub('quick-start', 'Quick Start')}</div>`
                        : `<div class="glass-card-inset rounded-xl p-6 max-w-md mx-auto relative">
                        <div class="absolute top-2 right-2">${window.LSNotices ? LSNotices.dismissButton('quick-start') : ''}</div>
                        <h4 class="text-white font-medium mb-3">🚀 Quick Start Guide:</h4>
                        <div class="text-left space-y-2 text-sm text-gray-300">
                            <div class="flex items-center gap-2">
                                <span class="w-5 h-5 bg-[var(--primary-color)] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                <span>Click <strong>"🔴 Start New Stream"</strong> above</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-5 h-5 bg-[var(--primary-color)] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                <span>Select your audio input source</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-5 h-5 bg-[var(--primary-color)] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                <span>Click <strong>"Go Live"</strong> to start streaming</span>
                            </div>
                        </div>

                        <div class="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p class="text-xs text-blue-300">
                                💡 <strong>Pro Tip:</strong> Install DVS (Dante Virtual Soundcard) or Virtual Audio Cable to route audio from music players, DJ software, or any application to LANStreamer.
                            </p>
                        </div>
                    </div>` }
                </div>
            `;
        }

        return this.activeStreams.map((stream, index) => {
            // Use client-side timer for uptime calculation
            const clientTimer = this.clientTimers.get(stream.id);
            let uptime = '0s';

            if (clientTimer && clientTimer.isRunning) {
                const currentUptime = Date.now() - clientTimer.startTime;
                uptime = this.formatUptime(currentUptime);
            } else if (stream.status !== 'running') {
                // For stopped streams, show last known uptime or 0
                uptime = '0s';
            }

            const displayHost = this.serverHost || window.location.hostname;
            // Sharing always points at the LISTENER page (not the raw Icecast
            // mount): phones get the proper UI, and the URL survives port changes.
            const serverPort = window.location.port || '3001';
            const listenerUrl = `http://${displayHost}:${serverPort}/streams`;

            // Determine status styling and icon
            let statusColor, statusIcon, statusText, statusBg, errorMessage = '';
            switch (stream.status) {
                case 'running':
                    statusColor = 'text-green-400';
                    statusIcon = 'radio';
                    statusText = 'LIVE';
                    statusBg = 'bg-green-500/10 border-green-500/20';
                    break;
                case 'stopped':
                    statusColor = 'text-gray-400';
                    statusIcon = 'stop_circle';
                    statusText = 'STOPPED';
                    statusBg = 'bg-gray-500/10 border-gray-500/20';
                    break;
                case 'error':
                    statusColor = 'text-red-400';
                    statusIcon = 'error';
                    statusText = 'ERROR';
                    statusBg = 'bg-red-500/10 border-red-500/20';
                    errorMessage = stream.error || 'Stream failed to start';
                    break;
                default:
                    statusColor = 'text-yellow-400';
                    statusIcon = 'help';
                    statusText = 'UNKNOWN';
                    statusBg = 'bg-yellow-500/10 border-yellow-500/20';
            }

            return `
            <div class="stream-row stream-row-admin ${stream.status === 'running' ? 'stream-row-live' : stream.status === 'error' ? 'stream-row-error' : ''}" data-stream-row="${stream.id}" style="flex-wrap:wrap">
                <!-- Reorder (compact, left of badge) -->
                <div class="flex flex-col items-center flex-shrink-0 -my-1">
                    <button type="button" onclick="ffmpegStreamsManager.moveStreamUp(${index})" title="Move up" aria-label="Move ${stream.name || stream.id} up" class="p-0.5 rounded hover:bg-[var(--tok-surface-2,#333)] text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none" ${index === 0 ? 'disabled' : ''}>
                        <span class="material-symbols-rounded text-base">keyboard_arrow_up</span>
                    </button>
                    <button type="button" onclick="ffmpegStreamsManager.moveStreamDown(${index})" title="Move down" aria-label="Move ${stream.name || stream.id} down" class="p-0.5 rounded hover:bg-[var(--tok-surface-2,#333)] text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none" ${index === this.activeStreams.length - 1 ? 'disabled' : ''}>
                        <span class="material-symbols-rounded text-base">keyboard_arrow_down</span>
                    </button>
                </div>

                <div class="channel-badge" aria-hidden="true">${stream.label || 'S' + (index + 1)}</div>

                <div class="flex-1 min-w-0" style="min-width:200px">
                    <div class="stream-name">${stream.name || stream.id}</div>
                    <div class="stream-sub">
                        ${stream.status === 'running' ? `
                            <span class="eq" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
                            <span class="live-chip">Live</span>
                        ` : `
                            <span class="${stream.status === 'error' ? 'text-red-400' : ''}">${statusText}</span>
                        `}
                        <span aria-hidden="true">·</span>
                        <span class="mq" title="${this.getDeviceName(stream.deviceId)}"><span class="mq-inner">${this.getDeviceName(stream.deviceId)}</span></span>
                        <span aria-hidden="true">·</span>
                        <span>${stream.config?.bitrate || '192'} kbps</span>
                        <span aria-hidden="true">·</span>
                        <span class="uptime-chip" title="Uptime" data-stream-uptime="${stream.id}"><span class="material-symbols-rounded text-sm" aria-hidden="true">schedule</span> ${uptime}</span>
                    </div>
                    ${stream.status === 'error' ? `
                        <div class="mt-1.5 text-xs text-red-400/90 leading-relaxed" data-stream-error>${errorMessage} <button type="button" onclick="ffmpegStreamsManager.editStream('${stream.id}')" class="underline hover:text-red-300">Edit</button> to change device, then Start.</div>
                    ` : ''}
                </div>

                <!-- Actions (sharing lives in the header card, not per stream) -->
                <div class="flex items-center gap-1.5 flex-shrink-0">
                    ${stream.status === 'running' ? `
                        <button onclick="ffmpegStreamsManager.stopStream('${stream.id}')" class="play-btn is-playing" title="Stop stream" aria-label="Stop ${stream.name || stream.id}">
                            <span class="material-symbols-rounded">stop</span>
                        </button>
                    ` : `
                        <button onclick="ffmpegStreamsManager.restartStream('${stream.id}')" class="play-btn" title="Start stream" aria-label="Start ${stream.name || stream.id}">
                            <span class="material-symbols-rounded" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                        </button>
                    `}
                    <button onclick="ffmpegStreamsManager.editStream('${stream.id}')" class="copy-btn" title="Edit stream settings" aria-label="Edit ${stream.name || stream.id}">
                        <span class="material-symbols-rounded text-base">edit</span>
                    </button>
                    <button onclick="ffmpegStreamsManager.deleteStream('${stream.id}')" class="copy-btn hover:!text-red-400" title="Delete stream" aria-label="Delete ${stream.name || stream.id}">
                        <span class="material-symbols-rounded text-base">delete</span>
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    /**
     * Check if virtual audio devices are present
     */
    hasVirtualAudioDevices() {
        return this.audioDevices.some(device =>
            device.name.toLowerCase().includes('voicemeeter') ||
            device.name.toLowerCase().includes('vb-audio') ||
            device.name.toLowerCase().includes('dante') ||
            device.name.toLowerCase().includes('dvs') ||
            device.name.toLowerCase().includes('virtual cable')
        );
    }

    /**
     * Render error state
     */
    renderError(message) {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="glass-card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-white">FFmpeg Streams</h2>
                    <div class="group relative flex items-center">
                        <div class="flex items-center gap-2 cursor-pointer">
                            <span class="h-3 w-3 rounded-full bg-red-500"></span>
                            <span class="text-sm font-medium text-gray-300">Error</span>
                        </div>
                    </div>
                </div>
                <div class="text-center py-8">
                    <span class="material-symbols-rounded text-4xl text-red-500 mb-2">error</span>
                    <p class="text-red-400 mb-2">${message}</p>
                    <button onclick="ffmpegStreamsManager.init()" class="btn-glass btn-glass-secondary text-sm">
                        <span class="material-symbols-rounded">refresh</span>
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const addStreamBtn = document.getElementById('add-stream-btn');
        if (addStreamBtn) {
            addStreamBtn.addEventListener('click', () => {
                this.showAddStreamModal();
            });
        }

        const startStopAllBtn = document.getElementById('start-stop-all-btn');
        if (startStopAllBtn) {
            startStopAllBtn.addEventListener('click', () => {
                if (this.getRunningStreamsCount() > 0) {
                    this.stopAllStreams();
                } else {
                    this.startAllStreams();
                }
            });
        }

        const refreshDevicesBtn = document.getElementById('refresh-devices-btn');
        if (refreshDevicesBtn) {
            refreshDevicesBtn.addEventListener('click', () => {
                this.refreshAudioDevices();
            });
        }

        const showTestToolsToggle = document.getElementById('show-test-tools-toggle');
        if (showTestToolsToggle) {
            showTestToolsToggle.addEventListener('change', () => {
                this.showTestTools = showTestToolsToggle.checked;
                this.render();
            });
        }
    }

    /**
     * Show add stream modal with improved UX
     */
    showAddStreamModal() {
        // Create modal for adding new stream
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-card p-6 max-w-lg w-full mx-4">
                <div class="flex items-center gap-3 mb-6">
                    <span class="material-symbols-rounded text-2xl text-[var(--primary-color)]">radio</span>
                    <h3 class="text-xl font-bold text-white">🎤 Start New Audio Stream</h3>
                </div>

                <div class="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div class="flex items-start gap-2">
                        <span class="material-symbols-rounded text-blue-400 text-lg mt-0.5">info</span>
                        <div class="text-sm">
                            <p class="text-blue-300 font-medium">Quick Start</p>
                            <p class="text-blue-200/80">Select your audio input source and click "Go Live" to start streaming immediately.</p>
                        </div>
                    </div>
                </div>

                <form id="add-stream-form">
                    <div class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <span class="material-symbols-rounded text-sm mr-1">label</span>
                                Stream Name
                            </label>
                            <div class="relative">
                                <input type="text"
                                       id="stream-name"
                                       maxlength="50"
                                       class="w-full input-glass text-white text-sm rounded-md focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] block px-3 py-2.5 pr-12"
                                       placeholder="e.g., Main Room Audio, DJ Mix, Podcast"
                                       required>
                                <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <span id="stream-name-counter" class="text-xs text-gray-400">0/50</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <span class="material-symbols-rounded text-sm mr-1">mic</span>
                                Audio Input Source
                                <button type="button" id="audio-source-info" class="text-gray-400 hover:text-white ml-1 align-middle" aria-label="Audio source tips">
                                    <span class="material-symbols-rounded text-base">info</span>
                                </button>
                            </label>
                            <div id="audio-source-info-pop" class="hidden mb-2 p-3 rounded-lg border border-[var(--tok-line-strong,#2F2F2F)] bg-[var(--tok-surface-2,#1A1A1A)] text-xs text-gray-300 leading-relaxed">
                                <p class="mb-1"><strong>Routing app audio into LANStreamer:</strong> install DVS (Dante Virtual Soundcard) or VB-Audio Virtual Cable, then pick it above.</p>
                                <p><strong>Virtual devices disappearing?</strong> Driver restarts can drop them — restart your virtual audio software or click Refresh Devices.</p>
                                <p class="mt-1">Full guide: <a class="underline hover:text-white" href="/manual-setup/README.md" target="_blank" rel="noopener">manual setup docs</a></p>
                            </div>
                            <select id="stream-device" class="w-full input-glass text-white text-sm rounded-md focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] block px-3 py-2.5" required>
                                <option value="">🎯 Select your audio source...</option>
                                ${this.audioDevices.map(device => `
                                    <option value="${device.id}">
                                        ${device.virtual ? '🔗' : '🎤'} ${device.name}
                                        ${device.fallback ? ' (Fallback)' : ''}
                                        ${device.virtual ? ' (Virtual)' : ''}
                                    </option>
                                `).join('')}
                            </select>
                            ${this.showTestTools ? `
                                <div class="mt-2">
                                    <button type="button" id="test-source-btn" class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-amber-300 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 transition-all duration-300" title="Test if the selected source is available">
                                        <span class="material-symbols-rounded text-sm">science</span>
                                        Test source
                                    </button>
                                </div>
                            ` : ''}
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <span class="material-symbols-rounded text-sm mr-1">high_quality</span>
                                Stream Quality
                            </label>
                            <select id="stream-bitrate" class="w-full input-glass text-white text-sm rounded-md focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] block px-3 py-2.5">
                                <option value="128">🎵 128 kbps - Good (smaller file size)</option>
                                <option value="192" selected>🎶 192 kbps - High Quality (recommended)</option>
                                <option value="256">🎼 256 kbps - Very High Quality</option>
                                <option value="320">🎹 320 kbps - Maximum Quality</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex gap-3 mt-8">
                        <button type="submit" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white bg-[var(--live-color)] hover:bg-[var(--live-color)]/80 transition-all duration-300 shadow-lg">
                            <span class="material-symbols-rounded">play_arrow</span>
                            🔴 Go Live
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white bg-gray-600 hover:bg-gray-700 transition-all duration-300">
                            <span class="material-symbols-rounded">close</span>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Audio source info popover (guidance lives here instead of cluttering the form)
        const infoBtn = document.getElementById('audio-source-info');
        const infoPop = document.getElementById('audio-source-info-pop');
        if (infoBtn && infoPop) {
            infoBtn.addEventListener('click', () => infoPop.classList.toggle('hidden'));
        }

        // Test source button (only present when showTestTools is true)
        const testSourceBtn = document.getElementById('test-source-btn');
        if (testSourceBtn) {
            testSourceBtn.addEventListener('click', async () => {
                const deviceSelect = document.getElementById('stream-device');
                const deviceId = deviceSelect ? deviceSelect.value : '';
                if (!deviceId) {
                    this.showNotification('Select an audio source first', 'info');
                    return;
                }
                try {
                    testSourceBtn.disabled = true;
                    testSourceBtn.innerHTML = '<span class="material-symbols-rounded text-sm animate-spin">refresh</span> Testing...';
                    const response = await fetch('/api/system/audio-devices/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deviceId })
                    });
                    const data = await response.json();
                    if (data.accessible) {
                        this.showNotification(`Source OK: ${data.deviceName || deviceId}`, 'success');
                    } else {
                        this.showNotification(`Source not available: ${data.reason || 'Unknown reason'}`, 'error');
                    }
                } catch (err) {
                    this.showNotification(`Test failed: ${err.message || 'Network error'}`, 'error');
                } finally {
                    if (testSourceBtn) {
                        testSourceBtn.disabled = false;
                        testSourceBtn.innerHTML = '<span class="material-symbols-rounded text-sm">science</span> Test source';
                    }
                }
            });
        }

        // Setup character counter for stream name
        const streamNameInput = document.getElementById('stream-name');
        const streamNameCounter = document.getElementById('stream-name-counter');
        
        if (streamNameInput && streamNameCounter) {
            const updateCounter = () => {
                const length = streamNameInput.value.length;
                streamNameCounter.textContent = `${length}/50`;

                // Change color based on character count
                if (length > 45) {
                    streamNameCounter.className = 'text-xs text-red-400';
                } else if (length > 40) {
                    streamNameCounter.className = 'text-xs text-yellow-400';
                } else {
                    streamNameCounter.className = 'text-xs text-gray-400';
                }
            };
            
            streamNameInput.addEventListener('input', updateCounter);
            updateCounter(); // Initial update
        }

        // Handle form submission
        const form = modal.querySelector('#add-stream-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            // Show loading state
            submitBtn.innerHTML = `
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Starting Stream...
            `;
            submitBtn.disabled = true;

            try {
                const streamName = document.getElementById('stream-name').value.trim();

                // Basic sanitization - remove potentially dangerous characters
                const sanitizedName = streamName.replace(/[<>\"'&]/g, '');

                // Generate clean stream ID from name
                const cleanId = sanitizedName
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                    .replace(/\s+/g, '_') // Replace spaces with underscores
                    .substring(0, 20); // Limit length

                // Use name-based ID with timestamp for uniqueness
                const streamId = cleanId ? `${cleanId}_${Date.now()}` : this.generateUniqueStreamId();

                const streamConfig = {
                    name: sanitizedName,
                    deviceId: document.getElementById('stream-device').value,
                    bitrate: parseInt(document.getElementById('stream-bitrate').value),
                    id: streamId
                };

                // Don't remove modal yet - let startStream handle it on success
                await this.startStream(streamConfig, modal);
            } catch (error) {
                // Restore button state on error
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                this.showNotification(error.message || 'Failed to start stream', 'error', {
                    linkUrl: TROUBLESHOOTING_GUIDE_URL,
                    linkText: 'troubleshooting guide'
                });
            }
        });

        // Close modal on escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.remove();
            }
        });

        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Get device name from device ID
     */
    getDeviceName(deviceId) {
        const device = this.audioDevices.find(d => d.id === deviceId);
        if (device) {
            const icon = device.virtual ? '🔗' : '🎤';
            return `${icon} ${device.name}`;
        }
        return `🎤 ${deviceId || 'Unknown Device'}`;
    }

    /**
     * Format uptime duration
     */
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Show notification. For stream errors, pass options.linkUrl to show a short message + link to the troubleshooting guide.
     * @param {string} message - Message text
     * @param {string} type - 'info' | 'success' | 'error'
     * @param {{ linkUrl?: string, linkText?: string }} options - Optional; linkUrl + linkText show "See the [link] for steps."
     */
    showNotification(message, type = 'info', options = {}) {
        const { linkUrl, linkText = 'troubleshooting guide' } = options;
        const useErrorWithLink = type === 'error' && linkUrl;

        // For stream errors with link, always use our own toast (short message + link)
        if (useErrorWithLink) {
            const escaped = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="underline font-medium hover:opacity-90">${linkText}</a>`;
            const content = `${escaped}<br><br>See the ${linkHtml} for steps.`;
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-5 rounded-xl shadow-2xl transition-all duration-300 max-w-md bg-red-700 text-white';
            toast.innerHTML = `
                <div class="flex items-start gap-3">
                    <span class="material-symbols-rounded text-xl mt-0.5 flex-shrink-0">error</span>
                    <div class="flex-1 min-w-0 text-sm leading-relaxed">${content}</div>
                    <button class="text-white/80 hover:text-white transition-colors flex-shrink-0 ml-2" onclick="this.closest('.fixed').remove()">
                        <span class="material-symbols-rounded text-xl">close</span>
                    </button>
                </div>
            `;
            document.body.appendChild(toast);
            const timeout = 60000;
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, timeout);
            return;
        }

        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            const maxWidth = type === 'error' ? 'max-w-3xl' : 'max-w-md';
            const toast = document.createElement('div');
            toast.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-5 rounded-xl shadow-2xl transition-all duration-300 ${maxWidth} ${
                type === 'success' ? 'bg-green-600 text-white' :
                type === 'error' ? 'bg-red-700 text-white' :
                'bg-blue-600 text-white'
            }`;
            const formattedMessage = type === 'error'
                ? `<pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed max-h-96 overflow-y-auto">${String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
                : `<span class="flex-1">${String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
            toast.innerHTML = `
                <div class="flex items-start gap-3">
                    <span class="material-symbols-rounded text-xl mt-0.5 flex-shrink-0">
                        ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
                    </span>
                    <div class="flex-1 min-w-0">${formattedMessage}</div>
                    <button class="text-white/80 hover:text-white transition-colors flex-shrink-0 ml-2" onclick="this.parentElement.parentElement.remove()">
                        <span class="material-symbols-rounded text-xl">close</span>
                    </button>
                </div>
            `;
            document.body.appendChild(toast);
            const timeout = type === 'error' ? 60000 : 4000;
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, timeout);
        }
    }

    /**
     * Get stream count status for display
     */
    getStreamCountStatus() {
        if (!this.activeStreams || this.activeStreams.length === 0) {
            return 'FFmpeg Ready';
        }

        const totalStreams = this.activeStreams.length;
        const liveStreams = this.activeStreams.filter(stream => stream.status === 'running').length;

        return `${liveStreams}/${totalStreams} Live`;
    }

    /**
     * Get count of running streams
     */
    getRunningStreamsCount() {
        if (!this.activeStreams) return 0;
        return this.activeStreams.filter(stream => stream.status === 'running').length;
    }

    getStoppedStreamsCount() {
        if (!this.activeStreams) return 0;
        return this.activeStreams.filter(stream => stream.status === 'stopped' || stream.status === 'error').length;
    }

    /**
     * Generate unique stream ID using crypto API for better uniqueness
     */
    generateUniqueStreamId() {
        // Use crypto.randomUUID if available (modern browsers)
        if (crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // Fallback to timestamp + random for older browsers
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        const extraRandom = Math.random().toString(36).substring(2, 15);

        return `stream-${timestamp}-${randomPart}-${extraRandom}`;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopStatusPolling();
        this.stopUptimeUpdates();
        this.clientTimers.clear();
        this.isInitialized = false;
    }
}

// Make the class available globally for ComponentManager
window.FFmpegStreamsManager = FFmpegStreamsManager;

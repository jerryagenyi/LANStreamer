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

        // List filter (all / live / err) — segmented control in the toolbar
        this.streamFilter = 'all';

        // Close any open ⋯ menu when clicking elsewhere (delegated, once)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu')) {
                document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open'));
            }
        });

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

        // Every stream start/restart failure also lands in the notification bell
        if (window.LSNotifications) {
            LSNotifications.notify({
                title,
                message: 'Stream could not be started. Open the row details for the cause.',
                type: 'error'
            });
        }

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
                                Open the <a href="/docs" target="_blank" rel="noopener" class="underline font-medium hover:opacity-90">in-app guide</a> or the <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="underline font-medium hover:opacity-90">full ${linkText}</a> for more steps.
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

                // Feed the notification bell when a running stream lands in error
                if (window.LSNotifications && Array.isArray(this.activeStreams)) {
                    data.streams.forEach(next => {
                        const prev = this.activeStreams.find(s => s.id === next.id);
                        if (prev && prev.status === 'running' && next.status === 'error') {
                            LSNotifications.notify({
                                title: `Stream "${next.name || next.id}" stopped with an error`,
                                message: next.errorShort || 'Check the row details for the cause.',
                                type: 'error'
                            });
                        }
                    });
                }

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
                signal: AbortSignal.timeout(25000),
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
                    signal: AbortSignal.timeout(15000),
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
                signal: AbortSignal.timeout(25000),
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
            if (window.LSNotifications) {
                LSNotifications.notify({
                    title: error.shortMessageHint || `Could not start "${streamId}"`,
                    message: (error.message || '').split('\n')[0],
                    type: 'error'
                });
            }
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
                    signal: AbortSignal.timeout(15000),
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
                            style="height:40px;padding:0 12px;border-radius:10px;background:var(--tok-surface-inset);border:1px solid var(--tok-line-strong);color:var(--tok-text-1);font:inherit;font-size:14px;width:100%;"
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
                    signal: AbortSignal.timeout(25000),
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
     * Render the component. Skips the DOM rewrite when the visible data is
     * unchanged (`force` overrides): re-rendering on every 5s poll closes any
     * open "⋯" menu and makes the row actions flicker.
     */
    render(force = false) {
        if (!this.container) {
            console.error('Cannot render: container not found');
            return;
        }

        const signature = JSON.stringify(this.activeStreams.map(s =>
            [s.id, s.status, s.name, s.label, s.deviceId, s.config?.bitrate, s.errorShort]
        ));
        if (!force && signature === this._listSignature) return;
        this._listSignature = signature;

        const total = this.activeStreams.length;
        const live = this.getRunningStreamsCount();
        const issues = this.activeStreams.filter(s => s.status === 'error').length;

        this.container.innerHTML = `
            <div class="glass-card" style="padding:0;">
                <!-- Toolbar: title + filters + actions -->
                <div style="display:flex;align-items:center;gap:8px;padding:14px 18px;border-bottom:1px solid var(--tok-line);flex-wrap:wrap;">
                    <h2 style="font-size:16px;font-weight:600;color:var(--tok-text-1);margin-right:auto;">Streams</h2>
                    <div class="seg" role="group" aria-label="Filter streams" id="stream-filter">
                        <button type="button" data-f="all" aria-pressed="${this.streamFilter === 'all'}">All ${total}</button>
                        <button type="button" data-f="live" aria-pressed="${this.streamFilter === 'live'}">Live${live ? ' · ' + live : ''}</button>
                        <button type="button" data-f="err" aria-pressed="${this.streamFilter === 'err'}">Issues${issues ? ' · ' + issues : ''}</button>
                    </div>
                    ${(live > 0 || this.getStoppedStreamsCount() > 0) && total > 0 ? `
                        <button id="start-stop-all-btn" class="btn btn-ghost" style="height:30px;padding:0 10px;font-size:13px;" title="${live > 0 ? 'Stop all running streams' : 'Start all stopped streams'}">
                            <span class="material-symbols-rounded text-sm">${live > 0 ? 'stop' : 'play_arrow'}</span>
                            ${live > 0 ? 'Stop all' : 'Start all'}
                        </button>
                    ` : ''}
                    <button id="refresh-devices-btn" class="iconbtn" title="Refresh devices" aria-label="Refresh audio devices" style="width:30px;height:30px;">
                        <span class="material-symbols-rounded text-base">refresh</span>
                    </button>
                    <button id="add-stream-btn" class="btn btn-primary" style="height:32px;" title="Create a new stream">
                        <span class="material-symbols-rounded text-base">add</span>
                        New stream
                    </button>
                </div>

                <!-- Grouped, filterable list -->
                <div class="list" id="streams-list-admin">
                    ${this.renderStreams()}
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    /** One-line plain-language fix hint for a failed stream (under the error title). */
    errorHint(stream) {
        const s = `${stream.errorShort || ''} ${stream.error || ''}`;
        if (/busy|already used by/i.test(s)) return 'Stop the other stream first, or edit this one to use a different input.';
        if (/could not be opened|not found|device/i.test(s)) return 'The device is missing or held by another app — reconnect it or pick a different input.';
        if (/icecast|connect/i.test(s)) return 'Check the Icecast panel — it may need a start or restart.';
        return 'Open the details for the full diagnostic.';
    }

    /** Copy the listener page URL (share target is always the page, not the mount). */
    copyListenerUrl() {
        const displayHost = this.serverHost || window.location.hostname;
        const url = `http://${displayHost}:${window.location.port || '3001'}/streams`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => this.showNotification('Listener link copied', 'success', { tag: 'copy' }))
                .catch(() => window.prompt('Copy this link:', url));
        } else {
            window.prompt('Copy this link:', url);
        }
    }

    /** Duplicate a stream config as a new stopped stream ("(copy)" name). */
    async duplicateStream(streamId) {
        const src = this.activeStreams.find(s => s.id === streamId);
        if (!src) return;
        try {
            const response = await fetch('/api/streams/create', {
                signal: AbortSignal.timeout(15000),
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${src.name || streamId} (copy)`,
                    deviceId: src.deviceId,
                    bitrate: src.config?.bitrate || 192,
                    autoStart: false
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to duplicate');
            this.showNotification(`Duplicated as "${data.stream.name}" (stopped)`, 'success');
            await this.loadStreams();
            this.render();
        } catch (error) {
            this.showNotification(`Duplicate failed: ${error.message}`, 'error');
        }
    }

    /**
     * Render active streams (including stopped ones)
     */
    /**
     * Render streams grouped (On air / Ready) and filtered (all/live/issues)
     */
    renderStreams() {
        if (this.activeStreams.length === 0) {
            return this.renderEmptyState();
        }

        const visible = this.activeStreams.filter(s =>
            this.streamFilter === 'all' ||
            (this.streamFilter === 'live' ? s.status === 'running' : s.status === 'error')
        );
        if (visible.length === 0) {
            return `<p style="padding:32px 18px;text-align:center;color:var(--tok-text-2);">Nothing here.</p>`;
        }

        const liveRows = visible.filter(s => s.status === 'running');
        const restRows = visible.filter(s => s.status !== 'running');
        let html = '';
        if (liveRows.length > 0) {
            html += `<div class="group-label tok-label">On air · ${liveRows.length}</div>`;
            html += liveRows.map(s => this.renderAdminRow(s)).join('');
        }
        if (restRows.length > 0) {
            html += `<div class="group-label tok-label">${this.streamFilter === 'err' ? 'Issues' : 'Ready'} · ${restRows.length}</div>`;
            html += restRows.map(s => this.renderAdminRow(s)).join('');
        }
        return html;
    }

    /** Friendly 3-step empty state (replaces the old Quick Start notice). */
    renderEmptyState() {
        return `
            <div style="padding:48px 24px;text-align:center;">
                <img src="/assets/logo-mark.svg" alt="" style="width:48px;height:48px;margin:0 auto 16px;display:block;">
                <h3 style="font-size:20px;color:var(--tok-text-1);">No streams yet</h3>
                <p style="margin-top:6px;color:var(--tok-text-2);">Pick an audio input, name it, and go live — listeners on your Wi-Fi hear it instantly.</p>
                <div style="display:inline-flex;gap:24px;margin:20px 0;flex-wrap:wrap;justify-content:center;">
                    <span style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--tok-text-2);"><span class="mono" style="width:24px;height:24px;border-radius:50%;background:var(--tok-accent-soft);color:var(--tok-accent);display:grid;place-items:center;">1</span>New stream</span>
                    <span style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--tok-text-2);"><span class="mono" style="width:24px;height:24px;border-radius:50%;background:var(--tok-accent-soft);color:var(--tok-accent);display:grid;place-items:center;">2</span>Choose input</span>
                    <span style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--tok-text-2);"><span class="mono" style="width:24px;height:24px;border-radius:50%;background:var(--tok-accent-soft);color:var(--tok-accent);display:grid;place-items:center;">3</span>Go live</span>
                </div>
                <div><button type="button" class="btn btn-primary" onclick="ffmpegStreamsManager.openDrawer()"><span class="material-symbols-rounded text-base">add</span>Create first stream</button></div>
                <p style="font-size:13px;margin-top:20px;color:var(--tok-text-3);">Tip: route app audio with VB-Audio Cable or Dante Virtual Soundcard.</p>
            </div>
        `;
    }

    /** One admin stream row (designer anatomy: badge · name/meta · play + ⋯ menu). */
    renderAdminRow(stream) {
        const index = this.activeStreams.indexOf(stream);
        const live = stream.status === 'running';
        const err = stream.status === 'error';

        const clientTimer = this.clientTimers.get(stream.id);
        let uptime = '0s';
        if (clientTimer && clientTimer.isRunning) {
            uptime = this.formatUptime(Date.now() - clientTimer.startTime);
        }

        const statusChip = live
            ? `<span class="chip chip-live"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>LIVE</span>`
            : err
                ? `<span class="chip chip-err"><span class="pip" aria-hidden="true"></span>ERROR</span>`
                : `<span class="chip chip-off">Stopped</span>`;

        const deviceName = this.getDeviceName(stream.deviceId);
        const metaExtras = live
            ? `<span class="dotsep" aria-hidden="true"></span><span class="mono" data-stream-uptime="${stream.id}">${uptime}</span>`
            : '';

        const errBox = err ? `
            <div class="errbox">
                <b>${this.escapeHtml(stream.errorShort || 'Stream failed to start')}</b>
                <span class="grow">${this.escapeHtml(this.errorHint(stream))}</span>
                <button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:13px;" onclick="ffmpegStreamsManager.editStream('${stream.id}')">Change input</button>
                <button type="button" class="btn btn-ghost" style="height:30px;padding:0 10px;font-size:13px;" onclick="ffmpegStreamsManager.restartStream('${stream.id}')">Retry</button>
                <details style="width:100%;">
                    <summary style="cursor:pointer;color:var(--tok-text-3);font-size:12px;">Full diagnostic</summary>
                    <div class="stream-error-detail" style="margin-top:8px;">${this.escapeHtml(stream.error || '')}
<a href="/docs" target="_blank" rel="noopener">Open troubleshooting guide</a></div>
                </details>
            </div>
        ` : '';

        return `
            <div class="arow ${live ? 'is-live' : ''} ${err ? 'is-err' : ''}" data-stream-row="${stream.id}">
                <span class="sid2" aria-hidden="true">${stream.label || 'S' + (index + 1)}</span>
                <div style="min-width:0;">
                    <div class="name">${this.escapeHtml(stream.name || stream.id)}</div>
                    <div class="meta">
                        ${statusChip}
                        <span class="src" title="${this.escapeHtml(deviceName)}">
                            <span class="material-symbols-rounded" style="font-size:13px;" aria-hidden="true">mic</span>${this.escapeHtml(deviceName)}
                        </span>
                        <span class="dotsep" aria-hidden="true"></span>
                        <span class="mono">${stream.config?.bitrate || 192}k</span>
                        ${metaExtras}
                    </div>
                </div>
                <div class="rowactions">
                    ${live ? `
                        <button class="playbtn stop" onclick="ffmpegStreamsManager.stopStream('${stream.id}')" title="Stop stream" aria-label="Stop ${this.escapeHtml(stream.name || stream.id)}">
                            <span class="material-symbols-rounded" style="font-size:16px;">stop</span>
                        </button>
                    ` : `
                        <button class="playbtn" onclick="ffmpegStreamsManager.restartStream('${stream.id}')" title="${err ? 'Retry start' : 'Go live'}" aria-label="${err ? 'Retry' : 'Go live'} ${this.escapeHtml(stream.name || stream.id)}">
                            <span class="material-symbols-rounded" style="font-size:18px;font-variation-settings:'FILL' 1;">play_arrow</span>
                        </button>
                    `}
                    <div class="menu">
                        <button class="iconbtn" style="width:36px;height:36px;" title="More actions" aria-label="More actions for ${this.escapeHtml(stream.name || stream.id)}" onclick="this.parentNode.classList.toggle('open')">
                            <span class="material-symbols-rounded text-base">more_vert</span>
                        </button>
                        <div class="menu-pop">
                            <button type="button" onclick="ffmpegStreamsManager.copyListenerUrl()"><span class="material-symbols-rounded text-base">link</span>Copy listener link</button>
                            <button type="button" onclick="ffmpegStreamsManager.editStream('${stream.id}')"><span class="material-symbols-rounded text-base">edit</span>Edit</button>
                            <button type="button" onclick="ffmpegStreamsManager.moveStreamUp(${index})" ${index === 0 ? 'disabled style="opacity:.4;"' : ''}><span class="material-symbols-rounded text-base">keyboard_arrow_up</span>Move up</button>
                            <button type="button" onclick="ffmpegStreamsManager.moveStreamDown(${index})" ${index === this.activeStreams.length - 1 ? 'disabled style="opacity:.4;"' : ''}><span class="material-symbols-rounded text-base">keyboard_arrow_down</span>Move down</button>
                            <button type="button" onclick="ffmpegStreamsManager.duplicateStream('${stream.id}')"><span class="material-symbols-rounded text-base">content_copy</span>Duplicate</button>
                            <button type="button" class="del" onclick="ffmpegStreamsManager.deleteStream('${stream.id}')"><span class="material-symbols-rounded text-base">delete</span>Delete</button>
                        </div>
                    </div>
                </div>
                ${errBox}
            </div>
        `;
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
                this.openDrawer();
            });
        }

        // Segmented filter (All / Live / Issues)
        const filterGroup = document.getElementById('stream-filter');
        if (filterGroup) {
            filterGroup.querySelectorAll('button[data-f]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.streamFilter = btn.getAttribute('data-f');
                    this.render(true); // filter change must repaint even with identical data
                });
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

    /** Open the new-stream side drawer. */
    openDrawer() {
        this.showAddStreamModal();
    }

    /**
     * Show add stream modal with improved UX
     */
    /**
     * New-stream side drawer (designer P3): source cards annotated with the
     * stream already using them, purpose-based quality, auto-start switch, and
     * explicit Save (stopped) vs Go live. Replaces the centred modal.
     */
    showAddStreamModal() {
        // Rebuild drawer markup each open (state is cheap, stale state is not)
        let root = document.getElementById('stream-drawer-root');
        if (root) root.remove();

        root = document.createElement('div');
        root.id = 'stream-drawer-root';

        // Source cards: known devices + any device referenced by an existing
        // stream but missing from the system (greyed out — the OBS case).
        const usedBy = {};
        this.activeStreams.forEach(s => {
            if (s.status === 'running' && s.deviceId) {
                usedBy[s.deviceId] = usedBy[s.deviceId] || [];
                usedBy[s.deviceId].push(s.label || s.name || s.id);
            }
        });
        const knownIds = new Set(this.audioDevices.map(d => d.id));
        const missingDevices = [...new Set(
            this.activeStreams.map(s => s.deviceId).filter(id => id && !knownIds.has(id))
        )];

        // Source options as a dropdown (compact — no need to see every device at once)
        const sourceOptions = [
            `<option value="">Select an audio source…</option>`,
            ...this.audioDevices.map(d => {
                const used = usedBy[d.id];
                const label = used
                    ? `${d.name} — used by ${used.join(', ')}`
                    : `${d.name}${d.virtual ? ' (virtual)' : ''}`;
                return `<option value="${this.escapeHtml(d.id)}">${this.escapeHtml(label)}</option>`;
            }),
            ...missingDevices.map(id =>
                `<option value="" disabled>${this.escapeHtml(id)} — MISSING (not detected)</option>`)
        ].join('');

        root.innerHTML = `
            <div class="scrim" id="drawer-scrim"></div>
            <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
                <div style="display:flex;align-items:center;gap:10px;padding:18px 20px;border-bottom:1px solid var(--tok-line);">
                    <h2 id="drawer-title" style="font-size:17px;font-weight:600;color:var(--tok-text-1);">New stream</h2>
                    <span style="flex:1;"></span>
                    <button type="button" class="iconbtn" id="drawer-close" aria-label="Close drawer" title="Close">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <form class="drawer-b" id="drawer-form" onsubmit="event.preventDefault();">
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <label for="stream-name" style="font-size:13px;font-weight:600;color:var(--tok-text-1);">Name</label>
                        <input id="stream-name" maxlength="50" placeholder="e.g. Main Room English" required
                               style="height:40px;padding:0 12px;border-radius:10px;background:var(--tok-surface-inset);border:1px solid var(--tok-line-strong);color:var(--tok-text-1);font:inherit;font-size:14px;width:100%;">
                        <span class="hint" style="font-size:12px;color:var(--tok-text-3);">Listeners see this. Use the room or language.</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <label for="stream-device" style="font-size:13px;font-weight:600;color:var(--tok-text-1);">Audio input</label>
                        <select id="stream-device" style="height:40px;padding:0 12px;border-radius:10px;background:var(--tok-surface-inset);border:1px solid var(--tok-line-strong);color:var(--tok-text-1);font:inherit;font-size:14px;width:100%;">${sourceOptions}</select>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <label style="font-size:13px;font-weight:600;color:var(--tok-text-1);">Quality</label>
                        <div class="quality">
                            <label><input type="radio" name="drawer-q" value="96"><b>96</b>kbps · Speech</label>
                            <label><input type="radio" name="drawer-q" value="128"><b>128</b>kbps · Standard</label>
                            <label><input type="radio" name="drawer-q" value="192" checked><b>192</b>kbps · Music</label>
                        </div>
                        <span class="hint" style="font-size:12px;color:var(--tok-text-3);">192 kbps is recommended for music; 96 is plenty for spoken translation.</span>
                    </div>
                    <label style="display:flex;align-items:center;gap:10px;font-size:14px;color:var(--tok-text-1);cursor:pointer;">
                        <button type="button" class="switch" id="drawer-autostart" role="switch" aria-checked="false" aria-label="Start automatically when LANStreamer launches"></button>
                        Start automatically when LANStreamer launches
                    </label>
                </form>
                <div class="drawer-f">
                    <button type="button" class="btn btn-ghost" id="drawer-cancel">Cancel</button>
                    <button type="button" class="btn btn-secondary" id="drawer-save">Save</button>
                    <button type="button" class="btn btn-primary" id="drawer-golive"><span class="material-symbols-rounded text-base">play_arrow</span>Go live</button>
                </div>
            </aside>
        `;
        document.body.appendChild(root);
        requestAnimationFrame(() => document.body.classList.add('drawer-open'));

        const close = () => {
            document.body.classList.remove('drawer-open');
            setTimeout(() => root.remove(), 250);
            document.removeEventListener('keydown', escHandler);
        };
        root.querySelector('#drawer-close').addEventListener('click', close);
        root.querySelector('#drawer-cancel').addEventListener('click', close);
        root.querySelector('#drawer-scrim').addEventListener('click', close);
        root.querySelector('#drawer-autostart').addEventListener('click', function () {
            this.setAttribute('aria-checked', this.getAttribute('aria-checked') !== 'true');
        });
        const escHandler = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', escHandler);

        // Name counter hint tints as the limit approaches
        const nameInput = root.querySelector('#stream-name');
        const hint = root.querySelector('#drawer-form .hint');
        nameInput.addEventListener('input', () => {
            const n = nameInput.value.length;
            hint.style.color = n > 45 ? 'var(--tok-danger)' : n > 40 ? 'var(--tok-warning)' : 'var(--tok-text-3)';
        });
        setTimeout(() => nameInput.focus(), 300);

        const collect = () => {
            const name = nameInput.value.trim().replace(/[<>"'&]/g, '');
            const deviceId = root.querySelector('#stream-device')?.value || '';
            const bitrate = parseInt(root.querySelector('input[name="drawer-q"]:checked')?.value || '192', 10);
            const autoStart = root.querySelector('#drawer-autostart').getAttribute('aria-checked') === 'true';
            if (!name || !deviceId) {
                this.showNotification('Give the stream a name and pick an audio input.', 'warning');
                return null;
            }
            const cleanId = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 20);
            return {
                name,
                deviceId,
                bitrate,
                autoStart,
                id: cleanId ? `${cleanId}_${Date.now()}` : this.generateUniqueStreamId()
            };
        };

        // Save: create as stopped (appears instantly in the Ready group)
        root.querySelector('#drawer-save').addEventListener('click', async () => {
            const config = collect();
            if (!config) return;
            try {
                const response = await fetch('/api/streams/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to save');
                this.showNotification(`Saved "${data.stream.name}" (stopped)`, 'success');
                close();
                await this.loadStreams();
                this.render();
            } catch (error) {
                this.showNotification(`Save failed: ${error.message}`, 'error');
            }
        });

        // Go live: create + start immediately (reuses the hardened start path)
        root.querySelector('#drawer-golive').addEventListener('click', () => {
            const config = collect();
            if (!config) return;
            // Duck-type the close handle startStream expects from the old modal
            this.startStream(config, { remove: close, querySelector: () => null });
        });
    }

    /**
     * Get device name from device ID
     */
    getDeviceName(deviceId) {
        // Plain name only — icons live in the UI layer (Material mic symbol).
        // Emoji prefixes here previously produced '�' replacement characters:
        // the emoji-stripping regex split surrogate pairs.
        const device = this.audioDevices.find(d => d.id === deviceId);
        return device ? device.name : (deviceId || 'Unknown Device');
    }

    /**
     * Escape text for safe interpolation into HTML templates
     */
    escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
        // All toasts go through the stacking toast system (LSToasts): new ones
        // push older ones down instead of overlapping at the same fixed spot.
        if (window.LSToasts) {
            LSToasts.show(message, type, {
                linkUrl: options.linkUrl,
                linkText: options.linkText || 'troubleshooting guide',
                timeoutMs: type === 'error' ? 30000 : undefined
            });
            return;
        }
        console.log(`${type.toUpperCase()}: ${message}`);
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

/**
 * FFmpeg Streams Manager Component
 * Manages FFmpeg audio streams with real-time status updates
 */
class FFmpegStreamsManager {
    constructor(containerId = 'ffmpeg-streams') {
        this.activeStreams = [];
        this.audioDevices = [];
        this.isInitialized = false;
        this.statusCheckInterval = null;
        this.uptimeUpdateInterval = null;
        this.containerId = containerId;
        this.container = null;

        // Client-side timer tracking
        this.clientTimers = new Map(); // streamId -> { startTime, isRunning }

        // Auto-initialize immediately to ensure component loads
        this.init().catch(error => {
            console.error('Failed to auto-initialize FFmpegStreamsManager:', error);
        });
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
     * Load active streams from the API
     */
    async loadStreams() {
        try {
            const response = await fetch('/api/streams/status');
            const data = await response.json();

            // The API returns { total, running, errors, streams } format
            if (data.streams) {
                // Update client timers based on stream status changes
                this.updateClientTimers(data.streams);
                this.activeStreams = data.streams;
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
            const data = await response.json();

            // Handle both old format (array) and new format (object with devices array)
            const devices = data.devices || data || [];

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

            const response = await fetch('/api/system/audio-devices/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.audioDevices = data.devices || [];
                this.render(); // Re-render to update device lists
                this.showNotification(`Audio devices refreshed - ${data.count} devices found`, 'success');
            } else {
                throw new Error(data.message || 'Failed to refresh devices');
            }
        } catch (error) {
            console.error('Failed to refresh audio devices:', error);
            this.showNotification(`Failed to refresh audio devices: ${error.message}`, 'error');
        }
    }

    /**
     * Start a new stream
     */
    async startStream(streamConfig) {
        try {
            // First check if Icecast server is running
            const icecastStatus = await this.checkIcecastStatus();
            if (!icecastStatus.running) {
                this.showNotification('Icecast server is not running. Please start the Icecast server first.', 'error');
                return;
            }

            const response = await fetch('/api/streams/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(streamConfig)
            });

            const data = await response.json();
            
            if (data.message === 'Stream started successfully') {
                await this.loadStreams();
                this.render();
                
                // Generate stream URL and show success message
                const currentHost = window.location.hostname;
                const streamUrl = `http://${currentHost}:8000/${streamConfig.id || 'stream'}`;
                this.showNotification(`Stream started successfully! Stream is now available in the list below.`, 'success');
            } else {
                throw new Error(data.error || 'Failed to start stream');
            }
        } catch (error) {
            console.error('Failed to start stream:', error);
            this.showNotification(`Failed to start stream: ${error.message}`, 'error');
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
                this.showNotification('Stream stopped successfully', 'success');
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
            const response = await fetch('/api/streams/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: streamId })
            });

            const data = await response.json();

            if (data.message === 'Stream restarted successfully') {
                await this.loadStreams();
                this.render();
                this.showNotification('Stream started successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to restart stream');
            }
        } catch (error) {
            console.error('Failed to start stream:', error);
            this.showNotification(`Failed to start stream: ${error.message}`, 'error');
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
                this.showNotification(data.message || 'All streams stopped successfully', 'success');
            } else {
                throw new Error(data?.message || data?.error || 'Failed to stop all streams');
            }
        } catch (error) {
            console.error('Failed to stop all streams:', error);
            this.showNotification(`Failed to stop all streams: ${error.message}`, 'error');
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
                // Remove from local array
                this.activeStreams = this.activeStreams.filter(s => s.id !== streamId);
                this.renderStreams();
                this.showNotification('Stream deleted successfully', 'success');
            } else {
                throw new Error(result.error || 'Failed to delete stream');
            }
        } catch (error) {
            console.error('Failed to delete stream:', error);
            this.showNotification(`Failed to delete stream: ${error.message}`, 'error');
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
                                class="w-full px-3 py-2 bg-[#1a1a1a] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--primary-color)] transition-colors pr-12"
                                placeholder="Enter stream name"
                                required
                            >
                            <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <span id="edit-stream-name-counter" class="text-xs text-gray-400">${(stream.name || '').length}/50</span>
                            </div>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">Maximum 50 characters</p>
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
                            class="flex-1 px-4 py-2 bg-[var(--primary-color)]/20 hover:bg-[var(--primary-color)]/30 border border-[var(--primary-color)]/30 text-[var(--primary-color)] rounded-lg transition-all duration-300"
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

                if (response.ok) {
                    modal.remove();
                    await this.loadStreams();
                    this.render();
                    this.showNotification('Stream updated. Device reset — click Start to begin streaming.', 'success');
                } else {
                    throw new Error(result.error || 'Failed to update stream');
                }
            } catch (error) {
                // Restore button state on error
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                this.showNotification(`Failed to update stream: ${error.message}`, 'error');
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
     * Copy stream URL to clipboard
     */
    async copyStreamUrl(url, button) {
        try {
            await navigator.clipboard.writeText(url);
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="material-symbols-rounded text-sm">check</span>';
            button.classList.add('text-green-400');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('text-green-400');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            this.showNotification('Failed to copy URL to clipboard', 'error');
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
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
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
                        <div class="flex items-center gap-2">
                            <button id="refresh-devices-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 transition-all duration-300 border border-gray-600/50" title="Refresh Audio Devices">
                                <span class="material-symbols-rounded text-sm">refresh</span>
                                Refresh Devices
                            </button>
                            ${this.getRunningStreamsCount() > 0 ? `
                                <button id="stop-all-streams-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-300 bg-red-900/30 hover:bg-red-800/40 transition-all duration-300 border border-red-700/50" title="Stop All Running Streams">
                                    <span class="material-symbols-rounded text-sm">stop</span>
                                    Stop All
                                </button>
                            ` : ''}
                            <button id="add-stream-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white bg-[var(--live-color)] hover:bg-[var(--live-color)]/80 transition-all duration-300 shadow-lg">
                                <span class="material-symbols-rounded">add</span>
                                🔴 Start New Stream
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

                    <div class="bg-[#111111] border border-[var(--border-color)] rounded-xl p-6 max-w-md mx-auto">
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
                    </div>
                </div>
            `;
        }

        return this.activeStreams.map(stream => {
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

            const currentHost = window.location.hostname;
            const streamUrl = `http://${currentHost}:8000/${stream.id}`;

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
            <div class="bg-[#111111] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--primary-color)]/30 transition-all duration-300">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <!-- Stream Info -->
                    <div class="flex items-center gap-4 flex-1">
                        <div class="relative">
                            <div class="w-3 h-3 rounded-full ${stream.status === 'running' ? 'bg-[var(--live-color)] pulse-live' : stream.status === 'error' ? 'bg-red-500' : 'bg-gray-500'}"></div>
                            ${stream.status === 'running' ? '<div class="absolute inset-0 w-3 h-3 rounded-full bg-[var(--live-color)] animate-ping opacity-75"></div>' : ''}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2 mb-1">
                                <h3 class="font-semibold text-white text-lg truncate flex-1">${stream.name || stream.id}</h3>
                            </div>
                            <div class="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                <span class="flex items-center gap-1">
                                    <span class="material-symbols-rounded text-sm">mic</span>
                                    ${this.getDeviceName(stream.deviceId)}
                                </span>
                                <span class="flex items-center gap-1">
                                    <span class="material-symbols-rounded text-sm">high_quality</span>
                                    ${stream.config?.bitrate || '192'} kbps
                                </span>
                                <span class="flex items-center gap-1">
                                    <span class="material-symbols-rounded text-sm">schedule</span>
                                    <span data-stream-uptime="${stream.id}">Uptime: ${uptime}</span>
                                </span>
                                <span class="px-2 py-1 text-xs font-medium ${statusBg} ${statusColor} border rounded-full flex items-center gap-1 flex-shrink-0">
                                    <span class="material-symbols-rounded text-xs">${statusIcon}</span>
                                    ${statusText}
                                </span>
                            </div>
                        </div>
                    </div>



                    <!-- Stream Actions -->
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        <div class="flex items-center gap-2 flex-1 sm:flex-initial">
                            ${stream.status === 'running' ? `
                                <button
                                    onclick="navigator.clipboard.writeText('${streamUrl}'); ffmpegStreamsManager.showNotification('Stream URL copied!', 'success')"
                                    class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-300 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[var(--border-color)] transition-all duration-300"
                                    title="Copy stream URL"
                                >
                                    <span class="material-symbols-rounded text-sm">link</span>
                                    Copy URL
                                </button>
                                <button
                                    onclick="ffmpegStreamsManager.editStream('${stream.id}')"
                                    class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-300 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 transition-all duration-300"
                                    title="Edit stream settings"
                                >
                                    <span class="material-symbols-rounded text-sm">edit</span>
                                    Edit
                                </button>
                                <button
                                    onclick="ffmpegStreamsManager.stopStream('${stream.id}')"
                                    class="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all duration-300 shadow-lg"
                                >
                                    <span class="material-symbols-rounded">stop</span>
                                    Stop Stream
                                </button>
                            ` : `
                                <button
                                    onclick="ffmpegStreamsManager.restartStream('${stream.id}')"
                                    class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-green-300 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 transition-all duration-300"
                                    title="Start stream"
                                >
                                    <span class="material-symbols-rounded text-sm">play_arrow</span>
                                    Start
                                </button>
                                <button
                                    onclick="ffmpegStreamsManager.editStream('${stream.id}')"
                                    class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-300 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 transition-all duration-300"
                                    title="Edit stream settings"
                                >
                                    <span class="material-symbols-rounded text-sm">edit</span>
                                    Edit
                                </button>
                                <button
                                    onclick="ffmpegStreamsManager.deleteStream('${stream.id}')"
                                    class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-300 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 transition-all duration-300"
                                    title="Delete stream"
                                >
                                    <span class="material-symbols-rounded text-sm">delete</span>
                                    Delete
                                </button>
                            `}
                        </div>
                    </div>
                </div>

                ${stream.status === 'running' ? `
                    <!-- Stream URL Display -->
                    <div class="mt-4 p-3 bg-[#0A0A0A] border border-[var(--border-color)] rounded-lg">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 flex-1">
                                <span class="material-symbols-rounded text-sm text-[var(--primary-color)]">radio</span>
                                <span class="text-xs text-gray-400">Listen via:</span>
                                <code class="text-xs text-[var(--primary-color)] font-mono bg-[var(--primary-color)]/10 px-2 py-1 rounded flex-1 truncate">${streamUrl}</code>
                            </div>
                            <div class="flex items-center gap-1">
                                <button
                                    onclick="ffmpegStreamsManager.copyStreamUrl('${streamUrl}', this)"
                                    class="text-xs text-gray-400 hover:text-white transition-colors px-1"
                                    title="Copy stream URL to clipboard"
                                >
                                    <span class="material-symbols-rounded text-sm">content_copy</span>
                                </button>
                                <button
                                    onclick="window.open('${streamUrl}', '_blank')"
                                    class="text-xs text-gray-400 hover:text-white transition-colors px-1"
                                    title="Test stream in browser"
                                >
                                    <span class="material-symbols-rounded text-sm">open_in_new</span>
                                </button>
                             ${stream.status === 'stopped' ? `
                             <button
                                 onclick="ffmpegStreamsManager.restartStream('${stream.id}')"
                                 class="text-xs text-blue-400 hover:text-blue-300 transition-colors px-1"
                                 title="Start this stream"
                             >
                                 <span class="material-symbols-rounded text-sm">restart_alt</span>
                             </button>
                             ` : ''}
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-500">
                            💡 Stream is live! Click copy button to share this URL.
                        </div>
                    </div>
                ` : stream.status === 'stopped' ? `
                    <!-- Stream Status Info -->
                    <div class="mt-4 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-rounded text-sm text-gray-400">info</span>
                            <span class="text-xs text-gray-400">Stream stopped. Use Start to begin streaming.</span>
                        </div>
                    </div>
                ` : `
                    <!-- Error Status Info -->
                    <div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div class="flex items-start gap-2">
                            <span class="material-symbols-rounded text-sm text-red-400 mt-0.5">error</span>
                            <div class="flex-1">
                                <p class="text-xs text-red-300 font-medium mb-1">${errorMessage}</p>
                                <p class="text-xs text-red-400/80">Click Edit to change device, then Start.</p>
                            </div>
                        </div>
                    </div>
                `}
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
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
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
                    <button onclick="ffmpegStreamsManager.init()" class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 border border-[var(--border-color)] transition-all duration-300">
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

        const refreshDevicesBtn = document.getElementById('refresh-devices-btn');
        if (refreshDevicesBtn) {
            refreshDevicesBtn.addEventListener('click', () => {
                this.refreshAudioDevices();
            });
        }

        const stopAllStreamsBtn = document.getElementById('stop-all-streams-btn');
        if (stopAllStreamsBtn) {
            stopAllStreamsBtn.addEventListener('click', () => {
                this.stopAllStreams();
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
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30 max-w-lg w-full mx-4">
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
                                       class="w-full bg-[#2A2A2A] border border-[var(--border-color)] text-white text-sm rounded-md focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] block px-3 py-2.5 pr-12"
                                       placeholder="e.g., Main Room Audio, DJ Mix, Podcast"
                                       required>
                                <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <span id="stream-name-counter" class="text-xs text-gray-400">0/50</span>
                                </div>
                            </div>
                            <p class="text-xs text-gray-400 mt-1">Maximum 50 characters</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <span class="material-symbols-rounded text-sm mr-1">mic</span>
                                Audio Input Source
                            </label>
                            <select id="stream-device" class="w-full bg-[#2A2A2A] border border-[var(--border-color)] text-white text-sm rounded-md focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] block px-3 py-2.5" required>
                                <option value="">🎯 Select your audio source...</option>
                                ${this.audioDevices.map(device => `
                                    <option value="${device.id}">
                                        ${device.virtual ? '🔗' : '🎤'} ${device.name}
                                        ${device.fallback ? ' (Fallback)' : ''}
                                        ${device.virtual ? ' (Virtual)' : ''}
                                    </option>
                                `).join('')}
                            </select>
                            <p class="text-xs text-gray-400 mt-1">💡 Install DVS or Virtual Audio Cable for virtual audio routing</p>
                            ${this.hasVirtualAudioDevices() ? `
                                <div class="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-300">
                                    ⚠️ <strong>Virtual Audio Notice:</strong> Virtual devices may occasionally disappear due to driver restarts. If streaming fails, try restarting your virtual audio software or refresh audio devices.
                                </div>
                            ` : ''}
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <span class="material-symbols-rounded text-sm mr-1">high_quality</span>
                                Stream Quality
                            </label>
                            <select id="stream-bitrate" class="w-full bg-[#2A2A2A] border border-[var(--border-color)] text-white text-sm rounded-md focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] block px-3 py-2.5">
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

                const streamConfig = {
                    name: sanitizedName,
                    deviceId: document.getElementById('stream-device').value,
                    bitrate: parseInt(document.getElementById('stream-bitrate').value),
                    id: `${cleanId}_${Date.now()}`
                };

                modal.remove();
                await this.startStream(streamConfig);
            } catch (error) {
                // Restore button state on error
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                this.showNotification(`Failed to start stream: ${error.message}`, 'error');
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
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use the existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Create a simple toast notification
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
                type === 'success' ? 'bg-green-600 text-white' :
                type === 'error' ? 'bg-red-600 text-white' :
                'bg-blue-600 text-white'
            }`;
            toast.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="material-symbols-rounded text-sm">
                        ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
                    </span>
                    ${message}
                </div>
            `;

            document.body.appendChild(toast);

            // Auto remove after 3 seconds
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
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

// Create global instance
window.ffmpegStreamsManager = new FFmpegStreamsManager();

// Also make the class available globally
window.FFmpegStreamsManager = FFmpegStreamsManager;

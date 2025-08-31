/**
 * Lobby Background Music Player Component
 * Handles music file selection, playback controls, and volume management
 */
class LobbyMusicPlayer {
    constructor(containerId) {
        this.containerId = containerId;
        this.currentFile = 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3';
        this.isPlaying = false;
        this.volume = 75;
        this.isMuted = false;
        this.audioElement = null;
        this.supportedFormats = ['.mp3', '.wav', '.ogg', '.m4a'];
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.createAudioElement();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with ID '${this.containerId}' not found`);
            return;
        }

        container.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
                <h2 class="text-xl font-bold text-white mb-4">Lobby Background Music</h2>
                <div class="bg-[#111111] border border-[var(--border-color)] rounded-xl p-4 space-y-4">
                    <!-- Music Player Status -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-2 h-10 rounded-full ${this.isPlaying ? 'bg-[var(--live-color)] pulse-live' : 'bg-gray-600'}" id="music-status-indicator"></div>
                            <div>
                                <p class="font-semibold text-white">Background Music</p>
                                <p class="text-sm font-medium flex items-center gap-1" id="music-status-text">
                                    <span class="material-symbols-outlined text-sm">circle</span> 
                                    <span class="${this.isPlaying ? 'text-[var(--live-color)]' : 'text-gray-500'}" id="music-status-label">
                                        ${this.isPlaying ? 'Playing' : 'Stopped'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <button id="play-pause-btn" class="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${this.isPlaying ? 'btn-stop-gradient' : 'btn-gradient'}">
                                <span class="material-symbols-outlined">${this.isPlaying ? 'pause' : 'play_arrow'}</span>
                                ${this.isPlaying ? 'Pause' : 'Start'}
                            </button>
                        </div>
                    </div>

                    <!-- Music File Controls -->
                    <div class="pt-4 border-t border-gray-800 space-y-4">
                        <!-- File Selection -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <span class="material-symbols-outlined text-xl text-[var(--primary-color)]">library_music</span>
                                <p class="text-sm font-mono text-gray-400 truncate" id="current-file-name">${this.currentFile}</p>
                            </div>
                            <div class="flex items-center gap-2 ml-4">
                                <input type="file" id="file-input" accept="${this.supportedFormats.join(',')}" class="hidden">
                                <button id="change-file-btn" class="text-sm font-semibold text-[var(--primary-color)] hover:text-white transition-colors px-3 py-1 rounded border border-[var(--primary-color)]/30 hover:border-[var(--primary-color)]">
                                    Change
                                </button>
                                <button id="stop-btn" class="text-sm font-semibold text-red-400 hover:text-white transition-colors px-3 py-1 rounded border border-red-400/30 hover:border-red-400" ${!this.isPlaying ? 'disabled' : ''}>
                                    Stop
                                </button>
                            </div>
                        </div>

                        <!-- Volume Controls -->
                        <div class="flex items-center gap-4">
                            <button id="mute-btn" class="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-[#2A2A2A] text-gray-400 hover:bg-[var(--primary-color)]/20 hover:text-[var(--primary-color)] transition-colors">
                                <span class="material-symbols-outlined text-base">${this.isMuted ? 'volume_off' : 'volume_up'}</span>
                            </button>
                            <div class="flex-1 flex items-center gap-3">
                                <span class="text-xs text-gray-500 w-8">0%</span>
                                <input id="volume-slider" class="flex-1" max="100" min="0" type="range" value="${this.volume}"/>
                                <span class="text-xs text-gray-500 w-12">100%</span>
                            </div>
                            <span class="text-sm font-mono text-gray-400 w-12" id="volume-display">${this.volume}%</span>
                        </div>

                        <!-- Progress Bar (when playing) -->
                        <div class="space-y-2 ${!this.isPlaying ? 'hidden' : ''}" id="progress-container">
                            <div class="flex justify-between text-xs text-gray-500">
                                <span id="current-time">0:00</span>
                                <span id="duration">0:00</span>
                            </div>
                            <div class="w-full bg-[#111111] rounded-full h-1.5 cursor-pointer" id="progress-bar-container">
                                <div class="bg-[var(--primary-color)] h-1.5 rounded-full transition-all duration-150" style="width: 0%" id="progress-bar"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createAudioElement() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.remove();
        }

        this.audioElement = new Audio();
        this.audioElement.volume = this.volume / 100;
        this.audioElement.loop = true; // Loop background music
        
        // Audio event listeners
        this.audioElement.addEventListener('play', () => this.onPlayStateChange(true));
        this.audioElement.addEventListener('pause', () => this.onPlayStateChange(false));
        this.audioElement.addEventListener('ended', () => this.onPlayStateChange(false));
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioElement.addEventListener('error', (e) => this.handleAudioError(e));
        
        // Set initial audio source if current file exists
        if (this.currentFile) {
            this.loadAudioFile(`/assets/${this.currentFile}`);
        }
    }

    setupEventListeners() {
        // Play/Pause button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#play-pause-btn')) {
                this.togglePlayPause();
            }
        });

        // Stop button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#stop-btn')) {
                this.stop();
            }
        });

        // Change file button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#change-file-btn')) {
                document.getElementById('file-input').click();
            }
        });

        // File input change
        document.addEventListener('change', (e) => {
            if (e.target.id === 'file-input') {
                this.handleFileSelection(e.target.files[0]);
            }
        });

        // Mute button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#mute-btn')) {
                this.toggleMute();
            }
        });

        // Volume slider
        document.addEventListener('input', (e) => {
            if (e.target.id === 'volume-slider') {
                this.setVolume(parseInt(e.target.value));
            }
        });

        // Progress bar click
        document.addEventListener('click', (e) => {
            if (e.target.closest('#progress-bar-container')) {
                this.seekTo(e);
            }
        });
    }

    togglePlayPause() {
        if (!this.audioElement || !this.currentFile) {
            this.showNotification('No audio file loaded', 'error');
            return;
        }

        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async play() {
        if (!this.audioElement) return;

        try {
            await this.audioElement.play();
            this.showNotification('Background music started', 'success');
        } catch (error) {
            console.error('Failed to play audio:', error);
            this.showNotification('Failed to play audio', 'error');
        }
    }

    pause() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.showNotification('Background music paused', 'info');
        }
    }

    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.showNotification('Background music stopped', 'info');
        }
    }

    onPlayStateChange(playing) {
        this.isPlaying = playing;
        this.updateUI();
    }

    updateUI() {
        const statusIndicator = document.getElementById('music-status-indicator');
        const statusLabel = document.getElementById('music-status-label');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        const progressContainer = document.getElementById('progress-container');

        if (statusIndicator) {
            statusIndicator.className = `w-2 h-10 rounded-full ${this.isPlaying ? 'bg-[var(--live-color)] pulse-live' : 'bg-gray-600'}`;
        }

        if (statusLabel) {
            statusLabel.className = this.isPlaying ? 'text-[var(--live-color)]' : 'text-gray-500';
            statusLabel.textContent = this.isPlaying ? 'Playing' : 'Stopped';
        }

        if (playPauseBtn) {
            playPauseBtn.className = `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${this.isPlaying ? 'btn-stop-gradient' : 'btn-gradient'}`;
            playPauseBtn.innerHTML = `
                <span class="material-symbols-outlined">${this.isPlaying ? 'pause' : 'play_arrow'}</span>
                ${this.isPlaying ? 'Pause' : 'Start'}
            `;
        }

        if (stopBtn) {
            stopBtn.disabled = !this.isPlaying;
            stopBtn.className = `text-sm font-semibold transition-colors px-3 py-1 rounded border ${!this.isPlaying ? 'text-gray-600 border-gray-600/30 cursor-not-allowed' : 'text-red-400 hover:text-white border-red-400/30 hover:border-red-400'}`;
        }

        if (progressContainer) {
            progressContainer.className = `space-y-2 ${!this.isPlaying ? 'hidden' : ''}`;
        }
    }

    handleFileSelection(file) {
        if (!file) return;

        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!this.supportedFormats.includes(fileExtension)) {
            this.showNotification(`Unsupported format. Supported: ${this.supportedFormats.join(', ')}`, 'error');
            return;
        }

        this.currentFile = file.name;
        const fileURL = URL.createObjectURL(file);
        this.loadAudioFile(fileURL);
        
        // Update UI
        const fileNameDisplay = document.getElementById('current-file-name');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = this.currentFile;
        }

        this.showNotification(`Loaded: ${file.name}`, 'success');
    }

    loadAudioFile(src) {
        if (this.audioElement) {
            this.audioElement.src = src;
            this.audioElement.load();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.audioElement) {
            this.audioElement.muted = this.isMuted;
        }

        const muteBtn = document.getElementById('mute-btn');
        const volumeSlider = document.getElementById('volume-slider');

        if (muteBtn) {
            muteBtn.innerHTML = `<span class="material-symbols-outlined text-base">${this.isMuted ? 'volume_off' : 'volume_up'}</span>`;
        }

        if (volumeSlider) {
            volumeSlider.disabled = this.isMuted;
            volumeSlider.className = `flex-1 ${this.isMuted ? 'opacity-50 cursor-not-allowed' : ''}`;
        }

        this.showNotification(this.isMuted ? 'Audio muted' : 'Audio unmuted', 'info');
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        
        if (this.audioElement && !this.isMuted) {
            this.audioElement.volume = this.volume / 100;
        }

        const volumeDisplay = document.getElementById('volume-display');
        if (volumeDisplay) {
            volumeDisplay.textContent = `${this.volume}%`;
        }
    }

    updateProgress() {
        if (!this.audioElement || !this.isPlaying) return;

        const progressBar = document.getElementById('progress-bar');
        const currentTimeDisplay = document.getElementById('current-time');

        if (this.audioElement.duration) {
            const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }

        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = this.formatTime(this.audioElement.currentTime);
        }
    }

    updateDuration() {
        const durationDisplay = document.getElementById('duration');
        if (durationDisplay && this.audioElement.duration) {
            durationDisplay.textContent = this.formatTime(this.audioElement.duration);
        }
    }

    seekTo(event) {
        if (!this.audioElement || !this.audioElement.duration) return;

        const progressContainer = document.getElementById('progress-bar-container');
        const rect = progressContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        
        this.audioElement.currentTime = percentage * this.audioElement.duration;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    handleAudioError(error) {
        console.error('Audio error:', error);
        this.showNotification('Error loading audio file', 'error');
        this.isPlaying = false;
        this.updateUI();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        const colors = {
            'info': 'bg-blue-500',
            'success': 'bg-green-500', 
            'error': 'bg-red-500'
        };
        
        notification.className += ` ${colors[type] || colors.info} text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Slide in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Slide out and remove
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Public API methods
    getCurrentFile() {
        return this.currentFile;
    }

    getPlayState() {
        return {
            isPlaying: this.isPlaying,
            currentTime: this.audioElement ? this.audioElement.currentTime : 0,
            duration: this.audioElement ? this.audioElement.duration : 0,
            volume: this.volume,
            isMuted: this.isMuted
        };
    }

    destroy() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.remove();
            this.audioElement = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LobbyMusicPlayer;
}

/**
 * Lobby Background Music Player Component
 * Handles music file selection, playback controls, and volume management
 */
class LobbyMusicPlayer {
    constructor(containerId) {
        this.containerId = containerId;
        this.currentFile = null;
        this.isPlaying = false;
        this.isPaused = false; // New state for paused
        this.volume = 75;
        this.isMuted = false;
        this.isLooping = true; // New state for looping
        this.audioElement = null;
        this.supportedFormats = ['.mp3', '.wav', '.ogg', '.m4a'];
        this.defaultFileErrorHandled = false; // Flag to prevent infinite error loops
        this.handleDefaultFileError = null; // Bound error handler reference
        this.errorCount = 0; // Track error count to prevent spam
        this.maxErrors = 3; // Maximum errors before stopping attempts
        
        this.init();
    }

    async init() {
        // Set default file immediately so UI renders properly
        if (!this.currentFile) {
            this.currentFile = 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3';
        }
        
        await this.loadLastPlayedFile();
        this.render();
        this.setupEventListeners();
        this.createAudioElement();
    }

    // Load music settings from server storage
    async loadLastPlayedFile() {
        try {
            const response = await fetch('/api/settings/music');
            if (response.ok) {
                const data = await response.json();
                this.currentFile = data.filename;
                this.volume = data.volume || 75;
                this.isMuted = data.muted || false;
                this.isLooping = data.loop !== undefined ? data.loop : true;
                
                // Update audio element if it exists
                if (this.audioElement) {
                    this.audioElement.volume = this.volume / 100;
                    this.audioElement.muted = this.isMuted;
                    this.audioElement.loop = this.isLooping;
                }
            } else {
                // Fallback to defaults
                this.currentFile = 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3';
            }
        } catch (error) {
            console.log('No saved music settings found, using defaults');
            this.currentFile = 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3';
        }
        
        // Ensure we always have a default file
        if (!this.currentFile) {
            this.currentFile = 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3';
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with ID '${this.containerId}' not found`);
            return;
        }

        // Show "No music file loaded" if no file is actually loaded in the audio element
        const fileNameDisplay = this.audioElement && this.audioElement.src ? this.currentFile : 'No music file loaded';

        container.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-white">Lobby Background Music</h2>
                </div>
                <div class="bg-[#111111] border border-[var(--border-color)] rounded-xl p-4 space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-2 h-10 rounded-full ${this.isPlaying ? 'bg-[var(--live-color)] pulse-live' : 'bg-gray-600'}" id="music-status-indicator"></div>
                            <div>
                                <p class="font-semibold text-white">Background Music</p>
                                <p class="text-sm font-medium flex items-center gap-1" id="music-status-text">
                                    <span class="material-symbols-rounded text-sm">circle</span> 
                                    <span class="${this.isPlaying ? 'text-[var(--live-color)]' : this.isPaused ? 'text-yellow-400' : 'text-gray-500'}" id="music-status-label">
                                        ${this.isPlaying ? 'Playing' : this.isPaused ? 'Paused' : 'Stopped'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="play-pause-btn" class="flex items-center justify-center h-8 w-8 rounded-full shadow-lg transition-all duration-300 ${this.isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--primary-color)] hover:bg-[var(--primary-color-dark)]'} ${!this.audioElement || !this.audioElement.src ? 'opacity-50 cursor-not-allowed bg-gray-500 hover:bg-gray-500' : ''}" ${!this.audioElement || !this.audioElement.src ? 'disabled' : ''}>
                                <span class="material-symbols-rounded text-white">${this.isPlaying ? 'pause' : 'play_arrow'}</span>
                            </button>
                            <button id="stop-btn" class="flex items-center justify-center h-8 w-8 rounded-full border transition-colors ${!this.audioElement || !this.audioElement.src ? 'opacity-50 cursor-not-allowed text-gray-400 border-gray-400/30 bg-gray-500 hover:bg-gray-500' : 'text-red-400 hover:text-white hover:bg-red-400 border-red-400/30'}" ${!this.audioElement || !this.audioElement.src ? 'disabled' : ''}>
                                <span class="material-symbols-rounded text-base">stop</span>
                            </button>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-gray-800 space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <span class="material-symbols-rounded text-xl text-[var(--primary-color)]">library_music</span>
                                <p class="text-sm font-mono text-gray-400 truncate" id="current-file-name">${fileNameDisplay}</p>
                                <input type="file" id="file-input" accept="${this.supportedFormats.join(',')}" class="hidden">
                            </div>
                            <button id="change-file-btn" class="flex items-center justify-center h-8 w-8 rounded-full text-[var(--primary-color)] hover:text-white transition-colors border border-[var(--primary-color)]/30 hover:bg-[var(--primary-color)]/20">
                                <span class="material-symbols-rounded text-base">folder_open</span>
                            </button>
                        </div>

                        <div class="flex items-center gap-2">
                            <div class="flex-1 space-y-2">
                                <div class="w-full bg-gray-700 rounded-full h-1.5 cursor-pointer" id="progress-bar-container">
                                    <div class="bg-[var(--primary-color)] h-1.5 rounded-full transition-all duration-150" style="width: 0%" id="progress-bar"></div>
                                </div>
                                <div class="flex justify-between text-xs text-gray-500">
                                    <span id="current-time">0:00</span>
                                    <span id="duration">0:00</span>
                                </div>
                            </div>
                            <button id="loop-btn" class="flex items-center justify-center h-8 w-8 rounded-full transition-colors ${this.isLooping ? 'text-white bg-[var(--primary-color)]' : 'text-gray-400 bg-[#2A2A2A] hover:bg-gray-600'}" ${!this.currentFile ? 'disabled' : ''}>
                                <span class="material-symbols-rounded text-base">repeat</span>
                            </button>
                        </div>

                        <div class="flex items-center gap-4">
                            <button id="mute-btn" class="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-color)] bg-[#2A2A2A] text-gray-400 hover:bg-[var(--primary-color)]/20 hover:text-[var(--primary-color)] transition-colors">
                                <span class="material-symbols-rounded text-base">${this.isMuted ? 'volume_off' : 'volume_up'}</span>
                            </button>
                            <div class="flex-1 flex items-center gap-3">
                                <span class="text-xs text-gray-500 w-8">0%</span>
                                <input id="volume-slider" class="flex-1" max="100" min="0" type="range" value="${this.volume}" title="${this.volume}%"/>
                                <span class="text-xs text-gray-500 w-12">100%</span>
                            </div>
                            <span class="text-sm font-mono text-gray-400 w-12" id="volume-display">${this.volume}%</span>
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
        this.audioElement.loop = this.isLooping; // Use the looping state
        
        // Audio event listeners
        this.audioElement.addEventListener('play', () => this.onPlayStateChange(true));
        this.audioElement.addEventListener('pause', () => this.onPlayStateChange(false));
        this.audioElement.addEventListener('ended', () => this.onPlayStateChange(false));
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioElement.addEventListener('error', (e) => this.handleAudioError(e));
        
        // Don't auto-load any files - let user manually select or play
        // This prevents the infinite error loop and makes the play button work properly
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

        // Loop button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#loop-btn')) {
                this.toggleLoop();
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
                // Update the tooltip to show current volume
                e.target.title = `${e.target.value}%`;
            }
        });

        // Progress bar click
        document.addEventListener('click', (e) => {
            if (e.target.closest('#progress-bar-container')) {
                this.seekTo(e);
            }
        });
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        if (this.audioElement) {
            this.audioElement.loop = this.isLooping;
        }
        this.updateUI();
        this.showNotification(`Looping ${this.isLooping ? 'enabled' : 'disabled'}`, 'info');
    }

    togglePlayPause() {
        if (!this.audioElement) {
            this.showNotification('Audio system not ready', 'error');
            return;
        }

        if (!this.currentFile) {
            this.showNotification('No audio file selected', 'error');
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

        // Check if we have a file loaded
        if (!this.audioElement.src) {
            if (this.currentFile) {
                // Try to load the file first
                try {
                    const src = this.currentFile.startsWith('blob:') ? this.currentFile : `/assets/${this.currentFile}`;
                    this.loadAudioFile(src);
                    
                    // Wait a bit for the file to load before playing
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Check if the file loaded successfully
                    if (!this.audioElement.src || this.audioElement.error) {
                        this.showNotification('Failed to load audio file', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Failed to load audio file:', error);
                    this.showNotification('Failed to load audio file', 'error');
                    return;
                }
            } else {
                this.showNotification('No audio file selected', 'error');
                return;
            }
        }

        try {
            await this.audioElement.play();
            this.isPaused = false;
            this.isPlaying = true;
            this.showNotification('Background music started', 'success');
        } catch (error) {
            console.error('Failed to play audio:', error);
            this.showNotification('Failed to play audio', 'error');
        }
    }

    pause() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.isPaused = true;
            this.isPlaying = false;
            this.showNotification('Background music paused', 'info');
        }
    }

    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isPaused = false;
            this.isPlaying = false;
            this.showNotification('Background music stopped', 'info');
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.audioElement) {
            this.audioElement.muted = this.isMuted;
        }
        this.updateVolumeDisplay();
    }

    setVolume(volume) {
        this.volume = volume;
        if (this.audioElement) {
            this.audioElement.volume = volume / 100;
        }
        this.updateVolumeDisplay();
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        if (this.audioElement) {
            this.audioElement.loop = this.isLooping;
        }
        this.updateLoopDisplay();
    }

    onPlayStateChange(playing) {
        this.isPlaying = playing;
        if (!playing && this.audioElement && this.audioElement.currentTime > 0) {
            // If not playing but has current time, it's paused
            this.isPaused = true;
        } else if (!playing) {
            // If not playing and no current time, it's stopped
            this.isPaused = false;
        }
        this.updateUI(); // Calls updateUI to re-render buttons and progress
    }

    updatePlaybackDisplay() {
        // Update play/pause button
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.className = `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${this.isPlaying ? 'btn-stop-gradient' : 'btn-gradient'}`;
            playPauseBtn.innerHTML = `<span class="material-symbols-rounded">${this.isPlaying ? 'pause' : 'play_arrow'}</span> ${this.isPlaying ? 'Pause' : 'Start'}`;
        }

        // Update stop button
        const stopBtn = document.getElementById('stop-btn');
        if (stopBtn) {
            stopBtn.disabled = !this.isPlaying;
            stopBtn.style.opacity = this.isPlaying ? '1' : '0.5';
        }

        // Update status indicator
        const statusIndicator = document.getElementById('music-status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `w-2 h-10 rounded-full ${this.isPlaying ? 'bg-[var(--live-color)] pulse-live' : this.isPaused ? 'bg-yellow-400' : 'bg-gray-600'}`;
        }

        // Update status label
        const statusLabel = document.getElementById('music-status-label');
        if (statusLabel) {
            statusLabel.className = this.isPlaying ? 'text-[var(--live-color)]' : this.isPaused ? 'text-yellow-400' : 'text-gray-500';
            statusLabel.textContent = this.isPlaying ? 'Playing' : this.isPaused ? 'Paused' : 'Stopped';
        }

        // Update progress container visibility
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.style.display = this.isPlaying ? 'block' : 'none';
        }
    }

    updateVolumeDisplay() {
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.innerHTML = `<span class="material-symbols-rounded text-base">${this.isMuted ? 'volume_off' : 'volume_up'}</span>`;
        }

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.volume;
            volumeSlider.title = `${this.volume}%`;
        }
    }

    updateLoopDisplay() {
        const loopBtn = document.getElementById('loop-btn');
        if (loopBtn) {
            loopBtn.className = `flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${this.isLooping ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/20 text-[var(--primary-color)]' : 'border-[var(--border-color)] bg-[#2A2A2A] text-gray-400 hover:bg-[var(--primary-color)]/20 hover:text-[var(--primary-color)]'}`;
        }
    }

    updateProgress() {
        if (!this.audioElement || !this.isPlaying) return;

        const currentTime = this.audioElement.currentTime;
        const duration = this.audioElement.duration;

        if (isNaN(duration)) return;

        const progressPercent = (currentTime / duration) * 100;
        
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }

        const currentTimeEl = document.getElementById('current-time');
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(currentTime);
        }
    }

    updateDuration() {
        if (!this.audioElement) return;

        const duration = this.audioElement.duration;
        const durationEl = document.getElementById('duration');
        if (durationEl && !isNaN(duration)) {
            durationEl.textContent = this.formatTime(duration);
        }
    }

    seekTo(event) {
        if (!this.audioElement || !this.audioElement.duration) return;

        const progressContainer = event.currentTarget;
        const rect = progressContainer.getBoundingClientRect();
        const clickPosition = event.clientX - rect.left;
        const progressWidth = rect.width;
        const seekPercent = clickPosition / progressWidth;
        
        this.audioElement.currentTime = seekPercent * this.audioElement.duration;
    }

    handleFileSelection(file) {
        if (!this.supportedFormats.some(format => file.name.toLowerCase().endsWith(format))) {
            this.showNotification(`Unsupported file format. Supported: ${this.supportedFormats.join(', ')}`, 'error');
            return;
        }

        this.currentFile = file.name;
        this.errorCount = 0; // Reset error count on new file selection
        const fileURL = URL.createObjectURL(file);
        this.loadAudioFile(fileURL);
        
        // Save the file name to server storage
        this.saveLastPlayedFile(file.name);

        // Update UI
        this.updateUI();

        this.showNotification(`Loaded: ${file.name}`, 'success');
    }

    loadAudioFile(src) {
        if (this.audioElement) {
            // Prevent infinite loops by checking if we're already loading this source
            if (this.audioElement.src === src) {
                return;
            }
            
            this.audioElement.src = src;
            this.audioElement.load();
            
            // If loading the default file, ensure it's properly loaded
            if (src.includes('Slack-Huddle-Hold-Music_Daniel-Simmons.mp3')) {
                // Remove any existing error listeners to prevent duplicates
                this.audioElement.removeEventListener('error', this.handleDefaultFileError);
                
                // Create a bound error handler
                this.handleDefaultFileError = (e) => {
                    console.error('Failed to load default music file:', e);
                    // Only try alternative path once to prevent infinite loops
                    if (this.audioElement && !this.defaultFileErrorHandled) {
                        this.defaultFileErrorHandled = true;
                        this.audioElement.src = `./assets/${this.currentFile}`;
                        this.audioElement.load();
                    }
                };
                
                this.audioElement.addEventListener('error', this.handleDefaultFileError, { once: true });
                
                this.audioElement.addEventListener('canplaythrough', () => {
                    console.log('Default music file loaded successfully');
                    this.defaultFileErrorHandled = false; // Reset flag on success
                    this.errorCount = 0; // Reset error count on successful load
                }, { once: true });
            }
        }
    }

    // Save music settings to server storage
    async saveLastPlayedFile(filename) {
        try {
            await fetch('/api/settings/music', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    filename,
                    volume: this.volume,
                    loop: this.isLooping,
                    muted: this.isMuted
                })
            });
        } catch (error) {
            console.log('Failed to save music settings:', error);
        }
    }

    // Clear music settings from server storage
    async clearLastPlayedFile() {
        try {
            await fetch('/api/settings/music', {
                method: 'DELETE'
            });
        } catch (error) {
            console.log('Failed to clear music settings:', error);
        }
    }

    updateUI() {
        const statusIndicator = document.getElementById('music-status-indicator');
        const statusLabel = document.getElementById('music-status-label');
        const playPauseBtnMain = document.getElementById('play-pause-btn');
        const stopBtnMain = document.getElementById('stop-btn');
        const progressContainer = document.getElementById('progress-container');
        const fileNameDisplay = document.getElementById('current-file-name');
        const volumeDisplay = document.getElementById('volume-display');
        const loopBtn = document.getElementById('loop-btn');

        if (fileNameDisplay) {
            // Show "No music file loaded" if no file is actually loaded in the audio element
            fileNameDisplay.textContent = this.audioElement && this.audioElement.src ? this.currentFile : 'No music file loaded';
        }

        if (playPauseBtnMain) {
            // Enable play button only if we have a file actually loaded
            const hasFileLoaded = this.audioElement && this.audioElement.src;
            playPauseBtnMain.disabled = !hasFileLoaded;
            playPauseBtnMain.className = `flex items-center justify-center h-8 w-8 rounded-full shadow-lg transition-all duration-300 ${this.isPlaying ? 'bg-red-500 hover:bg-red-600' : hasFileLoaded ? 'bg-[var(--primary-color)] hover:bg-[var(--primary-color-dark)]' : 'bg-gray-500 hover:bg-gray-500 opacity-50 cursor-not-allowed'}`;
            playPauseBtnMain.innerHTML = `<span class="material-symbols-rounded text-white">${this.isPlaying ? 'pause' : 'play_arrow'}</span>`;
        }
        
        if (stopBtnMain) {
            // Stop button is grayed out when no file is loaded
            const hasFileLoaded = this.audioElement && this.audioElement.src;
            stopBtnMain.disabled = !hasFileLoaded;
            stopBtnMain.className = `flex items-center justify-center h-8 w-8 rounded-full border transition-colors ${!hasFileLoaded ? 'opacity-50 cursor-not-allowed text-gray-400 border-gray-400/30 bg-gray-500 hover:bg-gray-500' : 'text-red-400 hover:text-white hover:bg-red-400 border-red-400/30'}`;
        }
    
        if (loopBtn) {
            loopBtn.disabled = !this.currentFile;
            loopBtn.className = `flex items-center justify-center h-8 w-8 rounded-full transition-colors ${this.isLooping ? 'text-white bg-[var(--primary-color)]' : 'text-gray-400 bg-[#2A2A2A] hover:bg-gray-600'}`;
        }

        if (statusIndicator) {
            statusIndicator.className = `w-2 h-10 rounded-full ${this.isPlaying ? 'bg-[var(--live-color)] pulse-live' : this.isPaused ? 'bg-yellow-400' : 'bg-gray-600'}`;
        }
    
        if (statusLabel) {
            statusLabel.className = this.isPlaying ? 'text-[var(--live-color)]' : this.isPaused ? 'text-yellow-400' : 'text-gray-500';
            statusLabel.textContent = this.isPlaying ? 'Playing' : this.isPaused ? 'Paused' : 'Stopped';
        }

        if (progressContainer) {
            // Progress container is now always visible
            progressContainer.classList.remove('hidden');
        }

        if (volumeDisplay) {
            volumeDisplay.textContent = `${this.volume}%`;
        }
    }

    handleAudioError(error) {
        console.error('Audio error:', error);
        
        // Limit error notifications to prevent spam
        this.errorCount++;
        if (this.errorCount <= this.maxErrors) {
            // Only show error notification for user-initiated actions, not background loading
            if (this.currentFile && this.currentFile !== 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3') {
                this.showNotification('Error loading audio file', 'error');
            }
        }
        
        this.isPlaying = false;
        
        // Clear the saved file if it fails to load (but only for user files)
        if (this.currentFile && this.currentFile !== 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3') {
            this.clearLastPlayedFile();
            this.currentFile = null;
        }

        this.updateUI();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.audioElement) {
            this.audioElement.muted = this.isMuted;
        }

        this.updateUI();

        this.showNotification(this.isMuted ? 'Audio muted' : 'Audio unmuted', 'info');
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        
        if (this.audioElement && !this.isMuted) {
            this.audioElement.volume = this.volume / 100;
        }

        // Update slider tooltip
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.title = `${this.volume}%`;
        }

        this.updateUI();
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
        return `${minutes}:${remainingSeconds.toString().padStart(2, 0)}`;
    }

    showNotification(message, type = 'info') {
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
        
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Emergency stop method to prevent browser freezing
    emergencyStop() {
        console.log('Emergency stop triggered - clearing error state');
        this.errorCount = this.maxErrors + 1; // Stop all error notifications
        this.defaultFileErrorHandled = true; // Stop retry attempts
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.removeEventListener('error', this.handleDefaultFileError);
        }
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
            // Remove all event listeners to prevent memory leaks
            this.audioElement.removeEventListener('error', this.handleDefaultFileError);
            this.audioElement.pause();
            this.audioElement.remove();
            this.audioElement = null;
        }
        // Reset error tracking
        this.errorCount = 0;
        this.defaultFileErrorHandled = false;
    }

}

// Make available on window object for ComponentManager
if (typeof window !== 'undefined') {
    window.LobbyMusicPlayer = LobbyMusicPlayer;
    
    // Global emergency stop function to prevent browser freezing
    window.stopMusicPlayerErrors = function() {
        console.log('Global emergency stop triggered');
        // Find all music player instances and stop them
        if (window.currentMusicPlayer) {
            window.currentMusicPlayer.emergencyStop();
        }
        // Clear any existing error notifications
        const errorNotifications = document.querySelectorAll('.fixed.top-20.right-4.z-50.p-3.rounded-lg.shadow-lg.transition-all.duration-300.transform.bg-red-500.text-white');
        errorNotifications.forEach(notification => notification.remove());
    };
}
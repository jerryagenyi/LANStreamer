class EventManager {
    constructor() {
        this.eventDetails = {
            // Event configuration
            eventTitle: '',
            eventSubtitle: '',
            // About section configuration
            showAbout: true,
            aboutSubtitle: '',
            aboutDescription: '',
            showAboutSubtitle: true
        };
        this.isLoading = false;
        this.isCollapsed = true; // Collapsed by default
        this.init();
    }

    async init() {
        console.log('🎯 EventManager initializing...');
        await this.loadEventDetails();
        this.render();
        this.setupEventListeners();
    }

    async loadEventDetails() {
        try {
            console.log('🎯 Loading event details...');
            const response = await fetch('/api/contact-details');
            const data = await response.json();
            
            this.eventDetails = {
                // Event configuration
                eventTitle: data.eventTitle || '',
                eventSubtitle: data.eventSubtitle || '',
                // About section configuration
                showAbout: Boolean(data.showAbout !== false), // Default to true
                aboutSubtitle: data.aboutSubtitle || '',
                aboutDescription: data.aboutDescription || '',
                showAboutSubtitle: Boolean(data.showAboutSubtitle !== false) // Default to true
            };
            
            console.log('🎯 Event details loaded:', {
                hasEventTitle: !!this.eventDetails.eventTitle,
                hasEventSubtitle: !!this.eventDetails.eventSubtitle,
                showAbout: this.eventDetails.showAbout
            });
        } catch (error) {
            console.error('❌ Failed to load event details:', error);
            this.showNotification('Failed to load event details', 'error');
        }
    }

    validateEventForm() {
        const errors = [];

        // Validate event title length
        if (this.eventDetails.eventTitle && this.eventDetails.eventTitle.length > 100) {
            errors.push('Event title must be 100 characters or less');
        }

        // Validate event subtitle length
        if (this.eventDetails.eventSubtitle && this.eventDetails.eventSubtitle.length > 200) {
            errors.push('Event subtitle must be 200 characters or less');
        }

        // Validate about description length
        if (this.eventDetails.aboutDescription && this.eventDetails.aboutDescription.length > 1000) {
            errors.push('About description must be 1000 characters or less');
        }

        return errors;
    }

    async saveEventSettings() {
        console.log('🎯 saveEventSettings called');
        if (this.isLoading) {
            console.log('🎯 Already loading, returning');
            return;
        }

        // Validate form
        const validationErrors = this.validateEventForm();
        if (validationErrors.length > 0) {
            console.log('🎯 Validation errors:', validationErrors);
            this.showNotification(`Validation errors: ${validationErrors.join(', ')}`, 'error');
            return;
        }

        console.log('🎯 Starting event settings save process...');
        this.isLoading = true;
        this.updateSaveButton(true);

        try {
            console.log('🎯 Saving event settings...');
            const eventData = {
                eventTitle: this.eventDetails.eventTitle,
                eventSubtitle: this.eventDetails.eventSubtitle,
                showAbout: this.eventDetails.showAbout,
                aboutSubtitle: this.eventDetails.aboutSubtitle,
                aboutDescription: this.eventDetails.aboutDescription,
                showAboutSubtitle: this.eventDetails.showAboutSubtitle
            };

            const response = await fetch('/api/contact-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Event settings saved successfully');
                this.showNotification('Event settings saved successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to save event settings');
            }
        } catch (error) {
            console.error('❌ Failed to save event settings:', error);
            this.showNotification(`Failed to save event settings: ${error.message}`, 'error');
        } finally {
            this.isLoading = false;
            this.updateSaveButton(false);
        }
    }

    updateEventField(field, value) {
        this.eventDetails[field] = value;
        console.log(`🎯 Updated ${field}:`, value ? value.substring(0, 20) + '...' : 'empty');
    }

    toggleEventVisibility(field) {
        this.eventDetails[field] = !this.eventDetails[field];
        console.log(`🎯 Toggled ${field}:`, this.eventDetails[field]);
    }

    updateCharacterCount(counterId, currentLength, maxLength) {
        const counter = document.getElementById(counterId);
        if (counter) {
            counter.textContent = currentLength;
            const parent = counter.parentElement;
            if (currentLength > maxLength * 0.9) {
                parent.classList.add('text-yellow-500');
                parent.classList.remove('text-gray-500');
            } else if (currentLength >= maxLength) {
                parent.classList.add('text-red-500');
                parent.classList.remove('text-gray-500', 'text-yellow-500');
            } else {
                parent.classList.add('text-gray-500');
                parent.classList.remove('text-yellow-500', 'text-red-500');
            }
        }
    }

    render() {
        const container = document.getElementById('event-manager');
        if (!container) {
            console.error('❌ Event manager container not found');
            return;
        }

        container.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-white">🎯 Edit Event Details</h2>
                    <button id="toggle-event-section" class="text-gray-400 hover:text-white transition-colors">
                        <span class="material-symbols-rounded text-xl">${this.isCollapsed ? 'expand_more' : 'expand_less'}</span>
                    </button>
                </div>

                <div class="space-y-3 ${this.isCollapsed ? 'hidden' : ''}">
                    <!-- Event Configuration -->
                    <div class="border-b border-[var(--border-color)] pb-3 mb-3">
                        <h3 class="text-base font-semibold text-white mb-3">📅 Event Details</h3>
                        
                        <div class="space-y-3">
                            <!-- Event Title -->
                            <div class="space-y-1">
                                <label class="text-xs font-medium text-gray-300">Event Title</label>
                                <input type="text"
                                       id="event-title"
                                       maxlength="50"
                                       class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]"
                                       placeholder="Live Audio Streams"
                                       value="${this.eventDetails.eventTitle}">
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="event-title-count">${this.eventDetails.eventTitle.length}</span>/50 characters
                                </div>
                            </div>

                            <!-- Event Subtitle -->
                            <div class="space-y-1">
                                <label class="text-xs font-medium text-gray-300">Event Subtitle</label>
                                <input type="text"
                                       id="event-subtitle"
                                       maxlength="60"
                                       class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]"
                                       placeholder="Click play to listen to any available stream"
                                       value="${this.eventDetails.eventSubtitle}">
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="event-subtitle-count">${(this.eventDetails.eventSubtitle || '').length}</span>/60 characters
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- About Section Configuration -->
                    <div class="border-t border-[var(--border-color)] pt-3 mt-3">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-base font-semibold text-white">ℹ️ About Section</h3>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" 
                                       id="show-about" 
                                       class="sr-only peer" 
                                       ${this.eventDetails.showAbout ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                            </label>
                        </div>
                        
                        <div class="space-y-3">
                            <!-- About Subtitle -->
                            <div class="space-y-1">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-medium text-gray-300">About Subtitle</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" 
                                               id="show-about-subtitle" 
                                               class="sr-only peer" 
                                               ${this.eventDetails.showAboutSubtitle ? 'checked' : ''}>
                                        <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                                    </label>
                                </div>
                                <input type="text"
                                       id="about-subtitle"
                                       maxlength="60"
                                       class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]"
                                       placeholder="About this event"
                                       value="${this.eventDetails.aboutSubtitle}">
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="about-subtitle-count">${(this.eventDetails.aboutSubtitle || '').length}</span>/35 characters
                                </div>
                            </div>

                            <!-- About Description -->
                            <div class="space-y-1">
                                <label class="text-xs font-medium text-gray-300">About Description</label>
                                <textarea id="about-description"
                                          rows="3"
                                          maxlength="150"
                                          class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)] resize-none"
                                          placeholder="Welcome to LANStreamer - your local audio streaming platform. Listen to live audio streams from your network.">${this.eventDetails.aboutDescription}</textarea>
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="about-description-count">${(this.eventDetails.aboutDescription || '').length}</span>/150 characters
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <button id="save-event-settings" 
                            class="w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-gradient">
                        <span class="material-symbols-rounded text-base">event</span>
                        <span id="save-event-button-text">Save Event Settings</span>
                    </button>
                </div>
            </div>
        `;
    }

    renderPreview() {
        const previews = [];
        
        // Event title and subtitle
        if (this.eventDetails.eventTitle) {
            previews.push(`
                <div class="text-white font-semibold">${this.eventDetails.eventTitle}</div>
            `);
        }
        
        if (this.eventDetails.eventSubtitle) {
            previews.push(`
                <div class="text-gray-400">${this.eventDetails.eventSubtitle}</div>
            `);
        }
        
        // About section
        if (this.eventDetails.showAbout) {
            if (this.eventDetails.showAboutSubtitle && this.eventDetails.aboutSubtitle) {
                previews.push(`
                    <div class="text-white font-medium mt-2">${this.eventDetails.aboutSubtitle}</div>
                `);
            }
            
            if (this.eventDetails.aboutDescription) {
                previews.push(`
                    <div class="text-gray-400">${this.eventDetails.aboutDescription}</div>
                `);
            }
        }
        
        if (previews.length === 0) {
            return '<div class="text-gray-500 text-sm">No event information will be displayed</div>';
        }
        
        return previews.join('');
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.render();
    }

    setupEventListeners() {
        // Toggle collapse button
        document.getElementById('toggle-event-section')?.addEventListener('click', () => {
            this.toggleCollapse();
        });

        // Event configuration fields
        const eventTitleInput = document.getElementById('event-title');
        if (eventTitleInput) {
            eventTitleInput.addEventListener('input', (e) => {
                this.updateEventField('eventTitle', e.target.value);
                this.updateCharacterCount('event-title-count', e.target.value.length, 50);
            });
        }

        const eventSubtitleInput = document.getElementById('event-subtitle');
        if (eventSubtitleInput) {
            eventSubtitleInput.addEventListener('input', (e) => {
                this.updateEventField('eventSubtitle', e.target.value);
                this.updateCharacterCount('event-subtitle-count', e.target.value.length, 60);
            });
        }

        // About section fields
        const aboutSubtitleInput = document.getElementById('about-subtitle');
        if (aboutSubtitleInput) {
            aboutSubtitleInput.addEventListener('input', (e) => {
                this.updateEventField('aboutSubtitle', e.target.value);
                this.updateCharacterCount('about-subtitle-count', e.target.value.length, 35);
            });
        }

        const aboutDescriptionInput = document.getElementById('about-description');
        if (aboutDescriptionInput) {
            aboutDescriptionInput.addEventListener('input', (e) => {
                this.updateEventField('aboutDescription', e.target.value);
                this.updateCharacterCount('about-description-count', e.target.value.length, 150);
            });
        }

        // About section toggles
        const showAboutToggle = document.getElementById('show-about');
        if (showAboutToggle) {
            showAboutToggle.addEventListener('change', () => {
                this.toggleEventVisibility('showAbout');
            });
        }

        const showAboutSubtitleToggle = document.getElementById('show-about-subtitle');
        if (showAboutSubtitleToggle) {
            showAboutSubtitleToggle.addEventListener('change', () => {
                this.toggleEventVisibility('showAboutSubtitle');
            });
        }

        // Save button - with additional debugging
        const saveButton = document.getElementById('save-event-settings');
        if (saveButton) {
            console.log('🎯 Event save button found, adding event listener');

            // Remove any existing listeners first
            saveButton.replaceWith(saveButton.cloneNode(true));
            const newSaveButton = document.getElementById('save-event-settings');

            newSaveButton.addEventListener('click', (e) => {
                console.log('🎯 Event save button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.saveEventSettings();
            });

            // Also add a backup listener for any form submission
            const form = newSaveButton.closest('form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    console.log('🎯 Form submitted!');
                    e.preventDefault();
                    this.saveEventSettings();
                });
            }
        } else {
            console.error('❌ Event save button not found!');
        }
    }

    updatePreview() {
        const previewContainer = document.querySelector('#event-manager .space-y-2');
        if (previewContainer) {
            previewContainer.innerHTML = this.renderPreview();
        }
    }

    updateSaveButton(isLoading) {
        const saveButton = document.getElementById('save-event-settings');
        const saveButtonText = document.getElementById('save-event-button-text');
        
        if (saveButton && saveButtonText) {
            if (isLoading) {
                saveButton.disabled = true;
                saveButton.classList.add('opacity-50', 'cursor-not-allowed');
                saveButtonText.textContent = 'Saving...';
            } else {
                saveButton.disabled = false;
                saveButton.classList.remove('opacity-50', 'cursor-not-allowed');
                saveButtonText.textContent = 'Save Event Settings';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `fixed top-20 right-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        const colors = {
            'info': 'bg-blue-500',
            'success': 'bg-green-500', 
            'error': 'bg-red-500'
        };
        
        toast.className += ` ${colors[type] || colors.info} text-white`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Slide in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Slide out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Make it available globally
window.EventManager = EventManager;

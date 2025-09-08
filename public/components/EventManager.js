class EventManager {
    constructor(containerId = 'event-manager') {
        this.containerId = containerId;
        this.eventDetails = {
            // Event configuration
            eventTitle: '',
            eventSubtitle: '',
            eventImage: '',
            // About section configuration
            aboutDescription: ''
        };
        this.isLoading = false;
        this.isCollapsed = true; // Collapsed by default
        this.isInitialized = false;
        // Don't call init() here - let ComponentManager handle it
    }

    async init() {
        if (this.isInitialized) {
            console.log('🎯 EventManager already initialized, skipping...');
            return;
        }

        console.log('🎯 EventManager initializing...');
        await this.loadEventDetails();
        this.render();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ EventManager initialization complete');
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
                eventImage: data.eventImage || '',
                // About section configuration
                aboutDescription: data.aboutDescription || ''
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

        // Collect current form values before validation and saving
        this.collectFormValues();

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
                eventImage: this.eventDetails.eventImage,
                aboutDescription: this.eventDetails.aboutDescription
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

                // Collapse the form after successful save to provide visual feedback
                setTimeout(() => {
                    const formContent = document.querySelector(`#${this.containerId} .space-y-3:not(.hidden)`);
                    if (formContent) {
                        // Add smooth closing animation
                        formContent.style.transition = 'all 0.3s ease-out';
                        formContent.style.opacity = '0';
                        formContent.style.transform = 'translateY(-10px)';

                        setTimeout(() => {
                            this.isCollapsed = true;
                            this.render();
                        }, 300); // Wait for animation to complete
                    } else {
                        this.isCollapsed = true;
                        this.render();
                    }
                }, 1000); // Small delay to let user see the success message
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

    collectFormValues() {
        console.log('🎯 Collecting current form values...');

        // Collect values from form inputs
        const eventTitleInput = document.getElementById('event-title');
        const eventSubtitleInput = document.getElementById('event-subtitle');
        const aboutDescriptionInput = document.getElementById('about-description');

        if (eventTitleInput) {
            this.eventDetails.eventTitle = eventTitleInput.value;
        }
        if (eventSubtitleInput) {
            this.eventDetails.eventSubtitle = eventSubtitleInput.value;
        }
        if (aboutDescriptionInput) {
            this.eventDetails.aboutDescription = aboutDescriptionInput.value;
        }

        console.log('🎯 Form values collected:', {
            eventTitle: this.eventDetails.eventTitle,
            eventSubtitle: this.eventDetails.eventSubtitle,
            aboutDescription: this.eventDetails.aboutDescription
        });
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
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Event manager container not found: ${this.containerId}`);
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
                    <div class="space-y-3">
                        <h3 class="text-base font-semibold text-white mb-3">📅 Event Details</h3>

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

                    <!-- About The Event Configuration -->
                    <div class="border-t border-[var(--border-color)] pt-4 mt-4">
                        <h3 class="text-base font-semibold text-white mb-3">ℹ️ About The Event</h3>

                        <div class="space-y-3">
                            <div class="space-y-1">
                                <textarea id="about-description"
                                          rows="4"
                                          maxlength="200"
                                          class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)] resize-none"
                                          placeholder="Describe your event, its purpose, and what attendees can expect">${this.eventDetails.aboutDescription}</textarea>
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="about-description-count">${(this.eventDetails.aboutDescription || '').length}</span>/200 characters
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Event Image Upload -->
                    <div class="border-t border-[var(--border-color)] pt-4 mt-4">
                        <h3 class="text-base font-semibold text-white mb-3">🖼️ Event Image</h3>

                        <div class="space-y-3">
                            <!-- Current Image Preview -->
                            ${this.eventDetails.eventImage ? `
                                <div class="relative group">
                                    <img src="${this.eventDetails.eventImage}"
                                         alt="Event Image"
                                         class="w-full max-w-md h-48 object-cover rounded-lg border border-[var(--border-color)]">
                                    <button id="remove-event-image"
                                            type="button"
                                            class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-200 opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[var(--card-bg)]"
                                            title="Remove image">
                                        <span class="material-symbols-rounded text-base">close</span>
                                    </button>
                                </div>
                            ` : ''}

                            <!-- Image Upload -->
                            <div class="flex items-center gap-3">
                                <input type="file"
                                       id="event-image-upload"
                                       accept="image/*"
                                       class="hidden">
                                <button id="upload-event-image"
                                        class="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 text-white rounded-lg text-sm font-medium transition-colors">
                                    <span class="material-symbols-rounded text-sm">upload</span>
                                    ${this.eventDetails.eventImage ? 'Change Image' : 'Upload Image'}
                                </button>
                                <span class="text-xs text-gray-400">
                                    Recommended: Square (1:1) or Landscape (16:9) format, max 2MB
                                </span>
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

        // Re-setup dynamic event listeners after DOM update
        this.setupDynamicEventListeners();
    }

    setupDynamicEventListeners() {
        console.log('🔧 Setting up dynamic event listeners after render...');

        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            // Setup save button listener
            console.log('💾 Setting up save button listener after render...');
            const saveButton = document.getElementById('save-event-settings');
            if (saveButton) {
                console.log('💾 Save button found, adding listener...');
                // Clear any existing listeners
                saveButton.onclick = null;

                saveButton.addEventListener('click', (e) => {
                    console.log('💾 SAVE BUTTON CLICKED!');
                    e.preventDefault();
                    e.stopPropagation();
                    this.saveEventSettings();
                });
                console.log('💾 Save button listener added successfully');
            } else {
                console.error('❌ Save button not found after render!');
            }

            // Re-setup input field listeners after render
            console.log('🔧 Setting up input field listeners after render...');

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
            const aboutDescriptionInput = document.getElementById('about-description');
            if (aboutDescriptionInput) {
                aboutDescriptionInput.addEventListener('input', (e) => {
                    this.updateEventField('aboutDescription', e.target.value);
                    this.updateCharacterCount('about-description-count', e.target.value.length, 200);
                });
            }

            // Setup upload button listener
            console.log('🖼️ Setting up upload button listener after render...');
            const uploadImageButton = document.getElementById('upload-event-image');
            const imageUploadInput = document.getElementById('event-image-upload');

            if (uploadImageButton && imageUploadInput) {
                console.log('🖼️ Upload button found, adding listener...');
                // Clear any existing listeners
                uploadImageButton.onclick = null;
                imageUploadInput.onchange = null;

                uploadImageButton.addEventListener('click', (e) => {
                    console.log('🖼️ UPLOAD BUTTON CLICKED!');
                    e.preventDefault();
                    e.stopPropagation();
                    imageUploadInput.click();
                });

                imageUploadInput.addEventListener('change', (e) => {
                    console.log('🖼️ FILE INPUT CHANGED!');
                    this.handleImageUpload(e);
                });

                console.log('🖼️ Upload button listener added successfully');
            } else {
                console.error('❌ Upload button or input not found after render!');
            }

            // Setup remove image button listener (only exists if image is present)
            const removeImageButton = document.getElementById('remove-event-image');
            if (removeImageButton) {
                console.log('🖼️ Setting up remove button listener after render...');
                removeImageButton.addEventListener('click', (e) => {
                    console.log('🖼️ Remove button clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeEventImage();
                });
            }

            console.log('✅ All dynamic event listeners setup complete');
        }, 10);
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
        console.log('🔧 Setting up initial event listeners...');

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

        // Dynamic buttons (save, upload, remove) will be handled by setupDynamicEventListeners

        // About section fields
        const aboutDescriptionInput = document.getElementById('about-description');
        if (aboutDescriptionInput) {
            aboutDescriptionInput.addEventListener('input', (e) => {
                this.updateEventField('aboutDescription', e.target.value);
                this.updateCharacterCount('about-description-count', e.target.value.length, 200);
            });
        }

        // Dynamic buttons (save, upload, remove) will be handled by setupDynamicEventListeners
        console.log('✅ Initial event listeners setup complete');


    }

    updatePreview() {
        const previewContainer = document.querySelector(`#${this.containerId} .space-y-2`);
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

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('Image size must be less than 2MB', 'error');
            return;
        }

        try {
            console.log('🖼️ Uploading event image...');
            const formData = new FormData();
            formData.append('eventImage', file);

            const response = await fetch('/api/upload-event-image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.eventDetails.eventImage = data.imageUrl;
                console.log('✅ Event image uploaded successfully:', data.imageUrl);
                this.showNotification('Event image uploaded successfully', 'success');
                this.render(); // Re-render to show the new image
            } else {
                throw new Error(data.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('❌ Failed to upload event image:', error);
            this.showNotification(`Failed to upload image: ${error.message}`, 'error');
        }

        // Clear the input
        event.target.value = '';
    }

    async removeEventImage() {
        try {
            console.log('🗑️ Removing event image...');

            const response = await fetch('/api/remove-event-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageUrl: this.eventDetails.eventImage
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.eventDetails.eventImage = '';
                console.log('✅ Event image removed successfully');
                this.showNotification('Event image removed successfully', 'success');
                this.render(); // Re-render to hide the image
            } else {
                throw new Error(data.error || 'Failed to remove image');
            }
        } catch (error) {
            console.error('❌ Failed to remove event image:', error);
            this.showNotification(`Failed to remove image: ${error.message}`, 'error');
        }
    }
}

// Make it available globally
window.EventManager = EventManager;

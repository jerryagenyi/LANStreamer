class ContactManager {
    constructor() {
        this.contactDetails = {
            email: '',
            phone: '',
            whatsapp: '',
            showEmail: false,
            showPhone: false,
            showWhatsapp: false,
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
        this.init();
    }

    async init() {
        console.log('📞 ContactManager initializing...');
        await this.loadContactDetails();
        this.render();
        this.setupEventListeners();
    }

    async loadContactDetails() {
        try {
            console.log('📞 Loading contact details...');
            const response = await fetch('/api/contact-details');
            const data = await response.json();
            
            this.contactDetails = {
                email: data.email || '',
                phone: data.phone || '',
                whatsapp: data.whatsapp || '',
                showEmail: Boolean(data.showEmail),
                showPhone: Boolean(data.showPhone),
                showWhatsapp: Boolean(data.showWhatsapp),
                // Event configuration
                eventTitle: data.eventTitle || '',
                eventSubtitle: data.eventSubtitle || '',
                // About section configuration
                showAbout: Boolean(data.showAbout !== false), // Default to true
                aboutSubtitle: data.aboutSubtitle || '',
                aboutDescription: data.aboutDescription || '',
                showAboutSubtitle: Boolean(data.showAboutSubtitle !== false) // Default to true
            };
            
            console.log('📞 Contact details loaded:', {
                hasEmail: !!this.contactDetails.email,
                hasPhone: !!this.contactDetails.phone,
                hasWhatsapp: !!this.contactDetails.whatsapp
            });
        } catch (error) {
            console.error('❌ Failed to load contact details:', error);
            this.showNotification('Failed to load contact details', 'error');
        }
    }

    validateForm() {
        const errors = [];
        
        // Validate email if showEmail is enabled
        if (this.contactDetails.showEmail && this.contactDetails.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.contactDetails.email)) {
                errors.push('Please enter a valid email address');
            }
        }
        
        // Validate phone if showPhone is enabled
        if (this.contactDetails.showPhone && this.contactDetails.phone) {
            const phoneRegex = /^\+?[1-9]\d{6,14}$/;
            const cleanedPhone = this.contactDetails.phone.replace(/[^\d+]/g, '');
            if (!phoneRegex.test(cleanedPhone)) {
                errors.push('Please enter a valid phone number');
            }
        }
        
        // Validate WhatsApp if showWhatsapp is enabled
        if (this.contactDetails.showWhatsapp && this.contactDetails.whatsapp) {
            const phoneRegex = /^\+?[1-9]\d{6,14}$/;
            const cleanedWhatsapp = this.contactDetails.whatsapp.replace(/[^\d+]/g, '');
            if (!phoneRegex.test(cleanedWhatsapp)) {
                errors.push('Please enter a valid WhatsApp number');
            }
        }
        
        return errors;
    }

    async saveContactDetails() {
        if (this.isLoading) return;
        
        // Basic form validation
        const validationErrors = this.validateForm();
        if (validationErrors.length > 0) {
            this.showNotification(`Validation errors: ${validationErrors.join(', ')}`, 'error');
            return;
        }
        
        this.isLoading = true;
        this.updateSaveButton(true);

        try {
            console.log('📞 Saving contact details...');
            const response = await fetch('/api/contact-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.contactDetails)
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Contact details saved successfully');
                this.showNotification('All settings saved successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to save contact details');
            }
        } catch (error) {
            console.error('❌ Failed to save contact details:', error);
            this.showNotification(`Failed to save: ${error.message}`, 'error');
        } finally {
            this.isLoading = false;
            this.updateSaveButton(false);
        }
    }

    updateContactField(field, value) {
        this.contactDetails[field] = value;
        console.log(`📞 Updated ${field}:`, value ? '***' : 'empty');
    }

    toggleContactVisibility(field) {
        this.contactDetails[field] = !this.contactDetails[field];
        console.log(`📞 Toggled ${field}:`, this.contactDetails[field]);
    }

    render() {
        const container = document.getElementById('contact-manager');
        if (!container) {
            console.error('❌ Contact manager container not found');
            return;
        }

        container.innerHTML = `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-white">📞 Contact Information</h2>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400">Public Display</span>
                    </div>
                </div>

                <div class="space-y-4">
                    <!-- Email -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-sm font-medium text-gray-300">📧 Email Address</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" 
                                       id="show-email" 
                                       class="sr-only peer" 
                                       ${this.contactDetails.showEmail ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                            </label>
                        </div>
                        <input type="email" 
                               id="contact-email" 
                               class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                               placeholder="admin@example.com" 
                               value="${this.contactDetails.email}">
                    </div>

                    <!-- Phone -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-sm font-medium text-gray-300">📱 Phone Number</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" 
                                       id="show-phone" 
                                       class="sr-only peer" 
                                       ${this.contactDetails.showPhone ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                            </label>
                        </div>
                        <input type="tel" 
                               id="contact-phone" 
                               class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                               placeholder="+1 (234) 567-8900" 
                               value="${this.contactDetails.phone}">
                    </div>

                    <!-- WhatsApp -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-sm font-medium text-gray-300">💬 WhatsApp</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" 
                                       id="show-whatsapp" 
                                       class="sr-only peer" 
                                       ${this.contactDetails.showWhatsapp ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                            </label>
                        </div>
                        <input type="tel" 
                               id="contact-whatsapp" 
                               class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                               placeholder="+1 (234) 567-8900" 
                               value="${this.contactDetails.whatsapp}">
                    </div>

                    <!-- Event Configuration -->
                    <div class="border-t border-[var(--border-color)] pt-4 mt-4">
                        <h3 class="text-lg font-semibold text-white mb-4">🎯 Event Configuration</h3>
                        
                        <div class="space-y-4">
                            <!-- Event Title -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-300">Event Title</label>
                                <input type="text" 
                                       id="event-title" 
                                       class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                                       placeholder="Live Audio Streams" 
                                       value="${this.contactDetails.eventTitle}">
                            </div>

                            <!-- Event Subtitle -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-300">Event Subtitle</label>
                                <input type="text" 
                                       id="event-subtitle" 
                                       class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                                       placeholder="Click play to listen to any available stream" 
                                       value="${this.contactDetails.eventSubtitle}">
                            </div>
                        </div>
                    </div>

                    <!-- About Section Configuration -->
                    <div class="border-t border-[var(--border-color)] pt-4 mt-4">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold text-white">ℹ️ About Section</h3>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" 
                                       id="show-about" 
                                       class="sr-only peer" 
                                       ${this.contactDetails.showAbout ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                            </label>
                        </div>
                        
                        <div class="space-y-4">
                            <!-- About Subtitle -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-sm font-medium text-gray-300">About Subtitle</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" 
                                               id="show-about-subtitle" 
                                               class="sr-only peer" 
                                               ${this.contactDetails.showAboutSubtitle ? 'checked' : ''}>
                                        <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                                    </label>
                                </div>
                                <input type="text" 
                                       id="about-subtitle" 
                                       class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                                       placeholder="About this event" 
                                       value="${this.contactDetails.aboutSubtitle}">
                            </div>

                            <!-- About Description -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-300">About Description</label>
                                <textarea id="about-description" 
                                          rows="3"
                                          class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)] resize-none" 
                                          placeholder="Welcome to LANStreamer - your local audio streaming platform. Listen to live audio streams from your network.">${this.contactDetails.aboutDescription}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <button id="save-contact-details" 
                            class="w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-gradient">
                        <span class="material-symbols-rounded text-base">save</span>
                        <span id="save-button-text">Save All Settings</span>
                    </button>

                    <!-- Preview -->
                    <div class="mt-6 p-4 bg-[#111111] border border-[var(--border-color)] rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3">👁️ Public Preview</h4>
                        <div class="space-y-2 text-sm">
                            ${this.renderPreview()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPreview() {
        const previews = [];
        
        if (this.contactDetails.showEmail && this.contactDetails.email) {
            previews.push(`
                <div class="flex items-center gap-2 text-gray-400">
                    <span class="material-symbols-rounded text-sm">email</span>
                    <span>${this.contactDetails.email}</span>
                </div>
            `);
        }
        
        if (this.contactDetails.showPhone && this.contactDetails.phone) {
            previews.push(`
                <div class="flex items-center gap-2 text-gray-400">
                    <span class="material-symbols-rounded text-sm">phone</span>
                    <span>${this.contactDetails.phone}</span>
                </div>
            `);
        }
        
        if (this.contactDetails.showWhatsapp && this.contactDetails.whatsapp) {
            previews.push(`
                <div class="flex items-center gap-2 text-gray-400">
                    <span class="material-symbols-rounded text-sm">chat</span>
                    <span>WhatsApp Chat</span>
                </div>
            `);
        }
        
        if (previews.length === 0) {
            return '<div class="text-gray-500 text-sm">No contact information will be displayed</div>';
        }
        
        return previews.join('');
    }

    setupEventListeners() {
        // Email field
        const emailInput = document.getElementById('contact-email');
        if (emailInput) {
            emailInput.addEventListener('input', (e) => {
                this.updateContactField('email', e.target.value);
            });
        }

        // Phone field
        const phoneInput = document.getElementById('contact-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.updateContactField('phone', e.target.value);
            });
        }

        // WhatsApp field
        const whatsappInput = document.getElementById('contact-whatsapp');
        if (whatsappInput) {
            whatsappInput.addEventListener('input', (e) => {
                this.updateContactField('whatsapp', e.target.value);
            });
        }

        // Toggle switches
        const showEmailToggle = document.getElementById('show-email');
        if (showEmailToggle) {
            showEmailToggle.addEventListener('change', () => {
                this.toggleContactVisibility('showEmail');
                this.render(); // Re-render to update preview
            });
        }

        const showPhoneToggle = document.getElementById('show-phone');
        if (showPhoneToggle) {
            showPhoneToggle.addEventListener('change', () => {
                this.toggleContactVisibility('showPhone');
                this.render(); // Re-render to update preview
            });
        }

        const showWhatsappToggle = document.getElementById('show-whatsapp');
        if (showWhatsappToggle) {
            showWhatsappToggle.addEventListener('change', () => {
                this.toggleContactVisibility('showWhatsapp');
                this.render(); // Re-render to update preview
            });
        }

        // Event configuration fields
        const eventTitleInput = document.getElementById('event-title');
        if (eventTitleInput) {
            eventTitleInput.addEventListener('input', (e) => {
                this.updateContactField('eventTitle', e.target.value);
            });
        }

        const eventSubtitleInput = document.getElementById('event-subtitle');
        if (eventSubtitleInput) {
            eventSubtitleInput.addEventListener('input', (e) => {
                this.updateContactField('eventSubtitle', e.target.value);
            });
        }

        // About section fields
        const aboutSubtitleInput = document.getElementById('about-subtitle');
        if (aboutSubtitleInput) {
            aboutSubtitleInput.addEventListener('input', (e) => {
                this.updateContactField('aboutSubtitle', e.target.value);
            });
        }

        const aboutDescriptionInput = document.getElementById('about-description');
        if (aboutDescriptionInput) {
            aboutDescriptionInput.addEventListener('input', (e) => {
                this.updateContactField('aboutDescription', e.target.value);
            });
        }

        // About section toggles
        const showAboutToggle = document.getElementById('show-about');
        if (showAboutToggle) {
            showAboutToggle.addEventListener('change', () => {
                this.toggleContactVisibility('showAbout');
                this.render(); // Re-render to update preview
            });
        }

        const showAboutSubtitleToggle = document.getElementById('show-about-subtitle');
        if (showAboutSubtitleToggle) {
            showAboutSubtitleToggle.addEventListener('change', () => {
                this.toggleContactVisibility('showAboutSubtitle');
                this.render(); // Re-render to update preview
            });
        }

        // Save button
        const saveButton = document.getElementById('save-contact-details');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveContactDetails();
            });
        }
    }

    updateSaveButton(isLoading) {
        const saveButton = document.getElementById('save-contact-details');
        const saveButtonText = document.getElementById('save-button-text');
        
        if (saveButton && saveButtonText) {
            if (isLoading) {
                saveButton.disabled = true;
                saveButton.classList.add('opacity-50', 'cursor-not-allowed');
                saveButtonText.textContent = 'Saving...';
            } else {
                saveButton.disabled = false;
                saveButton.classList.remove('opacity-50', 'cursor-not-allowed');
                saveButtonText.textContent = 'Save Contact Details';
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
window.ContactManager = ContactManager;

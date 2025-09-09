class ContactManager {
    constructor() {
        this.contactDetails = {
            email: '',
            phone: '',
            whatsapp: '',
            showEmail: false,
            showPhone: false,
            showWhatsapp: false
        };
        this.isLoading = false;
        this.isCollapsed = true; // Collapsed by default

        // Rate limiting for saves
        this.saveTimeout = null;
        this.saveDebounceMs = 500;
        this.lastSaveTime = 0;
        this.minSaveInterval = 1000; // Minimum 1 second between saves

        this.init();
    }

    async init() {
        console.log('📞 ContactManager initializing...');
        await this.loadContactDetails();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Sanitize input to prevent XSS and injection attacks
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }

        // Remove HTML tags and dangerous characters
        return input
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[<>'"&]/g, (match) => { // Escape dangerous characters
                const escapeMap = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return escapeMap[match];
            })
            .trim()
            .substring(0, 500); // Limit length
    }

    /**
     * Sanitize and validate email
     */
    sanitizeEmail(email) {
        const sanitized = this.sanitizeInput(email);
        // Additional email-specific sanitization
        return sanitized.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    }

    /**
     * Sanitize and validate phone number
     */
    sanitizePhone(phone) {
        const sanitized = this.sanitizeInput(phone);
        // Keep only digits, plus, spaces, hyphens, parentheses
        return sanitized.replace(/[^0-9+\s\-()]/g, '');
    }

    /**
     * Sanitize URL
     */
    sanitizeUrl(url) {
        const sanitized = this.sanitizeInput(url);
        // Basic URL validation - must start with http:// or https://
        if (sanitized && !sanitized.match(/^https?:\/\//)) {
            return 'https://' + sanitized;
        }
        return sanitized;
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
                showWhatsapp: Boolean(data.showWhatsapp)
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
                errors.push('Please enter a valid phone number (e.g., +1234567890 or 1234567890)');
            }
        }

        // Validate WhatsApp if showWhatsapp is enabled
        if (this.contactDetails.showWhatsapp && this.contactDetails.whatsapp) {
            const whatsappRegex = /^\+?[1-9]\d{6,14}$/;
            const cleanedWhatsapp = this.contactDetails.whatsapp.replace(/[^\d+]/g, '');
            if (!whatsappRegex.test(cleanedWhatsapp)) {
                errors.push('Please enter a valid WhatsApp number (e.g., +1234567890 or 1234567890)');
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



    /**
     * Debounced save to prevent API spam
     */
    saveContactDetails() {
        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Set new timeout for debounced save
        this.saveTimeout = setTimeout(() => {
            this.performSave();
        }, this.saveDebounceMs);
    }

    /**
     * Perform the actual save with rate limiting
     */
    async performSave() {
        console.log('📞 performSave called');

        // Rate limiting check
        const now = Date.now();
        if (now - this.lastSaveTime < this.minSaveInterval) {
            console.log('📞 Rate limited, scheduling retry');
            setTimeout(() => this.performSave(), this.minSaveInterval - (now - this.lastSaveTime));
            return;
        }

        if (this.isLoading) {
            console.log('📞 Already loading, returning');
            return;
        }

        this.lastSaveTime = now;
        
        // Basic form validation for contact fields only
        const validationErrors = this.validateForm();
        if (validationErrors.length > 0) {
            console.log('📞 Validation errors:', validationErrors);
            this.showNotification(`Validation errors: ${validationErrors.join(', ')}`, 'error');
            return;
        }
        
        console.log('📞 Starting contact details save process...');
        this.isLoading = true;
        this.updateSaveButton(true);

        try {
            console.log('📞 Saving contact details...');

            // Sanitize all inputs before sending to API
            const contactData = {
                email: this.sanitizeEmail(this.contactDetails.email),
                phone: this.sanitizePhone(this.contactDetails.phone),
                whatsapp: this.sanitizePhone(this.contactDetails.whatsapp),
                showEmail: Boolean(this.contactDetails.showEmail),
                showPhone: Boolean(this.contactDetails.showPhone),
                showWhatsapp: Boolean(this.contactDetails.showWhatsapp)
            };

            console.log('📞 Sanitized contact data:', contactData);

            const response = await fetch('/api/contact-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Contact details saved successfully');
                this.showNotification('Contact details saved successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to save contact details');
            }
        } catch (error) {
            console.error('❌ Failed to save contact details:', error);
            this.showNotification(`Failed to save contact details: ${error.message}`, 'error');
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
                    <h2 class="text-lg font-bold text-white">📞 Your Feedback Contact</h2>
                    <button id="toggle-contact-section" class="text-gray-400 hover:text-white transition-colors">
                        <span class="material-symbols-rounded text-xl">${this.isCollapsed ? 'expand_more' : 'expand_less'}</span>
                    </button>
                </div>

                <div class="space-y-3 ${this.isCollapsed ? 'hidden' : ''}">
                    <!-- Email -->
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <label class="text-xs font-medium text-gray-300">📧 Email Address</label>
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
                               class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                               placeholder="admin@example.com" 
                               value="${this.contactDetails.email}">
                    </div>

                    <!-- Phone -->
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <label class="text-xs font-medium text-gray-300">📱 Phone Number</label>
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
                               class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                               placeholder="+1 (234) 567-8900" 
                               value="${this.contactDetails.phone}">
                    </div>

                    <!-- WhatsApp -->
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <label class="text-xs font-medium text-gray-300">💬 WhatsApp</label>
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
                               class="w-full px-3 py-2 bg-[#111111] border border-[var(--border-color)] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:border-[var(--primary-color)]" 
                               placeholder="+1 (234) 567-8900" 
                               value="${this.contactDetails.whatsapp}">
                    </div>

                    <!-- Save Button -->
                    <button id="save-contact-details" 
                            class="w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 btn-gradient">
                        <span class="material-symbols-rounded text-base">contact_phone</span>
                        <span id="save-contact-button-text">Save Contact Details</span>
                    </button>
                </div>
            </div>
        `;
    }

    updatePreview() {
        const previewContainer = document.querySelector('#contact-manager .space-y-2');
        if (previewContainer) {
            previewContainer.innerHTML = this.renderPreview();
        }
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

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.render();
    }

    setupEventListeners() {
        // Toggle collapse button
        document.getElementById('toggle-contact-section')?.addEventListener('click', () => {
            this.toggleCollapse();
        });

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
                this.updatePreview(); // Update preview without full re-render
            });
        }

        const showPhoneToggle = document.getElementById('show-phone');
        if (showPhoneToggle) {
            showPhoneToggle.addEventListener('change', () => {
                this.toggleContactVisibility('showPhone');
                this.updatePreview(); // Update preview without full re-render
            });
        }

        const showWhatsappToggle = document.getElementById('show-whatsapp');
        if (showWhatsappToggle) {
            showWhatsappToggle.addEventListener('change', () => {
                this.toggleContactVisibility('showWhatsapp');
                this.updatePreview(); // Update preview without full re-render
            });
        }

        // Contact Details Save button
        const saveContactButton = document.getElementById('save-contact-details');
        if (saveContactButton) {
            console.log('📞 Contact save button found, adding event listener');
            saveContactButton.addEventListener('click', (e) => {
                console.log('📞 Contact save button clicked!');
                e.preventDefault();
                this.saveContactDetails();
            });
        } else {
            console.error('❌ Contact save button not found!');
        }
    }

    updateSaveButton(isLoading) {
        const saveButton = document.getElementById('save-contact-details');
        const saveButtonText = document.getElementById('save-contact-button-text');
        
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

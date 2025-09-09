/**
 * Component Manager
 * Handles conditional rendering between components and static content
 * Shows development status and graceful fallbacks
 * At production, to replace static elements with error messages and what to do to fix it
 * 
 * DEPENDENCIES & INTEGRATION:
 * ===========================
 * Component Classes (Expected on window object):
 * - LobbyMusicPlayer - Background music player component
 * - IcecastManager - Icecast server management component
 * - StreamControlPanel - Stream control interface (future)
 * - AudioDeviceSelector - Audio device selection (future)
 * - FFmpegStreamsPanel - FFmpeg stream management (future)
 * - VideoSourcesPanel - Video source management (future)
 * 
 * HTML Structure Requirements:
 * - Main container IDs must match componentRegistry keys
 * - Static fallback containers with IDs ending in '-static'
 * - Material Symbols icons for status indicators
 * - Tailwind CSS classes for styling
 * 
 * Component Registration System:
 * - componentRegistry object defines all available sections
 * - Each section has component class name and static fallback ID
 * - Components must be available on window object
 * - Static content serves as development fallback
 * 
 * Browser APIs:
 * - DOM manipulation and event handling
 * - ES6 modules and class instantiation
 * - Async/await for component initialization
 * - Error handling and fallback mechanisms
 * 
 * WORKFLOW:
 * =========
 * 1. INITIALIZATION:
 *    - Scan componentRegistry for all registered sections
 *    - Check if component classes exist on window object
 *    - Initialize components or fall back to static content
 *    - Add development status indicators to each section
 * 
 * 2. COMPONENT LOADING:
 *    - Attempt to instantiate component class
 *    - Pass container ID to component constructor
 *    - Store component instance for future reference
 *    - Handle initialization errors gracefully
 * 
 * 3. STATIC FALLBACK:
 *    - If component class not found, use static content
 *    - Move static HTML from fallback container to main container
 *    - Add notice about using static content
 *    - Maintain functionality without interactive features
 * 
 * 4. STATUS REPORTING:
 *    - Track which sections use components vs static content
 *    - Provide development status overview
 *    - Log component availability and initialization results
 *    - Enable debugging and development tracking
 * 
 * 5. COMPONENT MANAGEMENT:
 *    - Store references to all component instances
 *    - Provide access to components via getComponent()
 *    - Handle component cleanup and destruction
 *    - Support dynamic component refresh and reload
 * 
 * 6. ERROR HANDLING:
 *    - Graceful fallback when components fail to load
 *    - User-friendly error messages and status indicators
 *    - Development mode notifications and debugging info
 *    - Recovery mechanisms for failed initializations
 * 
 * DEVELOPMENT FEATURES:
 * =====================
 * - Visual indicators for component vs static usage
 * - Console logging for debugging and development
 * - Component refresh capabilities for testing
 * - Status reporting for development progress tracking
 * - Graceful degradation when components unavailable
 * 
 * INTEGRATION PATTERNS:
 * =====================
 * - Components must follow standard constructor pattern
 * - Components should implement destroy() method
 * - Static content should provide basic functionality
 * - Status indicators show development progress
 * - Error boundaries prevent complete failure
 */
class ComponentManager {
    constructor() {
        this.components = new Map();
        this.staticSections = new Map();
        this.componentRegistry = {
            'lobby-music-player': {
                component: 'LobbyMusicPlayer',
                static: 'lobby-music-static',
                name: 'Lobby Background Music'
            },
            // Future components will be registered here
            'audio-devices': {
                component: 'AudioDeviceSelector',
                static: 'audio-devices-static',
                name: 'Audio Devices'
            },
            'icecast-server': {
                component: 'IcecastManager',
                static: 'icecast-server-static',
                name: 'Icecast Server'
            },
            'ffmpeg-streams': {
                component: 'FFmpegStreamsManager',
                static: 'ffmpeg-streams-static',
                name: 'FFmpeg Streams'
            },
            'video-sources': {
                component: 'VideoSourcesPanel',
                static: 'video-sources-static',
                name: 'Video Sources'
            },
            'event-manager': {
                component: 'EventManager',
                static: 'event-manager-static',
                name: 'Event Configuration'
            },
            'contact-manager': {
                component: 'ContactManager',
                static: 'contact-manager-static',
                name: 'Contact Information'
            }
        };
    }

    /**
     * Initialize all registered sections
     */
    async initializeAll() {
        for (const [sectionId, config] of Object.entries(this.componentRegistry)) {
            await this.initializeSection(sectionId, config);
        }
    }

    /**
     * Initialize a specific section with component or fallback to static
     */
    async initializeSection(sectionId, config) {
        console.log(`🔧 Initializing section: ${sectionId} with config:`, config);
        const container = document.getElementById(sectionId);
        if (!container) {
            console.warn(`❌ Container '${sectionId}' not found`);
            return;
        }

        try {
            // Enhanced dependency validation
            const ComponentClass = window[config.component];
            console.log(`🔍 Component class ${config.component} for ${sectionId}:`, ComponentClass, 'Type:', typeof ComponentClass);

            // Enhanced error logging as requested
            if (!ComponentClass) {
                console.error(`❌ Component ${config.component} not found on window for ${sectionId}`);
                console.log(`🔍 Available components on window:`, Object.keys(window).filter(key => key.includes('Manager') || key.includes('Player')));
                this.useEmergencyFallback(sectionId, config);
                return;
            }

            // Comprehensive component availability check
            const isComponentAvailable = this.validateComponentDependency(config.component, ComponentClass);

            // Always show debug info in browser environment
            console.log(`🔍 Component class for ${sectionId}:`, ComponentClass, 'Type:', typeof ComponentClass);
            console.log(`🔍 Looking for component: ${config.component} on window object`);
            console.log(`🔍 Available components on window:`, Object.keys(window).filter(key => key.includes('Manager') || key.includes('Player')));

            // Debug logging for component availability
            if (sectionId === 'ffmpeg-streams') {
                console.log('🎤 FFmpeg Streams Debug:');
                console.log('- Container exists:', !!document.getElementById(sectionId));
                console.log('- Component class:', ComponentClass);
            }

            if (isComponentAvailable) {
                // Component exists and is valid - use it
                await this.useComponent(sectionId, ComponentClass, config);
            } else {
                // Component doesn't exist or is invalid - use static with notice
                console.log(`⚠️ Component ${config.component} not available for ${sectionId}, using static fallback`);
                this.useStaticWithNotice(sectionId, config);
            }
        } catch (error) {
            console.error(`❌ Critical error initializing ${config.name}:`, error);
            // Ensure we always have a fallback, even if static fails
            this.useEmergencyFallback(sectionId, config);
        }
    }

    /**
     * Use component for the section
     */
    async useComponent(sectionId, ComponentClass, config) {
        let componentInstance = null;

        try {
            console.log(`🚀 Attempting to initialize ${config.name} component with class:`, ComponentClass.name);

            // Enhanced validation before component creation
            if (!ComponentClass || typeof ComponentClass !== 'function') {
                throw new Error(`Invalid component class for ${config.component}`);
            }

            try {
                componentInstance = new ComponentClass(sectionId);
            } catch (constructorError) {
                console.error(`Component constructor failed for ${config.name}:`, constructorError);
                throw new Error(`Component constructor failed: ${constructorError.message}`);
            }

            // Validate component instance
            if (!componentInstance || typeof componentInstance !== 'object') {
                throw new Error(`Component constructor returned invalid instance for ${config.name}`);
            }

            // Initialize the component if it has an init method
            if (typeof componentInstance.init === 'function') {
                console.log(`🔧 Calling init() method for ${config.name} component`);
                try {
                    await componentInstance.init();
                } catch (initError) {
                    console.error(`Component init failed for ${config.name}:`, initError);
                    throw new Error(`Component initialization failed: ${initError.message}`);
                }
            } else {
                console.warn(`Component ${config.name} has no init() method - this may be intentional`);
            }

            // Final validation before storing
            if (!componentInstance) {
                throw new Error(`Component instance is null after initialization for ${config.name}`);
            }

            this.components.set(sectionId, componentInstance);
            console.log(`✅ ${config.name} - Component initialized successfully`);

        } catch (error) {
            console.error(`❌ Failed to initialize ${config.name} component:`, error);

            // Clean up any partial initialization
            if (componentInstance && typeof componentInstance.destroy === 'function') {
                try {
                    componentInstance.destroy();
                } catch (destroyError) {
                    console.warn(`Failed to destroy component ${sectionId}:`, destroyError);
                }
            }

            // Remove from components map if it was added
            if (this.components.has(sectionId)) {
                this.components.delete(sectionId);
            }

            // Fall back to static content
            this.useStaticWithNotice(sectionId, config);
        }
    }

    /**
     * Validate component dependency with comprehensive checks
     */
    validateComponentDependency(componentName, ComponentClass) {
        // Check if component exists
        if (!ComponentClass) {
            return false;
        }

        // Check if it's a function (constructor)
        if (typeof ComponentClass !== 'function') {
            console.warn(`Component ${componentName} exists but is not a constructor function`);
            return false;
        }

        // Check if it has a prototype (proper class/function)
        if (!ComponentClass.prototype) {
            console.warn(`Component ${componentName} has no prototype`);
            return false;
        }

        // Additional validation for known component patterns
        try {
            // Test if we can create a temporary instance (without calling constructor)
            const hasValidConstructor = ComponentClass.toString().includes('constructor') ||
                                      ComponentClass.toString().includes('function');
            if (!hasValidConstructor) {
                console.warn(`Component ${componentName} doesn't appear to be a valid constructor`);
                return false;
            }
        } catch (error) {
            console.warn(`Component ${componentName} validation failed:`, error);
            return false;
        }

        return true;
    }


    /**
     * Emergency fallback when even static content fails
     */
    useEmergencyFallback(sectionId, config) {
        const container = document.getElementById(sectionId);
        if (container) {
            container.innerHTML = `
                <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
                    <div class="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <span class="material-symbols-rounded text-red-500">error</span>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-red-400">Component Unavailable</p>
                            <p class="text-xs text-red-300">${config.name} could not be loaded</p>
                        </div>
                    </div>
                </div>
            `;
        }
        console.error(`Emergency fallback used for ${sectionId}`);
    }

    /**
     * Use static content with development notice
     */
    useStaticWithNotice(sectionId, config) {
        const container = document.getElementById(sectionId);
        const staticContainer = document.getElementById(config.static);
        
        if (staticContainer) {
            // Move static content to main container
            container.innerHTML = staticContainer.innerHTML;
            
            // Static content loaded - no status indicator needed in production
            
            console.log(`⚠️ ${config.name} - Using Static Content`);
        } else {
            // No static content found
            container.innerHTML = this.createEmptyState(config.name);
            // Missing component - no status indicator needed in production
            
            console.log(`❌ ${config.name} - No Component or Static Content`);
        }
    }

    /**
     * Add development status indicator to section (DISABLED FOR PRODUCTION)
     * This method is disabled to provide a cleaner production UI without development notices
     */
    addComponentStatus(sectionId, status, sectionName) {
        // Development status indicators disabled for cleaner production UI
        // To re-enable for debugging, comment out the return statement below
        return;

        const container = document.getElementById(sectionId);
        if (!container) return;

        // Remove any existing status
        const existingStatus = container.querySelector('.component-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        const statusConfig = {
            component: {
                icon: 'widgets',
                text: 'Using Interactive Component',
                color: 'text-green-400',
                bg: 'bg-green-500/10',
                border: 'border-green-500/30'
            },
            static: {
                icon: 'code_off',
                text: 'Using Static Content - Component Not Available',
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10',
                border: 'border-yellow-500/30'
            },
            missing: {
                icon: 'error',
                text: 'Section Not Implemented',
                color: 'text-red-400',
                bg: 'bg-red-500/10',
                border: 'border-red-500/30'
            }
        };

        const config = statusConfig[status];
        const statusElement = document.createElement('div');
        statusElement.className = 'component-status mt-3 p-2 rounded border text-xs flex items-center gap-2 ' + 
                                 config.bg + ' ' + config.border + ' ' + config.color;
        
        statusElement.innerHTML = `
            <span class="material-symbols-outlined text-sm">${config.icon}</span>
            <span>${config.text}</span>
            <span class="text-gray-500 ml-auto">${sectionName}</span>
        `;

        // Add to the bottom of the card content
        const cardContent = container.querySelector('.bg-\\[var\\(--card-bg\\)\\]') || container;
        cardContent.appendChild(statusElement);
    }

    /**
     * Create empty state for missing sections
     */
    createEmptyState(sectionName) {
        return `
            <div class="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl shadow-black/30">
                <h2 class="text-xl font-bold text-white mb-4">${sectionName}</h2>
                <div class="bg-[#111111] border border-[var(--border-color)] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <span class="material-symbols-outlined text-4xl text-gray-600">construction</span>
                    <p class="text-gray-400">This section is under development</p>
                    <p class="text-sm text-gray-500">Component will be available in a future update</p>
                </div>
            </div>
        `;
    }

    /**
     * Get component instance
     */
    getComponent(sectionId) {
        return this.components.get(sectionId);
    }

    /**
     * Get all component instances
     */
    getAllComponents() {
        return Object.fromEntries(this.components);
    }

    /**
     * Destroy all components (cleanup)
     */
    destroyAll() {
        for (const [sectionId, component] of this.components) {
            if (component && typeof component.destroy === 'function') {
                try {
                    component.destroy();
                } catch (error) {
                    console.error(`Error destroying component ${sectionId}:`, error);
                }
            }
        }
        this.components.clear();
    }

    /**
     * Refresh a specific section (useful for development)
     */
    async refreshSection(sectionId) {
        const config = this.componentRegistry[sectionId];
        if (!config) {
            console.error(`Section ${sectionId} not registered`);
            return;
        }

        // Destroy existing component if it exists
        const existingComponent = this.components.get(sectionId);
        if (existingComponent && typeof existingComponent.destroy === 'function') {
            existingComponent.destroy();
        }
        this.components.delete(sectionId);

        // Reinitialize
        await this.initializeSection(sectionId, config);
    }

    /**
     * Get development status report
     */
    getStatusReport() {
        const report = {
            total: Object.keys(this.componentRegistry).length,
            components: 0,
            static: 0,
            missing: 0,
            sections: {}
        };

        for (const [sectionId, config] of Object.entries(this.componentRegistry)) {
            const hasComponent = this.components.has(sectionId);
            const ComponentClass = window[config.component];
            const componentExists = ComponentClass && typeof ComponentClass === 'function';
            
            let status;
            if (hasComponent && componentExists) {
                status = 'component';
                report.components++;
            } else if (document.getElementById(config.static)) {
                status = 'static';
                report.static++;
            } else {
                status = 'missing';
                report.missing++;
            }

            report.sections[sectionId] = {
                name: config.name,
                status: status,
                componentClass: config.component
            };
        }

        return report;
    }

    /**
     * Log development status to console
     */
    logStatus() {
        const report = this.getStatusReport();
        
        console.group('🏗️ Dashboard Component Status');
        console.log(`📊 Total Sections: ${report.total}`);
        console.log(`✅ Using Components: ${report.components}`);
        console.log(`⚠️ Using Static: ${report.static}`);
        console.log(`❌ Missing: ${report.missing}`);
        
        console.group('📋 Section Details:');
        for (const [sectionId, info] of Object.entries(report.sections)) {
            const emoji = info.status === 'component' ? '✅' : 
                         info.status === 'static' ? '⚠️' : '❌';
            console.log(`${emoji} ${info.name} (${info.componentClass})`);
        }
        console.groupEnd();
        console.groupEnd();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentManager;
}

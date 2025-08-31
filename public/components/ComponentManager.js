/**
 * Component Manager
 * Handles conditional rendering between components and static content
 * Shows development status and graceful fallbacks
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
            'stream-controls': {
                component: 'StreamControlPanel',
                static: 'stream-controls-static',
                name: 'Stream Controls'
            },
            'audio-devices': {
                component: 'AudioDeviceSelector',
                static: 'audio-devices-static',
                name: 'Audio Devices'
            },
            'icecast-server': {
                component: 'IcecastServerPanel',
                static: 'icecast-server-static',
                name: 'Icecast Server'
            },
            'ffmpeg-streams': {
                component: 'FFmpegStreamsPanel',
                static: 'ffmpeg-streams-static',
                name: 'FFmpeg Streams'
            },
            'video-sources': {
                component: 'VideoSourcesPanel',
                static: 'video-sources-static',
                name: 'Video Sources'
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
        const container = document.getElementById(sectionId);
        if (!container) {
            console.warn(`Container '${sectionId}' not found`);
            return;
        }

        try {
            // Check if component class exists
            const ComponentClass = window[config.component];
            
            if (ComponentClass && typeof ComponentClass === 'function') {
                // Component exists - use it
                await this.useComponent(sectionId, ComponentClass, config);
            } else {
                // Component doesn't exist - use static with notice
                this.useStaticWithNotice(sectionId, config);
            }
        } catch (error) {
            console.error(`Error initializing ${config.name}:`, error);
            this.useStaticWithNotice(sectionId, config);
        }
    }

    /**
     * Use component for the section
     */
    async useComponent(sectionId, ComponentClass, config) {
        try {
            const componentInstance = new ComponentClass(sectionId);
            this.components.set(sectionId, componentInstance);
            
            // Add development status indicator
            this.addComponentStatus(sectionId, 'component', config.name);
            
            console.log(`✅ ${config.name} - Using Component`);
        } catch (error) {
            console.error(`Failed to initialize ${config.name} component:`, error);
            this.useStaticWithNotice(sectionId, config);
        }
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
            
            // Add notice about static content
            this.addComponentStatus(sectionId, 'static', config.name);
            
            console.log(`⚠️ ${config.name} - Using Static Content`);
        } else {
            // No static content found
            container.innerHTML = this.createEmptyState(config.name);
            this.addComponentStatus(sectionId, 'missing', config.name);
            
            console.log(`❌ ${config.name} - No Component or Static Content`);
        }
    }

    /**
     * Add development status indicator to section
     */
    addComponentStatus(sectionId, status, sectionName) {
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

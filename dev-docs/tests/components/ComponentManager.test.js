/**
 * Unit Tests for ComponentManager
 * Tests component detection, static fallbacks, and status reporting
 */

// Mock DOM environment for testing
class MockDOM {
    constructor() {
        this.elements = new Map();
        this.global = {};
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    createElement(tagName) {
        return {
            tagName: tagName.toUpperCase(),
            className: '',
            innerHTML: '',
            appendChild: () => {},
            querySelector: () => null,
            remove: () => {}
        };
    }

    addElement(id, element = {}) {
        const mockElement = {
            id,
            innerHTML: '',
            className: '',
            appendChild: (child) => {},
            querySelector: (selector) => {
                if (selector === '.component-status') return null;
                if (selector.includes('bg-[var(--card-bg)]')) return mockElement;
                return null;
            },
            remove: () => {},
            ...element
        };
        this.elements.set(id, mockElement);
        return mockElement;
    }

    setGlobal(name, value) {
        this.global[name] = value;
    }

    getGlobal(name) {
        return this.global[name];
    }
}

// Mock LobbyMusicPlayer component
class MockLobbyMusicPlayer {
    constructor(containerId) {
        this.containerId = containerId;
        this.initialized = true;
    }

    destroy() {
        this.initialized = false;
    }
}

// Test ComponentManager
async function testComponentManager() {
    console.group('🧪 ComponentManager Unit Tests');
    
    const mockDOM = new MockDOM();
    let testsPassed = 0;
    let testsTotal = 0;

    // Mock global environment
    const originalDocument = global.document;
    const originalWindow = global.window;
    
    global.document = mockDOM;
    global.window = mockDOM.global;

    try {
        // Import ComponentManager (simulate loading)
        eval(componentManagerCode);
        const ComponentManager = mockDOM.global.ComponentManager || window.ComponentManager;

        // Test 1: Component Manager Creation
        testsTotal++;
        console.log('Test 1: ComponentManager Creation');
        try {
            const manager = new ComponentManager();
            if (manager && manager.componentRegistry) {
                console.log('✅ ComponentManager created successfully');
                testsPassed++;
            } else {
                console.log('❌ ComponentManager creation failed');
            }
        } catch (error) {
            console.log('❌ ComponentManager creation error:', error.message);
        }

        // Test 2: Component Detection - Component Available
        testsTotal++;
        console.log('\nTest 2: Component Detection - Component Available');
        try {
            const manager = new ComponentManager();
            
            // Add container element
            mockDOM.addElement('lobby-music-player');
            
            // Add static template
            mockDOM.addElement('lobby-music-static', {
                innerHTML: '<div>Static content</div>'
            });
            
            // Register mock component
            mockDOM.setGlobal('LobbyMusicPlayer', MockLobbyMusicPlayer);
            
            await manager.initializeSection('lobby-music-player', {
                component: 'LobbyMusicPlayer',
                static: 'lobby-music-static',
                name: 'Lobby Background Music'
            });
            
            const component = manager.getComponent('lobby-music-player');
            if (component && component instanceof MockLobbyMusicPlayer) {
                console.log('✅ Component detected and initialized');
                testsPassed++;
            } else {
                console.log('❌ Component not properly initialized');
                console.log('Component instance:', component);
            }
        } catch (error) {
            console.log('❌ Component detection test error:', error.message);
        }

        // Test 3: Static Fallback - Component Not Available
        testsTotal++;
        console.log('\nTest 3: Static Fallback - Component Not Available');
        try {
            const manager = new ComponentManager();
            
            // Add container element
            mockDOM.addElement('test-section');
            
            // Add static template
            mockDOM.addElement('test-section-static', {
                innerHTML: '<div>Static fallback content</div>'
            });
            
            // Don't register component (simulate missing component)
            mockDOM.setGlobal('NonExistentComponent', undefined);
            
            await manager.initializeSection('test-section', {
                component: 'NonExistentComponent',
                static: 'test-section-static',
                name: 'Test Section'
            });
            
            const container = mockDOM.getElementById('test-section');
            if (container && container.innerHTML.includes('Static fallback content')) {
                console.log('✅ Static fallback working correctly');
                testsPassed++;
            } else {
                console.log('❌ Static fallback failed');
                console.log('Container content:', container ? container.innerHTML : 'Container not found');
            }
        } catch (error) {
            console.log('❌ Static fallback test error:', error.message);
        }

        // Test 4: Status Reporting
        testsTotal++;
        console.log('\nTest 4: Status Reporting');
        try {
            const manager = new ComponentManager();
            
            // Setup components and static templates
            mockDOM.addElement('lobby-music-player');
            mockDOM.addElement('lobby-music-static', { innerHTML: '<div>Static</div>' });
            mockDOM.addElement('test-section');
            mockDOM.addElement('test-section-static', { innerHTML: '<div>Static</div>' });
            
            // Register one component
            mockDOM.setGlobal('LobbyMusicPlayer', MockLobbyMusicPlayer);
            
            await manager.initializeSection('lobby-music-player', {
                component: 'LobbyMusicPlayer',
                static: 'lobby-music-static',
                name: 'Lobby Background Music'
            });
            
            await manager.initializeSection('test-section', {
                component: 'NonExistentComponent',
                static: 'test-section-static',
                name: 'Test Section'
            });
            
            const report = manager.getStatusReport();
            if (report && typeof report === 'object') {
                console.log('✅ Status report generated');
                console.log('Report:', {
                    total: report.total,
                    components: report.components,
                    static: report.static,
                    missing: report.missing
                });
                testsPassed++;
            } else {
                console.log('❌ Status report generation failed');
            }
        } catch (error) {
            console.log('❌ Status reporting test error:', error.message);
        }

        // Test 5: Real-world Component Loading Debug
        testsTotal++;
        console.log('\nTest 5: Real-world Component Loading Debug');
        try {
            const manager = new ComponentManager();
            
            // Simulate the exact scenario from the dashboard
            mockDOM.addElement('lobby-music-player');
            mockDOM.addElement('lobby-music-static', { innerHTML: '<div>Static music content</div>' });
            
            // Test different ways the component might be registered
            console.log('Testing component registration methods:');
            
            // Method 1: Direct global assignment
            mockDOM.setGlobal('LobbyMusicPlayer', MockLobbyMusicPlayer);
            console.log('- window.LobbyMusicPlayer:', mockDOM.getGlobal('LobbyMusicPlayer'));
            
            // Method 2: Check component detection logic
            const config = manager.componentRegistry['lobby-music-player'];
            console.log('- Registry config:', config);
            
            const ComponentClass = mockDOM.getGlobal(config.component);
            console.log('- Component class lookup:', ComponentClass);
            console.log('- Is function?', typeof ComponentClass === 'function');
            
            // Method 3: Initialize and check result
            await manager.initializeSection('lobby-music-player', config);
            
            const componentInstance = manager.getComponent('lobby-music-player');
            console.log('- Component instance:', componentInstance);
            console.log('- Has component?', manager.components.has('lobby-music-player'));
            
            if (componentInstance) {
                console.log('✅ Component loading debug successful');
                testsPassed++;
            } else {
                console.log('❌ Component loading debug failed - this reveals the issue!');
                
                // Additional debugging
                console.log('Debug info:');
                console.log('- Container exists:', !!mockDOM.getElementById('lobby-music-player'));
                console.log('- Static template exists:', !!mockDOM.getElementById('lobby-music-static'));
                console.log('- Component class exists:', !!ComponentClass);
            }
        } catch (error) {
            console.log('❌ Real-world debug test error:', error.message);
            console.log('Error stack:', error.stack);
        }

        // Test Summary
        console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);
        
        if (testsPassed === testsTotal) {
            console.log('🎉 All tests passed! ComponentManager is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Issues detected in ComponentManager.');
        }

    } finally {
        // Restore global environment
        global.document = originalDocument;
        global.window = originalWindow;
        console.groupEnd();
    }

    return { passed: testsPassed, total: testsTotal };
}

// Component Manager source code (for testing)
const componentManagerCode = `
class ComponentManager {
    constructor() {
        this.components = new Map();
        this.staticSections = new Map();
        this.componentRegistry = {
            'lobby-music-player': {
                component: 'LobbyMusicPlayer',
                static: 'lobby-music-static',
                name: 'Lobby Background Music'
            }
        };
    }

    async initializeSection(sectionId, config) {
        const container = document.getElementById(sectionId);
        if (!container) {
            console.warn('Container not found:', sectionId);
            return;
        }

        try {
            const ComponentClass = window[config.component];
            
            if (ComponentClass && typeof ComponentClass === 'function') {
                await this.useComponent(sectionId, ComponentClass, config);
            } else {
                this.useStaticWithNotice(sectionId, config);
            }
        } catch (error) {
            console.error('Error initializing:', error);
            this.useStaticWithNotice(sectionId, config);
        }
    }

    async useComponent(sectionId, ComponentClass, config) {
        try {
            const componentInstance = new ComponentClass(sectionId);
            this.components.set(sectionId, componentInstance);
            console.log('Component initialized:', config.name);
        } catch (error) {
            console.error('Failed to initialize component:', error);
            this.useStaticWithNotice(sectionId, config);
        }
    }

    useStaticWithNotice(sectionId, config) {
        const container = document.getElementById(sectionId);
        const staticContainer = document.getElementById(config.static);
        
        if (staticContainer) {
            container.innerHTML = staticContainer.innerHTML;
            console.log('Using static content:', config.name);
        } else {
            container.innerHTML = '<div>Empty state</div>';
            console.log('No static content found:', config.name);
        }
    }

    getComponent(sectionId) {
        return this.components.get(sectionId);
    }

    getStatusReport() {
        return {
            total: Object.keys(this.componentRegistry).length,
            components: this.components.size,
            static: 0,
            missing: 0
        };
    }
}

if (typeof window !== 'undefined') {
    window.ComponentManager = ComponentManager;
}
`;

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testComponentManager, MockLobbyMusicPlayer };
} else {
    // Run tests in browser
    testComponentManager().then(results => {
        console.log('Test execution completed:', results);
    });
}

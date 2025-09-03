# LANStreamer Dashboard Components

This directory contains modular UI components for the LANStreamer dashboard. Each component is designed to be self-contained, reusable, and easy to integrate.

## Component Architecture

### Design Principles
- **Self-contained**: Each component manages its own state and DOM
- **Event-driven**: Components communicate through events and public APIs
- **Responsive**: All components work across mobile and desktop
- **Accessible**: Following ARIA guidelines and keyboard navigation
- **Themed**: Using CSS variables for consistent styling

### Component Structure
```javascript
class ComponentName {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = options;
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        // Component-specific initialization
    }

    render() {
        // Generate and inject HTML
    }

    setupEventListeners() {
        // Bind event handlers
    }

    // Public API methods
    destroy() {
        // Cleanup when component is removed
    }
}
```

## Available Components

### LobbyMusicPlayer
**File**: `LobbyMusicPlayer.js`  
**Purpose**: Background music player with file selection and playback controls

**Features**:
- ✅ Play/Pause/Stop controls
- ✅ File selection (MP3, WAV, OGG, M4A)
- ✅ Volume control with mute
- ✅ Progress bar with seek functionality
- ✅ Loop playback for background music
- ✅ Real-time status updates
- ✅ Error handling and user notifications

**Usage**:
```javascript
// Initialize the component
const musicPlayer = new LobbyMusicPlayer('container-id');

// Get current state
const state = musicPlayer.getPlayState();

// Cleanup when done
musicPlayer.destroy();
```

**API Methods**:
- `togglePlayPause()` - Toggle between play and pause
- `play()` - Start playback
- `pause()` - Pause playback  
- `stop()` - Stop and reset to beginning
- `setVolume(volume)` - Set volume (0-100)
- `toggleMute()` - Toggle mute state
- `getCurrentFile()` - Get current file name
- `getPlayState()` - Get current playback state
- `destroy()` - Clean up component

### IcecastManager
**File**: `IcecastManager.js`  
**Purpose**: Comprehensive Icecast server management with autonomous operation capabilities

**Features**:
- ✅ **Installation Detection**: Multi-platform search with Windows-specific path handling
- ✅ **File Validation**: Comprehensive validation of executable, config, batch files, and directories
- ✅ **Process Management**: Start, stop, restart, and force kill Icecast processes
- ✅ **Real-time Monitoring**: Live status updates, uptime tracking, listener counts
- ✅ **Configuration Management**: Validate Icecast XML configuration files
- ✅ **Windows Integration**: Service detection, process ID tracking, port monitoring
- ✅ **Error Recovery**: Automatic restart, health monitoring, graceful degradation
- ✅ **Network Diagnostics**: Admin interface accessibility, port conflict detection
- ✅ **Autonomous Operation**: Self-healing, external process detection, status determination

**Core Capabilities**:
- **Installation Detection & Validation**: Checks for `icecast.exe`, `icecast.xml`, `icecast.bat` across multiple paths
- **Process Management & Monitoring**: Uses `tasklist`, `netstat`, `taskkill` for Windows process control
- **Service Integration**: Monitors Windows services with `sc query` commands
- **Configuration Management**: Parses and validates `icecast.xml` syntax and paths
- **Logging & Diagnostics**: Real-time access to `access.log` and `error.log` files
- **Network & Connectivity**: Tests admin interface at `http://localhost:8000/admin/`
- **Error Recovery & Resilience**: Automatic health checks and recovery procedures

**Usage**:
```javascript
// Initialize the component
const icecastManager = new IcecastManager('container-id');

// Check current status
const status = icecastManager.status;

// Start server
await icecastManager.startServer();

// Validate configuration
await icecastManager.validateConfiguration();

// Cleanup when done
icecastManager.destroy();
```

**API Methods**:
- `detectIcecastInstallation()` - Search for and validate Icecast installation
- `checkStatus()` - Get current server status and statistics
- `validateConfiguration()` - Validate Icecast XML configuration
- `startServer()` - Start Icecast server process
- `stopServer()` - Stop Icecast server gracefully
- `restartServer()` - Restart server with full cycle
- `updateActionButtons()` - Update UI button states
- `updateStatusIndicators()` - Update external status displays
- `startAutoRefresh()` - Begin automatic status monitoring
- `stopAutoRefresh()` - Stop automatic status monitoring
- `destroy()` - Clean up component and intervals

**Status Information**:
- **Installation Status**: Detected paths, file validation results
- **Process Status**: Running state, Process ID (PID), port activity
- **Server Stats**: Uptime, listeners, sources, connections
- **Health Status**: Overall system health (healthy/degraded/warning/critical)
- **Configuration**: XML validation, path accessibility, error detection

**Workflow**:
1. **Initialization**: Detect Icecast installation, validate files, check current status
2. **Status Monitoring**: Continuous monitoring of process, port, and admin interface
3. **User Control**: Handle start/stop/restart commands with proper error handling
4. **Health Management**: Monitor system health and trigger recovery procedures
5. **External Detection**: Detect manually started instances and integrate with them

**Dependencies**:
- Backend API endpoints (`/api/system/icecast/*`)
- Windows system commands (`tasklist`, `netstat`, `taskkill`, `sc`)
- Icecast configuration files (`icecast.xml`)
- Network connectivity to localhost:8000
- File system access to Program Files directories

## Integration Guide

### 1. Include Component Script
```html
<script src="/components/ComponentName.js"></script>
```

### 2. Create Container Element
```html
<div id="component-container"></div>
```

### 3. Initialize Component
```javascript
const component = new ComponentName('component-container', options);
```

### 4. Handle Component Events (if needed)
```javascript
// Components emit custom events for integration
document.addEventListener('music-player-state-changed', (event) => {
    console.log('Music state:', event.detail);
});
```

## Styling Guidelines

### CSS Variables Used
```css
:root {
  --primary-color: #00AEEF;
  --live-color: #4CAF50;
  --dark-bg: #111111;
  --card-bg: #1A1A1A;
  --border-color: #2F2F2F;
  --warning-color: #F85149;
}
```

### Component Classes
- `.btn-gradient` - Primary action buttons
- `.btn-stop-gradient` - Stop/destructive action buttons
- `.pulse-live` - Live status animation
- `.status-icon` - Status indicator icons

## Future Components

### Planned Components
- [ ] **StreamControlPanel** - Individual stream management
- [ ] **AudioDeviceSelector** - Device selection with type filtering
- [ ] **IcecastServerPanel** - Server management and stats
- [ ] **SystemStatusIndicator** - Service status monitoring
- [ ] **NotificationCenter** - Centralized notifications
- [ ] **FileUploader** - Drag-and-drop file uploads
- [ ] **SettingsPanel** - Configuration management

### Component Development Checklist
- [ ] Create component class file
- [ ] Implement core functionality
- [ ] Add error handling
- [ ] Include accessibility features
- [ ] Write unit tests (future)
- [ ] Document API and usage
- [ ] Update this README
- [ ] Integrate into main dashboard

## Best Practices

### Error Handling
- Always include try-catch blocks for async operations
- Provide user-friendly error messages
- Log detailed errors to console for debugging

### Performance
- Use event delegation for dynamic content
- Clean up event listeners in `destroy()` method
- Avoid memory leaks with proper cleanup

### Accessibility
- Include proper ARIA labels
- Support keyboard navigation
- Provide screen reader friendly content
- Use semantic HTML elements

### Testing
- Test across different browsers
- Verify mobile responsiveness
- Test with various file types/sizes
- Validate error scenarios

## Contributing

When adding new components:
1. Follow the established naming convention
2. Include comprehensive error handling
3. Document all public methods
4. Update this README with component details
5. Test integration with main dashboard
6. Consider mobile/responsive design

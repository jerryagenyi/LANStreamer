# LANStreamer - Technical Specification

## 1. Executive Summary
LANStreamer is a Node.js-based application that transforms a standard Windows PC into a multi-channel audio streaming server for local area networks. This document outlines the system architecture, technology stack, file structure, and implementation details for the project.

**Related Documentation:**
- [Product Requirements](LANStreamer-PRD.md) - Business requirements and user stories
- [UI Design Specification](Admin-Dashboard-UI-Design.md) - Visual design guidelines and frontend requirements
- [Audio Monitoring Feature](Audio-Monitoring-Feature-Specification.md) - Professional monitoring implementation details
- [Authentication & Security](Authentication-Security-Specification.md) - Security requirements and implementation
- [Environment Configuration](env-example.md) - Configuration variables and deployment settings
- [Development Progress](CHANGELOG.md) - Complete implementation history and current status

## Document Information
- **Project**: LANStreamer
- **Version**: 1.0.0
- **Date**: 2025-09-01
- **Author**: LANStreamer Development Team


## 2. Technology Stack
### 2.1 Backend Technologies
- **Runtime:** Node.js 16+ with Express.js framework
- **WebSocket:** Socket.io for real-time communication
- **Process Management:** Node.js `child_process` for FFmpeg and Icecast control
- **Validation:** Joi for schema validation
- **Logging:** Winston with daily log rotation
- **System Information:** `systeminformation` library for hardware monitoring

### 2.2 Frontend Technologies
- **Framework:** Vue.js 3 with Composition API
- **State Management:** Vuex 4 for centralised state management
- **Routing:** Vue Router 4 for single-page application navigation
- **UI Framework:** Bootstrap 5 with custom SCSS styling
- **HTTP Client:** Axios for API communication
- **Real-time:** Socket.io-client for WebSocket connections

### 2.3 Browser APIs and Client-Side Security

#### 2.3.1 Device Permission Management
**Implementation:** `navigator.mediaDevices.getUserMedia()` JavaScript API
**Purpose:** Request browser permissions for audio/video device access
**Security:** Browser-enforced permission system with user consent

**Permission Request Flow:**
```javascript
async function requestDevicePermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Permission granted - cleanup and proceed
    stream.getTracks().forEach(track => track.stop());
    return { status: 'granted' };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { status: 'denied', error: 'User denied permission' };
    }
    return { status: 'error', error: error.message };
  }
}
```

**Permission States:**
- `granted` - User allowed device access
- `denied` - User blocked device access  
- `prompt` - Permission not yet requested

#### 2.3.2 Authentication Security Implementation

**JWT Token Structure:**
```json
{
  "userId": "admin",
  "role": "administrator", 
  "iat": 1640995200,
  "exp": 1641081600,
  "isDefaultCredentials": true
}
```

**Security Configuration:**
```javascript
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'change-this-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  algorithm: 'HS256'
};
```

**Password Validation:**
```javascript
function validatePassword(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    notDefault: password !== 'admin'
  };
  
  return {
    isValid: Object.values(requirements).every(req => req),
    requirements
  };
}
```

### 2.4 External Dependencies
- **Audio Processing:** FFmpeg for audio encoding and streaming
- **Streaming Server:** Icecast for audio stream distribution  
- **Audio Hardware:** Support for multi-channel USB audio interfaces

**Audio Concepts:** For detailed understanding of audio pipeline concepts and hardware integration, see [Audio Pipeline Concepts](LANStreamer-Audio-Pipeline-Concepts.md).

### 2.4 Development & Testing Tools
- **E2E Testing:** Playwright
- **Unit/Integration Testing:** Vitest
- **API Client for Tests:** Supertest
- **Linting:** ESLint
- **Dev Server:** Nodemon for development
- **Version Control:** Git

## 3. System Architecture

### 3.1 Current Implementation Architecture

**Backend Services:**
- **Express Server:** Main HTTP server (`src/server.js`) running on port 3001
- **Route Handlers:** Modular API endpoints organized by functionality:
  - `src/routes/system.js` - System management (Icecast, FFmpeg, audio devices)
  - `src/routes/streams.js` - Audio streaming control
  - `src/routes/settings.js` - Configuration management
  - `src/routes/auth.js` - Authentication endpoints
- **Service Layer:** Business logic services:
  - `IcecastService.js` - Windows-specific Icecast management
  - `AudioDeviceService.js` - Audio hardware detection
  - `StreamService.js` - FFmpeg process management
- **Configuration:** Environment-based configuration with `.env` support
- **Logging:** Winston-based logging with file rotation

**Frontend Architecture:**
- **Component-Based UI:** Dynamic loading with static fallbacks
- **Component Manager:** `ComponentManager.js` handles dynamic loading
- **Core Components:**
  - `IcecastManager.js` - Icecast server control panel
  - `LobbyMusicPlayer.js` - Audio playback interface
- **Static Templates:** HTML fallbacks when components fail to load
- **Responsive Design:** Tailwind CSS with Material Symbols icons

**Process Management:**
- **Windows Integration:** Native Windows `tasklist`/`taskkill` commands
- **Process Tracking:** PID monitoring and lifecycle management  
- **File Validation:** Comprehensive installation verification
- **Error Recovery:** Graceful failure handling with user feedback

## 4. File Structure
The file structure outlined in the `README.md` is accurate and will be followed. Key development will occur within `vue-app/src` (backend) and `vue-app/frontend/src` (frontend).

## 5. Current API Implementation

### 5.1 Implemented Endpoints

**System Management (`/api/system/*`):**
```javascript
GET /api/health                              // Server health check
GET /api/system/audio-devices                // List available audio devices
GET /api/system/ffmpeg-check                 // Verify FFmpeg installation
GET /api/system/ffmpeg-processes             // List running FFmpeg processes

// Icecast Management
GET /api/system/icecast-status               // Basic Icecast status
GET /api/system/icecast/detailed-status      // Detailed status with mountpoints
POST /api/system/icecast/start               // Start Icecast server
POST /api/system/icecast/stop                // Stop Icecast server  
POST /api/system/icecast/restart             // Restart Icecast server
POST /api/system/icecast/check-installation  // Verify Icecast installation
GET /api/system/icecast/search-installations // Search for installations
GET /api/system/icecast/validate-config      // Validate configuration
```

**Stream Management (`/api/streams/*`):**
```javascript
GET /api/streams                             // List active streams
POST /api/streams/start                      // Start audio stream
POST /api/streams/stop                       // Stop audio stream
```

**Configuration (`/api/settings/*`):**
```javascript
GET /api/settings                            // Get current settings
POST /api/settings/update                    // Update settings
```

### 5.2 Icecast Service Implementation

**Windows-Specific Features:**
- **Installation Detection:** Multi-path search including Program Files directories
- **File Validation:** Comprehensive checking of `icecast.exe`, `icecast.xml`, batch files
- **Process Management:** Windows `tasklist`/`taskkill` integration with PID tracking
- **Configuration Validation:** XML parsing and path verification
- **Error Recovery:** Graceful handling of missing files and permissions

**Configuration Example:**
```javascript
// Environment variables for manual path configuration
ICECAST_EXE_PATH="C:\Program Files (x86)\Icecast\bin\icecast.exe"
ICECAST_CONFIG_PATH="C:\Program Files (x86)\Icecast\icecast.xml"
ICECAST_ACCESS_LOG="C:\Program Files (x86)\Icecast\logs\access.log"
ICECAST_ERROR_LOG="C:\Program Files (x86)\Icecast\logs\error.log"
```

### 5.3 Component Architecture Implementation

**Dynamic Loading System:**
```javascript
// ComponentManager.js handles component lifecycle
const componentRegistry = {
  'icecast-server': IcecastManager,
  'lobby-music-player': LobbyMusicPlayer
};

// Fallback to static HTML if component fails
if (component && componentClass) {
  new componentClass(targetId);
} else {
  container.innerHTML = staticTemplate;
}
```

**Error Handling Strategy:**
- Service-level error catching with detailed logging
- User-friendly error messages in the UI
- Graceful degradation when external processes fail
- Comprehensive installation troubleshooting

### 5.4 Future Implementation Details
- **Stream Management:** FFmpeg command generation for audio encoding
- **Real-time Communication:** WebSocket integration for live updates
- **Audio Device Integration:** Hardware detection and configuration

## 6. Deployment
The final deliverable will be a single `.exe` file created using a packager like **pkg** or **nexe**. This will bundle the Node.js server, Vue.js frontend, and the FFmpeg/Icecast binaries into one executable, eliminating external dependencies for the end-user.

---

## 7. Development Status & Roadmap

### 7.1 Completed Implementation ✅

**Backend Foundation:**
- ✅ **Express Server:** Core HTTP server with health check (`src/server.js`)
- ✅ **Route Structure:** Modular API endpoints with proper separation of concerns
- ✅ **Icecast Integration:** Complete Windows-specific management service
- ✅ **Configuration System:** Environment-based configuration with `.env` support
- ✅ **Error Handling:** Comprehensive logging and user-friendly error reporting

**System Management:**
- ✅ **Installation Detection:** Multi-path Icecast discovery with file validation
- ✅ **Process Management:** Windows `tasklist`/`taskkill` integration with PID tracking  
- ✅ **Configuration Validation:** XML parsing and troubleshooting assistance
- ✅ **Audio Device Service:** Basic device detection infrastructure

**Frontend Architecture:**
- ✅ **Component System:** Dynamic loading with static fallbacks
- ✅ **Icecast Manager:** Complete UI for server control and monitoring
- ✅ **Installation Validation:** File status grid and troubleshooting interface
- ✅ **Responsive Design:** Tailwind CSS with Material Symbols

### 7.2 Current Development Priorities 🚧

**Audio Streaming Pipeline:**
- 🚧 **FFmpeg Integration:** Command generation and process management
- 🚧 **Stream Configuration:** Mount point setup and audio device mapping
- 🚧 **Real-time Monitoring:** Audio levels and stream health indicators

**User Interface Completion:**
- 🚧 **Stream Management UI:** Start/stop controls for individual streams
- 🚧 **Audio Device Selection:** Device picker with real-time detection
- 🚧 **Listener Interface:** Mobile-first web player for stream consumption

### 7.3 Upcoming Features 📋

**Core Functionality:**
- 📋 **WebSocket Integration:** Real-time status updates without polling
- 📋 **QR Code Generation:** Easy listener access to stream URLs
- 📋 **Stream Statistics:** Listener counts and connection monitoring
- 📋 **Advanced Error Recovery:** Automatic restart and health monitoring

**Deployment & Distribution:**
- 📋 **Executable Packaging:** Single `.exe` file with bundled dependencies
- 📋 **Installation Wizard:** Guided setup for Icecast and FFmpeg
- 📋 **Documentation:** Complete user manual and troubleshooting guide

### 7.4 Technical Debt & Optimizations

**Performance:**
- Address repetitive "Icecast installation verified" logging
- Implement caching for installation detection results
- Optimize component loading and error boundaries

**Testing Coverage:**
- Expand Playwright E2E tests for core workflows
- Add comprehensive unit tests for service classes
- Implement integration tests for process management
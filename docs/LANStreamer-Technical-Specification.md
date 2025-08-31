# LANStreamer - Technical Specification

## 1. Executive Summary
LANStreamer is a Node.js-based application that transforms a standard Windows PC into a multi-channel audio streaming server for local area networks. This document outlines the system architecture, technology stack, file structure, and implementation details for the project.

**Related Documentation:**
- [Product Requirements](LANStreamer-PRD.md) - Business requirements and user stories
- [UI Design Specification](Admin-Dashboard-UI-Design.md) - Visual design guidelines and frontend requirements
- [Audio Monitoring Feature](Audio-Monitoring-Feature-Specification.md) - Professional monitoring implementation details
- [Authentication & Security](Authentication-Security-Specification.md) - Security requirements and implementation
- [Environment Configuration](env-example.md) - Configuration variables and deployment settings

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
### 3.1 Component Architecture
- **Express Server:** Main HTTP server handling API requests and serving the frontend.
- **WebSocket Service:** Manages real-time communication for live updates.
- **Service Layer:** Contains the business logic for system, audio, streaming, and device management.
- **Data Layer:** Uses file-based JSON storage for configuration and stream data.

## 4. File Structure
The file structure outlined in the `README.md` is accurate and will be followed. Key development will occur within `vue-app/src` (backend) and `vue-app/frontend/src` (frontend).

## 5. Key Implementation Details
- **Stream Management:** The backend will generate and execute FFmpeg commands with the necessary arguments to encode audio from the selected device and push it to the Icecast server.
- **Real-time Communication:** WebSockets will be used to push live updates (stream status, audio levels) from the backend to the frontend without requiring the client to constantly poll the API.
- **Error Handling:** A centralised error handling strategy will ensure that all failures (e.g., FFmpeg process crashes, device disconnection) are caught, logged, and presented to the user via a clear, human-readable message.

## 6. Deployment
The final deliverable will be a single `.exe` file created using a packager like **pkg** or **nexe**. This will bundle the Node.js server, Vue.js frontend, and the FFmpeg/Icecast binaries into one executable, eliminating external dependencies for the end-user.

---

## 7. Development Roadmap (TDD Plan)
This section outlines a practical, step-by-step guide for implementing features by writing tests first.

### Step 1: Backend - Core Server and Health Check
- **Objective:** Establish the foundational Express server and verify that it is running.
- **Test:** Write an integration test using Supertest to make a `GET` request to `/api/health`. The test will assert that the response status is `200` and the body contains a success message.
- **Implementation:** Create `src/server.js` with a basic Express app and a single health-check route.

### Step 2: Backend - Audio Device Service (Mocked)
- **Objective:** Create the service responsible for retrieving audio devices and define the expected data structure.
- **Test:** Write a unit test for `src/services/AudioDeviceService.js`. The test will call the `getAudioDevices()` method and assert that it returns a consistent array of mocked device objects.
- **Implementation:** Create the `AudioDeviceService` class. For now, the `getAudioDevices()` method will simply return a hardcoded, mock array of devices.

### Step 3: Backend - Audio Device API Endpoint
- **Objective:** Expose the list of audio devices via an API endpoint for the frontend to consume.
- **Test:** Write an integration test using Supertest. The test will send a `GET` request to `/api/system/audio-devices` and assert that the response body matches the data returned by the mocked `AudioDeviceService`.
- **Implementation:** Create `src/routes/system.js`, import the `AudioDeviceService`, create the route, and register it with the main Express app.

### Step 4: Backend - FFmpeg Process Management (Simulated)
- **Objective:** Create a service to manage the FFmpeg process lifecycle without actually spawning a process yet.
- **Test:** Write a unit test for `src/services/FFmpegService.js`. The test will create an instance of the service, call the `start()` method, and assert that an internal state flag (e.g., `this.is_running`) is set to `true`. A separate test will verify the `stop()` method works correctly.
- **Implementation:** Create the `FFmpegService` class with `start()`, `stop()`, and `get_status()` methods. These methods will, for now, only manipulate internal state variables.

### Step 5: Backend - Stream Control API Endpoints
- **Objective:** Create API endpoints to start and stop streams.
- **Test:** Write integration tests using Supertest. The tests will send `POST` requests to `/api/streams/start` and `/api/streams/stop` with a configuration payload. Using test spies, assert that the corresponding `FFmpegService` methods are called with the correct parameters.
- **Implementation:** Create `src/routes/streams.js` and wire it up to the `FFmpegService`.
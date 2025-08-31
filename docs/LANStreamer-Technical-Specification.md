# LANStreamer - Technical Specification

## 1. Executive Summary
LANStreamer is a Node.js-based application that transforms a standard Windows PC into a multi-channel audio streaming server for local area networks. This document outlines the system architecture, technology stack, file structure, and implementation details for the project.

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

### 2.3 External Dependencies
- **Audio Processing:** FFmpeg for audio encoding and streaming
- **Streaming Server:** Icecast for audio stream distribution
- **Audio Hardware:** Support for multi-channel USB audio interfaces

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
# LANStreamer: Test-Driven Development (TDD) Plan

## 1. Introduction

This document outlines a Test-Driven Development (TDD) plan for the LANStreamer project. It serves as a practical, step-by-step guide for implementing features by writing tests first. This approach ensures code quality, reduces bugs, and simplifies future maintenance.

## 2. Testing Strategy

### Unit Tests
For individual functions and service methods. We will use **Vitest**.

### Integration Tests
To verify that different services and components work together correctly, particularly for API endpoints. We will use **Supertest**.

### End-to-End (E2E) Tests
To simulate the full user journey in a real browser. We will use **Playwright**.

## 3. Development Roadmap
### Step 1: Backend - Core Server and Health Check

**Objective:** Establish the foundational Express server and verify that it is running.

**Test:** Write an integration test using Supertest to make a GET request to `/api/health`. The test will assert that the response status is 200 and the body contains a success message.

**Implementation:** Create `src/server.js` with a basic Express app and a single health-check route.

### Step 2: Backend - Audio Device Service (Mocked)

**Objective:** Create the service responsible for retrieving audio devices and define the expected data structure.

**Test:** Write a unit test for `src/services/AudioDeviceService.js`. The test will call the `getAudioDevices()` method and assert that it returns a consistent array of mocked device objects.

**Implementation:** Create the AudioDeviceService class. For now, the `getAudioDevices()` method will simply return a hardcoded, mock array of devices.

### Step 3: Backend - Audio Device API Endpoint

**Objective:** Expose the list of audio devices via an API endpoint for the frontend to consume.

**Test:** Write an integration test using Supertest. The test will send a GET request to `/api/system/audio-devices` and assert that the response body matches the data returned by the mocked AudioDeviceService.

**Implementation:** Create `src/routes/system.js`, import the AudioDeviceService, create the route, and register it with the main Express app.

### Step 4: Backend - FFmpeg Process Management (Simulated)

**Objective:** Create a service to manage the FFmpeg process lifecycle without actually spawning a process yet.

**Test:** Write a unit test for `src/services/FFmpegService.js`. The test will create an instance of the service, call the `start()` method, and assert that an internal state flag (e.g., `this.is_running`) is set to true. A separate test will verify the `stop()` method works correctly.

**Implementation:** Create the FFmpegService class with `start()`, `stop()`, and `get_status()` methods. These methods will, for now, only manipulate internal state variables.

### Step 5: Backend - Stream Control API Endpoints

**Objective:** Create API endpoints to start and stop streams.

**Test:** Write integration tests using Supertest. The tests will send POST requests to `/api/streams/start` and `/api/streams/stop` with a configuration payload. Using test spies, assert that the corresponding FFmpegService methods are called with the correct parameters.

**Implementation:** Create `src/routes/streams.js` and wire it up to the FFmpegService.

### Step 6: Frontend - The Admin Dashboard

**Objective:** Build the core admin dashboard UI that interacts with the backend APIs.

**Test:** Write an End-to-End test using Playwright. The test will navigate to the dashboard, wait for the audio device list to load, and verify that the UI correctly displays the names of the devices.

**Implementation:** Develop the Vue components, Vuex store, and API service to make the `GET /api/system/audio-devices` call and render the results.

### Step 7: Final Integration ✅

**Objective:** Replace the simulated FFmpeg/Icecast logic with real process spawning and integrate the entire system.

**Test:** Write a final, comprehensive End-to-End test with Playwright. The test will:

1. Navigate to the dashboard
2. Select an audio device
3. Click "Start Stream"
4. Verify that the stream status changes to "Live"
5. Navigate to the listener page
6. Assert that the stream is listed and playable

**Implementation:** Update the FFmpegService and IcecastService to use Node's `child_process` to execute the real FFmpeg and Icecast binaries with the correct command-line arguments.

### Step 8: Audio Monitoring Feature 🔄

**Objective:** Implement audio monitoring capability that allows Event Admins to listen to streams through local output devices for quality control.

**Test:** Write comprehensive tests for the monitoring feature:

1. **API Tests:**
   - Test `/api/system/audio-devices` returns both input and output devices with `type` field
   - Test new `/api/streams/monitor` endpoint accepts stream ID and output device ID
   - Verify monitoring FFmpeg process spawns correctly alongside main stream

2. **UI Tests:**
   - Test "Monitor this Stream" checkbox shows/hides monitoring dropdown
   - Verify monitoring dropdown only shows output devices
   - Test stream status updates to "Live + Monitoring" when monitoring is active

3. **Integration Tests:**
   - Test that monitoring does not interfere with main stream quality
   - Verify monitoring process cleanup when stream stops
   - Test multiple simultaneous monitoring sessions

**Implementation:** 
- Update `AudioDeviceService` to detect and differentiate input vs output devices
- Create monitoring API endpoint in `routes/streams.js`
- Extend `FFmpegService` to handle secondary monitoring processes
- Update dashboard UI with monitoring controls and status indicators

## 4. Summary

This TDD plan provides a clear, structured roadmap that prioritises building a robust and reliable backend, which is the most critical part of this project.

**Status:** ✅ **All Steps Completed** - The LANStreamer project has successfully completed all TDD phases with real FFmpeg process spawning and comprehensive End-to-End testing.
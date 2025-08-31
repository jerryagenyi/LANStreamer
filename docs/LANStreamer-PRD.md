# Product Requirements Document: LANStreamer v1.0

## 1. Introduction

This document outlines the requirements for **LANStreamer v1.0**, a desktop application that turns a standard Windows PC into a local, multi-channel audio streaming server. The primary goal is to provide a user-friendly, web-based interface for managing and broadcasting low-latency audio streams over a Local Area Network (LAN). This solution is designed for non-technical users in environments like conferences, houses of worship, and live events for purposes such as language interpretation or assistive listening.

## 2. Core Objective & Philosophy

**Simplicity is paramount.** The entire user experience is built around abstracting the technical complexity of audio streaming. The system must be operable by users with no command-line or audio engineering experience. The v1.0 product is exclusively a **local network solution**; it does not require and will not use an internet connection.

## 3. User Stories (MVP)

- **As an Event Admin,** I want the application to automatically detect all available audio input devices on my computer so I can easily select them for streaming.
- **As an Event Admin,** I want to name each audio stream (e.g., "French Interpretation," "Main Stage Audio") so they are clearly identifiable to listeners.
- **As an Event Admin,** I want to start and stop all streams with a single click and also be able to manage each stream individually.
- **As an Event Admin,** I want to see a clear, real-time status indicator (e.g., "Live," "Stopped," "Error") for each stream.
- **As an Event Admin,** I want to be able to monitor any live audio stream on a specific output device so I can check its quality before broadcasting to listeners. *(See [Audio Monitoring Feature Specification](Audio-Monitoring-Feature-Specification.md) for detailed implementation)*
- **As a Listener,** I want to connect to a simple web page on my phone, see a list of available audio streams, and click one to start listening immediately.
- **As a Listener,** I want the audio to play directly in my mobile web browser without needing to download a special app.

## 4. Scope & Features (v1.0)

### In Scope

- **Packaged Application:** A single, standalone executable for Windows (`.exe`) that bundles the Node.js server and the web frontend. No installation of external dependencies (like Node.js) is required for the end-user.
- **Web-Based Dashboard (Admin):**
    - Runs locally, accessible at `http://localhost:PORT`.
    - Audio device detection and selection.
    - Ability to name/label stream mount points (e.g., `/french`, `/spanish`).
    - Start/Stop controls for individual and all streams.
    - Real-time status display for each FFmpeg/Icecast process.
    - *(UI Design: See [Admin Dashboard UI Design](Admin-Dashboard-UI-Design.md) for complete visual specifications)*
- **Web-Based Player (Listener):**
    - A simple, mobile-first webpage served on the local network (e.g., `http://[SERVER_IP]:PORT/listen`).
    - Dynamically updated list of active streams.
    - Simple "Play" button for each stream.
    - QR code on the admin dashboard for easy listener access to the player page.
- **Backend (Node.js/Express):**
    - Manages the lifecycle of Icecast and FFmpeg processes.
    - Serves the admin dashboard and listener player page.
    - Provides a simple API for the frontend to interact with.

### Out of Scope (for v1.0)

- Video streaming.
- Internet broadcasting.
- User authentication or security roles.
- Recording, analytics, or statistics.
- Support for any operating system other than Windows.
- Advanced audio mixing, effects, or processing.
- The "Companion/Helper App" for Zoom/Teams integration.

## 5. Technical Requirements

- **Stack:** Node.js with Express for the backend, Vue.js for the frontend.
- **Core Dependencies:** The application will manage bundled, portable versions of **FFmpeg** and **Icecast**.
- **Deployment:** The final deliverable will be a single `.exe` file created using a packager like `pkg` or `nexe`.
- **Audio Device Discovery:** The backend must be able to programmatically list available audio input devices on the Windows host.
- **Error Handling:** The application must gracefully handle errors (e.g., FFmpeg process failure, device disconnection) and display a clear message to the admin.
- **Audio Assets:** Sample audio files are stored in the `/assets` directory for testing and demonstration purposes.

**Detailed Technical Implementation:** See [Technical Specification](LANStreamer-Technical-Specification.md) for complete API documentation and system architecture.

---

## 6. Future Vision & Ecosystem

This section captures potential future enhancements and companion applications that build upon the core LANStreamer solution. These are explicitly **out of scope for v1.0** but inform the architectural design.

### Core Application Enhancements (vNext)

- **Video Integration:** Add a video player to the listener page, with the backend capable of receiving an RTMP stream from OBS to create a full, self-hosted, multi-language video platform.
- **Recording & Analytics:** Add features to record streams and provide basic analytics (e.g., listener count, uptime).
- **Cross-Platform Support:** Expand support to macOS and Linux.
- **User Roles & Security:** Introduce authentication for the admin dashboard.

### Ecosystem & Integrations

- **Internet Gateway:** A feature to easily re-stream a local channel to an external RTMP service like YouTube, Twitch, or Castr.io.
- **"Virtual Audio Router" Helper App:** A separate, installable companion application for listeners. It would receive a stream from the LANStreamer server and create a virtual audio device on the user's machine. This would allow them to select an interpretation channel as their audio source in applications like Zoom, Teams, or Google Meet.
- **OBS Plugin:** A plugin for OBS Studio that would display the LANStreamer audio channels directly within the OBS interface, allowing for easier integration into complex broadcast productions.
- **AI Live Translation:** Integration with services like ElevenLabs or Azure AI Speech to provide real-time, AI-powered translation for a given audio source, creating a new, automated language stream.

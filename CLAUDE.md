# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LANStreamer is a multi-channel audio streaming server for local area networks. It orchestrates **FFmpeg** (audio capture/encoding) and **Icecast** (streaming media server) to deliver live, low-latency audio broadcasts for conferences, language interpretation, and meetings.

**Tech Stack:** Node.js (ES6 modules) + Express.js backend, vanilla JavaScript frontend with component-based architecture, Windows-focused with macOS/Linux support.

## Development Commands

```bash
# Start production server (sets terminal title on Windows)
npm start

# Development with auto-reload (nodemon)
npm run dev

# Run setup wizard
npm run setup

# Generate documentation screenshots
npm run screenshots
```

**Windows users** can double-click `Start LANStreamer Server.bat` for one-click startup (auto-installs deps if needed).

**No test suite is configured** - there are no jest/mocha tests.

## Architecture

The codebase follows a **three-tier architecture** with clear separation:

```
Frontend (public/) → Express Server (src/server.js) → Service Layer (src/services/) → External Processes (FFmpeg/Icecast)
```

### Service Layer (Core Business Logic)

All business logic lives in `src/services/`. Each service exports a singleton instance.

| Service | Purpose |
|---------|---------|
| `StreamingService.js` | Stream lifecycle (start/stop/restart/delete), FFmpeg process spawning, format fallback (MP3→AAC→OGG), persistent stream storage in `config/streams.json` |
| `IcecastService.js` | Icecast server management, auto-detection across multiple paths, XML config generation/parsing, security vulnerability checking |
| `FFmpegService.js` | FFmpeg process wrapper, command-line argument building, stream status tracking |
| `AudioDeviceService.js` | Platform-specific audio device detection (DirectShow/WASAPI on Windows, AVFoundation on macOS, ALSA on Linux) |
| `SystemService.js` | System monitoring (CPU/memory), network interface detection, metrics collection |
| `WebSocketService.js` | Real-time updates to connected clients |
| `UpdateService.js` | GitHub-based update checking and deployment |

### Key Architectural Patterns

1. **Format Fallback System**: When starting a stream, the system tries MP3, then AAC, then OGG if encoding fails.
2. **Device Config Caching**: Icecast/FFmpeg paths are cached in `config/device-config.json` to avoid re-detection on startup.
3. **Persistent Streams**: Active streams are saved to `config/streams.json` and restored on server restart (marked as stopped).
4. **DirectShow Device Mapping**: On Windows, audio device IDs are mapped to actual DirectShow device names for FFmpeg compatibility.
5. **Process Status Verification**: Services use multiple verification methods (HTTP + process checks) to accurately detect Icecast/FFmpeg status.

### Frontend Components

`public/components/` contains class-based JavaScript components orchestrated by `ComponentManager.js`. Components include:
- `FFmpegStreamsManager.js` - Stream control interface
- `IcecastManager.js` - Icecast server controls
- `EventManager.js`, `ContactManager.js`, `LobbyMusicPlayer.js`, `FileBrowser.js`, etc.

The frontend has **graceful degradation** - components fall back to static HTML if JavaScript fails.

### Routes

API endpoints in `src/routes/`:
- `/api/auth` - JWT authentication (login required for admin dashboard)
- `/api/streams` - Stream CRUD operations
- `/api/system` - System status, health checks, device detection
- `/api/settings` - Configuration management
- `/api/contact` - Contact information
- `/api/setup` - Initial setup wizard

### Middleware

`src/middleware/`:
- `auth.js` - JWT verification, optional auth for public endpoints
- `errorHandler.js` - Custom error classes (`AppError`, `IcecastError`, `ErrorFactory`)
- `validation.js` - Input validation

### Error Handling

The project uses a custom error system (`src/utils/errors.js`):
- `ErrorFactory` - Creates typed errors with error codes
- `ErrorHandler` - Wraps operations with consistent error logging
- `IcecastError`, `AppError` - Domain-specific error classes
- Error codes in `ErrorCodes` enum (e.g., `ICECAST_NOT_INSTALLED`, `PROCESS_SPAWN_FAILED`)

## Configuration

All configuration via environment variables (`.env` file, see `env.example` as template).

**Critical Security Variables (change defaults in production):**
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Dashboard credentials (default: `admin` / `lanstreamer123`)
- `JWT_SECRET` - Token signing key
- `SESSION_SECRET` - Session encryption

**Icecast Paths (auto-detected, searched in priority order):**
1. `.env` `ICECAST_EXE_PATH` override
2. `config/device-config.json` (cached from manual selection)
3. Standard installation paths (Windows: `C:\Program Files (x86)\Icecast`, `C:\Program Files\Icecast`)
4. System PATH

**Important:** Icecast passwords are configured in `icecast.xml`, not `.env`.

## Known Issues & Gotchas

### Icecast Process Detection
The dashboard may show Icecast as "online" even when the process isn't running. This happens when:
- Port 8000 responds but Icecast process doesn't exist (another service may be using the port)
- HTTP check succeeds but process has crashed

**Fix:** The backend now uses dual-verification (HTTP + process check) for accurate status detection. If status is incorrect, click "Stop" then "Start" to restart Icecast properly.

### Icecast Log Directory
Fresh Icecast installations on Windows often fail with:
```
FATAL: could not open error logging (./log\error.log): No such file or directory
```
Solution: Edit `icecast.xml` to use full path: `<logdir>C:\Program Files (x86)\Icecast\log</logdir>`

### Windows DirectShow Audio Devices
FFmpeg on Windows requires special handling for audio device names. The `validateAndGetDeviceName()` method in `StreamingService.js` (line 447) maps user-selected device IDs to actual DirectShow device names using a lookup table.

**Common mappings:**
- `microphone-hd-pro-webcam-c910` → `Microphone (HD Pro Webcam C910)`
- `vb-audio-virtual-cable` → `CABLE Output (VB-Audio Virtual Cable)`
- `amd-streaming-audio-device` → `AMD Streaming Audio Device`

### Startup Order
Correct order: 1) Start LANStreamer Server → 2) Start Icecast Server → 3) Create/Start Streams

**Critical:** Streams cannot start without Icecast running. The `StreamingService.startStream()` method checks Icecast process status before attempting to connect.

### Stream Source Limit
Default Icecast config limits to 2 concurrent streams (`<sources>2</sources>`). To increase:
1. Edit `icecast.xml`: change `<sources>2</sources>` to desired number
2. Restart Icecast server

### Cross-Subnet Access
Server PCs with multiple network adapters (WiFi, Ethernet, VPN) may auto-detect the wrong IP for listeners on different subnets. Users should access the dashboard using the IP address matching their router's subnet.

## Frontend Development Guidelines

This project uses **"Intentional Minimalism"** design philosophy (see `.cursorrules`).

When working on frontend:
- **Library Discipline**: Use existing UI components/libraries - don't reinvent buttons, modals, or dropdowns
- **Anti-Generic**: Avoid bootstrapped template-looking layouts
- **Purpose-Driven**: Every element must have a clear purpose - if not, delete it
- **Visual Polish**: Focus on micro-interactions, perfect spacing, and "invisible" UX

## Entry Points

- **Backend:** `src/server.js` (Express server on port 3001, configurable via `PORT`)
- **Admin Dashboard:** `/` or `/dashboard` → `public/index.html` (auth required)
- **Listener Page:** `/streams` → `public/streams.html` (public, no auth)
- **Login:** `/login` → `public/login.html`

## Important Files Not in Git

- `.env` - Environment configuration (use `env.example` as template)
- `config/streams.json` - Persistent stream definitions
- `config/device-config.json` - Cached Icecast/FFmpeg paths
- `config/icecast.xml` - Icecast server configuration (auto-generated)
- `logs/` - Winston logs with daily rotation

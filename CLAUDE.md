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

### Key Architectural Patterns

1. **Format Fallback System**: When starting a stream, the system tries MP3, then AAC, then OGG if encoding fails.
2. **Device Config Caching**: Icecast/FFmpeg paths are cached in `config/device-config.json` to avoid re-detection on startup.
3. **Persistent Streams**: Active streams are saved to `config/streams.json` and restored on server restart (marked as stopped).
4. **DirectShow Device Mapping**: On Windows, audio device IDs are mapped to actual device names for DirectShow compatibility.

### Frontend Components

`public/components/` contains class-based JavaScript components orchestrated by `ComponentManager.js`. Components include:
- `FFmpegStreamsManager.js` - Stream control interface
- `IcecastManager.js` - Icecast server controls
- `EventManager.js`, `ContactManager.js`, `LobbyMusicPlayer.js`, etc.

The frontend has **graceful degradation** - components fall back to static HTML if JavaScript fails.

### Routes

API endpoints in `src/routes/`:
- `/api/auth` - JWT authentication (login required for admin dashboard)
- `/api/streams` - Stream CRUD operations
- `/api/system` - System status, health checks, device detection
- `/api/settings` - Configuration management
- `/api/contact` - Contact information

### Middleware

`src/middleware/`:
- `auth.js` - JWT verification, optional auth for public endpoints
- `errorHandler.js` - Custom error classes (`AppError`, `IcecastError`)
- `validation.js` - Input validation

## Configuration

All configuration via environment variables (`.env` file, see `env.example` as template).

**Critical Security Variables (change defaults in production):**
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Dashboard credentials (default: `admin` / `lanstreamer123`)
- `JWT_SECRET` - Token signing key
- `SESSION_SECRET` - Session encryption

**Icecast Paths (auto-detected, searched in priority order):**
1. `.env` `ICECAST_EXE_PATH` override
2. `config/device-config.json` (cached from manual selection)
3. `C:\Program Files (x86)\Icecast`
4. `C:\Program Files\Icecast`
5. System PATH

**Important:** Icecast passwords are configured in `icecast.xml`, not `.env`.

## Known Issues & Gotchas

### Icecast Log Directory
Fresh Icecast installations on Windows often fail with:
```
FATAL: could not open error logging (./log\error.log): No such file or directory
```
Solution: Edit `icecast.xml` to use full path: `<logdir>C:\Program Files (x86)\Icecast\log</logdir>`

### Windows DirectShow Audio Devices
FFmpeg on Windows requires special handling for audio device names. The `validateAndGetDeviceName()` method in `StreamingService.js` maps user-selected device IDs to actual DirectShow device names.

### Startup Order
Correct order: 1) Start LANStreamer Server → 2) Start Icecast Server → 3) Create/Start Streams

## Frontend Development Guidelines

This project uses **"Intentional Minimalism"** design philosophy (see `.cursorrules` / `.augment/rules/kingmode.md`).

When working on frontend:
- **Library Discipline**: Use existing UI components/libraries - don't reinvent buttons, modals, or dropdowns
- **Anti-Generic**: Avoid bootstrapped template-looking layouts
- **Purpose-Driven**: Every element must have a clear purpose - if not, delete it

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

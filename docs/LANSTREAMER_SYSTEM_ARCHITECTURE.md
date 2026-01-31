# LANStreamer System Architecture

**Version:** 1.2.3
**Last Updated:** 2026-01-27
**Author:** LANStreamer Development Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
   - 1.1 [Three-Component Architecture](#11-three-component-architecture)
   - 1.2 [Request Flow Examples](#12-request-flow-examples)
2. [Startup Sequence](#2-startup-sequence)
   - 2.1 [Module Loading Order](#21-module-loading-order)
   - 2.2 [Service Initialization Timeline](#22-service-initialization-timeline)
3. [Core Services Architecture](#3-core-services-architecture)
   - 3.1 [IcecastService](#31-icecastservice)
   - 3.2 [FFmpegService](#32-ffmpegservice)
   - 3.3 [StreamingService](#33-streamingservice)
   - 3.4 [AudioDeviceService](#34-audiodeviceservice)
   - 3.5 [WebSocketService](#35-websocketservice)
   - 3.6 [SystemService](#36-systemservice)
   - 3.7 [UpdateService](#37-updateservice)
4. [Configuration Management](#4-configuration-management)
5. [Stream Creation Flow (End-to-End)](#5-stream-creation-flow-end-to-end)
6. [Error Handling & Diagnostics](#6-error-handling--diagnostics)
7. [Troubleshooting Decision Trees](#7-troubleshooting-decision-trees)
8. [File Reference](#8-file-reference)

---

## 1. System Overview

LANStreamer is a local audio streaming server that captures audio from devices or files, encodes it with FFmpeg, broadcasts via Icecast, and delivers to browsers through a Node.js/Express backend.

### 1.1 Three-Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LANStreamer System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   FFmpeg     │─────>│   Icecast    │─────>│   Browser    │  │
│  │              │      │              │      │              │  │
│  │ Audio Capture│      │  Streaming   │      │  Playback    │  │
│  │ + Encoding   │      │   Server     │      │              │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         ▲                                           ▲          │
│         │                                           │          │
│         │            ┌──────────────┐              │          │
│         └────────────│  Node.js     │──────────────┘          │
│                      │              │                         │
│                      │ Orchestration│                         │
│                      │   + API      │                         │
│                      │   + UI       │                         │
│                      └──────────────┘                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Component Responsibilities:**

| Component | Role | Technology |
|-----------|------|------------|
| **FFmpeg** | Audio capture, encoding, streaming to Icecast | FFmpeg executable |
| **Icecast** | Receive encoded audio, serve to multiple listeners | Icecast2 server |
| **Node.js/Express** | Process management, API, WebSocket, UI | Express.js, Socket.io |

### 1.2 Request Flow Examples

#### Flow 1: User Creates Stream (Dashboard)

```
User (Dashboard)                    Node.js Backend                   FFmpeg/Icecast
      │                                  │                                 │
      │  POST /api/streams               │                                 │
      │  (deviceId, name)                │                                 │
      ├─────────────────────────────────>│                                 │
      │                                  │                                 │
      │                                  │  1. Check Icecast running       │
      │                                  │  2. Validate device accessible   │
      │                                  │  3. Build FFmpeg args            │
      │                                  │  4. Spawn FFmpeg process        │
      │                                  ├─────────────────────────────────>│
      │                                  │                                 │
      │                                  │  FFmpeg connects to Icecast      │
      │                                  │  (icecast://source:pass@host:port)│
      │  { success: true,               │                                 │
      │    streamId, status }            │                                 │
      │<─────────────────────────────────┤                                 │
      │                                  │                                 │
      │  WebSocket: stream_created       │                                 │
      │<─────────────────────────────────┤                                 │
```

#### Flow 2: Listener Plays Stream (Browser)

```
Listener (Browser)                   Icecast Server                    Audio Source
      │                                  │                                 │
      │  GET /streamId                   │                                 │
      │  (Accept: audio/mpeg)            │                                 │
      ├─────────────────────────────────>│                                 │
      │                                  │                                 │
      │                                  │  Check mount point exists        │
      │                                  │  (FFmpeg must be streaming)      │
      │                                  │                                 │
      │  200 OK                          │                                 │
      │  Content-Type: audio/mpeg        │                                 │
      │  (continuous audio stream)       │                                 │
      │<─────────────────────────────────┤                                 │
      │                                  │                                 │
      │  <audio> element plays stream    │                                 │
      │                                  │                                 │
```

---

## 2. Startup Sequence

### 2.1 Module Loading Order

**Entry Point:** `npm run dev` → `nodemon src/server.js`

```
Timeline: 0ms ────────────────────────────────────────────────────────>

1. server.js imports (synchronous, top-to-bottom):
   ├─> routes/system.js
   │     └─> services/IcecastService.js (singleton created)
   │           └─> initialize() called IMMEDIATELY
   │                 ├─> Load device-config.json
   │                 ├─> Parse icecast.xml (port, passwords, hostname)
   │                 └─> Start file watcher
   │
   ├─> routes/streams.js
   │     └─> services/StreamingService.js (singleton created)
   │           └─> Constructor runs
   │                 ├─> Load persistent streams from config/streams.json
   │                 └─> Set up cleanup interval (6 hours)
   │
   ├─> routes/settings.js
   ├─> routes/contact.js
   ├─> routes/auth.js
   └─> middleware/auth.js

2. Express app setup:
   ├─> Middleware registration (express.json, express.static)
   ├─> Route registration (/api/*)
   └─> Server.listen(PORT, HOST)

3. Server ready - accepting connections
```

**Key Timing Notes:**
- IcecastService initialization starts **during module import**, before server begins listening
- StreamingService loads persistent streams synchronously in constructor
- File watcher on icecast.xml starts immediately after config parsing

### 2.2 Service Initialization Timeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                    INITIALIZATION TIMELINE                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  0ms      50ms      100ms     200ms     500ms    1000ms   2000ms     │
│  │────────│─────────│─────────│─────────│────────│────────│         │
│                                                                       │
│  [IcecastService]                                                     │
│    ├─ Load device-config.json                                        │
│    ├─ Parse icecast.xml (port, passwords)                            │
│    ├─ Start file watcher                                             │
│    └─ Check Icecast running status                                   │
│                                                                       │
│  [StreamingService]                                                  │
│    ├─ Load config/streams.json                                       │
│    └─ Clean up old streams                                           │
│                                                                       │
│  [AudioDeviceService]                                                │
│    └─ Initialize (lazy, on first device list request)                │
│                                                                       │
│  [WebSocketService]                                                  │
│    └─ Attach to Express server (when server.listen() completes)      │
│                                                                       │
│  [SystemService]                                                     │
│    └─ Initialize (lazy, on first API request)                        │
│                                                                       │
│  [UpdateService]                                                     │
│    └─ Lazy initialization (on update check request)                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Services Architecture

All services follow the **singleton pattern** - exported as pre-instantiated objects.

### 3.1 IcecastService

**File:** `src/services/IcecastService.js`
**Export:** `export default new IcecastService()`
**Lines:** ~900 lines

#### Responsibilities

1. **Icecast Installation Detection**
   - Search common paths: `C:\Program Files (x86)\Icecast`, `C:\Program Files\Icecast`
   - Validate: `icecast.exe` exists, `icecast.xml` exists
   - Cache paths to `config/device-config.json`

2. **Configuration Parsing**
   - Read `icecast.xml` (source of truth)
   - Extract: port, source-password, admin-password, hostname, max-listeners
   - Store in-memory (passwords never written to disk)

3. **Process Management**
   - Start: Spawn `icecast.exe -c config.xml`
   - Stop: Kill process tree (includes child processes)
   - Status: Check process running + port listening + admin interface accessible

4. **File Watching**
   - Watch `icecast.xml` for changes
   - Auto-reparse on modification (no server restart needed)

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `initialize()` | 192-224 | Entry point - idempotent initialization |
| `parsePort()` | 598-640 | Extract port from icecast.xml, sync to device-config.json |
| `parsePasswords()` | 736-771 | Extract source/admin passwords (in-memory only) |
| `parseHostname()` | 776-796 | Extract hostname from icecast.xml |
| `getActualPort()` | 566-605 | Return cached port (3-tier priority: runtime → cache → default) |
| `getSourcePassword()` | 801 | Return in-memory source password |
| `getAdminPassword()` | 808 | Return in-memory admin password |
| `getHostname()` | 815 | Return in-memory hostname |
| `startConfigWatcher()` | 822-857 | Watch icecast.xml for changes |
| `startIcecast()` | 269-347 | Spawn icecast.exe process |
| `stopIcecast()` | 352-398 | Kill icecast.exe process tree |
| `getStatus()` | 476-545 | Check running status (process + port + HTTP) |

#### Port Configuration Flow

```
icecast.xml (source of truth)
     │
     ├─> parsePort() reads <port>8200</port>
     │
     ├─> Saves to device-config.json (cache)
     │
     └─> getActualPort() returns:
           1. Runtime cache (actualPort property)
           2. device-config.json port (fallback)
           3. config/index.js fallback (8000)
```

**Integration Points:**
- StreamingService.js:312, 355, 421, 1082: Uses `getActualPort()` for FFmpeg args
- FFmpegService.js:139: Uses `getActualPort()` for icecast:// URL
- SystemService.js:320: Uses `getActualPort()` for port availability check

#### Configuration Watching

**File:** `src/services/IcecastService.js:822-857`

```javascript
startConfigWatcher() {
  this.configWatcher = fs.watch(
    this.paths.config,  // Path to icecast.xml
    { persistent: false },
    async (eventType, filename) => {
      if (eventType === 'change') {
        logger.info('icecast.xml changed, re-parsing configuration...');
        await this.parsePort();        // Re-extract port
        await this.parsePasswords();   // Re-extract passwords
        await this.parseHostname();    // Re-extract hostname
      }
    }
  );
}
```

**Triggered by:**
- User edits `C:\Program Files (x86)\Icecast\icecast.xml`
- Text editor saves file
- Configuration update script runs

### 3.2 FFmpegService

**File:** `src/services/FFmpegService.js`
**Export:** `export default new FFmpegService()`
**Lines:** ~250 lines

#### Responsibilities

1. **FFmpeg Executable Detection**
   - Check if `ffmpeg` in PATH
   - Fallback to bundled: `bin/ffmpeg.exe`

2. **Process Spawning**
   - Spawn FFmpeg child process with audio streaming args
   - Handle process events: `spawn`, `error`, `exit`

3. **Format Fallback System**
   - Try formats in order: MP3 → AAC → OGG
   - Automatic fallback on codec errors

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `findFFmpegPath()` | 22-37 | Detect FFmpeg executable location |
| `startStream()` | 51-98 | Spawn FFmpeg process with stream config |
| `stopStream()` | 162-193 | Kill FFmpeg process (SIGTERM, SIGKILL after 5s) |
| `buildFFmpegArgs()` | 133-156 | Build command line arguments |
| `getAudioFormats()` | 104-125 | Return available format configurations |
| `getActiveStreams()` | 43-45 | Return map of running streams |

#### FFmpeg Command Structure

**File:** `src/services/FFmpegService.js:133-156`

```javascript
// For device input:
ffmpeg -f dshow \
       -i "audio=MICROPHONE (HD Pro Webcam C910)" \
       -acodec libmp3lame \
       -ab 128k \
       -ar 44100 \
       -ac 2 \
       -f mp3 \
       -content_type audio/mpeg \
       icecast://source:hackme@localhost:8200/stream_id \
       -loglevel error
```

**Format Configurations:**

| Format | Codec | Content Type | Browser Support |
|--------|-------|--------------|-----------------|
| MP3 | libmp3lame | audio/mpeg | Universal (BEST) |
| AAC | aac | audio/aac | Modern browsers |
| OGG | libvorbis | audio/ogg | Firefox, Chrome |

#### Process Lifecycle

```
startStream(streamConfig)
     │
     ├─> Validate stream config (id required)
     ├─> Check not already running
     ├─> Build FFmpeg args (with format index)
     │
     ├─> spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
     │
     ├─> process.on('error') ─────> handleProcessError()
     ├─> process.on('exit') ──────> handleProcessExit()
     │
     └─> Store in activeStreams[streamId]
           ├─ status: 'running'
           ├─ process: ChildProcess
           ├─ startedAt: Date
           └─ pid: process.pid
```

### 3.3 StreamingService

**File:** `src/services/StreamingService.js`
**Lines:** ~1270 lines

**Primary orchestration service** - coordinates FFmpeg, Icecast, audio devices, and persistent storage.

#### Responsibilities

1. **Stream Lifecycle Management**
   - Create: Validate, spawn FFmpeg, store persistent config
   - Start: Launch FFmpeg with device/file input
   - Stop: Kill FFmpeg gracefully
   - Restart: Relaunch with existing config
   - Update: Change device/name (generates new stream ID)
   - Delete: Remove from persistent storage

2. **Persistent Storage**
   - Save to: `config/streams.json`
   - Store: stream config (id, deviceId, name, inputFile)
   - Load: On service startup (mark as stopped)

3. **Device Conflict Detection**
   - Prevent multiple streams using same device simultaneously
   - Check before starting/restarting streams

4. **Icecast Dependency Management**
   - Check Icecast running before stream start
   - Optional: Auto-stop streams if Icecast down for 30s (disabled by default)

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `startStream()` | 101-219 | Main entry point - validates, starts FFmpeg, stores config |
| `startFFmpegProcess()` | 228-372 | Spawn FFmpeg with error detection and grace period |
| `stopStream()` | 658-698 | Kill FFmpeg, mark as intentionally stopped |
| `restartStream()` | 705-767 | Relaunch stopped stream with validation |
| `updateStream()` | 775-878 | Change config (device/name), generates new ID if name changed |
| `deleteStream()` | 884-904 | Remove from active streams and persistent storage |
| `buildFFmpegArgs()` | 411-493 | Build FFmpeg command with device/file input |
| `validateAndGetDeviceName()` | 500-652 | Map device ID to DirectShow name |
| `handleProcessExit()` | 1014-1051 | Process exit handler, distinguishes crash vs intentional stop |
| `parseFFmpegError()` | 1061-1086 | Use errorDiagnostics for user-friendly messages |
| `getStats()` | 1194-1267 | Verify process status, detect dead processes |
| `cleanupOldStreams()` | 910-937 | Remove stopped/error streams older than 24h |

#### Stream Creation Flow

```
User: POST /api/streams { deviceId, name }
     │
     ▼
StreamingService.startStream()
     │
     ├─> Check Icecast running (IcecastService.isIcecastRunning())
     ├─> Check for device conflicts (device already in use?)
     ├─> Validate device accessible (AudioDeviceService.testDevice())
     │
     ├─> Try each format (MP3 → AAC → OGG):
     │     │
     │     ├─> startFFmpegProcess(streamId, streamConfig, formatIndex)
     │     │     │
     │     │     ├─> buildFFmpegArgs() ──> IcecastService.getActualPort()
     │     │     ├─> spawn(ffmpeg, args)
     │     │     ├─> Wait for spawn event (10s timeout)
     │     │     ├─> Wait 2s grace period for crash detection
     │     │     │
     │     │     └─> Return process or throw error
     │     │
     │     ├─> Success? Store in activeStreams, break loop
     │     └─> Error? Try next format
     │
     ├─> All formats failed? Throw error with last error
     │
     └─> Return stream info { id, status, audioFormat, ... }
```

#### Device Mapping System

**File:** `src/services/StreamingService.js:500-652`

The service maintains a mapping from frontend device IDs to actual DirectShow device names:

```javascript
// Frontend ID → DirectShow name mapping
const deviceMap = {
  'microphone-hd-pro-webcam-c910': 'Microphone (HD Pro Webcam C910)',
  'vb-audio-voicemeeter-vaio': 'VB-Audio Voicemeeter VAIO',
  'vb-audio-virtual-cable': 'CABLE Output (VB-Audio Virtual Cable)',
  'amd-streaming-audio-device': 'AMD Streaming Audio Device',
  // ... 40+ mappings
};
```

**Priority order:**
1. AudioDeviceService cache (most reliable)
2. Hardcoded deviceMap
3. Generated DirectShow name from device ID

#### Persistent Storage Structure

**File:** `config/streams.json`

```json
{
  "mic_stream_1234567890": {
    "id": "mic_stream_1234567890",
    "deviceId": "microphone-hd-pro-webcam-c910",
    "inputFile": null,
    "name": "My Microphone",
    "config": {
      "deviceId": "microphone-hd-pro-webcam-c910",
      "name": "My Microphone",
      "bitrate": 192
    },
    "createdAt": "2026-01-27T10:30:00.000Z"
  }
}
```

### 3.4 AudioDeviceService

**File:** `src/services/AudioDeviceService.js`
**Lines:** ~600 lines

#### Responsibilities

1. **Platform-Specific Device Detection**
   - **Windows**: DirectShow enumeration (ffmpeg -list_devices true)
   - **macOS**: AVFoundation devices
   - **Linux**: ALSA devices

2. **Device Caching**
   - Cache devices for 30 seconds (performance)
   - Refresh on user request

3. **Device Testing**
   - Test if device accessible before starting stream
   - Prevent false "device not found" errors

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `getDevices()` | 43-92 | Get cached devices or enumerate fresh |
| `detectWindowsDevices()` | 94-207 | Windows DirectShow enumeration |
| `detectOSXDevices()` | 209-276 | macOS AVFoundation enumeration |
| `detectLinuxDevices()` | 278-330 | Linux ALSA enumeration |
| `testDevice()` | 371-432 | Test device accessibility with FFmpeg |
| `getFallbackDevices()` | 434-459 | Return platform-specific fallback devices |

#### Windows Device Detection

**File:** `src/services/AudioDeviceService.js:94-207`

Uses FFmpeg DirectShow to enumerate audio devices:

```bash
ffmpeg -f dshow -list_devices true -i dummy
```

**Parsing Strategy:**
1. Run FFmpeg with `-list_devices true`
2. Capture stderr output
3. Parse device names from `[dshow]` lines
4. Map to frontend-friendly IDs

**Example Output:**
```
[dshow] "Microphone (HD Pro Webcam C910)"
[dshow] "VB-Audio Voicemeeter VAIO"
[dshow] "CABLE Output (VB-Audio Virtual Cable)"
```

#### Device Accessibility Test

**File:** `src/services/AudioDeviceService.js:371-432`

Before starting stream, test if device accessible:

```javascript
async testDevice(deviceId) {
  const deviceName = this.mapDeviceIdToName(deviceId);
  const args = [
    '-f', 'dshow',
    '-i', `audio="${deviceName}"`,
    '-t', '1',  // Test for 1 second
    '-f', 'null',
    '-'
  ];

  // Spawn FFmpeg, if it runs for 1s without error, device is accessible
}
```

### 3.5 WebSocketService

**File:** `src/services/WebSocketService.js`
**Lines:** ~418 lines

#### Responsibilities

1. **Real-Time Updates**
   - Broadcast stream status changes to all connected clients
   - Update stream list on create/start/stop/delete

2. **Role-Based Authentication**
   - Admin: Full access
   - Operator: Can manage streams
   - Viewer: Read-only

3. **Room Management**
   - `admin`: Admin dashboard users
   - `operators`: Stream operators
   - `viewers`: Listener view

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `initialize()` | 26-43 | Attach Socket.io to HTTP server |
| `handleConnection()` | 80-128 | Authentication and room management |
| `broadcastToAll()` | 134-140 | Send event to all connected clients |
| `broadcastToRoom()` | 146-157 | Send event to specific room |
| `broadcastStreamUpdate()` | 163-177 | Broadcast stream status change |
| `startPeriodicUpdates()` | 183-199 | Send stream list every 30s |

#### WebSocket Events

**Client → Server:**
- `authenticate`: Token-based authentication
- `join_room`: Join admin/operators/viewers room
- `subscribe_streams`: Subscribe to stream updates

**Server → Client:**
- `authenticated`: Authentication success
- `stream_created`: New stream created
- `stream_updated`: Stream config changed
- `stream_started`: Stream started
- `stream_stopped`: Stream stopped
- `stream_deleted`: Stream deleted
- `streams_updated`: Periodic stream list update

### 3.6 SystemService

**File:** `src/services/SystemService.js`
**Lines:** ~436 lines

#### Responsibilities

1. **System Information**
   - CPU, memory, network interfaces
   - OS info (platform, distro, kernel)
   - External IP detection

2. **System Health**
   - CPU usage, memory usage
   - Load average (Linux/Unix)
   - Status: healthy/warning/error

3. **Network Connectivity**
   - Ping test (8.8.8.8, google.com, github.com)
   - Network interface stats

4. **System Validation**
   - Node.js version check (>= 16.0.0)
   - Memory check (>= 4GB)
   - Disk space check (>= 1GB)
   - Port availability check

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `getSystemInfo()` | 87-139 | Get comprehensive system information |
| `getStatus()` | 167-213 | Get current system health status |
| `getNetworkInfo()` | 230-251 | Get network interfaces and connectivity |
| `checkConnectivity()` | 253-281 | Ping test to external hosts |
| `validateSystemRequirements()` | 283-364 | Validate Node version, memory, disk, ports |

### 3.7 UpdateService

**File:** `src/services/UpdateService.js`
**Lines:** ~204 lines

#### Responsibilities

1. **Version Checking**
   - Read current version from `package.json`
   - Fetch latest release from GitHub API
   - Compare versions (semver)

2. **Update Instructions**
   - Automatic update script path
   - Manual update steps

3. **Caching**
   - Cache result for 6 hours

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `getCurrentVersion()` | 23-37 | Read version from package.json |
| `checkForUpdates()` | 42-89 | Query GitHub API for latest release |
| `compareVersions()` | 95-110 | Semver comparison |
| `getUpdateStatus()` | 115-129 | Return cached or fresh update status |
| `getUpdateInstructions()` | 134-158 | Return automatic/manual update steps |

---

## 4. Configuration Management

### Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Layer 1: icecast.xml (SOURCE OF TRUTH)                          │
│  ├─ Location: C:\Program Files (x86)\Icecast\icecast.xml         │
│  ├─ Port: <listen-socket><port>8200</port></listen-socket>      │
│  ├─ Source Password: <source-password>hackme</source-password>  │
│  └─ Admin Password: <admin-password>hackme</admin-password>      │
│                                                                   │
│  Layer 2: device-config.json (CACHE)                             │
│  ├─ Location: config/device-config.json                          │
│  ├─ Purpose: Fast startup, avoid parsing icecast.xml every time   │
│  ├─ Port: "port": 8200                                           │
│  └─ Paths: icecastPath, configPath, accessLogPath, errorLogPath  │
│                                                                   │
│  Layer 3: config/index.js (FALLBACK)                              │
│  ├─ Purpose: Minimal fallback if icecast.xml not found           │
│  ├─ Port: icecast.port (from device-config or 8000 default)      │
│  └─ Note: Passwords NOT stored here (security)                   │
│                                                                   │
│  Layer 4: In-Memory (RUNTIME)                                    │
│  ├─ IcecastService.actualPort (cached port)                      │
│  ├─ IcecastService.sourcePassword (never written to disk)        │
│  ├─ IcecastService.adminPassword (never written to disk)         │
│  └─ IcecastService.hostname (cached hostname)                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### File Watching

**Monitored:** `icecast.xml`
**Watcher:** IcecastService.startConfigWatcher()
**Behavior:** Auto-reparse port, passwords, hostname on file change

**No server restart needed** for most configuration changes!

### Security Considerations

| Data Type | Stored in disk? | Location |
|-----------|-----------------|----------|
| Port | Yes | device-config.json (cache) |
| Passwords | **NO** | In-memory only (IcecastService) |
| Hostname | **NO** | In-memory only (IcecastService) |
| Paths | Yes | device-config.json (cache) |

---

## 5. Stream Creation Flow (End-to-End)

### User Action: Create Stream from Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER FLOW: CREATE STREAM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. USER SELECTS DEVICE                                          │
│     ├─> GET /api/devices (AudioDeviceService.getDevices)         │
│     ├─> Display device list in dropdown                          │
│     └─> User selects "Microphone (HD Pro Webcam C910)"           │
│                                                                   │
│  2. USER ENTERS STREAM NAME                                      │
│     └─> "My Microphone Stream"                                   │
│                                                                   │
│  3. USER CLICKS "CREATE STREAM"                                  │
│     └─> POST /api/streams                                        │
│         {                                                         │
│           "deviceId": "microphone-hd-pro-webcam-c910",           │
│           "name": "My Microphone Stream"                         │
│         }                                                         │
│                                                                   │
│  4. SERVER VALIDATES REQUEST                                     │
│     ├─> StreamingService.startStream()                           │
│     ├─> Check Icecast running? (IcecastService.isIcecastRunning) │
│     │    └─> NO: Throw error "Start Icecast first"               │
│     ├─> Check device conflicts?                                  │
│     │    └─> YES: Throw error "Device already in use"            │
│     └─> Check device accessible? (AudioDeviceService.testDevice) │
│          └─> NO: Throw error "Device not accessible"             │
│                                                                   │
│  5. SERVER BUILDS FFMPEG COMMAND                                  │
│     ├─> StreamingService.buildFFmpegArgs()                       │
│     ├─> Get DirectShow device name                               │
│     │    └─> validateAndGetDeviceName() → "Microphone (...)"     │
│     ├─> Get Icecast config                                       │
│     │    ├─> IcecastService.getActualPort() → 8200               │
│     │    ├─> IcecastService.getSourcePassword() → "hackme"       │
│     │    └─> IcecastService.getHostname() → "localhost"          │
│     └─> Build args:                                              │
│          [-f dshow                                               │
│           -i "audio=Microphone (HD Pro Webcam C910)"             │
│           -acodec libmp3lame                                      │
│           -b:a 192k                                              │
│           -ar 44100                                              │
│           -ac 2                                                  │
│           -f mp3                                                 │
│           -content_type audio/mpeg                               │
│           icecast://source:hackme@localhost:8200/mic_stream_xyz] │
│                                                                   │
│  6. SERVER SPAWNS FFMPEG                                         │
│     ├─> spawn(ffmpeg, args)                                      │
│     ├─> Wait for spawn event (10s timeout)                       │
│     ├─> Wait 2s grace period (crash detection)                  │
│     ├─> Process still running? → Success                         │
│     └─> Process crashed? → Try next format (AAC → OGG)           │
│                                                                   │
│  7. SERVER STORES STREAM CONFIG                                  │
│     ├─> activeStreams[mic_stream_xyz] = {                        │
│     │      id, deviceId, name, status,                           │
│     │      ffmpegProcess, startedAt, audioFormat                 │
│     │    }                                                        │
│     └─> savePersistentStreams() → config/streams.json            │
│                                                                   │
│  8. SERVER RESPONDS TO CLIENT                                    │
│     └─> 201 Created                                              │
│         {                                                        │
│           "id": "mic_stream_xyz",                                │
│           "name": "My Microphone Stream",                        │
│           "status": "running",                                   │
│           "audioFormat": "MP3",                                  │
│           "startedAt": "2026-01-27T10:30:00.000Z"                │
│         }                                                        │
│                                                                   │
│  9. SERVER BROADCASTS VIA WEBSOCKET                              │
│     └─> socket.emit('stream_created', { stream })                │
│        └─> All admin dashboard clients receive update            │
│                                                                   │
│ 10. FFMPEG CONNECTS TO ICECAST                                   │
│     ├─> icecast://source:hackme@localhost:8200/mic_stream_xyz    │
│     ├─> Icecast authenticates source                             │
│     ├─> Mount point created: /mic_stream_xyz                     │
│     └─> Ready to accept listener connections                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Listener Playback Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   LISTENER FLOW: PLAY STREAM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. LISTENER OPENS STREAMS PAGE                                  │
│     ├─> GET /streams                                             │
│     ├─> Fetch active streams from API                           │
│     └─> Display list of available streams                       │
│                                                                   │
│  2. LISTENER CLICKS PLAY BUTTON                                  │
│     └─> Construct audio player URL:                             │
│        http://192.168.1.100:8200/mic_stream_xyz                 │
│        (Icecast URL: http://host:port/mountpoint)                │
│                                                                   │
│  3. BROWSER REQUESTS STREAM FROM ICECAST                         │
│     ├─> GET http://192.168.1.100:8200/mic_stream_xyz            │
│     ├─> Icecast checks:                                         │
│     │    ├─> Mount point exists? (FFmpeg streaming)             │
│     │    └─> Source connected?                                  │
│     ├─> Icecast responds:                                       │
│     │    200 OK                                                  │
│     │    Content-Type: audio/mpeg                               │
│     │    (continuous audio stream)                              │
│     └─> <audio> element begins playback                          │
│                                                                   │
│  4. AUDIO FLOWS TO LISTENER                                      │
│     FFmpeg → Icecast → Browser → Speaker                        │
│                                                                   │
│  5. LISTENER STOPS PLAYBACK                                      │
│     └─> Browser closes HTTP connection                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Error Handling & Diagnostics

### Error Diagnostics System

**File:** `src/utils/errorDiagnostics.js`
**Lines:** ~500 lines

Centralized error handling that detects error types from FFmpeg/Icecast output and provides user-friendly, actionable error messages.

### Error Categories

| Category | Patterns | Example |
|----------|----------|---------|
| **connection** | "connection refused", "ECONNREFUSED" | Icecast not running |
| **port_conflict** | "address already in use", "EADDRINUSE" | Port 8200 in use |
| **authentication** | "401 unauthorized", "authentication failed" | Wrong password |
| **mount_point** | "mount point already in use", "source limit" | Stream exists |
| **device_not_found** | "could not find audio device", "no such device" | Device unplugged |
| **device_busy** | "device or resource busy", "exclusive access" | Device in use |
| **virtual_audio** | "vb-audio", "virtual cable", "voicemeeter" | Virtual device issue |
| **directshow** | "dshow", "directshow", "could not enumerate" | Windows device error |
| **codec** | "unknown encoder", "codec not found" | Missing codec |
| **format** | "unknown format", "invalid format" | Unsupported format |
| **resource** | "out of memory", "cannot allocate" | Memory/CPU issue |
| **timeout** | "timed out", "timeout" | Network/device timeout |

### Pattern Matching Flow

```
FFmpeg stderr output + exit code
            │
            ▼
   ┌──────────────────┐
   │ errorDiagnostics │
   │   .diagnose()    │
   └────────┬─────────┘
            │
            ├─> Check Windows exit codes first
            │   ├─> 4294967291 (-5) → connection refused
            │   └─> 2812791304 (0xA7F00008) → Windows crash
            │
            ├─> Try pattern matching (order matters)
            │   ├─> "connection refused" → diagnoseConnectionError()
            │   ├─> "address already in use" → diagnosePortConflict()
            │   ├─> "device not found" → diagnoseDeviceNotFound()
            │   └─> ... (12 categories total)
            │
            └─> No match? → diagnoseGenericError()
```

### Diagnostic Result Structure

```javascript
{
  category: 'connection',
  title: 'Icecast Connection Refused',
  description: 'FFmpeg cannot connect to the Icecast server...',
  causes: [
    'Icecast server is not running',
    'Wrong port configured'
  ],
  solutions: [
    'Start the Icecast server from the dashboard',
    'Verify port configuration matches icecast.xml'
  ],
  technicalDetails: 'Exit code: -5, stderr: Connection refused',
  severity: 'critical'
}
```

### Windows Exit Codes

| Exit Code (unsigned) | Signed | Hex | Name | Meaning |
|---------------------|--------|-----|------|---------|
| 4294967291 | -5 | N/A | ACCESS_DENIED_OR_CONNECTION_REFUSED | Icecast unreachable |
| 2812791304 | -1482175992 | 0xA7F00008 | WINDOWS_PROCESS_CRASH | FFmpeg crashed |
| 4294967295 | -1 | N/A | GENERAL_ERROR | Generic FFmpeg error |
| 4294967294 | -2 | N/A | MISUSE_OF_COMMAND | Invalid command line |

### Error Pattern Order (Critical)

**File:** `src/utils/errorDiagnostics.js:44-199`

The order of pattern matching is **first-match-wins**. More specific patterns must come first:

1. Connection/Network (most specific first)
2. Port Conflict
3. Authentication
4. Mount Point
5. Device Not Found
6. Device Busy
7. Virtual Audio (catches VB-Audio, Voicemeeter)
8. DirectShow (Windows-specific)
9. Codec
10. Format
11. Resource
12. Timeout

**DO NOT REORDER** without testing all error scenarios!

### Error Handling in StreamingService

**File:** `src/services/StreamingService.js:228-372`

The `startFFmpegProcess()` method implements sophisticated error handling:

```javascript
// 1. Spawn timeout (10s)
//    If FFmpeg doesn't spawn within 10s → "FFmpeg not found"

// 2. Grace period (2s)
//    Wait 2s after spawn to detect immediate crashes
//    If exit code != 0 within 2s → Use errorDiagnostics

// 3. Process exit handler
//    Check if intentionally stopped or crashed
//    Parse error with errorDiagnostics.diagnose()

// 4. Format fallback
//    Try MP3 → AAC → OGG
//    Each format gets fresh attempt
```

---

## 7. Troubleshooting Decision Trees

### Decision Tree 1: Stream Won't Start

```
STREAM WON'T START
    │
    ├─> ERROR: "Icecast server is not running"
    │   └─> GO TO: Decision Tree 2 (Icecast Issues)
    │
    ├─> ERROR: "Device already in use"
    │   ├─> Stop other streams using this device
    │   ├─> Check other applications (Zoom, Teams, Discord)
    │   └─> If still failing → Restart audio device/computer
    │
    ├─> ERROR: "Device not accessible"
    │   ├─> Click "Refresh Devices"
    │   ├─> Try selecting a different audio device
    │   ├─> Check Windows Sound settings
    │   └─> If still failing → Restart audio device/computer
    │
    ├─> ERROR: "Connection refused" (exit code -5)
    │   ├─> Check Icecast running (Dashboard should show "Running")
    │   ├─> Check port configuration matches icecast.xml
    │   │   └─> device-config.json port should match icecast.xml
    │   └─> If mismatch → Restart server to reload config
    │
    ├─> ERROR: "Authentication failed" (401)
    │   ├─> Check icecast.xml source-password
    │   ├─> Restart server to reload password
    │   └─> Verify FFmpeg using correct password (check logs)
    │
    ├─> ERROR: FFmpeg crash (exit code 0xA7F00008)
    │   ├─> Check device is plugged in and working
    │   ├─> Try different audio device
    │   ├─> Check FFmpeg executable (ffmpeg -version)
    │   └─> Check Windows Event Viewer for crash details
    │
    └─> ERROR: "All formats failed"
        ├─> Codec issue (libmp3lame missing)
        ├─> Reinstall FFmpeg with full codec support
        └─> Check FFmpeg codecs (ffmpeg -codecs)
```

### Decision Tree 2: Icecast Issues

```
ICECAST ISSUES
    │
    ├─> Icecast Won't Start
    │   ├─> Check icecast.xml syntax (XML validation)
    │   ├─> Check port not already in use (netstat -an | findstr 8200)
    │   ├─> Check log files:
    │   │   ├─> C:\Program Files (x86)\Icecast\logs\error.log
    │   │   └─> C:\Program Files (x86)\Icecast\logs\access.log
    │   └─> Check file permissions on icecast directory
    │
    ├─> Icecast Starts But Shows "Stopped" in Dashboard
    │   ├─> Check admin interface accessible:
    │   │   └─> http://localhost:8200/admin/stats.xml
    │   ├─> Check admin-password matches icecast.xml
    │   └─> Restart server to reload password
    │
    ├─> Icecast Running But Streams Can't Connect
    │   ├─> Check source-password in icecast.xml
    │   ├─> Check <sources> limit (default: 2)
    │   │   └─> Increase if need more concurrent streams
    │   └─> Check firewall blocking port 8200
    │
    └─> Icecast Crashes Immediately
        ├─> Check icecast.xml for invalid configuration
        ├─> Check log files for crash details
        └─> Try resetting to default icecast.xml
```

### Decision Tree 3: Audio Device Issues

```
AUDIO DEVICE ISSUES
    │
    ├─> Device Not Listed
    │   ├─> Click "Refresh Devices"
    │   ├─> Check device is plugged in
    │   ├─> Check Windows Sound settings:
    │   │   └─> Control Panel → Sound → Recording
    │   └─> Test FFmpeg device detection:
    │       └─> ffmpeg -f dshow -list_devices true -i dummy
    │
    ├─> Device Listed But Won't Work
    │   ├─> Check device not in use by another app
    │   │   └─> Close Zoom, Teams, Discord, etc.
    │   ├─> Check device privacy settings:
    │   │   └─> Settings → Privacy → Microphone
    │   └─> Test device in Windows Sound Recorder
    │
    ├─> Virtual Audio Device Issues (VB-Audio, Voicemeeter)
    │   ├─> VB-Audio Virtual Cable
    │   │   ├─> Restart VB-Audio Virtual Cable
    │   │   ├─> Reinstall VB-Audio driver
    │   │   └─> Try alternative: VoiceMeeter
    │   └─> VoiceMeeter
    │       ├─> Ensure VoiceMeeter application is running
    │       ├─> Check VoiceMeeter output device
    │       └─> Restart VoiceMeeter
    │
    └─> Device Works Then Stops
        ├─> USB device power management
        │   └─> Disable USB selective suspend
        ├─> Driver going to sleep
        │   └─> Update device drivers
        └─> Device conflict
            └─> Uninstall conflicting devices
```

### Decision Tree 4: Listener Can't Hear Stream

```
LISTENER CAN'T HEAR STREAM
    │
    ├─> Stream Shows "Running" But No Audio
    │   ├─> Check Icecast mount point exists:
    │   │   └─> http://localhost:8200/stream_name
    │   ├─> Check FFmpeg actually streaming:
    │   │   └─> logs/combined.log (search for stream ID)
    │   ├─> Check audio device has input:
    │   │   └─> Speak into mic, check levels
    │   └─> Check device not muted in Windows Sound
    │
    ├─> Listener Gets "404 Not Found"
    │   ├─> Stream not actually running (check status)
    │   ├─> Wrong stream URL (check mount point name)
    │   └─> Icecast not accessible (check firewall)
    │
    ├─> Audio Stutters or Buffers
    │   ├─> Network bandwidth issue
    │   ├─> CPU overload (check Task Manager)
    │   ├─> Increase bitrate (128k → 192k)
    │   └─> Check Icecast listener limit
    │
    └─> Audio Quality Poor
        ├─> Increase bitrate (128k → 192k or 256k)
        ├─> Check sample rate (44100 Hz recommended)
        ├─> Check audio device quality
        └─> Try different audio format (AAC, OGG)
```

### Quick Reference: Common Error Messages

| Error Message | Most Likely Cause | Quick Fix |
|---------------|-------------------|-----------|
| "Icecast server is not running" | Icecast not started | Start Icecast from dashboard |
| "Connection refused" (-5) | Wrong port or Icecast down | Check icecast.xml port, restart server |
| "Authentication failed" (401) | Wrong password | Check icecast.xml source-password |
| "Device already in use" | Device conflict | Stop other streams, close other apps |
| "Device not accessible" | Device not working | Refresh devices, try different device |
| "Address already in use" | Port conflict | Check what's using port 8200 |
| "Mount point already in use" | Stream already exists | Stop old stream first |
| "Unknown encoder libmp3lame" | FFmpeg missing codec | Reinstall FFmpeg with codecs |
| "Windows process crash" (0xA7F00008) | FFmpeg crashed | Check device, try different device |
| "All formats failed" | Codec or device issue | Reinstall FFmpeg, check device |

---

## 8. File Reference

### Core Application Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/server.js` | Express server entry point | ~180 |
| `package.json` | Dependencies, scripts | ~100 |
| `.env` | Environment variables (not in git) | ~20 |
| `public/index.html` | Admin dashboard UI | ~500 |
| `public/streams.html` | Listener page UI | ~300 |
| `public/login.html` | Login page UI | ~100 |

### Service Layer

| File | Purpose | Lines |
|------|---------|-------|
| `src/services/IcecastService.js` | Icecast process & config management | ~900 |
| `src/services/StreamingService.js` | Stream lifecycle orchestration | ~1270 |
| `src/services/FFmpegService.js` | FFmpeg process spawning | ~250 |
| `src/services/AudioDeviceService.js` | Audio device detection | ~600 |
| `src/services/WebSocketService.js` | Real-time updates | ~418 |
| `src/services/SystemService.js` | System health monitoring | ~436 |
| `src/services/UpdateService.js` | Auto-update checking | ~204 |

### Utility Layer

| File | Purpose | Lines |
|------|---------|-------|
| `src/utils/logger.js` | Logging system | ~200 |
| `src/utils/errorDiagnostics.js` | Error pattern matching | ~500 |
| `src/middleware/auth.js` | JWT authentication | ~150 |
| `src/middleware/errorHandler.js` | Express error handling | ~100 |

### Routes Layer

| File | Purpose | Lines |
|------|---------|-------|
| `src/routes/system.js` | System info API endpoints | ~100 |
| `src/routes/streams.js` | Stream management endpoints | ~300 |
| `src/routes/settings.js` | Settings endpoints | ~100 |
| `src/routes/contact.js` | Contact form endpoint | ~50 |
| `src/routes/auth.js` | Authentication endpoints | ~100 |

### Configuration Files

| File | Purpose | Format |
|------|---------|--------|
| `src/config/index.js` | Centralized config exports | JavaScript |
| `config/streams.json` | Persistent stream storage | JSON |
| `config/device-config.json` | Icecast path cache | JSON |
| `C:\Program Files (x86)\Icecast\icecast.xml` | Icecast configuration | XML |

### Log Files

| File | Purpose | Location |
|------|---------|----------|
| `logs/combined.log` | All application logs | `logs/` |
| `logs/error.log` | Error-only logs | `logs/` |
| `C:\Program Files (x86)\Icecast\logs\access.log` | Icecast access log | Icecast dir |
| `C:\Program Files (x86)\Icecast\logs\error.log` | Icecast error log | Icecast dir |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project readme |
| `CLAUDE.md` | Claude Code project instructions |
| [**STARTUP-SEQUENCE.md**](STARTUP-SEQUENCE.md) | Step-by-step process order for `npm run dev` and troubleshooting each step |
| [**TROUBLESHOOTING.md**](TROUBLESHOOTING.md) | Common issues: Icecast, network, playback, firewall, devices |
| [**NETWORK-SETUP.md**](NETWORK-SETUP.md) | Static IP, DHCP reservation, sharing URLs with listeners |
| `ERROR_DIAGNOSTICS_ANALYSIS_REPORT.md` | Error system analysis |
| `LANSTREAMER_SYSTEM_ARCHITECTURE.md` | This document |

---

## Appendix A: Key Code Locations

### Port Configuration

**All references to port configuration:**

```javascript
// Runtime port access
IcecastService.getActualPort()
  ├─> src/services/IcecastService.js:566-605
  ├─> src/services/StreamingService.js:311, 354, 421, 1077
  └─> src/services/FFmpegService.js:139

// Port parsing from icecast.xml
IcecastService.parsePort()
  └─> src/services/IcecastService.js:598-640

// Port caching to device-config.json
IcecastService._saveDeviceConfigPort()
  └─> src/services/IcecastService.js:646-664

// Port validation
SystemService.validateSystemRequirements()
  └─> src/services/SystemService.js:320
```

### Password Access

**All references to password configuration:**

```javascript
// Source password (FFmpeg → Icecast)
IcecastService.getSourcePassword()
  ├─> src/services/IcecastService.js:801
  ├─> src/services/StreamingService.js:417
  └─> src/services/FFmpegService.js:140

// Admin password (dashboard → Icecast)
IcecastService.getAdminPassword()
  ├─> src/services/IcecastService.js:808
  └─> src/routes/system.js (Icecast control)

// Password parsing from icecast.xml
IcecastService.parsePasswords()
  └─> src/services/IcecastService.js:736-771
```

### Error Diagnostics Integration

**All references to error diagnostics:**

```javascript
// Main diagnostic entry point
errorDiagnostics.diagnose(stderr, exitCode, context)
  ├─> src/services/StreamingService.js:312, 355, 1078
  └─> src/utils/errorDiagnostics.js:209

// Error formatting for user display
errorDiagnostics.formatMessage(diagnosis)
  └─> src/services/StreamingService.js:1085
```

---

## Appendix B: Environment Variables

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `PORT` | Express server port | 3001 | No |
| `HOST` | Express server host | 0.0.0.0 | No |
| `NODE_ENV` | Environment mode | development | No |
| `JWT_SECRET` | JWT signing secret | (generated) | No |

**Note:** Icecast configuration (port, passwords) is **NOT** stored in environment variables for security. Always read from `icecast.xml`.

---

## Appendix C: Default Ports

| Service | Default Port | Configurable |
|---------|--------------|--------------|
| Express API | 3001 | Yes (PORT env var) |
| Icecast | 8200 | Yes (icecast.xml) |
| Socket.io | Inherits Express | Yes |

**Important:** Icecast port is read from `icecast.xml` at runtime. The default 8000 in `config/index.js` is only a fallback.

---

## Related documentation

- **[Startup sequence](STARTUP-SEQUENCE.md)** — Process order when running `npm run dev`; use it to troubleshoot step-by-step.
- **[Troubleshooting guide](TROUBLESHOOTING.md)** — Icecast connection, network/subnet, playback, firewall, audio devices.
- **[Network setup](NETWORK-SETUP.md)** — Static IP and DHCP reservation for events; sharing listener URLs.

---

**Document End**

For questions or contributions, please refer to:
- GitHub: https://github.com/jerryagenyi/LANStreamer
- Issues: https://github.com/jerryagenyi/LANStreamer/issues

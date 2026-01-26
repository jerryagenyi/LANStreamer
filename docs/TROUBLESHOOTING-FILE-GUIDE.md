# 🔍 LANStreamer Critical Files for Troubleshooting

Complete reference guide to all critical files involved in stream creation, management, decoding, and error handling.

## 📋 Table of Contents
- [Stream Creation & Management](#stream-creation--management)
- [Audio Processing & Encoding](#audio-processing--encoding)
- [Icecast Integration](#icecast-integration)
- [Error Handling & Diagnostics](#error-handling--diagnostics)
- [Configuration Files](#configuration-files)
- [Log Files](#log-files)
- [Frontend Components](#frontend-components)
- [API Routes](#api-routes)

---

## Stream Creation & Management

### Core Service Files

**`src/services/StreamingService.js`** ⭐ **MOST CRITICAL**
- **Purpose**: Main orchestrator for stream lifecycle
- **Key Functions**:
  - `startStream()` - Creates and starts FFmpeg streams
  - `stopStream()` - Stops individual streams
  - `restartStream()` - Restarts stopped streams
  - `buildFFmpegArgs()` - Constructs FFmpeg command-line arguments
  - `startFFmpegProcess()` - Spawns and manages FFmpeg processes
  - `parseFFmpegError()` - Parses FFmpeg errors (now uses errorDiagnostics)
- **What to check**: 
  - FFmpeg command construction (line ~407-450)
  - Icecast URL format (line ~418)
  - Process spawn logic (line ~220-350)
  - Error handling (line ~1053-1090)

**`src/services/FFmpegService.js`**
- **Purpose**: FFmpeg process wrapper and testing
- **Key Functions**:
  - `testFFmpegConnection()` - Tests if FFmpeg can connect to Icecast
  - `findFFmpegPath()` - Locates FFmpeg executable
- **What to check**: FFmpeg path detection, connection testing

**`src/services/AudioDeviceService.js`**
- **Purpose**: Audio device detection and validation
- **Key Functions**:
  - `getAudioDevices()` - Lists available audio devices
  - `testDevice()` - Tests if device is accessible
  - `detectWindowsDevices()` - Windows DirectShow device detection
- **What to check**: Device detection logic, device name mapping

### API Routes

**`src/routes/streams.js`** ⭐ **API ENTRY POINT**
- **Purpose**: HTTP endpoints for stream operations
- **Key Routes**:
  - `POST /api/streams/start` - Start a new stream
  - `POST /api/streams/stop` - Stop a stream
  - `POST /api/streams/restart` - Restart a stream
  - `GET /api/streams/status` - Get stream status
- **What to check**: Request validation, error responses

---

## Audio Processing & Encoding

### FFmpeg Integration

**`src/services/StreamingService.js`** (buildFFmpegArgs method)
- **Purpose**: Constructs FFmpeg command-line arguments
- **Key Parameters**:
  - Input: DirectShow device name (`-f dshow -i audio="Device Name"`)
  - Codec: MP3/AAC/OGG with fallback (`-acodec libmp3lame`)
  - Output: Icecast URL (`icecast://source:password@host:port/streamId`)
- **What to check**: 
  - Device name quoting (line ~430)
  - Codec selection (line ~358-396)
  - Icecast URL format (line ~418)

**Format Fallback System** (StreamingService.js, line ~159-218)
- Tries formats in order: MP3 → AAC → OGG
- Each format has different codec requirements
- Logs which format succeeded

---

## Icecast Integration

### Core Service

**`src/services/IcecastService.js`** ⭐ **ICECAST MANAGEMENT**
- **Purpose**: Icecast server lifecycle and configuration
- **Key Functions**:
  - `start()` - Start Icecast server
  - `stop()` - Stop Icecast server (with manual stop flag)
  - `restart()` - Restart Icecast server
  - `getStatus()` - Get server status and stats
  - `getActualPort()` - Read port from icecast.xml (line ~528)
  - `parsePort()` - Parse port from XML config (line ~536)
- **What to check**:
  - Port detection (line ~528-567)
  - Process management (line ~1105-1350)
  - Manual stop flag (line ~44, ~1313, ~2013)

### Configuration

**`C:\Program Files (x86)\Icecast\icecast.xml`** ⭐ **ICECAST CONFIG**
- **Purpose**: Icecast server configuration
- **Key Settings**:
  - `<port>8200</port>` - Listening port (inside `<listen-socket>`)
  - `<source-password>hackme</source-password>` - Stream source password
  - `<admin-password>hackme</admin-password>` - Admin panel password
  - `<sources>2</sources>` - Max concurrent streams
- **What to check**: Port number, password, source limits

**`config/device-config.json`**
- **Purpose**: Cached Icecast/FFmpeg paths
- **What to check**: Paths are correct, not stale

---

## Error Handling & Diagnostics

### Error Diagnostics System

**`src/utils/errorDiagnostics.js`** ⭐ **ERROR ANALYSIS**
- **Purpose**: Centralized error detection and user-friendly messages
- **Key Functions**:
  - `diagnose()` - Main diagnostic entry point
  - `diagnoseConnectionError()` - Connection/port issues
  - `diagnosePortConflict()` - Port conflicts
  - `diagnoseDeviceNotFound()` - Device issues
  - `diagnoseVirtualAudioError()` - VB-Audio/VoiceMeeter issues
- **Error Categories Detected**:
  - Connection errors (port 8000/8200 conflicts)
  - Authentication errors (wrong passwords)
  - Device errors (not found, busy, in use)
  - Codec errors (missing libmp3lame, etc.)
  - Virtual audio errors (VB-Audio, VoiceMeeter)
- **What to check**: Error pattern matching, diagnostic accuracy

**`src/utils/errors.js`**
- **Purpose**: Custom error classes and error factory
- **Key Classes**: `IcecastError`, `AppError`, `ErrorFactory`
- **What to check**: Error codes, error messages

**`src/middleware/errorHandler.js`**
- **Purpose**: Express error handling middleware
- **What to check**: Error response format

---

## Configuration Files

### Application Config

**`src/config/index.js`** ⭐ **MAIN CONFIG**
- **Purpose**: Centralized configuration management
- **Key Settings**:
  - `icecast.port` - Default port (8000, but overridden by icecast.xml)
  - `icecast.host` - Icecast hostname
  - `icecast.sourcePassword` - Source password
  - `icecast.adminPassword` - Admin password
- **What to check**: Default values, environment variable loading

**`.env`** (not in git, use `env.example` as template)
- **Purpose**: Environment-specific configuration
- **Key Variables**:
  - `ICECAST_PORT` - Override Icecast port
  - `ICECAST_HOST` - Icecast hostname
  - `ICECAST_SOURCE_PASSWORD` - Source password
  - `ICECAST_EXE_PATH` - Manual Icecast path
- **What to check**: Port matches icecast.xml, passwords match

**`config/streams.json`**
- **Purpose**: Persistent stream definitions
- **What to check**: Stream IDs, device IDs, configurations

---

## Log Files

### Application Logs

**`logs/lanstreamer-YYYY-MM-DD.log`** ⭐ **MAIN LOG**
- **Purpose**: General application logs
- **What to check**: 
  - Stream creation attempts
  - FFmpeg process spawns
  - Icecast status checks
  - Port parsing messages

**`logs/streams-YYYY-MM-DD.log`**
- **Purpose**: Stream-specific logs
- **What to check**: Stream lifecycle events, FFmpeg output

**`logs/error-YYYY-MM-DD.log`**
- **Purpose**: Error logs only
- **What to check**: Crash details, error stack traces

### Icecast Logs

**`C:\Program Files (x86)\Icecast\logs\error.log`** ⭐ **ICECAST ERRORS**
- **Purpose**: Icecast server error log
- **What to check**: 
  - Server startup issues
  - Connection errors
  - Source authentication failures
  - Mount point errors

**`C:\Program Files (x86)\Icecast\logs\access.log`** ⭐ **ICECAST ACCESS**
- **Purpose**: HTTP access log
- **What to check**:
  - Source connections (PUT requests)
  - Listener connections (GET requests)
  - Admin panel access
  - Authentication failures (401 errors)

---

## Frontend Components

### Stream Management UI

**`public/components/FFmpegStreamsManager.js`** ⭐ **FRONTEND STREAM UI**
- **Purpose**: Stream creation and management interface
- **Key Functions**:
  - `startStream()` - Calls API to start stream (line ~209)
  - `showAddStreamModal()` - Stream creation form (line ~1095)
  - `showNotification()` - Error/success notifications (line ~1308)
- **What to check**: 
  - API call format (line ~218-224)
  - Error handling (line ~239-242)
  - Notification display (line ~1308-1341)

**`public/components/IcecastManager.js`**
- **Purpose**: Icecast server control UI
- **Key Functions**:
  - `startServer()` - Start Icecast
  - `stopServer()` - Stop Icecast
  - `restartServer()` - Restart Icecast
- **What to check**: Button handlers, status display

### Listener Interface

**`public/streams.html`**
- **Purpose**: Public listener page (no auth required)
- **What to check**: Audio player implementation, stream URL format

**`public/index.html`**
- **Purpose**: Admin dashboard (auth required)
- **What to check**: Component loading, authentication

---

## API Routes

### System Routes

**`src/routes/system.js`**
- **Purpose**: System status and Icecast control
- **Key Routes**:
  - `GET /api/system/icecast-status` - Get Icecast status
  - `POST /api/system/icecast/start` - Start Icecast
  - `POST /api/system/icecast/stop` - Stop Icecast
  - `GET /api/system/audio-devices` - List audio devices
- **What to check**: Status response format, port in response

### Stream Routes

**`src/routes/streams.js`** (already covered above)

---

## 🔧 Quick Troubleshooting Checklist

When streams fail to start, check these in order:

### 1. **Icecast Status**
```bash
# Check if Icecast is running
tasklist /FI "IMAGENAME eq icecast.exe"

# Check if port is listening
netstat -ano | findstr ":8200"
```

**Files to check:**
- `src/services/IcecastService.js` (getStatus method)
- `C:\Program Files (x86)\Icecast\logs\error.log`

### 2. **Port Configuration**
```bash
# Verify port in icecast.xml
Get-Content "C:\Program Files (x86)\Icecast\icecast.xml" | Select-String "<port>"
```

**Files to check:**
- `C:\Program Files (x86)\Icecast\icecast.xml` (actual port)
- `src/services/IcecastService.js` (parsePort method, line ~536)
- `src/services/StreamingService.js` (buildFFmpegArgs, line ~420)

### 3. **FFmpeg Command**
**Files to check:**
- `src/services/StreamingService.js` (buildFFmpegArgs, line ~407)
- `logs/streams-YYYY-MM-DD.log` (FFmpeg command output)

### 4. **Device Detection**
**Files to check:**
- `src/services/AudioDeviceService.js` (detectWindowsDevices)
- `src/services/StreamingService.js` (validateAndGetDeviceName, line ~430)

### 5. **Error Messages**
**Files to check:**
- `src/utils/errorDiagnostics.js` (diagnose method)
- `logs/error-YYYY-MM-DD.log`
- `C:\Program Files (x86)\Icecast\logs\error.log`

---

## 📊 Data Flow Diagram

```
User clicks "Go Live"
    ↓
FFmpegStreamsManager.startStream()
    ↓
POST /api/streams/start
    ↓
StreamingService.startStream()
    ↓
├─ AudioDeviceService.testDevice() [Device validation]
├─ StreamingService.buildFFmpegArgs() [Command construction]
│  └─ IcecastService.getActualPort() [Get port from icecast.xml]
└─ StreamingService.startFFmpegProcess() [Spawn FFmpeg]
    ↓
FFmpeg connects to: icecast://source:password@localhost:8200/streamId
    ↓
Icecast accepts connection (or rejects with error)
    ↓
Stream starts (or errorDiagnostics.diagnose() provides error message)
```

---

## 🎯 Most Common Issues & Files

| Issue | Primary File | Secondary Files |
|-------|-------------|-----------------|
| Port mismatch (8000 vs 8200) | `IcecastService.js` (getActualPort) | `icecast.xml`, `StreamingService.js` |
| Connection refused | `errorDiagnostics.js` (diagnoseConnectionError) | `IcecastService.js` (getStatus) |
| Device not found | `AudioDeviceService.js` (detectWindowsDevices) | `StreamingService.js` (validateAndGetDeviceName) |
| FFmpeg crash | `StreamingService.js` (startFFmpegProcess) | `errorDiagnostics.js` (diagnose) |
| Authentication failed | `icecast.xml` | `config/index.js` |
| Auto-restart after stop | `IcecastService.js` (stop method, manuallyStopped flag) | `IcecastService.js` (updateConfig) |

---

## 📝 Notes

- **Port Priority**: `icecast.xml` → `IcecastService.getActualPort()` → `config.icecast.port` (default 8000)
- **Error Diagnostics**: All FFmpeg errors go through `errorDiagnostics.diagnose()` for user-friendly messages
- **Manual Stop**: `manuallyStopped` flag prevents auto-restart after user clicks "Stop Server"
- **Format Fallback**: System tries MP3 → AAC → OGG automatically if one fails

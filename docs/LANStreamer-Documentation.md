# LANStreamer Documentation

This document provides comprehensive technical documentation for LANStreamer, including system architecture, component integration, installation guides, and operational procedures.

## Table of Contents
- [System Overview](#system-overview)
- [Codebase Architecture Analysis](#codebase-architecture-analysis)
- [Icecast Component](#icecast-component)
- [FFmpeg Component](#ffmpeg-component)
- [Player Component](#player-component)
- [Component Manager](#component-manager)
- [WebSocket Service](#websocket-service)
- [Audio Device Service](#audio-device-service)
- [Installation Guides](#installation-guides)
- [Troubleshooting](#troubleshooting)

---

## System Overview

LANStreamer follows a modular architecture where frontend components communicate with backend services through well-defined APIs:

**System Flow:**
1. **Frontend**: UI components (buttons, controls) call API endpoints
2. **Backend**: Express.js routes handle API calls and coordinate services
3. **Services**: Core business logic for Icecast, FFmpeg, audio devices, etc.
4. **External Tools**: Integration with Icecast server and FFmpeg processes

**Key Integration Pattern:**
```
Frontend Component → API Endpoint → Express Route → Service Class → External Process
```

---

## Codebase Architecture Analysis

### Overall Codebase Architecture
LANStreamer is well-structured with a clear separation of concerns:

**Frontend-Backend Architecture:**
- **Frontend**: Component-based JavaScript modules (`public/components/`)
- **Backend**: Express.js server with service layer (`src/services/`, `src/routes/`)
- **API Communication**: RESTful endpoints for system management
- **Configuration**: Centralized config management with environment variables

### Key Strengths:
- ✅ **Modular Design**: Clear separation between IcecastService, AudioDeviceService, etc.
- ✅ **Comprehensive Documentation**: Excellent installation guides and technical specs
- ✅ **Error Handling**: Robust error handling with proper logging
- ✅ **Cross-Platform Support**: Windows-focused with Unix compatibility

### Architecture Benefits:
- **Maintainability**: Each component has a single responsibility
- **Testability**: Services can be tested independently
- **Scalability**: Easy to add new components and features
- **Reliability**: Proper error handling and logging throughout

---

## Icecast Component

### System Flow
**Frontend**: Buttons call API endpoints like `/api/system/icecast/start`  
**Backend**: Routes in `src/routes/system.js` handle these calls  
**Service**: `IcecastService.js` contains the actual start/stop logic

### Backend API Endpoints
- `GET /api/system/icecast/search-installations` - Search for Icecast installations
- `GET /api/system/icecast-status` - Get current server status and statistics
- `POST /api/system/icecast/start` - Start Icecast server process
- `POST /api/system/icecast/stop` - Stop Icecast server gracefully
- `POST /api/system/icecast/restart` - Restart server with full cycle
- `GET /api/system/icecast/validate-config` - Validate configuration files

### Windows System Commands
- `tasklist | findstr /I icecast.exe` - Check if process is running
- `taskkill /IM icecast.exe /F` - Force kill icecast.exe process by name
- `netstat -ano | findstr :8000` - Check if port 8000 is active
- `tasklist /FI "IMAGENAME eq icecast.exe" /FO TABLE` - Get PID and details for icecast.exe
- `taskkill /PID {PID} /F` - Force kill process by ID
- `sc query "Icecast"` - Check Windows service status
- `net start/stop Icecast` - Control Windows service

### Icecast Installation Files
- `C:\Program Files (x86)\Icecast\bin\icecast.exe` - Main executable (ALWAYS in bin subfolder)
- `C:\Program Files (x86)\Icecast\icecast.xml` - Configuration file
- `C:\Program Files (x86)\Icecast\icecast.bat` - Windows batch file (calls bin\icecast.exe)
- `C:\Program Files (x86)\Icecast\logs\` - Log directory
- `C:\Program Files (x86)\Icecast\web\` - Web interface files
- `C:\Program Files (x86)\Icecast\admin\` - Admin interface files

**IMPORTANT**: icecast.exe is NEVER at the root - it's always in the bin\ subdirectory. The icecast.bat file is the standard way to start Icecast as it correctly references bin\icecast.exe

### Network Services
- `http://localhost:8000/admin/` - Icecast admin interface
- Port 8000 - Default Icecast listening port
- HTTP status endpoints for health monitoring

### Workflow

#### 1. Installation Detection
- Search predefined paths for Icecast installation
- Validate required files (exe, xml, bat, directories)
- Check file permissions and accessibility
- Store installation path for future operations

#### 2. Status Monitoring
- Check if icecast.exe process is running (tasklist) - **detects external processes too**
- Verify port 8000 is active (netstat)
- Test admin interface accessibility (HTTP GET)
- Monitor Windows service status (sc query)
- Track uptime, listeners, and connections
- **Sync internal state** with actual process status (important for external starts)

#### 3. Process Management

**Button State Logic:**
When LANStreamer starts (`npm start`) and the web application loads:
1. **Initial Check**: Automatically check if `icecast.exe` process is running
2. **Button State Setting**: 
   - If process is running: Start button becomes inactive, Stop/Restart buttons become active
   - If process is not running: Start/Restart buttons become active, Stop button becomes inactive

**New Button Logic Flow:**
1. **Pre-Operation Status Check**: All buttons verify current server status before performing actions
2. **Operation Execution**: Button performs its intended operation (start/stop/restart)
3. **Wait for Completion**: Button waits for actual server state change (3-12 seconds depending on operation)
4. **Status Verification**: Re-check server status to confirm operation actually succeeded
5. **UI Update**: Only update button states and show success/error after verification
6. **Race Condition Prevention**: All buttons disabled during any operation to prevent multiple clicks

**Benefits:**
- ✅ **No false success messages** - UI only shows success after verifying actual server state
- ✅ **Prevents race conditions** - Users can't click buttons before operations complete
- ✅ **Accurate button states** - Buttons reflect actual server status, not just API responses
- ✅ **Better user experience** - Clear feedback on what's actually happening vs. what was requested

**Process Management Operations:**

**Start Process:**
1. Check if `icecast.exe` is already running (prevent duplicate processes)
2. If already running: Display message "Icecast is already running" and return
3. If not running: Execute `icecast.bat` with proper working directory
4. Update button states: Start inactive, Stop/Restart active

**Stop Process:**
1. Check if `icecast.exe` process is currently running
2. If not running: Display message "Icecast is not running" and return
3. If running: Send termination signal to process ID
4. Update button states: Start/Restart active, Stop inactive

**Restart Process:**
1. Check if `icecast.exe` process is currently running
2. If running: Stop the process first, wait for clean shutdown
3. If not running: Skip stop step
4. Start the process using `icecast.bat`
5. Verify successful restart with status check
6. Update button states accordingly

**Additional Operations:**
- Force Kill: Use `taskkill` for unresponsive processes
- Process ID tracking for precise control
- Continuous status monitoring to keep button states synchronized

**Error Prevention:**
- Prevents starting duplicate Icecast processes
- Prevents stopping non-existent processes
- Handles edge cases where process state is unclear
- Provides clear user feedback for all operations

#### 4. Configuration Validation
- Parse icecast.xml for syntax errors
- Validate log and web directory paths
- Check file permissions and accessibility
- Detect configuration conflicts and issues
- Provide detailed error reporting

#### 5. Health Monitoring
- Determine overall system health status
- Monitor process, port, and admin interface
- Track error rates and recovery attempts
- **Automatic health checks every 5 seconds** (monitors external process changes)
- Graceful degradation on failures
- **Real-time button state updates** based on actual process status

#### 6. Error Recovery
- Automatic restart on process crashes
- Configuration validation before startup
- Fallback to manual process control
- User notification of issues and resolutions
- Logging of all operations and errors

### Autonomous Capabilities
- Self-detection of external Icecast instances
- Automatic health monitoring and recovery
- Configuration validation and error reporting
- Process lifecycle management without user intervention
- Integration with Windows services and process management
- Real-time status updates and health assessment

---

## FFmpeg Component

### System Flow
**Frontend**: Stream controls trigger FFmpeg operations  
**Backend**: Routes in `src/routes/streams.js` handle stream management  
**Service**: `FFmpegService.js` manages audio encoding and streaming

### Backend API Endpoints
- `GET /api/system/ffmpeg` - Get FFmpeg installation status
- `POST /api/system/ffmpeg/test` - Test FFmpeg functionality
- `POST /api/streams/start` - Start audio stream with FFmpeg
- `POST /api/streams/stop` - Stop active stream
- `GET /api/streams/status` - Get current stream status

### Audio Processing Workflow
1. **Audio Input Detection**: Detect available audio devices
2. **Stream Configuration**: Configure encoding parameters
3. **FFmpeg Process**: Launch FFmpeg with proper arguments
4. **Stream Monitoring**: Monitor process health and output
5. **Error Handling**: Automatic recovery on stream failures

### FFmpeg Commands and Parameters
- Audio device selection and input configuration
- Encoding settings (bitrate, sample rate, channels)
- Output stream destination (Icecast mountpoints)
- Real-time monitoring and logging

---

## Player Component

### System Flow
**Frontend**: Audio player interface  
**Backend**: Stream discovery and metadata services  
**Service**: Audio stream management and playback coordination

### Player Features
- **Stream Selection**: Choose from available audio streams
- **Volume Control**: Individual stream volume adjustment
- **Stream Metadata**: Display stream information and status
- **Auto-Discovery**: Automatic detection of available streams
- **Buffering Management**: Handle network latency and buffering

### Integration with Icecast
- Connects to Icecast mountpoints for audio playback
- Retrieves stream metadata from Icecast admin interface
- Monitors stream health and availability

---

## Component Manager

### System Flow
**Frontend**: Component coordination and state management  
**Backend**: Unified component status and control  
**Service**: Cross-component communication and dependency management

### Core Responsibilities
- **Component Lifecycle**: Manage startup/shutdown of all components
- **State Synchronization**: Keep component states in sync
- **Dependency Management**: Handle component dependencies
- **Health Monitoring**: Monitor overall system health
- **Error Coordination**: Coordinate error handling across components

---

## WebSocket Service

### Real-time Communication
- **Status Updates**: Real-time component status broadcasts
- **Event Notifications**: Component state changes and alerts
- **Performance Metrics**: Live system performance data
- **Error Reporting**: Real-time error notifications

### WebSocket Events
- `component:status` - Component status updates
- `stream:started` - Stream start notifications
- `stream:stopped` - Stream stop notifications
- `system:error` - System error alerts
- `health:check` - Health monitoring updates

---

## Audio Device Service

### Device Management
- **Device Detection**: Automatic audio device discovery
- **Device Classification**: Differentiate input/output devices
- **Professional Audio**: Support for multi-channel interfaces
- **Virtual Audio**: Integration with virtual audio routing

### Supported Device Types
- Built-in microphones and speakers
- USB audio interfaces
- Professional audio equipment (XR18, Scarlett series)
- Virtual audio cables and routing software
- Dante Virtual Soundcard integration

---

## Installation Guides

### Quick Installation Steps

#### Icecast Installation
1. **Download**: Get Icecast from [icecast.org](https://icecast.org/download/)
2. **Install**: Run the Windows installer (typically installs to `C:\Program Files (x86)\Icecast\`)
3. **Verify**: Check that `icecast.bat` and `bin\icecast.exe` exist
4. **Configure**: Edit `icecast.xml` if needed (default settings usually work)
5. **Test**: Run `icecast.bat` to verify installation

#### FFmpeg Installation
1. **Download**: Get FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. **Extract**: Extract to a folder (e.g., `C:\ffmpeg\`)
3. **PATH**: Add FFmpeg bin directory to Windows PATH environment variable
4. **Verify**: Open Command Prompt and run `ffmpeg -version`

#### LANStreamer Installation
1. **Clone**: `git clone <repository-url>`
2. **Dependencies**: `npm install`
3. **Environment**: Copy `.env.example` to `.env` and configure
4. **Start**: `npm start`
5. **Access**: Open `http://localhost:3001`

### Prerequisites
- Node.js 16+ installed
- Windows 10/11 (primary support)
- Administrator privileges for audio device access
- Network access for streaming

---

## File System Access and Integration

### Configuration Management
- Program Files directories (x86 and x64)
- Configuration file parsing (XML for Icecast)
- Log file access and monitoring
- Directory structure validation

### Data Persistence
- Settings and configuration storage
- Log file management and rotation
- Stream history and analytics
- User preferences and customization

---

## Security and Authentication

### Access Control
- Admin interface protection
- API endpoint authentication
- Stream access management
- Configuration security

### Network Security
- Local network isolation
- Port management and firewall considerations
- Stream encryption options
- Admin interface security

---

## Troubleshooting

### Common Issues
- **Icecast executable path problems** (bin folder structure)
- **Audio device detection failures**
- **Stream startup errors**
- **Network connectivity issues**

### Diagnostic Tools
- Component health checks
- Log file analysis
- Network port verification
- Audio device testing

### Recovery Procedures
- Automatic service restart
- Configuration validation and repair
- Manual intervention procedures
- Fallback operation modes

### Error Messages and Solutions
- **"Component Not Available"**: Check JavaScript console for errors, verify file paths
- **"Server stopped but failed to restart"**: Check Icecast installation, verify permissions
- **"Audio device not found"**: Refresh devices, check Windows audio settings
- **"Port already in use"**: Check for other Icecast instances, change port in config

---

## Performance Monitoring

### System Metrics
- CPU and memory usage
- Network bandwidth utilization
- Audio stream quality metrics
- Component response times

### Health Indicators
- Service availability status
- Stream connection counts
- Error rates and recovery success
- Overall system health score

---

This documentation serves as the comprehensive reference for LANStreamer's architecture, installation, and operational procedures.

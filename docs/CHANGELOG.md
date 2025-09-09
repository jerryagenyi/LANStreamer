# LANStreamer Changelog

All notable changes to LANStreamer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Stream configuration and mount point management
- FFmpeg integration for audio streaming
- Listener web player interface
- QR code generation for listener access
- Real-time stream monitoring and statistics
- Final packaging as standalone `.exe`

---

## [1.0.0-beta] - 2025-01-09

### Added
- **Component Button Functionality**
  - Fixed edit, delete, start, stop, and copy URL buttons in FFmpegStreamsManager
  - Added global component instance references for proper onclick handler access
  - Enhanced button state management and user feedback

- **API Compatibility Improvements**
  - Updated audio devices endpoint to handle both old and new response formats
  - Added refresh parameter support for clearing device cache
  - Improved error handling and response consistency

- **User Experience Enhancements**
  - Removed annoying device refresh warning dialog
  - Added comprehensive error logging and debugging information
  - Improved component loading reliability and error recovery

- **Update and Restore Tools**
  - Enhanced Update LANStreamer.bat with better error reporting
  - Added RESTORE LANStreamer.bat for easy backup restoration
  - Improved error visibility and prevented silent failures

### Fixed
- **Critical Button Issues**
  - Fixed non-responsive edit, delete, start, stop, and copy URL buttons
  - Resolved global variable reference issues in onclick handlers
  - Improved component instance management and accessibility

- **Audio Device Management**
  - Fixed "Failed to refresh devices" error with improved API handling
  - Enhanced device detection and caching mechanisms
  - Improved error messages and user feedback

- **Update Script Reliability**
  - Fixed silent failures in Update LANStreamer.bat
  - Added detailed error logging and user-friendly error messages
  - Prevented premature window closure on errors

### Changed
- **Component Architecture**
  - Enhanced ComponentManager with better global reference management
  - Improved component initialization and error handling
  - Streamlined component loading process

- **API Response Format**
  - Standardized audio devices API to return consistent object format
  - Added backward compatibility for existing implementations
  - Improved error response structure and messaging

---

## [1.0.0-alpha] - 2025-09-01

### Added
- **Complete Backend Infrastructure**
  - Express.js server running on port 3001
  - Modular API route structure (`/api/system/*`, `/api/streams/*`, `/api/settings/*`)
  - Comprehensive error handling and logging system
  - Environment-based configuration with `.env` support

- **Enhanced Icecast Integration**
  - Windows-specific installation detection (Program Files, PATH, services)
  - Multi-path search with file validation (`icecast.exe`, `icecast.xml`, batch files)
  - Process management using Windows `tasklist`/`taskkill` commands
  - PID tracking and process lifecycle management
  - Configuration validation and troubleshooting assistance
  - Support for manual path configuration via environment variables

- **Component-Based Frontend Architecture**
  - Dynamic component loading system with static HTML fallbacks
  - `ComponentManager.js` for handling component lifecycle
  - `IcecastManager.js` - Complete server control panel
  - Responsive design using Tailwind CSS and Material Symbols icons
  - Installation status display with file validation grid

- **API Endpoints**
  - `GET /api/health` - Server health check
  - `GET /api/system/icecast-status` - Basic Icecast status
  - `GET /api/system/icecast/detailed-status` - Detailed status with mountpoints
  - `POST /api/system/icecast/start` - Start Icecast server
  - `POST /api/system/icecast/stop` - Stop Icecast server
  - `POST /api/system/icecast/restart` - Restart Icecast server
  - `POST /api/system/icecast/check-installation` - Verify installation
  - `GET /api/system/icecast/search-installations` - Search for installations
  - `GET /api/system/icecast/validate-config` - Validate configuration
  - `GET /api/system/audio-devices` - List available audio devices
  - `GET /api/system/ffmpeg-check` - Verify FFmpeg installation
  - `GET /api/system/ffmpeg-processes` - List running FFmpeg processes

- **Configuration Management**
  - Environment variable support for Icecast paths
  - Automatic fallback to manual path detection
  - Comprehensive `.env` configuration examples
  - Installation path validation and error recovery

- **Documentation**
  - Complete Icecast installation guide with Windows-specific instructions
  - FFmpeg installation guide with platform-specific methods
  - Environment configuration examples and troubleshooting
  - Technical specification with current implementation details
  - Product requirements document with implementation status

### Changed
- **Architecture Evolution**
  - Moved from concept to working application
  - Implemented production-ready error handling
  - Added comprehensive logging and monitoring
  - Enhanced user experience with real-time status updates

- **Icecast Management**
  - Replaced basic status checking with full Windows integration
  - Added file validation and installation verification
  - Implemented process tracking and management
  - Enhanced configuration validation and troubleshooting

### Fixed
- **Windows Integration Issues**
  - Resolved Icecast installation detection problems
  - Fixed configuration file path resolution
  - Corrected process management for Windows services
  - Addressed relative path issues in Icecast configuration

- **User Experience**
  - Eliminated manual installation configuration requirements
  - Added automatic detection and validation
  - Improved error messages and troubleshooting guidance
  - Enhanced status display with detailed information

### Technical Details
- **Backend Services**
  - `IcecastService.js` - Windows-specific Icecast management
  - `AudioDeviceService.js` - Audio hardware detection infrastructure
  - `ComponentManager.js` - Frontend component lifecycle management
  - Comprehensive route handlers with proper error handling

- **Frontend Components**
  - Dynamic loading system with graceful degradation
  - Real-time status updates and process monitoring
  - File validation grid showing installation status
  - Responsive design for various screen sizes

- **Process Management**
  - Windows-native process detection and control
  - PID tracking for enhanced monitoring
  - Graceful error recovery and user feedback
  - Comprehensive logging for troubleshooting

### Known Issues
- **Repetitive Logging**: Frontend auto-refresh causes excessive "Icecast installation verified" log entries
- **Performance**: Installation detection runs on every status check (needs caching)
- **Component Loading**: Some edge cases in component fallback system

### Dependencies
- Node.js 16+ with Express.js framework
- Windows-specific process management tools
- Tailwind CSS for styling
- Material Symbols for icons
- Winston for logging

---

## [0.1.0] - 2025-08-31

### Added
- Initial project structure and documentation
- Basic Express server setup
- Project requirements and technical specifications
- Development roadmap and TDD plan

---

## [0.0.1] - 2025-08-30

### Added
- Project initialization
- Repository setup
- Initial documentation structure
- Development environment configuration

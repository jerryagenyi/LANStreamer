# LANStreamer Development TODO List

## 🚨 CURRENT ACTIVE TASKS

### 🎯 Phase 1: Smart Device Config System (COMPLETE ✅)
- [x] **Device Config Implementation**
  - [x] Smart initialization with device-specific config storage
  - [x] Config location: `LANStreamer/config/device-config.json` (project-based)
  - [x] Path validation and self-healing system
  - [x] Fast startup when config is valid, auto-detect when invalid
- [x] **Phase 2: Browse for Icecast UI Button**
  - [x] Add "Browse for Icecast" button when installation not found
  - [x] File browser integration for root folder selection
  - [x] Auto-detect all paths from selected root folder
  - [x] Update device config with user-selected path
- [x] **Code Cleanup & Optimization**
  - [x] Major IcecastService.js cleanup (2266 → 2024 lines, 10.7% reduction)
  - [x] Consolidated path detection logic with shared helpers
  - [x] Simplified getStatus method (113 → 40 lines)
  - [x] Fixed service state management for error recovery
- [x] **Music Player & Upload System (COMPLETE ✅)**
  - [x] Fixed music player display to show "No music file loaded" instead of confusing default names
  - [x] Removed problematic default file logic that caused errors
  - [x] Fixed server upload functionality with increased file size limit (50MB → 200MB)
  - [x] Enhanced Icecast auto-detection to find installations with dash suffix (Icecast-)
  - [x] Server running and handling music file uploads successfully
- [ ] **Phase 3: UI Cleanup & Optimization**
  - [ ] Remove redundant "Icecast Installation Detected" green section
  - [ ] Remove unnecessary buttons near Icecast status
  - [ ] Replace top status with bottom status component
  - [ ] Improve error messaging and user actions
- [ ] **Phase 4: Auto-refresh System**
  - [ ] Implement real-time detection of Icecast installation changes
  - [ ] Auto-refresh UI when installation status changes
  - [ ] Remove need for manual browser refresh
- [ ] **Phase 5: Music Player Enhancements (NEEDED)**
  - [ ] Implement default music file system - provide sample music files or auto-download
  - [ ] Add music file management (delete, rename, organize)
  - [ ] Add playlist functionality for multiple music files
  - [ ] Add fade in/out transitions between tracks
  - [ ] Add volume controls and audio visualization
  - [ ] Add music player state persistence across browser refreshes
- [ ] **Phase 8: Lobby Music System (NEW FEATURE 🎵)**
  - [ ] **MVP (Version 1.0)**
    - [ ] Admin audio file upload system for lobby music
    - [ ] Single lobby track selection and management
    - [ ] Admin toggle: "Enable/Disable Lobby Music" on dashboard
    - [ ] Backend lobby music stream creation (treat as special system stream)
    - [ ] Client-side auto-detection: Play lobby music when no live streams exist
    - [ ] Basic volume control for lobby music
    - [ ] File format support: MP3, WAV, OGG
    - [ ] Storage: Local file system in `uploads/lobby-music/` directory
  - [ ] **Version 2.0 - Enhanced Playlist System**
    - [ ] Multiple lobby music files upload and management
    - [ ] Playlist creation with track rotation/shuffle options
    - [ ] Track scheduling: Different music for different times/days
    - [ ] Crossfade transitions between tracks (3-5 second overlap)
    - [ ] Admin preview: Play lobby music in dashboard before enabling
    - [ ] Track metadata display (title, artist, duration)
    - [ ] Playlist loop modes: Sequential, shuffle, single repeat
  - [ ] **Version 3.0 - Advanced Features**
    - [ ] Smart transitions: Fade out lobby music when live streams start
    - [ ] Priority system: Live streams automatically override lobby music
    - [ ] User controls on `/streams.html`: Mute lobby music independently
    - [ ] Volume mixing: Lower lobby music volume when streams are live
    - [ ] Scheduling system: Different playlists for different time periods
    - [ ] Integration with stream events: Welcome music when first visitor joins
    - [ ] Analytics: Track lobby music engagement and listening duration
    - [ ] Cloud storage integration for larger music libraries
  - [ ] **Technical Implementation**
    - [ ] Backend: New `LobbyMusicService.js` for music management
    - [ ] API Endpoints: `/api/lobby-music/*` for CRUD operations
    - [ ] Database: Track metadata, playlists, and settings
    - [ ] Frontend: Admin lobby music management panel
    - [ ] Client Integration: Auto-play logic on `/streams.html`
    - [ ] Stream Priority: Lobby music as lowest priority system stream
  - [ ] **User Experience Flow**
    - [ ] Admin uploads music files via dashboard
    - [ ] Admin enables lobby music with toggle switch
    - [ ] Visitors to `/streams.html` hear lobby music when no streams are live
    - [ ] Lobby music automatically stops/fades when live streams start
    - [ ] Visitors can mute lobby music while keeping live streams audible
    - [ ] Professional feel: No dead air, continuous audio experience
- [ ] **Phase 6: Icecast Component & Service Edge Cases (BUG FIX)**
  - [ ] Fix confusing error message display when Icecast IS detected but validation fails
  - [ ] Revisit IcecastManager component error state logic - should not show "server not found" when it IS found
  - [ ] Improve IcecastService validation to distinguish between "not found" vs "found but invalid structure"
  - [ ] Remove redundant "Search Again" button (COMPLETED ✅)
  - [ ] Better error messaging for edge cases like missing config files vs missing executables
- [ ] **Phase 7: FFmpeg Streams Critical Issues (HIGH PRIORITY 🚨)**
  - [ ] **Fix FFmpeg Streams Section Visibility** - Section has gone hidden after refresh
  - [ ] **Stream URL Display** - Show stream URLs with "Stream created, listen via [URL]" messages
  - [ ] **Copy-to-Clipboard Functionality** - Click stream URL to copy to clipboard
  - [ ] **Icecast Dependency Check** - Verify Icecast is running before creating streams
  - [ ] **Stream Lifecycle Management** - Handle what happens when Icecast goes down after streams are created
  - [ ] **Stream Status Monitoring** - Real-time monitoring of stream health
  - [ ] **Persistent Stream URLs** - Display stream URLs permanently near each active stream
  - [ ] **Auto-copy Stream URLs** - Automatically copy stream URL when stream starts
  - [ ] **Stream Failure Recovery** - Graceful handling when Icecast server fails
  - [ ] **Dependency Order Clarification** - Document FFmpeg → Icecast relationship and startup order

### 🔧 Recent Fixes & Improvements (COMPLETED)
- [x] **Service State Management Fix**
  - [x] Fixed error state recovery - service can now re-initialize after errors
  - [x] Eliminated "Service is in error state" blocking issue
  - [x] Improved ensureInitialized() to allow recovery from error state
- [x] **Code Quality Improvements**
  - [x] Reduced IcecastService.js by 242 lines (10.7% reduction)
  - [x] Extracted helper methods for better maintainability
  - [x] Consolidated duplicate validation logic
  - [x] Improved error handling and logging
- [x] **Documentation Cleanup (COMPLETED ✅)**
  - [x] Created simplified installation guides (Context7 methodology)
  - [x] Icecast guide: 696 lines → 70 lines (90% reduction)
  - [x] FFmpeg guide: 400 lines → 60 lines (85% reduction)
  - [x] Audio pipeline guide: 209 lines → 100 lines (52% reduction)
  - [x] Added troubleshooting guide with quick fixes
  - [x] Updated guides README with clear navigation
  - [x] Preserved detailed guides as "Legacy" for technical reference
- [x] **Stream Controls Removal (COMPLETED ✅)**
  - [x] Removed bulk "Start All Streams" / "End All Streams" functionality
  - [x] Cleaned up backend API endpoints for bulk operations
  - [x] Simplified UI by removing unnecessary complexity
  - [x] Moved icecast-convo.md to tutorials/icecast-implementation-notes.md
- [x] **Documentation Organization (COMPLETED ✅)**
  - [x] Organized docs folder into logical subdirectories
  - [x] Created specifications/, design/, examples/, tutorials/ folders
  - [x] Updated all documentation links and references
  - [x] Improved docs/README.md with clear navigation
- [x] **Performance & Stress Testing Framework (COMPLETED ✅)**
  - [x] Created comprehensive stress testing framework
  - [x] Multi-stream capacity testing (up to 20 concurrent streams)
  - [x] Listener capacity testing (up to 100 listeners per stream)
  - [x] Resource monitoring (CPU, memory, network usage)
  - [x] Failure point analysis and bottleneck identification
  - [x] Performance benchmarks and hardware recommendations
  - [x] Quick stress test for CI/CD integration
  - [x] Automated report generation with actionable insights
  - [x] Added npm scripts: `npm run stress-test` and `npm run stress-test:full`
  - [x] **First Stress Test Results (COMPLETED ✅)**
    - [x] Validated all API endpoints working correctly
    - [x] Confirmed excellent system performance (API responses: 0.81-68ms avg)
    - [x] Perfect load handling (30 requests/30s, 100% success rate, 1.57ms avg)
    - [x] Identified audio device configuration issue (AMD device detected but not streamable)
    - [x] Generated detailed performance reports in `tests/stress/reports/`
    - [x] Framework ready for production use once audio input configured

### 🎯 Next Priority: UI/UX Improvements (HIGH PRIORITY)
- [ ] **Error State Improvements**
  - [x] Primary action: "Browse for Icecast" button ✅
  - [x] Secondary action: Link to simplified installation guide ✅
  - [x] Fixed mobile error state to show "No Live Streams" instead of "Error Loading Streams" ✅
  - [x] Removed underline from streams page title ✅
  - [ ] Better messaging for expected user actions
### 🎯 Audio Device Setup Plan (HIGH PRIORITY - NEXT)
- [ ] **VoiceMeeter & Ear Trumpet Setup**
  - [ ] **Install VoiceMeeter**: Download and install VoiceMeeter (virtual audio mixer)
  - [ ] **Install Ear Trumpet**: Download from Microsoft Store (advanced audio routing)
  - [ ] **Configure Virtual Audio Cables**: Set up VoiceMeeter virtual inputs/outputs
- [ ] **Multi-Source Audio Testing**
  - [ ] **Source 1 - Edge Browser**: Play YouTube music as audio source
  - [ ] **Source 2 - Chrome Browser**: Play audio podcast as second source
  - [ ] **Route Audio Sources**: Use Ear Trumpet to route sources to different outputs
- [ ] **Output Device Testing**
  - [ ] **Bluetooth Headset**: Route audio to Bluetooth headphones
  - [ ] **Main Speakers**: Route audio to primary desktop speakers
  - [ ] **Test Multiple Outputs**: Verify simultaneous routing to multiple devices
- [ ] **LANStreamer Integration Testing**
  - [ ] **Detect VoiceMeeter Devices**: Verify LANStreamer can see virtual audio devices
  - [ ] **Create Test Streams**: Set up streams using VoiceMeeter inputs
  - [ ] **Multi-Stream Testing**: Test concurrent streams from different sources
  - [ ] **Audio Quality Verification**: Ensure clean audio without dropouts
- [ ] **Stress Testing with Real Audio**
  - [ ] **Run stress tests**: Use configured audio devices for realistic testing
  - [ ] **Document performance**: Record actual limits with real audio sources
  - [ ] **Create setup guide**: Document the VoiceMeeter + Ear Trumpet configuration
  - [ ] Auto-refresh when installation is restored
- [ ] **Streams Page UI Refinements**
  - [x] Reduced vertical spacing in streams container (space-y-6 → space-y-4) ✅
  - [x] Reduced padding in loading/no-streams states (py-12 → pb-6) ✅
  - [ ] **Stream Card Visual Improvements**
    - [ ] Add subtle hover effects on stream cards
    - [ ] Improve stream status indicators (live/offline visual distinction)
    - [ ] Add smooth transitions for state changes (loading → content → error)
    - [ ] Optimize card spacing for different screen sizes
  - [ ] **Loading State Enhancements**
    - [ ] Add skeleton loading animation instead of spinner
    - [ ] Show progressive loading (detecting streams → loading details → ready)
    - [ ] Add timeout handling with retry option
  - [ ] **Empty State Improvements**
    - [ ] Add illustration or icon to empty state
    - [ ] Provide actionable next steps ("Start streaming from dashboard")
    - [ ] Add quick setup link for first-time users
  - [ ] **Stream Controls UI**
    - [ ] Improve play/stop button visual feedback
    - [ ] Add loading states for stream actions
    - [ ] Show connection status and listener count
    - [ ] Add volume control and audio visualization
  - [ ] **Responsive Design Refinements**
    - [ ] Optimize layout for tablet sizes (768px-1024px)
    - [ ] Improve touch targets for mobile devices
    - [ ] Test and refine grid breakpoints (xl:grid-cols-3)
    - [ ] Ensure consistent spacing across all screen sizes
- [ ] **Status Component Consolidation**
  - [ ] Remove duplicate status displays
  - [ ] Use single, comprehensive status component
  - [ ] Clean up redundant installation detection messages



---

## 🎯 Current Status: TDD Step 7 Complete - Enhancement Phase

### ✅ Completed Tasks

#### Core Infrastructure
- [x] **Project Setup & Dependencies**
  - [x] Node.js backend with Express
  - [x] ES Module configuration (`"type": "module"`)
  - [x] Environment variables (.env) setup
  - [x] Logging system (Winston)
  - [x] Error handling middleware

#### Backend Services
- [x] **Audio Device Detection**
  - [x] AudioDeviceService with device enumeration
  - [x] Cross-platform device detection
- [x] **FFmpeg Integration**
  - [x] Real FFmpeg process spawning
  - [x] Stream lifecycle management (start/stop)
  - [x] Process error handling and logging
- [x] **Streaming Service**
  - [x] High-level streaming orchestration
  - [x] Multiple concurrent streams support
  - [x] Stream status tracking

#### API Endpoints
- [x] **System APIs**
  - [x] `/api/system/audio-devices` - Device enumeration
  - [x] `/api/health` - Health check
- [x] **Stream APIs**
  - [x] `/api/streams/start` - Start streaming
  - [x] `/api/streams/stop` - Stop individual stream
  - [x] `/api/streams/stop-all` - Stop all streams
  - [x] `/api/streams/status` - Stream status

#### Frontend & Testing
- [x] **Basic Dashboard**
  - [x] Static HTML dashboard at `/dashboard`
  - [x] Basic stream start/stop functionality
  - [x] Real-time status updates
- [x] **E2E Testing**
  - [x] Playwright test framework setup
  - [x] Integration tests for real FFmpeg processes
  - [x] Multi-browser testing (Chrome, Firefox, Safari, Mobile)

#### TDD Implementation
- [x] **Step 1-6**: Foundation and unit testing
- [x] **Step 7**: Final integration with real processes
- [x] **Step 8**: Audio monitoring feature specification (design phase complete)

---

### 🔄 Current Sprint: Audio Monitoring & Authentication Features

#### 🎯 Priority 1: Audio Monitoring Feature (NEW)
- [ ] **Audio Device Type Detection**
  - [ ] Update AudioDeviceService to differentiate input vs output devices
  - [ ] Add `type` field to `/api/system/audio-devices` response
  - [ ] Filter device lists by type in UI dropdowns
- [ ] **Monitoring API Implementation**
  - [ ] Create `/api/streams/monitor` endpoint for monitoring control
  - [ ] Implement secondary FFmpeg process for local monitoring
  - [ ] Add monitoring process lifecycle management
- [ ] **Monitoring UI Controls**
  - [ ] Add "Monitor this Stream" checkbox to stream panels
  - [ ] Implement conditional "Monitoring Output Device" dropdown
  - [ ] Update status indicators to show "Live + Monitoring" state
  - [ ] Add monitoring error handling and user feedback

#### 🎯 Priority 2: Enhanced Audio Device Selection
- [x] **Device Type Differentiation** - Specified in Audio Monitoring Feature
- [ ] **Professional UI Implementation**
  - [ ] Replace basic buttons with labeled dropdowns ("Audio Input Source")
  - [ ] Show device names, IDs, and capabilities with type filtering
  - [ ] Handle device state (available/in-use/error) with visual feedback
- [ ] **Device Management**
  - [ ] "Refresh Devices" button to re-scan both input and output devices
  - [ ] Real-time device connect/disconnect detection
  - [ ] Device validation before streaming with type checking

#### 🎯 Priority 2: Icecast Integration & Management
- [ ] **Icecast Detection**
  - [ ] Check if Icecast is installed
  - [ ] Detect if Icecast service is running
  - [ ] Show Icecast status in dashboard
- [ ] **Icecast Controls**
  - [ ] Start/Stop Icecast service buttons
  - [ ] Icecast configuration management
  - [ ] Stream mount point management
- [ ] **Stream URL Display**
  - [ ] Show listening URLs for active streams
  - [ ] Copy-to-clipboard functionality
  - [ ] QR codes for mobile access

#### 🎯 Priority 3: Authentication & User Management
- [ ] **User Registration System**
  - [ ] OAuth integration for secure authentication
  - [ ] User registration endpoint with email validation
  - [ ] Password requirements and validation
  - [ ] Account activation workflow
- [ ] **Login System**
  - [ ] OAuth-based login implementation
  - [ ] Session management and JWT tokens
  - [ ] Default admin credentials (username: 'admin', password: 'admin')
  - [ ] Remember me functionality
- [ ] **Password Management**
  - [ ] Password reset functionality via email
  - [ ] Change password feature for logged-in users
  - [ ] Password strength requirements
  - [ ] Security warnings for default credentials
- [ ] **User Profile Management**
  - [ ] User profile settings page
  - [ ] Role-based access control (admin, user)
  - [ ] User session management
  - [ ] Account deletion and data privacy

#### 🎯 Priority 4: Enhanced User Experience
- [ ] **Dashboard Layout Improvements**
  - [ ] Better visual design and spacing
  - [ ] Status indicators and progress bars
  - [ ] Error state handling and notifications
- [ ] **Stream Management**
  - [ ] Stream naming and descriptions
  - [ ] Stream quality settings (bitrate, format)
  - [ ] Bulk operations (start all, stop all)
- [ ] **Real-time Updates**
  - [ ] WebSocket integration for live updates
  - [ ] Stream health monitoring
  - [ ] Connection status indicators

---

### 🔧 Technical Debt & Improvements

#### Code Quality
- [ ] **Service Refactoring**
  - [ ] Remove remaining `require` statements in other services
  - [ ] Standardize error handling across services
  - [ ] Add comprehensive JSDoc documentation
- [ ] **Test Improvements**
  - [ ] Fix test isolation issues (stream cleanup)
  - [ ] Add unit tests for new dashboard features
  - [ ] Performance testing for multiple streams

#### Configuration
- [ ] **Enhanced Configuration**
  - [ ] Audio quality presets (Low/Medium/High)
  - [ ] Custom FFmpeg arguments support
  - [ ] Stream persistence across restarts

---

### 🚀 Future Enhancements

#### Advanced Features
- [ ] **Multi-Platform Support**
  - [ ] Windows service installation
  - [ ] Linux systemd integration
  - [ ] macOS launchd support
- [ ] **Advanced Audio Processing**
  - [ ] Audio filters and effects
  - [ ] Volume normalization
  - [ ] Audio routing and mixing
- [ ] **Web Interface Enhancements**
  - [ ] Mobile-responsive design
  - [ ] Dark/light theme toggle
  - [ ] User authentication and settings

#### Integration & Deployment
- [ ] **Container Support**
  - [ ] Docker containerization
  - [ ] Docker Compose for full stack
  - [ ] Kubernetes deployment manifests
- [ ] **CI/CD Pipeline**
  - [ ] Automated testing on multiple platforms
  - [ ] Automated releases and packaging
  - [ ] Documentation generation

#### Icecast Configuration Management
- [ ] **Dynamic Configuration System**
  - [ ] Environment variable support for Icecast XML configuration
  - [ ] Template-based configuration generation
  - [ ] Script preprocessing for `icecast.xml` from `.env` variables
  - [ ] Dynamic client limits based on system capacity
- [ ] **Configuration Options**
  - [ ] **Option 1**: Preprocessing with `envsubst` script
    ```bash
    envsubst < icecast.template.xml > /etc/icecast2/icecast.xml
    ```
  - [ ] **Option 2**: Shell substitution with `sed`/`awk`
    ```bash
    sed -i "s/CLIENT_LIMIT_PLACEHOLDER/$MAX_CLIENTS/" /etc/icecast2/icecast.xml
    ```
  - [ ] **Option 3**: Config management tools (Ansible, Chef, Docker templating)
- [ ] **Docker Integration**
  - [ ] Entrypoint script to generate `icecast.xml` from template and `.env`
  - [ ] Mount volume with preprocessed config
  - [ ] Scale listener limits based on container resources or host metrics
- [ ] **Template Variables**
  - [ ] `MAX_CLIENTS` - Maximum concurrent listeners
  - [ ] `ADMIN_PASSWORD` - Icecast admin password from environment
  - [ ] `SOURCE_PASSWORD` - Stream source password from environment
  - [ ] `PORT` - Icecast server port configuration
  - [ ] `HOSTNAME` - Server hostname/IP configuration

---

### 🐛 Known Issues to Address

#### Current Problems
- [ ] **Test Isolation**
  - [ ] E2E tests accumulating streams (15-24 active)
  - [ ] Need proper cleanup between test runs
  - [ ] Stream IDs not being properly cleaned up
- [ ] **FFmpeg Process Management**
  - [ ] Exit code 4294967291 investigation
  - [ ] Process cleanup on application shutdown
  - [ ] Memory usage monitoring
- [ ] **Service Dependencies**
  - [ ] Complete ES Module migration for remaining services
  - [ ] Dependency injection improvements

#### Performance & Reliability
- [ ] **Resource Management**
  - [ ] Maximum concurrent streams enforcement
  - [ ] CPU and memory usage monitoring
  - [ ] Automatic stream recovery on failure
- [ ] **Error Handling**
  - [ ] Better error messages for users
  - [ ] Graceful degradation when services unavailable
  - [ ] Retry mechanisms for failed operations

---

### 📋 Definition of Done

Each task is considered complete when:
- ✅ **Functionality**: Feature works as specified
- ✅ **Testing**: Unit and integration tests pass
- ✅ **Documentation**: Code is documented and README updated
- ✅ **User Experience**: UI/UX is intuitive and accessible
- ✅ **Performance**: No significant performance regressions
- ✅ **Error Handling**: Proper error states and user feedback

---

*Last Updated: January 2025*
*Current Phase: Audio Monitoring & Authentication Features*

## 📋 Recent Major Additions

### 🔄 Authentication & User Management (Planned - January 2025)
- **OAuth Integration**: Secure authentication with OAuth providers
- **User Registration System**: Complete user onboarding with email validation
- **Password Management**: Reset, change, and strength validation features
- **Default Admin Access**: Initial setup with admin/admin credentials
- **Role-Based Access**: Admin and user roles with appropriate permissions

### ✅ Audio Monitoring Feature Specification (January 2025)
- **Professional Audio Workflow**: Event Admins can now monitor live streams through local output devices
- **Device Type Differentiation**: Input vs output device detection for DVS/Dante professional setups
- **Quality Control**: Listen to interpretation streams before broadcasting to ensure quality
- **Comprehensive Documentation**: Complete specification in `docs/Audio-Monitoring-Feature-Specification.md`

### ✅ Enhanced UI Design Documentation
- **Detailed Visual Design Prompt**: Production-ready specifications with exact measurements
- **Interactive Elements**: Clickable header indicators, monitoring controls, responsive design
- **Professional Layout**: 80px header, 1200px max-width, mobile-first responsive breakpoints

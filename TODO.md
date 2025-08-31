# LANStreamer Development TODO List

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

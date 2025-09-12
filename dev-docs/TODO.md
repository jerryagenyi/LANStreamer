# LANStreamer Development TODO List

## 🚨 CURRENT ACTIVE TASKS

## 📋 **VERSION ROADMAP**

### 🎯 **V1.0.1 - CRITICAL FIXES (IMMEDIATE PRIORITY)**
**Goal: Make core streaming functionality rock-solid**

#### **Phase 7: FFmpeg Streams Critical Issues (HIGH PRIORITY 🚨)**
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

#### **Phase 6: Icecast Component & Service Edge Cases (BUG FIX)**
- [ ] Fix confusing error message display when Icecast IS detected but validation fails
- [ ] Revisit IcecastManager component error state logic - should not show "server not found" when it IS found
- [ ] Improve IcecastService validation to distinguish between "not found" vs "found but invalid structure"
- [ ] Better error messaging for edge cases like missing config files vs missing executables      

#### **Audio Device Setup Plan (HIGH PRIORITY)**
- [ ] **VoiceMeeter & Ear Trumpet Setup**
  - [ ] **Install VoiceMeeter**: Download and install VoiceMeeter (virtual audio mixer)
  - [ ] **Install Ear Trumpet**: Download from Microsoft Store (advanced audio routing)
  - [ ] **Configure Virtual Audio Cables**: Set up VoiceMeeter virtual inputs/outputs
- [ ] **Multi-Source Audio Testing**
  - [ ] **Source 1 - Edge Browser**: Play YouTube music as audio source
  - [ ] **Source 2 - Chrome Browser**: Play audio podcast as second source
  - [ ] **Route Audio Sources**: Use Ear Trumpet to route sources to different outputs
- [ ] **LANStreamer Integration Testing**
  - [ ] **Detect VoiceMeeter Devices**: Verify LANStreamer can see virtual audio devices
  - [ ] **Create Test Streams**: Set up streams using VoiceMeeter inputs
  - [ ] **Multi-Stream Testing**: Test concurrent streams from different sources
  - [ ] **Audio Quality Verification**: Ensure clean audio without dropouts

### 🎯 **V1.1.0 - UI/UX IMPROVEMENTS**
**Goal: Polish the user experience**

#### **Streams Page UI Refinements**
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

#### **Status Component Consolidation**
- [ ] Remove duplicate status displays
- [ ] Use single, comprehensive status component
- [ ] Clean up redundant installation detection messages

### 🎯 **V1.2.0 - MUSIC PLAYER ENHANCEMENTS**
**Goal: Professional lobby music system**

#### **Phase 5: Music Player Enhancements (NEEDED)**
- [ ] Implement default music file system - provide sample music files or auto-download
- [ ] Add music file management (delete, rename, organize)
- [ ] Add playlist functionality for multiple music files
- [ ] Add fade in/out transitions between tracks
- [ ] Add volume controls and audio visualization
- [ ] Add music player state persistence across browser refreshes

#### **Phase 8: Lobby Music System (NEW FEATURE 🎵)**
- [ ] **MVP (Version 1.0)**
  - [ ] Admin audio file upload system for lobby music
  - [ ] Single lobby track selection and management
  - [ ] Admin toggle: "Enable/Disable Lobby Music" on dashboard
  - [ ] Backend lobby music stream creation (treat as special system stream)
  - [ ] Client-side auto-detection: Play lobby music when no live streams exist
  - [ ] Basic volume control for lobby music
  - [ ] File format support: MP3, WAV, OGG
  - [ ] Storage: Local file system in `uploads/lobby-music/` directory

### 🎯 **V2.0.0 - VUE.JS MIGRATION (MAJOR REWRITE)**
**Goal: Modern, professional-grade application**

#### **Full Vue.js Migration (NEW BRANCH)**
- [ ] **Create new branch**: `feature/vue-migration`
- [ ] **Vue 3 + Vite Setup**: Modern build system with hot reload
- [ ] **Component Architecture**:
  - [ ] `StreamManager.vue` - Replace FFmpegStreamsManager.js
  - [ ] `EventManager.vue` - Replace EventManager.js
  - [ ] `ContactManager.vue` - Replace ContactManager.js
  - [ ] `AudioDeviceSelector.vue` - Professional device selection
  - [ ] `StreamCard.vue` - Individual stream management
  - [ ] `LoginForm.vue` - Replace login.html with Vue component
  - [ ] `AuthGuard.vue` - Route protection component
- [ ] **State Management**: Pinia for global state (streams, devices, settings, auth)
- [ ] **API Integration**: Axios with interceptors for auth
- [ ] **Authentication System**:
  - [ ] JWT token management with Vue composables
  - [ ] Route guards for protected pages
  - [ ] Login/logout state management
  - [ ] Auto-refresh token handling
- [ ] **Real-time Updates**: WebSocket integration with Vue reactivity
- [ ] **Professional UI**:
  - [ ] Tailwind CSS with Vue components
  - [ ] Material Design 3 components
  - [ ] Responsive design with Vue transitions
  - [ ] Dark/light theme support
- [ ] **Benefits**:
  - [ ] Component reusability and maintainability
  - [ ] Better state management and reactivity
  - [ ] Modern development experience
  - [ ] Easier testing and debugging
  - [ ] Professional-grade UI/UX
- [ ] **Migration Strategy**:
  - [ ] Keep current HTML version as fallback
  - [ ] Gradual component migration
  - [ ] Feature parity before switching
  - [ ] A/B testing between versions

### 🎯 **V2.1.0 - ADVANCED FEATURES**
**Goal: Professional audio production features**

#### **Advanced Lobby Music System**
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

#### **Advanced Audio Features**
- [ ] **Multi-Platform Support**
  - [ ] Windows service installation
  - [ ] Linux systemd integration
  - [ ] macOS launchd support
- [ ] **Advanced Audio Processing**
  - [ ] Audio filters and effects
  - [ ] Volume normalization
  - [ ] Audio routing and mixing
- [ ] **Container Support**
  - [ ] Docker containerization
  - [ ] Docker Compose for full stack
  - [ ] Kubernetes deployment manifests

---

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

---

*Last Updated: January 2025*
*Current Phase: Audio Monitoring & Authentication Features*

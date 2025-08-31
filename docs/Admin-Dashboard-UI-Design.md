# LANStreamer: Admin Dashboard UI Design

## Overview

This document outlines the design specifications for the LANStreamer admin dashboard interface. The dashboard should provide comprehensive control over audio streaming services with real-time status monitoring, device management, and stream configuration capabilities.

## 1. Authentication & Security

### 1.1 Login Page Design

#### Visual Layout
- **Centered login form** on clean background
- **LANStreamer logo** prominently displayed
- **Professional dark theme** consistent with dashboard

#### Form Elements
- **Username field**: Pre-filled with "admin" for initial setup
- **Password field**: Pre-filled with "admin" for initial setup  
- **"Remember Me" checkbox**: Optional persistent login
- **"Login" button**: Primary action button
- **"Change Default Credentials" link**: Prominent secondary action

**Authentication Flow:** See [Authentication Security Specification](Authentication-Security-Specification.md#login-page-design) for login workflow implementation

#### Security Messaging
- **Default credentials notice**: Clear warning about using default login
- **Security recommendations**: Brief text about changing credentials

### 1.2 Dashboard Security Header

#### Default Credential Warning (Persistent Security Notice)
When logged in with default "admin/admin" credentials:
- **Centered notification** positioned at top center below header
- **Compact design**: Small red notification with rounded bottom corners
- **Warning text**: "⚠️ Default credentials in use" with "Change Password" link
- **Non-dismissible**: Cannot be closed by user - only disappears when credentials are actually changed
- **Visual styling**: 
  - Red background (#ff0000) with white text
  - 8px padding, rounded bottom corners (8px)
  - Box shadow for depth and prominence
  - Responsive design (smaller on mobile)

**Security Requirements:** See [Default Credentials Strategy](Authentication-Security-Specification.md#default-credentials-strategy) for implementation details

### 1.3 Device Permissions Management

#### Browser Permission Handling
**Visual Design Requirements:**
- Clear UI states for device permission status
- User-friendly messaging for permission requests
- Visual feedback for permission grant/deny scenarios

**Technical Implementation:** See [Device Permission Management](LANStreamer-Technical-Specification.md#231-device-permission-management) in Technical Specification

#### Permission States & UI Response

**1. Permission Not Requested (Initial State)**
- **UI**: "Detect Audio Devices" button with microphone icon
- **Action**: Clicking triggers permission request
- **Message**: "Click to scan for available audio devices"

**2. Permission Granted**
- **UI**: Normal device list display
- **Action**: Automatic device enumeration
- **Message**: "X audio devices detected"

**3. Permission Denied**
- **UI**: Error state with instructions
- **Action**: "Retry" button and browser settings link
- **Message**: "Audio access denied. Please enable microphone permissions in your browser settings and refresh."

#### Visual Flow Design
**Permission Request Button → Browser Dialog → Result State**
- **Step 1**: User clicks "Detect Audio Devices" button
- **Step 2**: Browser shows permission dialog (system UI)
- **Step 3**: Dashboard updates to show granted/denied state with appropriate styling

**Technical Flow:** See [Permission Request Flow](LANStreamer-Technical-Specification.md#231-device-permission-management) for JavaScript implementation

## 2. Header & Status Indicators

The header should contain the LANStreamer logo on the left and four critical status indicators on the right that provide at-a-glance system health monitoring:

### Status Indicators (Left to Right)

1. **FFmpeg Status** 🎵
   - 🟢 **Green**: FFmpeg processes running successfully
   - 🔴 **Red**: FFmpeg not running or processes failed
   - ⚠️ **Yellow**: FFmpeg installed but not currently active

2. **Icecast Status** 📡
   - 🟢 **Green**: Icecast server running and accessible
   - 🔴 **Red**: Icecast server not running or unreachable
   - ⚠️ **Yellow**: Icecast installed but not started
   - **Interactive Control**: Toggle switch next to status indicator
   - **Toggle Behavior**: Click to start/stop Icecast service
   - **Loading State**: Show spinner during start/stop operations
   - **Technical API**: See [System Control Endpoints](LANStreamer-Technical-Specification.md) for Icecast management API

3. **Audio Devices Status** 🎤
   - 🟢 **Green**: Audio devices detected and available
   - 🔴 **Red**: No audio devices found or browser permission denied
   - ⚠️ **Yellow**: Limited devices available or permission issues
   - **Permission Handling**: Automatically request device permissions on load
   - **Error Recovery**: "Retry Permission" button if access denied

4. **Network Status** 🌐
   - 🟢 **Green**: Network accessible, streams reachable by clients
   - 🔴 **Red**: Network issues, streams not accessible
   - ⚠️ **Yellow**: Limited connectivity or port conflicts

Each indicator should display tooltips on hover with detailed status information and timestamps of last status check. 

**🔗 Interactive Design**: Status indicators should be **clickable**, acting as shortcuts to their respective detailed panels further down the page. This creates a seamless user experience by providing both high-level overview and direct access to detailed troubleshooting information.

## 3. Dashboard Layout Priority

### 3.1 Active Streams Section (Top Priority)

**Position**: First detailed panel immediately below header
**Purpose**: Show current streaming status at-a-glance upon login

#### Panel Design
- **Title**: "Active Streams" with live indicator dot
- **Empty State**: "No active streams" with "Start Stream" call-to-action
- **Content Per Stream**:
  - Stream name and language tag
  - Source device name
  - Real-time listener count
  - Stream duration timer
  - Status indicator: 🟢 Live / 🔴 Stopped / ⚠️ Error
  - **Quick Actions**: Stop button, Monitor toggle

#### Interactive Elements
- **Stop Stream**: Red button with confirmation dialog
- **Monitor Stream**: Toggle to enable local monitoring
- **Stream Settings**: Gear icon to modify stream configuration
- **Listener Details**: Click count to see connected clients

### 3.2 Quick Actions Bar
**Position**: Below Active Streams, above detailed configuration
**Content**: 
- **"Start New Stream"** button (primary action)
- **"Stop All Streams"** button (destructive action)
- **"Refresh Devices"** button (utility action)

## 4. Global Settings
### Configuration Management
For a professional application, saving settings in a `.env` file is best for development, but not for a user-updatable dashboard. The best practice is to store user-configurable settings in a **JSON or YAML configuration file** (e.g., `config.json`). This file is read by the application on startup, and the admin dashboard's UI fields write updates back to it. This approach decouples the application's configuration from its deployment environment.

### Default Port
A dedicated input field for the default port is a great idea. It should be a **required field** and perform validation to ensure it's a valid port number. This value would be saved to the `config.json` file.

### Other Settings

#### Default Streaming Format/Codec
Options to select the audio codec (`.mp3`, `.ogg`, `.aac`) and bitrate (`64kbps`, `128kbps`, `192kbps`). These settings will be applied to all new streams unless overridden.

#### Stream Password
An input field to set a global password for all streams on the Icecast server to prevent unauthorised access.

#### Startup Behaviour
A toggle to choose whether streams should automatically start on application launch.

## 5. Dependencies & Status

This section is crucial for user confidence and troubleshooting. The UI should have clear, real-time status indicators beyond the header indicators.

**🔗 Integration with Header**: To prevent redundancy and keep the initial view clean, these detailed panels should be **expandable sections** that open when the corresponding header indicator is clicked. This creates a seamless connection between high-level status and detailed diagnostics.

### Detailed Service Sections

#### Icecast & FFmpeg Status Panels

##### Presence Check
The UI should display a clear status indicator (e.g., a green checkmark or a red "X" icon with a tooltip) for whether each dependency is installed and found on the system's `PATH`. If not, a link to a separate `Dependencies-Setup.md` document should be provided.

##### Running Status
Below the presence check, a status indicator should show if the process is currently running. A toggle switch or a dedicated "Start/Stop" button is ideal.

##### Process Log
A dedicated window or collapsible section to display the real-time logs from the Icecast and FFmpeg processes. This is invaluable for debugging and monitoring stream health.

## 6. Audio Devices & Streams
This will be the main, dynamic part of the dashboard.

### Global Refresh
A **"Refresh Audio Devices"** button is a great feature. It should trigger an API call to re-scan the system and update the list. The UI should show a loading state while this happens.

### Default Stream Configuration

- **Device Selection**: A single dropdown to select the default audio input device
- **Stream Naming**: A label or input field to name this stream (e.g., "Main Stage Audio")
- **Controls**: A start/stop button or toggle switch that updates in real-time
- **Status Indicator**: A real-time status indicator (e.g., "Offline", "Starting...", "Live")

### Additional Streams

#### Stream Creation
- A clear, prominent button or section titled **"Add New Language Stream"**
- Clicking this would reveal a form with two dropdowns: one for the audio input device and another for the language
- Once a new stream is added, it should appear as a new, collapsible section on the dashboard with its own name, start/stop button, and status indicator

#### Device Memory
As you mentioned, each stream's configuration (language, device ID) should be saved so it's remembered on next launch. If a saved device is not found, its name should be displayed in **red** with a clear tooltip explaining the status (e.g., "Device not found. Please select a new one.").

#### Global Controls
Buttons to **"Start All Streams"** and **"Stop All Streams"** are essential for ease of use.

## 7. Video Streaming (Future Feature)
### Placeholder UI
As per the Product Requirements Document (PRD), video is a feature for vNext. The UI should have a placeholder or a section clearly labelled as **"Video Streams"** with a **"Coming Soon"** message to manage user expectations.

## 8. UI/UX & Feedback

### Clear Layout
The dashboard should be designed in a clean, sectioned layout, possibly with collapsible panels for each major component (Global Settings, Audio Streams, etc.). This prevents information overload.

### Notifications
Implement a simple notification system to give the user feedback on actions (e.g., "Stream started successfully", "Failed to start stream: port already in use").

### Loading States
All interactive elements that trigger an API call (e.g., refresh button, start stream button) should show a loading indicator to let the user know that the system is processing their request.

## 9. Footer

### Essential Links
The footer should contain links to the project's key documents and external resources for the user:

- **"README"**: Links to the main `README.md` for project overview
- **"Contribute"**: Links to a `CONTRIBUTING.md` file (which we can create later) outlining how to contribute to the project
- **"Donate"**: A link to a PayPal donation page, as you specified

## 10. AI Visual Generation Prompt
The following is a comprehensive prompt designed to generate highly detailed and functional visual mockups of the LANStreamer admin dashboard UI. This prompt provides specific measurements, layout details, and interactive specifications.

### Comprehensive Visual Design Prompt

```
LANStreamer Admin Dashboard Visual Design Prompt
This prompt is designed to generate a highly detailed and functional visual mockup of the LANStreamer admin dashboard UI.

GENERAL DESIGN & AESTHETIC
Theme: Clean, minimalist, and professional. Use a dark theme inspired by network monitoring tools.

Colour Palette:
- Background: Dark grey (#1a1a1d)
- Accent: Cool, tech-inspired blue (#007bff)
- Status: Success green (#28a745), danger red (#dc3545), cautionary yellow (#ffc107)
- Security Warning: Bright red (#ff0000) for default credential warnings
- Typography: Clean, modern sans-serif font like 'Inter' or 'Roboto' with high contrast against dark background
- Form Elements: All input fields, buttons, and cards should have slightly rounded corners (0.5rem or 8px)

LAYOUT AND SPACING
Overall Layout: Fully responsive design

Desktop View (1024px+):
- Two-column or three-column grid layout for main content area
- Main content container: 1200px max-width, horizontally centred
- Generous margin: 32px on all sides
- Card spacing: Consistent 24px vertical and horizontal gaps between all cards and major sections
- Internal padding: All cards should have minimum 24px internal padding

Mobile View (480px and below):
- Single, stacked column layout
- Full-width cards and content blocks
- Horizontal padding: 16px
- Reduced card gaps: 16px vertical spacing

HEADER (<header>)
- Fixed top navigation bar: 96px height (increased to accommodate 64px logo)
- Left side: LANStreamer logo with brand icon and text
  • Logo image: 64px height, WiFi/streaming device icon in tech blue (#007bff)
  • Logo text: 'LANStreamer' in bold, modern font (fallback when logo unavailable)
  • Logo layout: Horizontal flex with 12px gap between icon and text
  • Smart fallback: Shows logo image OR text, never both
  • Hover effect: Subtle opacity transition (0.9)
- Right side: Service Status section with title and indicators
  • Section title: "Service Status:" in bold white text
  • Two service indicators (left to right):
    1. FFmpeg Status 🎵 with three-state indicator
    2. Icecast Status 📡 with three-state indicator + toggle switch

SERVICE STATUS INDICATORS (Three-State System)
Each service shows one of three distinct states:

State 1: NOT INSTALLED (Red dot with white × symbol)
- Visual: Red background (#dc3545) with white × overlay
- FFmpeg tooltip: "FFmpeg is not installed"
- Icecast tooltip: "Icecast is not installed"
- Toggle: Hidden for Icecast when not installed

State 2: INSTALLED BUT NOT RUNNING (Gray dot)
- Visual: Muted gray background (#6c757d) with reduced opacity (0.5)
- FFmpeg tooltip: "FFmpeg installed but not running"
- Icecast tooltip: "Icecast installed but not running - Click to start"
- Toggle: Available for Icecast (inactive state)

State 3: RUNNING (Glowing green dot with pulse animation)
- Visual: Green background (#28a745) with glowing box-shadow and 2s pulse animation
- FFmpeg tooltip: "FFmpeg running (X active streams)" with process count
- Icecast tooltip: "Icecast running on port XXXX - Click to stop" with actual port
- Toggle: Available for Icecast (active state)

INTERACTIVE ELEMENTS
- Clickable indicators: Scroll to corresponding detail panels below
- Hover tooltips: Detailed status information with technical details
- Real-time updates: Status checks every 30 seconds automatically
- Security Banner: Persistent red warning below header when using default credentials

MAIN CONTENT AREA (<main>)
The main content area comprises several distinct cards in priority order:

Card 0: Active Streams Status (TOP PRIORITY)
- Title: 'Active Streams' with live indicator dot
- Position: First card immediately visible after login
- Content: Current streaming overview
  • Empty state: "No active streams - Start your first stream below"
  • Active streams: List with stream name, device, listener count, duration
  • Status indicators: Live (green), Stopped (red), Error (yellow)
  • Quick actions: Stop button, Monitor toggle, Settings gear
- Bottom: Quick action bar with "Start New Stream" (primary blue button)

Card 0.5: Device Permission Status
- Conditional visibility: Only shown when permissions not granted
- Content: "Detect Audio Devices" button or permission error message
- Error state: Clear instructions for enabling browser permissions

Card 1: Global Settings
- Title: 'Global Settings'
- Content: Clear form with 16px vertical spacing between elements
  • Text input: 'Default Port' with placeholder
  • Dropdown: 'Default Audio Codec' (options: MP3, AAC, Ogg)
  • Dropdown: 'Default Bitrate' (options: 64kbps, 128kbps, 192kbps)
  • Password input: 'Stream Password' with show/hide toggle
  • Toggle switch: 'Start Streams on Launch'

Card 2: Dependencies & Status
- Title: 'Dependencies & Status'
- Content: Two sub-sections (FFmpeg and Icecast)
  • Each sub-section: Two status lines ('Installed' and 'Running')
  • Status indicators: Checkmark (✓) or cross (✗) icons in green or red
  • Collapsible panel: 'View Logs' button
  • When expanded: Dark, monospaced text area with simulated console output

Card 3: Audio Devices & Stream Configuration
- Title: 'Audio Devices & Stream Configuration'
- Top-right: Blue 'Refresh Audio Devices' button with subtle spin animation on click
- Device permission status: Clear indicator if browser permissions are granted/denied
- Available devices list: Shows input/output devices separately with type labels
- Stream configuration: Series of panels, each containing:
  • Title (e.g., 'French Interpretation', 'English Main')
  • Input field for stream name
  • Dropdown labelled 'Audio Input Source' (shows only input devices)
  • Checkbox labelled 'Monitor this Stream' (controls monitoring section visibility)
  • When monitoring checkbox is checked:
    - Dropdown labelled 'Monitoring Output Device' (shows only output devices)
    - Visual indicator showing monitoring is active
  • Toggle switch (turns green when stream running)
  • Real-time status label ('Offline', 'Starting...', 'Live', 'Live + Monitoring')
  • Missing devices: Display name in red with hover tooltip explaining issue

**Monitoring Implementation:** See [Audio Monitoring Feature Specification](Audio-Monitoring-Feature-Specification.md) for technical details
- Bottom section:
  • Blue 'Add New Language Stream' button with plus icon
  • Two prominent side-by-side buttons: Green 'Start All Streams' and Red 'Stop All Streams'

Card 4: Video Streaming  
- Title: 'Video Streams'
- Content: Centrally aligned text message: 'Video streaming is a feature for vNext and is coming soon!'

FOOTER (<footer>)
- Fixed bottom footer: 60px height
- Three links: 'README', 'Contribute', and 'Donate' button with small PayPal logo icon
- Layout: Simple, horizontal layout with even spacing

INTERACTIVE ELEMENTS
- Hover effects: Smooth transitions (300ms ease-in-out)
- Loading states: Subtle animations for refresh buttons and service toggles
- Form validation: Real-time feedback with colour-coded borders
- Permission handling: Clear UI states for browser permission requests
- Collapsible panels: Smooth expand/collapse animations
- Status updates: Real-time colour changes without page refresh
- Security warnings: Persistent red banner for default credentials
- Service controls: Toggle switches for Icecast start/stop with loading states
```

## 11. Implementation Guidelines

### Interactive Behaviors

#### Clickable Header Indicators
- **Purpose**: Provide shortcuts from high-level status to detailed diagnostics
- **Behavior**: Clicking a header indicator scrolls to and expands the corresponding detailed panel
- **Visual Feedback**: Subtle animation (300ms ease-in-out) when transitioning to detail view
- **State Management**: Only one detailed panel should be expanded at a time to maintain focus

#### Responsive Design Priorities
1. **Mobile First**: Ensure core functionality works on mobile devices
2. **Progressive Enhancement**: Add desktop-specific features like multi-column layouts
3. **Touch Targets**: Minimum 44px touch targets for mobile compatibility
4. **Keyboard Navigation**: Full keyboard accessibility for all interactive elements

#### Performance Considerations
- **Real-time Updates**: Use WebSocket connections for live status updates
- **Lazy Loading**: Load detailed panels only when accessed
- **Efficient Polling**: Intelligent polling rates based on user activity
- **Error Boundaries**: Graceful degradation when services are unavailable

### Development Notes
This design document provides a comprehensive blueprint that balances:
- **Professional aesthetics** with functional requirements
- **High-level overview** with detailed diagnostic capabilities  
- **Clean initial presentation** with comprehensive feature access
- **Desktop experience** with mobile responsiveness

The clickable header indicators and expandable detail panels create a **seamless user flow** that prevents information overload while maintaining full functionality access.
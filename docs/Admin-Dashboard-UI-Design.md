# LANStreamer: Admin Dashboard UI Design

## Overview

This document outlines the design specifications for the LANStreamer admin dashboard interface. The dashboard should provide comprehensive control over audio streaming services with real-time status monitoring, device management, and stream configuration capabilities.

## 1. Header & Status Indicators

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

3. **Audio Devices Status** 🎤
   - 🟢 **Green**: Audio devices detected and available
   - 🔴 **Red**: No audio devices found or detection failed
   - ⚠️ **Yellow**: Limited devices available or permission issues

4. **Network Status** 🌐
   - 🟢 **Green**: Network accessible, streams reachable by clients
   - 🔴 **Red**: Network issues, streams not accessible
   - ⚠️ **Yellow**: Limited connectivity or port conflicts

Each indicator should display tooltips on hover with detailed status information and timestamps of last status check. 

**🔗 Interactive Design**: Status indicators should be **clickable**, acting as shortcuts to their respective detailed panels further down the page. This creates a seamless user experience by providing both high-level overview and direct access to detailed troubleshooting information.

## 2. Global Settings
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

## 3. Dependencies & Status

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

## 4. Audio Devices & Streams
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

## 5. Video Streaming (Future Feature)
### Placeholder UI
As per the Product Requirements Document (PRD), video is a feature for vNext. The UI should have a placeholder or a section clearly labelled as **"Video Streams"** with a **"Coming Soon"** message to manage user expectations.

## 6. UI/UX & Feedback

### Clear Layout
The dashboard should be designed in a clean, sectioned layout, possibly with collapsible panels for each major component (Global Settings, Audio Streams, etc.). This prevents information overload.

### Notifications
Implement a simple notification system to give the user feedback on actions (e.g., "Stream started successfully", "Failed to start stream: port already in use").

### Loading States
All interactive elements that trigger an API call (e.g., refresh button, start stream button) should show a loading indicator to let the user know that the system is processing their request.

## 7. Footer

### Essential Links
The footer should contain links to the project's key documents and external resources for the user:

- **"README"**: Links to the main `README.md` for project overview
- **"Contribute"**: Links to a `CONTRIBUTING.md` file (which we can create later) outlining how to contribute to the project
- **"Donate"**: A link to a PayPal donation page, as you specified

## 8. AI Visual Generation Prompt
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
- Fixed top navigation bar: 80px height
- Left side: 'LANStreamer' logo in simple, bold font
- Right side: Four circular status indicators (left to right):
  1. FFmpeg Status 🎵 (tooltip: FFmpeg Running/Not Running)
  2. Icecast Status 📡 (tooltip: Icecast Server Active/Inactive)  
  3. Audio Devices Status 🎤 (tooltip: Devices Found/Not Found)
  4. Network Status 🌐 (tooltip: Network Accessible/Issues)
- Status indicators: Small circles that change colour (green/yellow/red), slightly larger than normal dots for mobile tappability
- INTERACTIVE: Clickable indicators that expand corresponding detail panels below

MAIN CONTENT AREA (<main>)
The main content area comprises several distinct cards:

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

Card 3: Audio Devices & Streams
- Title: 'Audio Devices & Streams'
- Top-right: Blue 'Refresh Audio Devices' button with subtle spin animation on click
- Stream list: Series of panels, each containing:
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
- Loading states: Subtle animations for refresh buttons
- Form validation: Real-time feedback with colour-coded borders
- Collapsible panels: Smooth expand/collapse animations
- Status updates: Real-time colour changes without page refresh
```

## 9. Implementation Guidelines

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
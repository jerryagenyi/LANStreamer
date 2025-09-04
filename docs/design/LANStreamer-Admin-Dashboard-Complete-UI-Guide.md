# LANStreamer Admin Dashboard - Complete UI Implementation Guide

## Overview

This document provides a complete specification for implementing the LANStreamer admin dashboard UI, based on the current working layout and incorporating all required features from user feedback and the audio monitoring specifications.

## Visual Design Philosophy

Create a professional, dark-themed streaming control dashboard with clean typography, intuitive status indicators, and efficient workflow design. The interface should feel like a professional broadcast control room - reliable, informative, and easy to operate under pressure.

## Header Design Specification

### Logo Section (Left)
- **Logo Image**: Use `/assets/lanstreamer-logo.png`
- **Fallback**: Display "LANStreamer" text only if image fails to load
- **Styling**: 32px height (h-8), modern sans-serif font for text fallback
- **Critical Rule**: Never show both logo image and text simultaneously

### Status Indicators Section (Right)
Create four status indicators with consistent hover tooltip design:

#### 1. Audio Devices Status
- **Icon**: `volume_up` Material Symbol
- **States**:
  - Green: "X devices detected" 
  - Yellow: "Browser permissions required"
  - Red: "No devices detected"
- **Tooltip**: Device count and permission status
- **Interactive**: Click scrolls to Audio Devices section

#### 2. FFmpeg Streams Status
- **Icon**: `settings_input_component` Material Symbol
- **States**:
  - Green: "FFmpeg Installed and Running" 
  - Gray: "FFmpeg installed but not running"
  - Red: "FFmpeg not installed"
- **Tooltip**: Installation status with GitHub guide link when not installed
- **Interactive**: Click scrolls to FFmpeg Streams section

#### 3. Icecast Server Status  
- **Icon**: `router` Material Symbol
- **States**:
  - Green: "Server Online" with port information
  - Gray: "Installed but not running"
  - Red: "Not installed"
- **Tooltip**: Server status with GitHub installation guide link
- **Interactive**: Click scrolls to Icecast Server section

#### 4. Security Warning
- **Icon**: `warning` Material Symbol
- **Purpose**: Always visible security reminder
- **Tooltip**: Security configuration guidance
- **Interactive**: Click scrolls to security settings (future feature)

### User Avatar (Far Right)
- **Display**: Circular profile image placeholder
- **Purpose**: Future authentication interface access point

## Main Content Layout

### Security Warning Banner
- **Position**: Full-width below header
- **Content**: "Security Warning: Your LANStreamer instance is running in development mode. For production use, please configure SSL and authentication."
- **Styling**: Yellow background with warning icon
- **Behaviour**: Persistent until proper authentication configured

### Content Grid Structure
Implement responsive three-column layout:
- **Left Column (66%)**: Primary controls (FFmpeg Streams, Audio Devices, Video Sources)
- **Right Column (33%)**: Status monitoring (Stream Controls, Icecast Server, Lobby Music)

## Section 1: FFmpeg Streams (Left Column)

### Section Header
- **Title**: "FFmpeg Streams"
- **No Status Indicator**: Header indicators handle status display

### Stream Entry Design
Each stream displays:
- **Visual Indicator**: Colored vertical bar (green for live, gray for stopped)
- **Stream Name**: "Main Room Audio" (editable in future)
- **Status Line**: Live indicator dot + "Live (192kbps)" format
- **Controls Section**:
  - Audio source dropdown (input devices only)
  - Stop/Start action button

### Add New Stream Control
- **Position**: Below last stream entry, within FFmpeg section
- **Design**: Full-width dashed border button with plus icon
- **Text**: "Add New Stream"

## Section 2: Audio Devices (Left Column)

### Section Header
- **Title**: "Audio Devices captured by FFmpeg"
- **Action Button**: "Refresh device list" with refresh icon

### Two-Column Device Layout
Split devices into distinct columns:

#### Left Column: Audio Input Devices
- **Header**: "Audio Input Devices"
- **Device Cards**: Each showing:
  - Device icon (microphone variants based on status)
  - Device name (e.g., "Focusrite Scarlett 2i2")
  - Device type label (e.g., "USB Audio Device")
  - Status through icon color (green=active, gray=inactive)

#### Right Column: Audio Output Devices  
- **Header**: "Audio Output Devices"
- **Device Cards**: Each showing:
  - Device icon (headphones, speakers based on type)
  - Device name (e.g., "Realtek Digital Output")
  - Device type label (e.g., "Onboard Audio")
  - Status indication through icon color

### Browser Permission Requirements
- **Permission Check**: Required for device enumeration
- **Permission UI**: Clear button when permissions not granted
- **Error Handling**: Graceful messaging when permissions denied

## Section 3: Video Sources (Left Column)

### Current Implementation
- **Title**: "Video Sources captured by FFmpeg"
- **Refresh Button**: "Refresh device list" 
- **Empty State**: "No video sources detected - Connect a camera or capture card"
- **Future Ready**: Placeholder for video streaming features (vNext)

## Section 4: Stream Controls (Right Column, Top Position)

### Control Buttons Layout
Two prominent action buttons:
- **Start All Streams**: Blue gradient button with play icon
- **End All Streams**: Red gradient button with stop icon
- **Styling**: Full-width buttons, stacked vertically

### Positioning Requirement
This section must appear at the top of the right column, above all other sidebar content.

## Section 5: Icecast Server (Right Column)

### Section Header with Status
- **Title**: "Icecast Server"
- **Status Display**: Inline status dot + text (green dot + "Online")
- **Status Variations**: 
  - Online: Green dot + "Online"
  - Connecting: Orange pulsing dot + "Connecting..."
  - Offline: Red dot + "Not Found"

### Server Information Display
- **Listeners Count**: "42 / 128" format (no separate "Peak Listeners")
- **Progress Bar**: Visual representation of listener capacity
- **Server Details**:
  - Host: localhost:8000
  - Uptime: 72:34:12

## Section 6: Lobby Background Music (Right Column)

### Visual Separator
- **Top Border**: Prominent colored border above section to separate from Icecast
- **Border Color**: Primary blue color (--primary-color)

### Music Player Interface
- **Player Controls**:
  - Status indicator (gray dot for stopped, green for playing)
  - "Background Music" title
  - Status text: "Stopped" or "Playing"
  - Start/Stop button

### File Management
- **File Display**: 
  - Current file name with intelligent truncation
  - Example: "Slack-Huddle-Hold-Music_Daniel-Simmons.mp3" 
  - Long names show as: "Slack-Huddle-Hold-Music_Dan..."
  - "Change" button for file selection

### Volume Controls (Critical Requirement)
Complete audio control interface:
- **Mute Button**: Volume icon that toggles between volume_up/volume_off
- **Volume Slider**: HTML5 range input with custom styling
- **Volume Display**: Percentage display (e.g., "75%")
- **Default Value**: 75%
- **Styling**: Consistent with application theme

## Audio Monitoring Feature Integration

### Stream Configuration Enhancement
For future monitoring implementation:

#### Monitoring Controls
- **Checkbox**: "Monitor this Stream" option for each stream
- **Conditional Display**: Monitoring output device dropdown appears only when checked
- **Device Filtering**: Output device dropdown shows only audio output devices
- **Status Integration**: Stream status shows "Live + Monitoring" when both active

#### Browser Permission Dependencies
- **Permission Check**: Monitoring controls disabled until browser audio permissions granted
- **Permission UI**: Clear indication when permissions required
- **Error Handling**: Graceful degradation when devices unavailable

### Implementation Requirements
- **Device Type Filtering**: API must distinguish between input/output devices
- **Real-time Status**: WebSocket updates for monitoring status changes
- **Process Management**: Secondary FFmpeg processes for monitoring streams
- **Resource Limits**: Maximum concurrent monitoring sessions (configurable)

## Technical Implementation Notes

### Tooltip System Requirements
All status indicators implement comprehensive tooltip system:
- **Installation Status**: Clear indication of service availability
- **GitHub Links**: Direct links to installation guides in repository
- **Status Details**: Detailed information about current state
- **Error Guidance**: Helpful troubleshooting information

### CSS Framework
- **Framework**: Tailwind CSS with custom CSS variables
- **Color System**: Consistent status colors throughout interface
- **Typography**: Professional font hierarchy (Inter, Noto Sans)
- **Spacing**: Consistent margins and padding
- **Interactive States**: Hover, focus, and active states for all controls

### Responsive Design
- **Desktop**: Three-column layout with full sidebar
- **Tablet**: Two-column layout with stacked sections  
- **Mobile**: Single column with collapsed navigation
- **Touch Targets**: Minimum 44px for mobile compatibility

### Real-time Updates
- **WebSocket Integration**: Live status updates without page refresh
- **Status Polling**: Fallback polling every 5 seconds for critical indicators
- **Error Recovery**: Automatic reconnection handling

### Logo Implementation
- **Smart Fallback**: JavaScript-based error handling for logo loading
- **Performance**: Optimized image loading with proper fallback text
- **Accessibility**: Proper alt text and semantic markup

## Current Implementation Status

### ✅ Completed Features
- Header with logo and status indicators
- Responsive grid layout with left/right columns
- FFmpeg Streams section with live stream display
- Audio Devices with two-column input/output layout
- Video Sources placeholder section
- Stream Controls with Start/End All buttons
- Icecast Server with inline status display
- Lobby Background Music with volume controls
- Complete Tailwind CSS implementation
- JavaScript dashboard class with status polling
- Tooltip system with installation guide links

### 🔄 In Progress
- Dynamic device loading and real-time updates
- Stream management functionality
- Audio monitoring feature integration

### 📋 Future Enhancements
- Authentication system integration
- Advanced stream configuration
- Video streaming capabilities
- Performance monitoring and analytics

This guide provides complete specifications for implementing a professional streaming control dashboard that matches the current layout while incorporating all required features from user feedback and technical specifications.

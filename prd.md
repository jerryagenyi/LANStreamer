# LANStreamer - Project Requirements Document

## Executive Summary

LANStreamer is a Node.js-based application designed to transform a standard PC into a multi-channel audio streaming server for local area networks (LAN). This solution addresses the complexity of setting up live, low-latency audio broadcasts for events such as language interpretation, meetings, conferences, and live streaming to platforms like YouTube or Twitch.

The application serves as a central control panel that automates the configuration and management of audio streaming components, moving from manual command-line operations to a cohesive, user-friendly solution.

## 1. Project Overview

### 1.1 Purpose
This document outlines the functional and technical requirements for LANStreamer, a Node.js application that simplifies the setup and management of multi-channel audio streaming services for local and remote broadcasting.

### 1.2 Scope
The application will provide:
- Automated setup and configuration of streaming components
- Real-time monitoring and control of audio streams
- Web-based user interface for both administrators and end-users
- Integration capabilities with external broadcasting tools
- Support for multiple audio channels and languages

### 1.3 Target Users
- **Primary Users**: Event organizers, conference managers, language interpretation services
- **Secondary Users**: Content creators, live streamers, educational institutions
- **End Users**: Attendees accessing audio streams via web interface

## 2. Core Functionality

### 2.1 Primary Features
- **Setup Wizard**: Step-by-step guided configuration for first-time users
- **System Status Dashboard**: Real-time monitoring of all system components
- **Stream Management**: Individual control of audio streams with start/stop/restart capabilities
- **Configuration Manager**: Interface for adjusting streaming parameters and settings
- **Live Logging**: Real-time log viewer for stream activity, errors, and system events
- **User Interface**: Clean web interface for both administrators and end-users

### 2.2 System Architecture
The application follows a modular architecture with three core components:
1. **Audio Input Layer**: Multi-channel audio interface (Behringer XR18)
2. **Processing Layer**: FFmpeg for audio encoding and stream generation
3. **Distribution Layer**: Icecast server for stream broadcasting and client management

## 3. Functional Requirements

### 3.1 Setup Wizard
The initial setup wizard guides users through system configuration and dependency installation.

#### 3.1.1 System Validation
- **Network Connectivity**: Verify active network connection and display local IP address
- **System Requirements**: Check operating system compatibility (Windows, macOS, Linux)
- **Port Availability**: Ensure required ports (8000, 8080) are available for streaming services

#### 3.1.2 Dependency Management
- **Icecast Server**:
  - Automatic detection of existing installation
  - Guided download and installation process
  - Configuration of admin and source passwords
  - Programmatic modification of `icecast.xml` configuration
- **FFmpeg**:
  - Installation verification and path configuration
  - Download links and installation guidance
  - Executable path specification and validation

#### 3.1.3 Audio Device Configuration
- **Device Detection**: Automatic enumeration of available audio input devices
- **Device Selection**: User-guided selection of primary audio interface (e.g., Behringer XR18)
- **Channel Mapping**: Assignment of individual channels to specific languages or purposes
  - Example: `Input 1` → English, `Input 2` → French, `Input 3` → Spanish
- **Test Audio**: Validation of audio input levels and channel routing

#### 3.1.4 External Application Integration
- **X AIR EDIT Detection**: Verify if X AIR EDIT application is running
- **Routing Instructions**: Step-by-step guidance for USB channel configuration
- **Connection Validation**: Confirm proper audio routing between XR18 and host PC

### 3.2 Administrative Dashboard
The admin dashboard provides comprehensive system monitoring and control capabilities.

#### 3.2.1 Real-time System Status
- **Hardware Status**:
  - Audio interface connection status (Connected/Disconnected)
  - USB connectivity and signal strength indicators
  - Audio input level meters for each channel
- **Service Status**:
  - Icecast server status (Running/Stopped/Error)
  - Individual stream status for each language/channel
  - System resource usage (CPU, memory, network)
- **Network Information**:
  - Local IP address display with copy-to-clipboard functionality
  - Active client connections and listener count
  - Network bandwidth usage statistics

#### 3.2.2 User Access Management
- **QR Code Generation**: Dynamic QR codes for easy mobile access to streaming URLs
- **URL Management**: Display and management of streaming endpoints
- **Client Monitoring**: Real-time view of connected clients and their selected streams

#### 3.2.3 System Logging
- **Live Log Viewer**: Scrollable, real-time display of system events
- **Log Filtering**: Filter logs by severity level (Info, Warning, Error)
- **Export Functionality**: Save logs to file for troubleshooting
- **FFmpeg Output**: Real-time display of encoding process status

### 3.3 Stream Management
Comprehensive control over individual audio streams and encoding parameters.

#### 3.3.1 Stream Control
- **Individual Stream Control**: Start/stop/restart buttons for each configured stream
- **Bulk Operations**: Start/stop all streams simultaneously
- **Automatic Startup**: Configurable auto-start behavior on application launch
- **Stream Health Monitoring**: Real-time status indicators and error reporting

#### 3.3.2 Stream Configuration
- **Encoding Parameters**:
  - Audio bitrate configuration (`-b:a` parameter)
  - Audio codec selection (`-acodec` parameter)
  - Sample rate and channel configuration
- **Stream Metadata**:
  - Stream titles and descriptions
  - Language tags and identifiers
  - Custom metadata fields
- **Configuration Persistence**: Save and load stream configurations
- **Profile Management**: Multiple configuration profiles for different event types

### 3.4 External Integration

#### 3.4.1 OBS Studio Integration
- **Installation Detection**: Automatic detection of OBS Studio installation
- **RTMP Configuration**: Generation of pre-formatted RTMP URLs and stream keys
- **Platform Integration**: Support for popular streaming platforms:
  - YouTube Live
  - Twitch
  - Facebook Live
  - Custom RTMP endpoints
- **Stream Key Management**: Secure storage and management of platform-specific credentials

#### 3.4.2 Third-party Compatibility
- **Audio Software Integration**: Compatibility with popular audio software
- **API Endpoints**: RESTful API for third-party integrations
- **Webhook Support**: Event notifications for external systems

## 4. Technical Requirements

### 4.1 Technology Stack
- **Backend Framework**: Node.js with Express.js for web server and API
- **Frontend**: Modern web technologies (HTML5, CSS3, JavaScript ES6+)
- **UI Framework**: Vue.js or React for responsive user interface
- **Real-time Communication**: WebSocket for live updates and status monitoring
- **Process Management**: Node.js `child_process` for FFmpeg lifecycle management
- **System Integration**: Libraries for system information and device detection
  - `systeminformation` for system metrics
  - `node-audio` for audio device enumeration
  - `qrcode` for QR code generation

### 4.2 System Requirements
- **Operating Systems**: Windows 10+, macOS 10.14+, Ubuntu 18.04+
- **Node.js**: Version 16.x or higher
- **Memory**: Minimum 4GB RAM, recommended 8GB+
- **Storage**: 500MB for application, additional space for logs and configurations
- **Network**: Ethernet connection recommended for stable streaming

### 4.3 Performance Requirements
- **Latency**: Sub-second audio latency for real-time applications
- **Concurrent Streams**: Support for up to 16 simultaneous audio streams
- **Client Capacity**: Handle 100+ concurrent client connections
- **Uptime**: 99.9% availability during active streaming sessions

## 5. Development and Testing Strategy

### 5.1 Hardware Simulation
For development and testing without physical hardware:

#### 5.1.1 Virtual Audio Setup
1. **Virtual Audio Cable Installation**:
   - Windows: VB-CABLE or Virtual Audio Cable
   - macOS: Soundflower or BlackHole
   - Linux: PulseAudio virtual devices

2. **Audio Source Simulation**:
   - Multi-channel audio file playback via VLC or Audacity
   - Route output to virtual audio cable
   - Simulate multiple language channels

3. **Testing Configuration**:
   - Configure FFmpeg to read from virtual audio devices
   - Test Icecast integration with simulated streams
   - Validate web interface functionality

#### 5.1.2 Development Benefits
- **Early Development**: Begin implementation before hardware acquisition
- **Continuous Testing**: Automated testing without physical setup
- **Cross-platform Validation**: Test on multiple operating systems
- **Team Collaboration**: Remote development and testing capabilities

## 6. Security and Compliance

### 6.1 Security Requirements
- **Access Control**: Admin authentication for configuration changes
- **Network Security**: HTTPS support for web interface
- **Stream Protection**: Optional password protection for streams
- **Data Privacy**: Secure handling of user credentials and stream metadata

### 6.2 Compliance Considerations
- **Audio Quality Standards**: Support for broadcast-quality audio encoding
- **Accessibility**: Web interface compliance with WCAG 2.1 guidelines
- **Data Protection**: GDPR compliance for user data handling
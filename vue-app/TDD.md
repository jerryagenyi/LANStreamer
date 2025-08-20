# LANStreamer - Technical Design Document (TDD)

## Document Information
- **Project**: LANStreamer
- **Version**: 1.0.0
- **Date**: 2025-01-18
- **Author**: LANStreamer Development Team

## 1. Executive Summary

LANStreamer is a Node.js-based application that transforms a standard PC into a multi-channel audio streaming server for local area networks. This Technical Design Document outlines the system architecture, technology stack, file structure, and implementation details.

## 2. Technology Stack

### 2.1 Backend Technologies
- **Runtime**: Node.js 16+ with Express.js framework
- **Authentication**: JWT tokens with bcryptjs for password hashing
- **WebSocket**: Socket.io for real-time communication
- **Process Management**: Child processes for FFmpeg and Icecast control
- **Validation**: Joi for schema validation and express-validator for input validation
- **Logging**: Winston with daily log rotation
- **System Information**: systeminformation library for hardware monitoring

### 2.2 Frontend Technologies
- **Framework**: Vue.js 3 with Composition API
- **State Management**: Vuex 4 for centralized state management
- **Routing**: Vue Router 4 for single-page application navigation
- **UI Framework**: Bootstrap 5 with custom SCSS styling
- **HTTP Client**: Axios for API communication
- **Real-time**: Socket.io-client for WebSocket connections

### 2.3 External Dependencies
- **Audio Processing**: FFmpeg for audio encoding and streaming
- **Streaming Server**: Icecast for audio stream distribution
- **Audio Hardware**: Support for multi-channel USB audio interfaces

### 2.4 Development Tools
- **Testing**: Playwright for end-to-end testing
- **Linting**: ESLint with Standard configuration
- **Process Management**: Nodemon for development
- **Version Control**: Git with conventional commits

## 3. System Architecture

### 3.1 High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Audio Device  │────│   LANStreamer   │────│   Icecast       │
│   (XR18, etc.)  │    │   Application   │    │   Server        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     FFmpeg      │    │   Web Clients   │
                       │   Processes     │    │   (Browsers)    │
                       └─────────────────┘    └─────────────────┘
```

### 3.2 Component Architecture
- **Express Server**: Main HTTP server handling API requests and serving frontend
- **WebSocket Service**: Real-time communication for live updates
- **Service Layer**: Business logic for system, audio, streaming, and device management
- **Middleware Layer**: Authentication, validation, error handling, and logging
- **Data Layer**: File-based JSON storage for configuration and stream data

## 4. File Structure and Descriptions

### 4.1 Root Level Files
```
├── package.json              # Node.js project configuration and dependencies
├── .env.example              # Environment variable template
├── .eslintrc.js              # ESLint configuration for code quality
├── playwright.config.js      # Playwright testing configuration
├── README.md                 # Project documentation and setup instructions
├── prd.md                    # Product Requirements Document
└── TDD.md                    # Technical Design Document (this file)
```

### 4.2 Backend Structure (`src/`)
```
src/
├── server.js                 # Main application entry point and server setup
├── config/
│   └── index.js             # Centralized configuration management
├── middleware/
│   ├── auth.js              # JWT authentication and authorization
│   ├── errorHandler.js      # Global error handling and custom error classes
│   └── validation.js        # Input validation schemas and sanitization
├── routes/
│   ├── api.js               # General API endpoints (health, info, stats)
│   ├── auth.js              # Authentication endpoints (login, logout, verify)
│   ├── streams.js           # Stream management endpoints (CRUD operations)
│   ├── system.js            # System monitoring and control endpoints
│   └── setup.js             # Initial setup wizard endpoints
├── services/
│   ├── SystemService.js     # System information and health monitoring
│   ├── FFmpegService.js     # FFmpeg process management and stream control
│   ├── IcecastService.js    # Icecast server management and configuration
│   ├── AudioDeviceService.js # Audio device detection and configuration
│   └── WebSocketService.js  # Real-time communication management
└── utils/
    └── logger.js            # Centralized logging with Winston
```

### 4.3 Frontend Structure (`frontend/src/`)
```
frontend/src/
├── main.js                  # Vue.js application entry point
├── App.vue                  # Root Vue component with global layout
├── router/
│   └── index.js             # Vue Router configuration and navigation guards
├── store/
│   ├── index.js             # Vuex store configuration and global state
│   └── modules/
│       ├── auth.js          # Authentication state management
│       ├── streams.js       # Stream data state management
│       ├── system.js        # System status state management
│       ├── websocket.js     # WebSocket connection management
│       ├── errors.js        # Error tracking and reporting
│       └── analytics.js     # Usage analytics and metrics
├── services/
│   └── api.js               # Axios HTTP client and API endpoints
├── components/
│   ├── common/              # Reusable UI components
│   │   ├── LoadingSpinner.vue    # Loading indicator component
│   │   ├── ErrorAlert.vue        # Error display component
│   │   └── ConfirmModal.vue      # Confirmation dialog component
│   └── layout/              # Layout components
│       ├── Navigation.vue        # Main navigation bar
│       └── Footer.vue            # Application footer
├── views/                   # Page-level Vue components
│   ├── Home.vue             # Landing page
│   ├── Dashboard.vue        # Admin dashboard
│   ├── Streams.vue          # Stream management interface
│   ├── System.vue           # System monitoring interface
│   ├── Setup.vue            # Initial setup wizard
│   ├── Login.vue            # Authentication page
│   ├── Client.vue           # Public stream selection interface
│   └── NotFound.vue         # 404 error page
└── assets/
    └── css/
        └── main.css         # Global CSS styles and utilities
```

### 4.4 Testing Structure (`tests/`)
```
tests/
└── e2e/
    └── basic.spec.js        # End-to-end tests with Playwright
```

## 5. Key Implementation Details

### 5.1 Authentication Flow
1. Admin enters password on login page
2. Backend validates against configured admin password
3. JWT token generated with role and permissions
4. Token stored in localStorage and sent with API requests
5. Middleware validates token on protected routes
6. Automatic token refresh before expiration

### 5.2 Stream Management Process
1. Audio device detection and configuration
2. Stream configuration with channel mapping
3. FFmpeg command generation with validation
4. Process spawning with output monitoring
5. Icecast integration for stream distribution
6. Real-time status updates via WebSocket

### 5.3 Real-time Communication
- WebSocket connections for live updates
- Room-based messaging (admin, operators, viewers)
- Stream subscription system for targeted updates
- Automatic reconnection on connection loss
- Heartbeat mechanism for connection health

### 5.4 Error Handling Strategy
- Global error handler with categorized error types
- Graceful degradation for non-critical failures
- User-friendly error messages with technical details
- Comprehensive logging for debugging
- Automatic retry mechanisms for transient failures

### 5.5 Security Implementation
- Input validation and sanitization on all endpoints
- Rate limiting to prevent abuse
- CORS configuration for cross-origin requests
- Helmet.js for security headers
- Command injection prevention for FFmpeg parameters

## 6. Data Flow Diagrams

### 6.1 Stream Creation Flow
```
User Input → Validation → Device Check → FFmpeg Command → Process Spawn → Icecast Registration → Status Update
```

### 6.2 Real-time Update Flow
```
Service Event → WebSocket Service → Room Broadcast → Client Update → UI Refresh
```

## 7. Configuration Management

### 7.1 Environment Variables
- Server configuration (port, host, environment)
- Security settings (JWT secret, passwords)
- External service configuration (Icecast, FFmpeg)
- Feature flags (hardware simulation, CORS)
- Logging and monitoring settings

### 7.2 Runtime Configuration
- Stream configurations stored in JSON files
- Audio device mappings persisted locally
- Setup wizard progress tracking
- User preferences and settings

## 8. Deployment Considerations

### 8.1 System Requirements
- Node.js 16+ runtime environment
- FFmpeg installation with codec support
- Icecast server installation
- Multi-channel USB audio interface
- Network connectivity for client access

### 8.2 Installation Process
1. Clone repository and install dependencies
2. Configure environment variables
3. Run setup wizard for initial configuration
4. Install and configure external dependencies
5. Start application and verify functionality

### 8.3 Production Considerations
- Process management with PM2 or systemd
- Reverse proxy with Nginx for HTTPS
- Log aggregation and monitoring
- Backup strategies for configuration data
- Update and maintenance procedures

## 9. Performance Optimization

### 9.1 Backend Optimizations
- Efficient process management for FFmpeg instances
- Memory usage monitoring and cleanup
- Database query optimization for large datasets
- Caching strategies for frequently accessed data

### 9.2 Frontend Optimizations
- Code splitting and lazy loading
- Component-level caching
- Efficient state management
- Optimized bundle sizes

## 10. Monitoring and Observability

### 10.1 Logging Strategy
- Structured logging with Winston
- Log levels: error, warn, info, debug
- Daily log rotation with retention policies
- Service-specific log categorization

### 10.2 Metrics Collection
- System resource usage (CPU, memory, network)
- Application performance metrics
- Stream quality and connection statistics
- User activity and error rates

### 10.3 Health Checks
- API endpoint health monitoring
- Service dependency checks
- Real-time status reporting
- Automated alerting for critical issues

## 11. Future Enhancements

### 11.1 Scalability Improvements
- Horizontal scaling support
- Load balancing capabilities
- Distributed stream processing
- Cloud deployment options

### 11.2 Feature Additions
- Advanced audio processing options
- Integration with additional streaming platforms
- Mobile application development
- Advanced analytics and reporting

This Technical Design Document serves as a comprehensive guide for developers working on the LANStreamer project, providing detailed insights into the system architecture, implementation details, and operational considerations.

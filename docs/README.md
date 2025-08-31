# LANStreamer Documentation

This directory contains comprehensive documentation for the LANStreamer project.

## Documentation Overview

### Core Documents

- **[LANStreamer-PRD.md](./LANStreamer-PRD.md)** - Product Requirements Document
  - Defines the vision, scope, and requirements for LANStreamer v1.0
  - Outlines user stories, features, and technical requirements
  - **Updated:** Includes audio monitoring user story for professional quality control

- **[LANStreamer-TDD.md](./LANStreamer-TDD.md)** - Test-Driven Development Plan
  - Step-by-step TDD implementation guide (Steps 1-7 complete)
  - Red-Green-Refactor workflow documentation
  - **New:** Step 8 - Audio Monitoring Feature specification and testing strategy

- **[LANStreamer-Technical-Specification.md](./LANStreamer-Technical-Specification.md)** - Technical Specifications
  - Detailed technical architecture and implementation details
  - API specifications and data models
  - System requirements and dependencies

### Design & Feature Documentation

- **[Admin-Dashboard-UI-Design.md](./Admin-Dashboard-UI-Design.md)** - UI Design Specifications
  - Comprehensive visual design guidelines with exact measurements
  - Interactive element specifications and responsive design requirements
  - **Enhanced:** Monitoring controls, clickable header indicators, professional layout

- **[Audio-Monitoring-Feature-Specification.md](./Audio-Monitoring-Feature-Specification.md)** - Audio Monitoring Feature
  - **New:** Complete specification for professional audio monitoring capability
  - Device type differentiation (input vs output) for DVS/Dante setups
  - Quality control workflow for live event management

- **[LANStreamer-Audio-Pipeline-Concepts.md](./LANStreamer-Audio-Pipeline-Concepts.md)** - Audio Pipeline Educational Guide
  - **Moved:** Comprehensive guide to understanding audio routing concepts
  - Hardware integration approaches (XR18, DVS, Virtual Cables)
  - Troubleshooting methodology and best practices

- **[Authentication-Security-Specification.md](./Authentication-Security-Specification.md)** - Security & Authentication
  - **New:** Complete authentication system specification
  - Default credential management and security warnings
  - Browser permission handling and session management

### Installation & Setup Guides

- **[Installation Guides](./guides/)** - Complete setup instructions for dependencies
  - **[FFmpeg Installation Guide](./guides/ffmpeg-installation.md)** - Cross-platform FFmpeg setup
  - **[Icecast Installation Guide](./guides/icecast-installation.md)** - Icecast server installation
  - Platform coverage: Windows, macOS, Linux with troubleshooting

### Configuration Documentation

- **[env-example.md](./env-example.md)** - Environment Configuration Guide
  - Detailed explanation of all environment variables
  - Security considerations and production deployment settings
  - Platform-specific configuration notes

### Maintenance Documentation

- **[File-Relationships-Guide.md](./File-Relationships-Guide.md)** - Documentation Maintenance Guide
  - **New:** File dependencies and update relationships
  - Change propagation checklist for documentation consistency
  - Maintenance schedule and quality standards

## Development Workflow

This project follows a **Test-Driven Development (TDD)** approach:

1. **Red Phase** - Write failing tests first
2. **Green Phase** - Implement minimum code to pass tests
3. **Refactor Phase** - Clean up and improve code quality

## Current Implementation Status

### ✅ Completed (Steps 1-7)
- Backend core server and health check
- Audio device service with real device detection
- Comprehensive audio device API endpoint
- Real FFmpeg process management and integration
- Stream control API endpoints with full lifecycle management
- Complete End-to-End testing with Playwright
- Production-ready configuration and environment setup

### ✅ Completed (Step 8 - Design Phase)
- Audio monitoring feature complete specification
- Professional UI design documentation with precise measurements
- Device type differentiation for input/output audio devices
- Quality control workflow for live event management

### 🔄 Next Phase (Step 8 - Implementation)
- Audio monitoring API implementation
- Enhanced dashboard UI with monitoring controls
- Device type filtering and professional audio workflows
- DVS/Dante integration for language interpretation events

### 🚀 Production Ready
- TDD Steps 1-7 fully implemented and tested
- Comprehensive documentation for all features
- Environment configuration with security considerations
- Professional-grade specifications for monitoring capabilities

## Getting Started

1. Review the **PRD** to understand project goals
2. Follow the **TDD Plan** for development workflow
3. Check **Technical Specifications** for implementation details
4. Run tests to verify current functionality

## Contributing

When contributing to this project:
- Follow the TDD workflow outlined in the TDD document
- Ensure all tests pass before submitting changes
- Update documentation as needed
- Follow the established code structure and patterns

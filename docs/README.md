# LANStreamer Documentation

This directory contains comprehensive documentation for the LANStreamer project.

## 🚀 Quick Start

1. **Install dependencies:** `npm install`
2. **Configure environment:** Copy `.env.example` to `.env` and modify as needed
3. **Start development server:**
   - **With live reload:** `npm run dev:live` → `http://localhost:3002` ⚡
   - **Regular mode:** `npm run dev` → `http://localhost:3001`
4. **Access dashboard:** Add `/dashboard` to either URL

### 🔄 Development Mode

For the best development experience, use `npm run dev:live`:
- **Auto-refresh** on file changes (no more manual refresh!)
- **BrowserSync** dashboard for development tools
- **Multi-device testing** support
- **Network access** for testing on other devices

## Documentation Overview

### Core Documents

- **[LANStreamer-PRD.md](./specifications/LANStreamer-PRD.md)** - Product Requirements Document
  - Defines the vision, scope, and requirements for LANStreamer v1.0
  - Outlines user stories, features, and technical requirements
  - **Updated:** Includes audio monitoring user story for professional quality control

- **[LANStreamer-TDD.md](./specifications/LANStreamer-TDD.md)** - Test-Driven Development Plan
  - Step-by-step TDD implementation guide (Steps 1-7 complete)
  - Red-Green-Refactor workflow documentation
  - **New:** Step 8 - Audio Monitoring Feature specification and testing strategy

- **[LANStreamer-Technical-Specification.md](./specifications/LANStreamer-Technical-Specification.md)** - Technical Specifications
  - Detailed technical architecture and implementation details
  - API specifications and data models
  - System requirements and dependencies

- **[CHANGELOG.md](./CHANGELOG.md)** - Development Progress & History
  - Complete tracking of all features, fixes, and improvements
  - Version history with detailed implementation status
  - Known issues and technical debt documentation

### 📁 Organized Documentation Structure

#### 📖 User Guides & Tutorials
- **[guides/](./guides/)** - Simple installation and troubleshooting guides
- **[tutorials/](./tutorials/)** - In-depth learning materials and concepts

#### 📋 Specifications
- **[specifications/](./specifications/)** - Technical specs, PRD, TDD, and security docs

#### 🎨 Design & UI
- **[design/](./design/)** - UI/UX specifications and visual design guides

#### 💡 Examples & Configuration
- **[examples/](./examples/)** - Configuration examples and environment templates



### 🚀 Quick Access Links

- **[Installation Guides](./guides/README.md)** - Get LANStreamer running in minutes
- **[Technical Specification](./specifications/LANStreamer-Technical-Specification.md)** - Complete technical reference
- **[Troubleshooting](./guides/troubleshooting-simple.md)** - Quick fixes for common issues

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

# LANStreamer Documentation

This directory contains comprehensive documentation for the LANStreamer project.

## Documentation Overview

### Core Documents

- **[LANStreamer-PRD.md](./LANStreamer-PRD.md)** - Product Requirements Document
  - Defines the vision, scope, and requirements for LANStreamer v1.0
  - Outlines user stories, features, and technical requirements
  - Provides future roadmap and ecosystem vision

- **[LANStreamer-TDD.md](./LANStreamer-TDD.md)** - Test-Driven Development Plan
  - Step-by-step TDD implementation guide
  - Red-Green-Refactor workflow documentation
  - Testing strategy and development roadmap

- **[LANStreamer-Technical-Specification.md](./LANStreamer-Technical-Specification.md)** - Technical Specifications
  - Detailed technical architecture and implementation details
  - API specifications and data models
  - System requirements and dependencies

## Development Workflow

This project follows a **Test-Driven Development (TDD)** approach:

1. **Red Phase** - Write failing tests first
2. **Green Phase** - Implement minimum code to pass tests
3. **Refactor Phase** - Clean up and improve code quality

## Current Implementation Status

### ✅ Completed (Steps 1-5)
- Backend core server and health check
- Audio device service (mocked)
- Audio device API endpoint
- FFmpeg process management (simulated)
- Stream control API endpoints
- Comprehensive test coverage (9/9 backend tests passing)

### 🔄 In Progress (Step 6)
- Frontend admin dashboard
- Vue.js components and routing
- Vuex store management
- User interface implementation

### ⏳ Pending (Step 7)
- Final integration with real FFmpeg/Icecast
- End-to-end testing with Playwright
- Production deployment preparation

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

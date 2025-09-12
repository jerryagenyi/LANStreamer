# LANStreamer Development Documentation

> **🔒 This is the development branch containing planning documents, specifications, and development resources.**

This folder contains all the development and planning documentation that was used to build LANStreamer. These files are preserved for future development reference but are not needed by end users.

## 📁 Folder Structure

### 📋 `/specifications/`
**Product planning and technical specifications used during development:**
- **`LANStreamer-PRD.md`** - Product Requirements Document
  - Original vision, scope, and requirements for LANStreamer v1.0
  - User stories, features, and business requirements
  - Audio monitoring specifications for professional quality control

- **`LANStreamer-TDD.md`** - Test-Driven Development Plan
  - Step-by-step TDD implementation guide (Steps 1-7 completed)
  - Red-Green-Refactor workflow documentation
  - Audio monitoring feature testing strategy

- **`LANStreamer-Technical-Specification.md`** - Technical Architecture
  - Detailed technical architecture and implementation details
  - API specifications and data models
  - System requirements and technology stack decisions

- **`Authentication-Security-Specification.md`** - Security Planning
  - Authentication system design and security requirements
  - Security implementation guidelines and best practices

### 🎓 `/tutorials/`
**Development tutorials and implementation guides:**
- **`LANStreamer-Audio-Pipeline-Concepts.md`** - Deep audio pipeline concepts
- **`VB-Audio-Virtual-Cable-Setup-Guide.md`** - Virtual audio cable setup for development
- **`architectural-thinking-guide.md`** - Development architectural guidance
- **`health-monitoring-systems-guide.md`** - System monitoring concepts
- **`icecast-implementation-notes.md`** - Technical Icecast implementation details

### 📝 `/planning/`
**Project planning and maintenance documentation:**
- **`File-Relationships-Guide.md`** - Documentation maintenance guide
  - File dependencies and update relationships
  - Change propagation checklist for documentation consistency
  - Maintenance schedule and quality standards

### 🧪 `/tests/`
**Complete test suite for development:**
- **`backend/`** - Backend service tests
  - Route testing (streams, system APIs)
  - Service testing (AudioDevice, FFmpeg services)
  - Health check and integration tests

- **`components/`** - Frontend component tests
  - Component manager testing
  - UI component unit tests

- **`e2e/`** - End-to-end testing
  - Full application workflow testing
  - Integration testing with Playwright

## 🎯 Purpose

These files were essential during LANStreamer's development for:
- **Planning**: PRD and specifications guided feature development
- **Architecture**: Technical specs ensured proper system design
- **Testing**: Comprehensive test suite ensured quality and reliability
- **Documentation**: Maintained consistency and tracked progress

## 🚀 For Future Development

If you're continuing development on LANStreamer:

1. **Review the PRD** to understand the original vision and requirements
2. **Check the Technical Specification** for architecture decisions and API design
3. **Use the TDD guide** to maintain the test-driven development approach
4. **Run the test suite** to ensure changes don't break existing functionality
5. **Update documentation** following the File-Relationships-Guide

## 🔄 Accessing These Files

**To switch to this branch:**
```bash
git checkout dev-docs
```

**To return to the main user branch:**
```bash
git checkout main
```

## 📚 User Documentation

For user-facing documentation, see the **main branch**:
- Installation guides
- User troubleshooting
- Technical documentation for administrators

---

**Note**: This development documentation is preserved for historical reference and future development. End users should refer to the documentation in the main branch.

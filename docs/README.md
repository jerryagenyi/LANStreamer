# LANStreamer Documentation

This directory contains comprehensive documentation for the LANStreamer project.

## 📚 Documentation Index

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| **[LANSTREAMER_SYSTEM_ARCHITECTURE.md](./LANSTREAMER_SYSTEM_ARCHITECTURE.md)** | ⭐ **Complete system architecture** - Detailed technical documentation covering all services, startup sequence, configuration, and troubleshooting | Developers, AI assistants, advanced users |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Common issues and solutions - Practical troubleshooting guide for real-world problems | All users |
| **[NETWORK-SETUP.md](./NETWORK-SETUP.md)** | Network configuration guide - Static IP setup for events and conferences | Event organisers, network admins |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history - Release notes, updates, and compatibility information | All users |

### Installation Guides

| Guide | Description |
|-------|-------------|
| **[guides/README.md](./guides/README.md)** | Installation guides index |
| **[guides/ffmpeg-installation.md](./guides/ffmpeg-installation.md)** | FFmpeg installation and setup |
| **[guides/icecast-installation.md](./guides/icecast-installation.md)** | Icecast server installation |
| **[guides/audio-pipeline-simple.md](./guides/audio-pipeline-simple.md)** | Simple audio pipeline setup |

### Archived Documentation

Old documentation files are preserved in the `archive/` folder for reference:
- `archive/ARCHIVED_ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md` - Previous Icecast-focused architecture doc (content merged into SYSTEM_ARCHITECTURE.md)

---

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

---

## 📖 Documentation Structure

```
docs/
├── README.md                          # This file - documentation index
├── LANSTREAMER_SYSTEM_ARCHITECTURE.md # ⭐ Core architecture documentation
├── TROUBLESHOOTING.md                 # Practical troubleshooting guide
├── NETWORK-SETUP.md                   # Network configuration guide
├── CHANGELOG.md                       # Version history
├── guides/                            # Installation guides
│   ├── README.md                      # Guides index
│   ├── ffmpeg-installation.md
│   ├── icecast-installation.md
│   └── audio-pipeline-simple.md
└── archive/                           # Archived documentation
    └── ARCHIVED_ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md
```

---

## 🎯 Finding What You Need

### For Users
- **Getting started?** → See main [README.md](../README.md)
- **Having problems?** → Start with [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Setting up network?** → See [NETWORK-SETUP.md](./NETWORK-SETUP.md)
- **Installing components?** → See [guides/](./guides/)

### For Developers
- **Understanding the system?** → Read [LANSTREAMER_SYSTEM_ARCHITECTURE.md](./LANSTREAMER_SYSTEM_ARCHITECTURE.md)
- **Contributing code?** → See [CLAUDE.md](../CLAUDE.md) for development workflow
- **API reference?** → See architecture doc Section 5 (Stream Creation Flow)

### For AI Assistants
- **System architecture?** → [LANSTREAMER_SYSTEM_ARCHITECTURE.md](./LANSTREAMER_SYSTEM_ARCHITECTURE.md) contains complete technical details
- **Error diagnostics?** → Architecture doc Section 6 (Error Handling & Diagnostics)
- **Service interactions?** → Architecture doc Section 3 (Core Services)

---

## 🔍 Quick Reference

### Common Tasks

| Task | Document | Section |
|------|----------|---------|
| Understand system architecture | SYSTEM_ARCHITECTURE.md | Section 1: System Overview |
| Trace stream creation flow | SYSTEM_ARCHITECTURE.md | Section 5: Stream Creation Flow |
| Debug connection issues | TROUBLESHOOTING.md | Icecast Connection Issues |
| Configure static IP | NETWORK-SETUP.md | Full guide |
| Install FFmpeg | guides/ffmpeg-installation.md | Full guide |
| Install Icecast | guides/icecast-installation.md | Full guide |

---

## 📝 Documentation Standards

- **Architecture docs** include file names, line numbers, and function names for precision
- **Troubleshooting guides** include step-by-step solutions with commands
- **Installation guides** are platform-specific with screenshots where helpful
- **All docs** are kept up-to-date with codebase changes

---

## 🤝 Contributing to Documentation

When updating documentation:
1. Keep technical accuracy - verify file paths and line numbers
2. Update cross-references if moving content
3. Test all commands and examples
4. Follow the existing structure and formatting
5. Update this README if adding new documents

---

**Last Updated:** 2026-01-27  
**Documentation Version:** Aligned with codebase v1.2.3

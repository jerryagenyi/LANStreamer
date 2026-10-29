# LANStreamer Documentation

LANStreamer is an **Electron desktop app in active development** — the operator runs the desktop app; listeners use their phones' browsers on the same LAN. This directory holds the project's documentation.

## 📚 Documentation Index

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| **[README-DEVELOPERS.md](./README-DEVELOPERS.md)** | ⭐ **Start here for development** — dev loop (`electron:dev`), tests, architecture notes, UI rules, telemetry internals, verify-script inventory | Developers |
| **[GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md)** | ⭐ **Pre-release checklist** — everything to test/check before bundling and shipping, incl. the GitHub release process (version, tag, release notes) | Maintainers, QA |
| **[LANSTREAMER_SYSTEM_ARCHITECTURE.md](./LANSTREAMER_SYSTEM_ARCHITECTURE.md)** | Complete system architecture — all services, startup sequence, configuration | Developers, AI assistants, advanced users |
| **[APP-FLOW.md](./APP-FLOW.md)** | Every page, user flow (mermaid), wireframe, and component — the map used for UI work; view on GitHub for rendered diagrams | Developers, designers |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Common issues and solutions — subnet, firewall, playback | All users |
| **[NETWORK-SETUP.md](./NETWORK-SETUP.md)** | Network configuration — static IP setup for events | Event organisers, network admins |
| **[LATENCY.md](./LATENCY.md)** | Getting the lowest latency for listeners | Operators |
| **[TEST-PLAN.md](./TEST-PLAN.md)** | Manual + automated test plan | Developers, QA |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and release notes | All users |

The user-facing guide lives in the root: **[../README.md](../README.md)** (quick start, admin login, telemetry & privacy). Hardware-specific setups: **[../manual-setup/](../manual-setup/)**.

### Installation Guides

| Guide | Description |
|-------|-------------|
| **[guides/README.md](./guides/README.md)** | Installation guides index |
| **[guides/ffmpeg-installation.md](./guides/ffmpeg-installation.md)** | FFmpeg installation and setup |
| **[guides/icecast-installation.md](./guides/icecast-installation.md)** | Icecast server installation |
| **[guides/audio-pipeline-simple.md](./guides/audio-pipeline-simple.md)** | Simple audio pipeline setup |

> FFmpeg and Icecast are **installed separately today** (bundling with the installer is planned). Until then, these guides are required reading for a fresh machine.

### Archived Documentation

Old documentation files are preserved in the `archive/` folder for reference.

---

## 🚀 Quick Start (Development)

```bash
npm install                # dependencies
npm run electron:dev       # run the DESKTOP APP (what users run)
# ...or, for server-only work (no Electron shell):
npm run dev                # Express server with live reload → http://localhost:3001
```

- The desktop app opens the dashboard window itself — you rarely need the raw server URL.
- `npm test` runs the full Jest suite; `npm run electron:smoke` smoke-tests the Electron shell.
- Login for the dashboard: `admin` / `lanstreamer123` by default (see README → Security Setup).
- Full developer workflow (branch model, CI, UI rules, verification scripts): **[README-DEVELOPERS.md](./README-DEVELOPERS.md)**.

---

## 🎯 Finding What You Need

### For Users
- **Getting started?** → main [README.md](../README.md)
- **Having problems?** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or the in-app guide (`http://localhost:3001/docs`)
- **Setting up network?** → [NETWORK-SETUP.md](./NETWORK-SETUP.md)
- **Installing components?** → [guides/](./guides/)

### For Developers
- **Day-to-day development?** → [README-DEVELOPERS.md](./README-DEVELOPERS.md)
- **Preparing a release?** → [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md)
- **Understanding the system?** → [LANSTREAMER_SYSTEM_ARCHITECTURE.md](./LANSTREAMER_SYSTEM_ARCHITECTURE.md)
- **Code conventions enforced in this repo?** → [CLAUDE.md](../CLAUDE.md)

### For AI Assistants
- **System architecture?** → [LANSTREAMER_SYSTEM_ARCHITECTURE.md](./LANSTREAMER_SYSTEM_ARCHITECTURE.md)
- **Dev conventions + verify scripts?** → [README-DEVELOPERS.md](./README-DEVELOPERS.md)

---

**Last Updated:** 2026-10-29 — aligned with the Electron app development cycle (post-1.2.4)

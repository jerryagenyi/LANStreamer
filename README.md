# LANStreamer

A comprehensive solution that turns a standard PC into a multi-channel audio streaming server for local area networks (LAN). This project provides a **web-based application** that orchestrates **FFmpeg** and **Icecast** to deliver local, live, low-latency audio broadcasts for events like language interpretation, meetings, or conferences.

## 📋 Documentation

| Documentation | Description |
|--------------|-------------|
| **Quick Start** | This README - get up and running quickly |
| **[Startup sequence](docs/STARTUP-SEQUENCE.md)** | Step-by-step process order for `npm run dev`; troubleshoot each step |
| **[Troubleshooting](docs/TROUBLESHOOTING.md)** | Common issues: network, firewall, playback problems |
| **[System Architecture](docs/LANSTREAMER_SYSTEM_ARCHITECTURE.md)** | ⭐ Complete technical documentation - all services, flows, and architecture |
| [Installation Guides](docs/guides/README.md) | FFmpeg, Icecast setup guides |
| [Network Setup](docs/NETWORK-SETUP.md) | Static IP configuration for events |
| [Developer Guide](CLAUDE.md) | Architecture and contribution guide |

---

## 🚀 Quick Start

### For Non-Technical Users

**Step 1: Install Prerequisites**
- **Node.js**: Download from https://nodejs.org/ (choose "LTS" version)
- **FFmpeg & Icecast**: See [Installation Guides](docs/guides/README.md)

**Step 2: Download & Extract**
1. Go to https://github.com/jerryagenyi/LANStreamer
2. Click **"Code"** → **"Download ZIP"**
3. Extract the ZIP file and open the `LANStreamer` folder

**Step 3: One-Click Start**
1. Double-click `Start LANStreamer Server.bat`
2. Wait for dependencies to install and the server to start
3. Note the URLs shown in the terminal

**Step 4: Access Your Streaming Server**
- **Admin Dashboard**: `http://YOUR-IP:3001` (login required)
- **Listener Page**: `http://YOUR-IP:3001/streams` (public access)

**Default Admin Credentials** (change these immediately in `.env`):
- **Username**: `admin`
- **Password**: `lanstreamer123`

### For Technical Users

```bash
# Clone and install
git clone https://github.com/jerryagenyi/LANStreamer.git
cd LANStreamer
npm install

# Start the server
npm start
```

Then visit `http://localhost:3001` for the admin dashboard.

> **Need more detail?** See [System Architecture](docs/LANSTREAMER_SYSTEM_ARCHITECTURE.md) or [Installation Guides](docs/guides/README.md)

---

## 🎯 What is LANStreamer?

LANStreamer creates a complete audio streaming ecosystem with two main interfaces and three core components:

### Interfaces

| Interface | Purpose | Access |
|-----------|---------|--------|
| **Admin Dashboard** | Control center for managing streams | `http://localhost:3001/` (auth required) |
| **Listener Interface** | User-friendly page for browsing and playing streams | `http://localhost:3001/streams` (public) |

### Core Components

1. **Audio Input** - Any detected audio device (microphone, audio interface, virtual audio cable)
2. **FFmpeg** - Reads audio channels, encodes, and pushes to streaming server
3. **Icecast** - Open-source streaming server that broadcasts to network clients

### Use Cases

- **Language Interpretation**: Multiple language channels for conferences
- **Meeting Audio**: Professional audio distribution for events
- **Training Sessions**: Audio streaming for educational content
- **Local Broadcasting**: Any situation requiring reliable, low-latency audio distribution

---

## 📁 Project Structure

```
LANStreamer/
├── Start LANStreamer Server.bat    # Windows startup (double-click to start)
├── Update LANStreamer.bat          # Update script
├── src/                            # Backend (Node.js/Express)
├── public/                         # Frontend (web interface)
├── config/                         # Runtime config (auto-generated)
├── docs/                           # Documentation
└── manual-setup/                   # Hardware-specific guides
```

> **For developers:** See [CLAUDE.md](CLAUDE.md) for detailed architecture and code structure.

---

## ⚙️ System Requirements

**Minimum (operator PC)**
- Windows 10/11 64-bit (macOS/Linux supported from source)
- 4 GB RAM, dual-core CPU — encoding one stream uses ~2–5% of a modern CPU
- Any audio input (built-in mic, USB, or virtual audio cable)
- FFmpeg + Icecast (bundling planned; today installed separately — see guides)

**Listeners:** any phone/PC with a browser and WiFi — nothing to install. ~20–25 listeners per consumer WiFi access point for stable audio; larger events should add access points.

**Recommended:** 8 GB RAM for 4+ simultaneous streams, wired Ethernet from the operator PC to the router, 5 GHz WiFi for listeners (see [Latency guide](docs/LATENCY.md)).

**Running from source additionally needs:** Node.js 18+ (the packaged desktop app drops this requirement).

**Cross-OS testing:** the automated suite + Electron smoke test run on Windows/macOS/Linux via CI (GitHub Actions matrix), and the web pages are verified with Playwright on all three engines — that's the "test it across major OSes" story; there's no credible downloadable tool that substitutes for real devices beyond VMs and the CI matrix.

---

## 🔐 Security Setup

**⚠️ CRITICAL: Change Default Credentials Immediately!**

1. Copy `env.example` to `.env`
2. Edit `.env` and change:
   - `ADMIN_USERNAME=your-new-username`
   - `ADMIN_PASSWORD=your-strong-password`
   - `JWT_SECRET=your-jwt-secret`
   - `SESSION_SECRET=your-session-secret`
3. Restart LANStreamer

---

## 🔄 Updating

**For ZIP Users:**
```bash
# Double-click this file in your installation folder
Update LANStreamer.bat
```

**For Git Users:**
```bash
git pull origin main
npm install  # If dependencies changed
```

---

## 🛠️ Troubleshooting

**Common Issues:**

| Problem | Quick Fix |
|---------|-----------|
| "npm not found" | Install Node.js from [nodejs.org](https://nodejs.org/) |
| "Port 3001 already in use" | Close other apps using port 3001, or change `PORT` in `.env` |
| "This site can't be reached" | Check [Network Troubleshooting](docs/TROUBLESHOOTING.md#network-connectivity-issues) - likely subnet mismatch |
| "Connection refused" | Check [Firewall Setup](docs/TROUBLESHOOTING.md#firewall-issues) |
| "No audio devices detected" | Ensure device is connected and not in use by another app |
| "Stream format not supported" | See [Stream Playback Issues](docs/TROUBLESHOOTING.md#stream-playback-issues) |

> **📖 Full Troubleshooting Guide:** See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for detailed solutions including subnet issues, firewall configuration, and network diagnostics.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Startup sequence](docs/STARTUP-SEQUENCE.md)** | Process order for `npm run dev`; troubleshoot step-by-step |
| **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** | Common issues and solutions (subnet, firewall, playback) |
| [Network Setup](docs/NETWORK-SETUP.md) | Static IP configuration for live events |
| [Installation Guides](docs/guides/README.md) | FFmpeg and Icecast setup guides |
| [Comprehensive Docs](docs/LANStreamer-Documentation.md) | Complete technical documentation |
| [Developer Guide](CLAUDE.md) | Architecture and development workflow |
| [Manual Setup](manual-setup/README.md) | Hardware-specific configuration guides |
| [Changelog](docs/CHANGELOG.md) | Version history and release notes |

---

## 📊 Telemetry & Privacy

LANStreamer is **free and open source — no one makes money from it, and no one should** (MIT license).

**What we collect (only if you allow it):** anonymous events — app start, stream started/stopped/failed (with the error *category* only), app version, OS, and a random install ID. Every event also carries a fixed `app: lanstreamer` tag (the maintainer's PostHog project is shared across apps; the tag separates this app's events). **Never collected:** audio, stream names, contact details, file paths, IPs, or any personal data. Listeners' phones never send anything — telemetry comes only from the operator's install.

- **First run** asks once: Allow / Decline. The choice is saved (`config/telemetry.json`).
- **Change it anytime**: tray icon → **Telemetry → On/Off**.
- Events go to the maintainer's PostHog over the internet, queued and flushed in the background — nothing is sent while you decline, and a fully offline LAN works either way.

**What the app communicates with:** your own LAN (Express + Icecast for streaming), the maintainer's PostHog *if* telemetry is allowed, and GitHub release checks for update notifications.

---

## 🤝 Contributing

We welcome contributions! See [CLAUDE.md](CLAUDE.md) for the development workflow and architecture guide.

**Branch workflow:** We never add to `main` directly. Pull from `main` when starting work; do work on a feature branch; merge into `dev` first; only then does change go to `main`. See [CLAUDE.md](CLAUDE.md) for the full flow.

For bug reports, include your OS, Node.js version, and steps to reproduce.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

1. Check the [Troubleshooting Guide](docs/TROUBLESHOOTING.md) first
2. Review the [Installation Guides](docs/guides/README.md)
3. See [Comprehensive Documentation](docs/LANStreamer-Documentation.md) for advanced topics
4. Create an issue on GitHub with detailed information

---

**LANStreamer** - Professional audio streaming for local networks. Perfect for conferences, meetings, and events requiring reliable multi-channel audio distribution.

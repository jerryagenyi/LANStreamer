# LANStreamer

A comprehensive solution that turns a standard PC into a multi-channel audio streaming server for local area networks (LAN). This project provides a **web-based application** that orchestrates **FFmpeg** and **Icecast** to deliver local, live, low-latency audio broadcasts for events like language interpretation, meetings, or conferences.

For advanced users or for troubleshooting, **manual setup guides** are also available. If you have ideas and use-cases for improving this system, contact jerryagenyi@gmail.com.

## Project Structure

```
LANStreamer/
├── README.md                               # This file - project overview
├── .env.example                            # Environment configuration template
├── package.json                            # Node.js dependencies
├── src/                                    # Server-side code (Express + Node.js)
├── frontend/                               # Frontend code (Vue.js)
├── tests/                                  # Automated tests
├── docs/                                   # Comprehensive documentation
│   ├── README.md                           # Documentation index and overview  
│   ├── File-Relationships-Guide.md         # Documentation maintenance guide
│   ├── LANStreamer-PRD.md                  # Product Requirements Document
│   ├── LANStreamer-TDD.md                  # Test-Driven Development Plan
│   ├── LANStreamer-Technical-Specification.md # Technical Architecture
│   ├── Admin-Dashboard-UI-Design.md        # UI Design Specifications
│   ├── Audio-Monitoring-Feature-Specification.md # Monitoring Feature Specs
│   └── env-example.md                      # Environment Configuration Guide
├── manual-setup/                           # Manual guides and scripts
│   ├── README.md                           # Explanation of the manual setup
│   ├── LANStreamer-basic-xr18.md           # XR18 hardware setup guide
│   ├── LANStreamer-basic-dvs.md            # DVS/Dante setup guide
│   └── ...                                 # Batch files, etc.
└── images/                                 # Project images
```

## Features

- **Automated Setup:** A guided wizard automates the installation and configuration of Icecast and FFmpeg.
- **Professional Audio Device Detection:** Automatically detects and differentiates input and output audio devices for professional setups.
- **Audio Monitoring:** Monitor live streams through local output devices for quality control before broadcasting.
- **Multi-Stream Management:** Start, stop, and manage individual audio streams from a simple web-based dashboard.
- **Real-time Status:** View the live status of all streams and system components via WebSockets.
- **User-Friendly Interface:** A clean web interface allows users on the network to easily select and listen to the audio stream of their choice.
- **Professional Integration:** Supports DVS/Dante audio interfaces for language interpretation and live event management.

## How It Works

LANStreamer creates a complete audio streaming ecosystem with two main interfaces and three core components:

### 🎛️ **Admin Dashboard** (`http://localhost:3001/`)
The control center where administrators:
- **Manage Streams:** Start, stop, and configure audio streams
- **Monitor System:** Check FFmpeg and Icecast status in real-time
- **Configure Settings:** Set up event details and contact information
- **View Analytics:** Monitor active streams and system performance

### 🎧 **Listener Interface** (`http://localhost:3001/streams`)
The user-friendly page where listeners:
- **Browse Streams:** See all available audio streams
- **Listen Live:** Click to play any stream instantly
- **Mobile Friendly:** Works on phones, tablets, and computers
- **No Apps Required:** Just open in any web browser

### ⚙️ **Core Components**
1.  **Audio Input:** Any detected audio device (microphone, audio interface, virtual audio cable) provides audio to the host PC.
2.  **FFmpeg:** This powerful tool reads the audio channels, encodes them, and pushes them to the streaming server.
3.  **Icecast:** The open-source streaming server that broadcasts the streams to any connected client on the network.

### 🔄 **Complete Workflow**
1. **Admin** uses the dashboard to create streams from available audio devices
2. **FFmpeg** captures audio and streams it to **Icecast** server
3. **Listeners** visit the streams page to browse and play available audio
4. **Real-time updates** keep everyone informed of stream status

## Screenshots

### Dashboard Interface
<div align="center">
  <img src="images/screenshots/dashboard.png" width="90%" alt="LANStreamer Dashboard" style="border: 1px solid #ccc; border-radius: 8px;" />
</div>

*The main dashboard provides system status, stream management, and real-time monitoring*

### Streams Interface
<div align="center">
  <img src="images/screenshots/streams.png" width="90%" alt="LANStreamer Streams Page" style="border: 1px solid #ccc; border-radius: 8px;" />
</div>

*The streams page allows users to browse and listen to available audio streams*

## Visual Concept Overview

<div align="center">
  <img src="images/lanstreamer-local-audio-concept-1.jpg" width="45%" alt="LANStreamer Local Server Setup" style="border: 1px solid #ccc;" />
  <img src="images/lanstreamer-local-audio-concept-2.jpg" width="45%" alt="LANStreamer Alternative Setup" style="border: 1px solid #ccc;" />
</div>

**Key Benefits:**
- **Complete Control:** Your own local streaming server.
- **No Internet Required:** Works entirely on your local network.
- **Cost-Effective:** Uses free, open-source software.
- **Privacy:** Audio never leaves your network.

> 💡 **Perfect for:** Conferences, meetings, language interpretation events, and any situation where you need reliable, low-latency audio distribution to multiple listeners on a local network.

## Getting Started

### Prerequisites

**System Requirements:**
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18 or higher ([Download here](https://nodejs.org/))
- **Git**: For cloning the repository ([Download here](https://git-scm.com/))
- **Audio Input**: Any audio device (built-in microphone, USB microphone, audio interface, etc.)

**Required Components (Manual Installation Required):**
- **FFmpeg**: Audio/video processing toolkit ([Official site](https://ffmpeg.org/))
- **Icecast**: Open-source streaming media server ([Official site](https://icecast.org/))

> ⚠️ **Important**: You must install FFmpeg and Icecast manually before running LANStreamer. See installation guides below or in the [`manual-setup/`](manual-setup/) directory.

### Quick Installation Guide

#### Windows (Recommended - Using Winget)
```bash
# Install FFmpeg
winget install FFmpeg

# Install Icecast (download from official site)
# Visit: https://icecast.org/download/
# Download Windows installer and run it
```

#### macOS (Using Homebrew)
```bash
# Install FFmpeg
brew install ffmpeg

# Install Icecast
brew install icecast
```

#### Linux (Ubuntu/Debian)
```bash
# Install FFmpeg
sudo apt update
sudo apt install ffmpeg

# Install Icecast
sudo apt install icecast2
```

**Verify Installation:**
```bash
# Check FFmpeg
ffmpeg -version

# Check Icecast (Windows)
icecast.exe -v

# Check Icecast (macOS/Linux)
icecast -v
```

**First-Time Setup Checklist:**
- [ ] Node.js installed and `node --version` shows v18+
- [ ] Git installed and `git --version` works
- [ ] Audio device connected and working
- [ ] Internet connection (for initial setup only)
- [ ] FFmpeg and Icecast installed and accessible in system PATH

### Audio Device Configuration

LANStreamer automatically detects and works with **any audio devices** available on your system. No specific hardware or software is required - the application is designed to be flexible and work with your existing setup.

#### For Simple Use Cases
- **Single Audio Source**: Use your computer's built-in microphone or a USB microphone
- **Basic Streaming**: Perfect for presentations, meetings, or simple audio broadcasting
- **Demo Mode**: Optional test audio file for demonstrations (see [`assets/README.md`](assets/README.md))

#### For Professional/Multi-Channel Applications
For advanced scenarios like **language interpretation** where you need multiple audio sources:

1. **Audio Routing**: You're responsible for routing your audio sources to devices that LANStreamer can detect
2. **Professional Interfaces**: Use multi-channel audio interfaces (e.g., Behringer XR18, Focusrite Scarlett series)
3. **Virtual Audio**: Use virtual audio routing software like VB-Cable, Dante Virtual Soundcard (DVS), or similar

#### Example: Language Interpretation Setup
If using **Dante Virtual Soundcard** for interpretation:
1. Configure audio routing in **Dante Controller** (not LANStreamer)
2. Route interpreter microphones and floor audio to virtual audio channels
3. LANStreamer detects these virtual channels as available input devices
4. Create separate streams for each language using LANStreamer's interface

> **📝 Note:** Detailed setup guides for specific hardware configurations are available in the [`manual-setup/`](manual-setup/) folder.

### 🚀 Quick Start (5 Minutes)

**Step 1: Download LANStreamer**
```bash
# Open Command Prompt (Windows) or Terminal (Mac/Linux)
git clone https://github.com/jerryagenyi/LANStreamer.git
cd LANStreamer
```

**Step 2: Initial Setup**
```bash
# Install dependencies and create necessary folders
npm install
npm run setup
```

**Step 3: Configure Settings**
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```
> **📝 Note**: Edit the `.env` file to change default passwords before using in production!

**Step 4: Start LANStreamer**
```bash
# Start the server (recommended for beginners)
npm run dev
```

**Step 5: Start Icecast Server**
```bash
# Windows (navigate to Icecast installation directory)
cd "C:\Program Files (x86)\Icecast"
icecast.exe -c icecast.xml

# macOS/Linux
icecast -c /usr/local/etc/icecast.xml
```
> **⚠️ Important**: Always start Icecast before creating streams to avoid connection errors.

**Step 6: Open in Browser**
- Open your web browser
- Go to: `http://localhost:3001`
- For the admin dashboard: `http://localhost:3001/dashboard`

**🎉 That's it!** LANStreamer should now be running and ready to detect your audio devices.

---

### 🔧 Advanced Development Mode

**For developers or advanced users who want auto-refresh:**
```bash
# Start with live reload (auto-refreshes when you edit files)
npm run dev:live
```
Then access: `http://localhost:3002` (BrowserSync with auto-refresh)

### ❓ Troubleshooting Quick Start

**Problem: "npm not found"**
- Solution: Install Node.js from [nodejs.org](https://nodejs.org/)

**Problem: "git not found"**
- Solution: Install Git from [git-scm.com](https://git-scm.com/)

**Problem: "Port 3001 already in use"**
- Solution: Close other applications using port 3001, or edit `.env` to change `PORT=3001` to another port

**Problem: "No audio devices detected"**
- Solution: Ensure your microphone/audio device is connected and working in your system settings

**Need more help?** Check the [Installation Guides](docs/guides/README.md) for detailed troubleshooting.

---

### 🎯 What to Expect After Installation

**First Time Opening LANStreamer:**

1. **Dashboard Overview**: You'll see the main control panel with system status
2. **Audio Device Detection**: LANStreamer automatically scans for available audio devices
3. **Icecast & FFmpeg Check**: The system verifies required components are installed
4. **Stream Management**: Create and manage audio streams from detected devices

**Typical First-Use Workflow:**

1. **Start Icecast Server First**:
   - **Windows**: Navigate to `C:\Program Files (x86)\Icecast` and run `icecast.exe -c icecast.xml`
   - **macOS/Linux**: Run `icecast -c /usr/local/etc/icecast.xml` (or your config path)
   - **Important**: Always start Icecast before creating streams to avoid connection errors
2. **Check System Status**: Ensure all components show "✅ Ready" in LANStreamer dashboard
3. **Browse Audio Devices**: See what microphones/inputs are detected
4. **Create Your First Stream**:
   - Click "Start New Stream"
   - Select an audio device (e.g., your microphone)
   - Give it a name (e.g., "Main Audio")
   - Click "Start Stream"
5. **Test the Stream**:
   - Go to `http://localhost:3001/streams`
   - You should see your stream listed
   - Click "Play" to test audio playback
6. **Share with Others**: Other devices on your network can access the same URL to listen

**For Network Access:**
- Find your computer's IP address (e.g., `192.168.1.100`)
- Others can access: `http://192.168.1.100:3001/streams`
- Perfect for meetings, events, or presentations!

### 🔄 Live Reload Development

The `npm run dev:live` command uses **BrowserSync** for automatic browser refresh during development:

- **Main Application:** `http://localhost:3002` (auto-refreshes on file changes)
- **BrowserSync Dashboard:** `http://localhost:3002` (shows the interface you saw)
- **Original Server:** `http://localhost:3001` (proxied by BrowserSync)

**Features:**
- ✅ **Auto-refresh** when you edit any file in `public/`
- ✅ **Server restart** when you edit backend files
- ✅ **Multiple device sync** (test on different browsers/devices simultaneously)
- ✅ **Network access** via the External URL shown in the dashboard

**Development Workflow:**
1. Run `npm run dev:live`
2. Open `http://localhost:3002` in your browser
3. Edit any file in `public/components/` or `public/index.html`
4. Watch the browser automatically refresh with your changes!

### Manual Setup (Advanced Users)

If you wish to understand the core components or run the system without the web interface, see the guides in the [manual-setup](manual-setup/README.md) folder. The primary hardware guides are:
- **XR18/Scarlett Users:** [LANStreamer-basic-xr18.md](manual-setup/LANStreamer-basic-xr18.md)
- **DVS/Dante Users:** [LANStreamer-basic-dvs.md](manual-setup/LANStreamer-basic-dvs.md)

---

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

### 📋 **Core Documentation**
- **[Documentation Index](docs/README.md)** - Overview and current implementation status
- **[LANStreamer Documentation](docs/LANStreamer-Documentation.md)** - Comprehensive technical documentation, installation guides, and component architecture
- **[Product Requirements](docs/LANStreamer-PRD.md)** - Features, user stories, and project scope
- **[Technical Specifications](docs/LANStreamer-Technical-Specification.md)** - API documentation and system architecture
- **[Test-Driven Development Plan](docs/LANStreamer-TDD.md)** - Development methodology and testing strategy
- **[Changelog](docs/CHANGELOG.md)** - Complete development history and progress tracking

### 🎨 **Design & Features**
- **[UI Design Specifications](docs/Admin-Dashboard-UI-Design.md)** - Complete visual design guidelines
- **[Audio Monitoring Feature](docs/Audio-Monitoring-Feature-Specification.md)** - Professional monitoring capabilities
- **[Audio Pipeline Concepts](docs/LANStreamer-Audio-Pipeline-Concepts.md)** - Understanding audio routing and hardware integration
- **[Authentication & Security](docs/Authentication-Security-Specification.md)** - Login system and security measures

### ⚙️ **Configuration & Maintenance**
- **[Environment Configuration Guide](docs/env-example.md)** - Detailed environment setup
- **[File Relationships Guide](docs/File-Relationships-Guide.md)** - Documentation maintenance

### 🔧 **Setup Guides**
- **[Manual Setup](manual-setup/README.md)** - Hardware-specific configuration guides
- **[Test Assets](assets/README.md)** - Sample audio files and testing resources

## Configuration

The application uses environment variables. Create a `.env` file in the root directory by copying `.env.example`. For detailed configuration options, see the [Environment Configuration Guide](docs/env-example.md).

## Technology Stack

### Backend (Node.js + Express)
- **Express.js**: Web server framework
- **Socket.io**: Real-time WebSocket communication

### Frontend (Vue.js)
- **Vue.js 3**: Progressive JavaScript framework
- **Vue Router**: Client-side routing
- **Vuex/Pinia**: State management

## Contributing

We welcome contributions to LANStreamer! Whether you're fixing bugs, adding features, improving documentation, or helping with testing, your contributions are valuable.

### 🚀 Quick Start for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/LANStreamer.git
   cd LANStreamer
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. **Make your changes** and test them
6. **Commit your changes**:
   ```bash
   git commit -m "Add: your feature description"
   ```
7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create a Pull Request** on GitHub

### 🛠️ Development Setup

**Start the development server:**
```bash
npm run dev
```

**Generate screenshots for documentation:**
```bash
npm run screenshots
```

**Run tests:**
```bash
npm test
npm run test:e2e
```

### 📝 Contribution Guidelines

**Code Style:**
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions small and focused

**Commit Messages:**
- Use clear, descriptive commit messages
- Start with a verb: `Add`, `Fix`, `Update`, `Remove`
- Reference issues when applicable: `Fix: audio device detection (#123)`

**Pull Requests:**
- Provide a clear description of changes
- Include screenshots for UI changes
- Test your changes thoroughly
- Update documentation if needed

### 🐛 Bug Reports

When reporting bugs, please include:
- **Operating System** and version
- **Node.js version** (`node --version`)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Console logs** or error messages
- **Screenshots** if applicable

### 💡 Feature Requests

For new features, please:
- Check existing issues first
- Describe the use case clearly
- Explain why it would be valuable
- Consider implementation complexity

### 🧪 Testing

**Manual Testing:**
- Test on different operating systems
- Verify audio device detection
- Test stream creation and playback
- Check responsive design on mobile

**Automated Testing:**
- Unit tests with Vitest
- End-to-end tests with Playwright
- Screenshot regression testing

### 📚 Documentation

Help improve documentation by:
- Fixing typos and grammar
- Adding missing information
- Creating tutorials or guides
- Updating screenshots
- Translating content

### 🎯 Areas We Need Help With

- **Cross-platform testing** (Windows, macOS, Linux)
- **Audio device compatibility** testing
- **Performance optimization**
- **UI/UX improvements**
- **Documentation and tutorials**
- **Internationalization (i18n)**
- **Accessibility improvements**

### 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community support
- **Documentation**: Check the [`docs/`](docs/) directory

### 🙏 Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Documentation credits

Thank you for helping make LANStreamer better! 🎉
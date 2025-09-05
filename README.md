# LANStreamer

A comprehensive solution that turns a standard PC into a multi-channel audio streaming server for local area networks (LAN). This project provides a **web-based application** that orchestrates **FFmpeg** and **Icecast** to deliver local, live, low-latency audio broadcasts for events like language interpretation, meetings, or conferences.

For advanced users or for troubleshooting, **manual setup guides** are also available. If you have ideas and use-cases for improving this system, contact jerryagenyi@gmail.com.

## Project Structure

```
LANStreamer/
├── Start-LANStreamer.bat                   # Windows startup batch file
├── Create-Desktop-Shortcut.ps1             # Desktop shortcut creator
├── README.md                               # This file - project overview
├── package.json                            # Node.js dependencies and scripts
├── src/                                    # Backend Node.js application
│   ├── server.js                           # Main server entry point
│   ├── routes/                             # API route handlers
│   └── services/                           # Core business logic
├── public/                                 # Frontend web interface
│   ├── index.html                          # Admin dashboard
│   ├── streams.html                        # User streams page
│   └── components/                         # Modular UI components
├── config/                                 # Configuration files
├── logs/                                   # Application logs
├── docs/                                   # Documentation and guides
│   └── guides/                             # Installation and troubleshooting guides
└── manual-setup/                           # Advanced manual setup guides
```

## Features

- **Audio Device Detection:** Automatically detects and lists available input audio devices (microphones, audio interfaces, virtual audio cables).
- **Multi-Stream Management:** Create, start, and stop individual audio streams from a web-based dashboard.
- **Real-time Status:** View live status of all streams and system components.
- **Network Broadcasting:** Stream audio to any device on your local network via web browsers.
- **Professional Audio Support:** Works with professional audio interfaces, virtual audio routing, and multi-channel setups.
- **Easy Startup:** One-click Windows batch file for quick server startup with optional Icecast integration.

## How It Works

LANStreamer creates a complete audio streaming ecosystem with two main interfaces and three core components:

### 🎛️ **Admin Dashboard** (`http://localhost:3001/`)
The control center where administrators:
- **Manage Streams:** Create, Start, and Stop audio streams
- **Monitor System:** Check FFmpeg and Icecast status in real-time
- **Configure Settings:** Set up event details and contact information for support
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

**Step 5: Easy Startup (Windows Users)**
```bash
# Use the convenient batch file (recommended)
double-click Start-LANStreamer.bat

# Or create a desktop shortcut
powershell -ExecutionPolicy Bypass -File Create-Desktop-Shortcut.ps1
```

> **📍 Important**: The batch file expects Icecast to be installed at `C:\Program Files (x86)\Icecast`. If your Icecast is installed elsewhere, you'll need to start it manually or modify the batch file path.

**Step 5: Manual Startup (All Platforms)**
```bash
# Start LANStreamer Server first
npm start

# Then start Icecast Server (in a separate terminal)
# Windows
cd "C:\Program Files (x86)\Icecast"
icecast.exe -c icecast.xml

# macOS/Linux
icecast -c /usr/local/etc/icecast.xml
```

**Step 6: Open in Browser**
- Open your web browser
- Go to: `http://localhost:3001`
- For the admin dashboard: `http://localhost:3001/dashboard`

**🎉 That's it!** LANStreamer should now be running and ready to detect your audio devices.

> **💡 Pro Tip**: The `Start-LANStreamer.bat` file handles dependency installation, server startup, and can optionally start Icecast for you!

---



### 🖥️ Desktop Shortcut Setup (Windows)

**Create a Desktop Shortcut:**
```powershell
# Run this in PowerShell (as Administrator if needed)
powershell -ExecutionPolicy Bypass -File Create-Desktop-Shortcut.ps1
```

**What the shortcut does:**
- ✅ **One-click startup**: Double-click to start LANStreamer
- ✅ **Dependency check**: Automatically installs npm packages if needed
- ✅ **Icecast integration**: Option to start Icecast server automatically
- ✅ **Error handling**: Clear error messages if something goes wrong
- ✅ **Professional look**: Custom icon and proper Windows integration

**Additional Options:**
- **Pin to Taskbar**: Right-click shortcut → "Pin to taskbar"
- **Pin to Start Menu**: Right-click shortcut → "Pin to Start"
- **Startup Folder**: Copy shortcut to startup folder for auto-start (optional)

### ❓ Troubleshooting Quick Start

**Problem: "npm not found"**
- Solution: Install Node.js from [nodejs.org](https://nodejs.org/)

**Problem: "git not found"**
- Solution: Install Git from [git-scm.com](https://git-scm.com/)

**Problem: "Port 3001 already in use"**
- Solution: Close other applications using port 3001, or edit `.env` to change `PORT=3001` to another port

**Problem: "No audio devices detected"**
- Solution: Ensure your microphone/audio device is connected and working in your system settings

**Problem: Batch file doesn't work**
- Check: Are you running it from the LANStreamer folder?
- Check: Is Node.js installed and in your system PATH?
- Try: Right-click batch file → "Run as administrator"

**Need more help?** Check the [Installation Guides](docs/guides/README.md) for detailed troubleshooting.

---

### 🎯 What to Expect After Installation

**First Time Opening LANStreamer:**

1. **Dashboard Overview**: You'll see the main control panel with system status
2. **Audio Device Detection**: LANStreamer automatically scans for available audio devices
3. **Icecast & FFmpeg Check**: The system verifies required components are installed
4. **Stream Management**: Create and manage audio streams from detected devices

**Typical First-Use Workflow:**

> **📋 Correct Startup Order:**
> 1. **Start LANStreamer Server** (`npm start` or use `Start-LANStreamer.bat`)
> 2. **Start Icecast Server**
> 3. **Create/Start FFmpeg Streams**

**Detailed Steps:**

1. **Start LANStreamer Server**:
   - **Easy Way**: Double-click `Start-LANStreamer.bat` (Windows)
   - **Manual Way**: Run `npm start` in terminal
   - **Wait for**: "Server is listening on http://0.0.0.0:3001"

2. **Start Icecast Server**:
   - **Windows**: Navigate to `C:\Program Files (x86)\Icecast` and run `icecast.exe -c icecast.xml`
   - **macOS/Linux**: Run `icecast -c /usr/local/etc/icecast.xml` (or your config path)
   - **Batch File**: The `Start-LANStreamer.bat` can do this for you automatically

3. **Check System Status**: Open `http://localhost:3001` and ensure all components show "✅ Ready"

4. **Browse Audio Devices**: See what microphones/inputs are detected

5. **Create Your First Stream**:
   - Click "Start New Stream"
   - Select an audio device (e.g., your microphone)
   - Give it a name (e.g., "Main Audio")
   - Click "Start Stream"

6. **Test the Stream**:
   - Go to `http://localhost:3001/streams`
   - You should see your stream listed
   - Click "Play" to test audio playback

7. **Share with Others**: Other devices on your network can access the same URL to listen

**For Network Access:**
- Find your computer's IP address (e.g., `192.168.1.100`)
- Others can access: `http://192.168.1.100:3001/streams`
- Perfect for meetings, events, or presentations!



### Manual Setup (Advanced Users)

If you wish to understand the core components or run the system without the web interface, see the guides in the [manual-setup](manual-setup/README.md) folder. The primary hardware guides are:
- **XR18/Scarlett Users:** [LANStreamer-basic-xr18.md](manual-setup/LANStreamer-basic-xr18.md)
- **DVS/Dante Users:** [LANStreamer-basic-dvs.md](manual-setup/LANStreamer-basic-dvs.md)

---

## Documentation

- **[Installation Guides](docs/guides/README.md)** - Detailed setup and troubleshooting
- **[Manual Setup](manual-setup/README.md)** - Hardware-specific configuration guides

## Configuration

The application uses environment variables. Create a `.env` file in the root directory by copying `.env.example`. For detailed configuration options, see the [Environment Configuration Guide](docs/env-example.md).

## Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript + HTML/CSS
- **Real-time Communication**: WebSockets
- **Audio Processing**: FFmpeg
- **Streaming Server**: Icecast

## Contributing

We welcome contributions! Fork the repository, make your changes, and create a pull request.

**Development Setup:**
```bash
git clone https://github.com/YOUR-USERNAME/LANStreamer.git
cd LANStreamer
npm install
npm run dev
```

For bug reports, include your OS, Node.js version, and steps to reproduce the issue.
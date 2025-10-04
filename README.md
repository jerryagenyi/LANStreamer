# LANStreamer

A comprehensive solution that turns a standard PC into a multi-channel audio streaming server for local area networks (LAN). This project provides a **web-based application** that orchestrates **FFmpeg** and **Icecast** to deliver local, live, low-latency audio broadcasts for events like language interpretation, meetings, or conferences.

## 🚀 Quick Start

### For Non-Technical Users

**The easiest way to get started - no command line needed!**

#### Step 1: Install Prerequisites
You need these three programs installed first:
- **Node.js**: Download from https://nodejs.org/ (choose "LTS" version)
- **FFmpeg & Icecast**: See our [Installation Guides](docs/guides/README.md) for step-by-step instructions

#### Step 2: Download & Extract LANStreamer
1. **Download**: Go to https://github.com/jerryagenyi/LANStreamer
2. **Get ZIP**: Click the green **"Code"** button → **"Download ZIP"**
3. **Extract**: Right-click the ZIP file → **"Extract All"** or **"Extract Here"**
4. **Open Folder**: Navigate to the extracted `LANStreamer` folder

#### Step 3: One-Click Start
1. **Double-click**: `Start LANStreamer Server.bat`
2. **Wait**: The system will automatically install dependencies and start (if the terminal window disappears, just double-click the file again, and you should be up and running) - do not close the terminal, else LANSteamer Server session will end
3. **Note the URLs**: The terminal will show your network addresses

#### Step 4: Access Your Streaming Server
- **Admin Dashboard**: Visit `http://YOUR-IP:3001` (login required)
- **Listener Page**: Visit `http://YOUR-IP:3001/streams` (public access for your audience)

**Default Admin Credentials:**
- **Username**: `admin`
- **Password**: `lanstreamer123`
- **⚠️ CRITICAL**: Change these immediately in your `.env` file for security!

### For Technical Users

```bash
# Clone the repository
git clone https://github.com/jerryagenyi/LANStreamer.git
cd LANStreamer

# Install dependencies
npm install

# Start the server
npm start
```

Then visit `http://localhost:3001` for the admin dashboard.

## 🔧 Installation Requirements

### System Requirements
- **Operating System**: Windows 10/11
- **Node.js**: Version 18 or higher ([Download here](https://nodejs.org/))
- **Audio Input**: Any audio device (built-in microphone, USB microphone, audio interface, etc.)

### Required Components (Manual Installation Required)
- **FFmpeg**: Audio/video processing toolkit ([Official site](https://ffmpeg.org/))
- **Icecast**: Open-source streaming media server ([Official site](https://icecast.org/))

### Windows Installation (Using Winget)
```bash
# Install FFmpeg
winget install FFmpeg

# Install Icecast (download from official site)
# Visit: https://icecast.org/download/
# Download Windows installer and run it
```

**Verify Installation:**
```bash
# Check FFmpeg
ffmpeg -version

# Check Icecast (Windows)
cd "C:\Program Files (x86)\Icecast\bin"
icecast.exe -v
```

### 🔧 **Icecast Log Directory Configuration**

**Common Issue**: When you first install Icecast and try to use it, you may get this error:
```
FATAL: could not open error logging (./log\error.log): No such file or directory
```

**Solution**: Update the log directory path in your `icecast.xml` configuration file:

1. **Navigate to your Icecast installation folder** (usually `C:\Program Files (x86)\Icecast`)
2. **Open `icecast.xml`** in a text editor
3. **Find the `<paths>` section** and locate the `<logdir>` tag
4. **Get the full path to your log folder**:
   - Navigate to the Icecast root folder
   - Right-click on the `log` folder
   - Select "Copy as path" (or similar option)
5. **Update the `<logdir>` tag** with the full path:

```xml
<paths>
    <logdir>C:\Program Files (x86)\Icecast\log</logdir>
    <!-- other path configurations -->
</paths>
```

**Example**: If your Icecast is installed at `C:\Program Files (x86)\Icecast`, the log directory should be:
```xml
<logdir>C:\Program Files (x86)\Icecast\log</logdir>
```

> **💡 Tip**: Make sure the log directory exists and Icecast has write permissions to it.

## 🎯 What is LANStreamer?

LANStreamer creates a complete audio streaming ecosystem with two main interfaces and three core components:

### 🎛️ **Admin Dashboard** (`http://localhost:3001/`)
The control center where administrators:
- **Manage Streams**: Create, Start, and Stop audio streams
- **Monitor System**: Check FFmpeg and Icecast status in real-time
- **Configure Settings**: Set up event details and contact information for support
- **View Analytics**: Monitor active streams and system performance

### 🎧 **Listener Interface** (`http://localhost:3001/streams`)
The user-friendly page where listeners:
- **Browse Streams**: See all available audio streams
- **Listen Live**: Click to play any stream instantly
- **Mobile Friendly**: Works on phones, tablets, and computers
- **No Apps Required**: Just open in any web browser

### ⚙️ **Core Components**
1. **Audio Input**: Any detected audio device (microphone, audio interface, virtual audio cable) provides audio to the host PC
2. **FFmpeg**: This powerful tool reads the audio channels, encodes them, and pushes them to the streaming server
3. **Icecast**: The open-source streaming server that broadcasts the streams to any connected client on the network

## 🎯 Use Cases

**Perfect for:**
- **Language Interpretation**: Multiple language channels for conferences
- **Meeting Audio**: Professional audio distribution for events
- **Training Sessions**: Audio streaming for educational content
- **Local Broadcasting**: Any situation requiring reliable, low-latency audio distribution

## 🔐 Security Setup

**⚠️ CRITICAL: Change Default Credentials Immediately!**

LANStreamer comes with default admin credentials that you **MUST change** for security:

1. **Copy** `env.example` to `.env` (if not already done)
2. **Edit the `.env` file** and change:
   - `ADMIN_USERNAME=your-new-username`
   - `ADMIN_PASSWORD=your-strong-password`
3. **Restart LANStreamer**

**Example Strong Passwords:**
- `MySecureLANStreamer2024!`
- `AudioStreaming@2024#Secure`
- `LANStreamer-Admin-Pass123!`

## 🔄 Updating LANStreamer

### For ZIP Download Users (Recommended)
1. **Double-click** `Update LANStreamer.bat` in your installation folder
2. **Follow the prompts** - the script will backup your configuration and install updates

### For Git Users
```bash
git pull origin main
npm install  # If dependencies changed
```

## 📁 Project Structure

```
LANStreamer/
├── Start LANStreamer Server.bat            # Windows startup batch file
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
└── docs/                                   # Documentation and guides
```

## 🛠️ Troubleshooting

**Problem: "npm not found"**
- Solution: Install Node.js from [nodejs.org](https://nodejs.org/)

**Problem: "Port 3001 already in use"**
- Solution: Close other applications using port 3001, or edit `.env` to change `PORT=3001` to another port

**Problem: "No audio devices detected"**
- Solution: Ensure your microphone/audio device is connected and working in your system settings

**Problem: "Icecast installation not found"**
- **Option 1 (Easiest)**: Move your Icecast to `C:\Program Files (x86)\Icecast`
- **Option 2**: Click **"Browse for Icecast"** in the dashboard to select your installation
- **Option 3**: Add your custom path to the `.env` file (see `env.example` for variables)

**Need more help?** Check the [Installation Guides](docs/guides/README.md) for detailed troubleshooting.

## 📚 Documentation

- **[Installation Guides](docs/guides/README.md)** - Detailed setup and troubleshooting
- **[Network Setup Guide](docs/NETWORK-SETUP.md)** - Static IP configuration for live events
- **[Manual Setup](manual-setup/README.md)** - Hardware-specific configuration guides
- **[Comprehensive Developer Documentation](README-LDR.md)** - Detailed technical information for developers and researchers

## 🤝 Contributing

We welcome contributions! Fork the repository, make your changes, and create a pull request.

For bug reports, include your OS, Node.js version, and steps to reproduce the issue.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you need help:
1. Check the [Installation Guides](docs/guides/README.md) first
2. Review the troubleshooting section above
3. Create an issue on GitHub with detailed information about your setup

---

**LANStreamer** - Professional audio streaming for local networks. Perfect for conferences, meetings, and events requiring reliable multi-channel audio distribution.
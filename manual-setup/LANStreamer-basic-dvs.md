# LANStreamer Manual Setup Guide (DVS-Only Edition)

A comprehensive step-by-step solution for setting up your multi-language audio streaming system using Dante Virtual Soundcard (DVS) and Icecast with multiple streaming software options.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Key Differences from Standard Setup](#key-differences-from-standard-setup)
4. [Prerequisites](#prerequisites)
5. [Step 1: Install and Configure Icecast](#step-1-install-and-configure-icecast)
6. [Step 2: Install and Configure DVS](#step-2-install-and-configure-dvs)
7. [Step 3: Install FFmpeg](#step-3-install-ffmpeg)
8. [Step 4: FFmpeg Direct Streaming (Recommended)](#step-4-ffmpeg-direct-streaming-recommended)
   - [Option A: Single Stream Testing (stream.bat)](#option-a-single-stream-testing-streambat)
   - [Option B: Multi-Stream Production (start_dvs_streams.bat)](#option-b-multi-stream-production-start_dvs_streamsbat)
9. [Step 5: Alternative Streaming Options](#step-5-alternative-streaming-options)
   - [Option C: Ezstream + FFmpeg (WSL)](#option-c-ezstream--ffmpeg-wsl)
   - [Option D: VLC Media Player](#option-d-vlc-media-player)
   - [Option E: GStreamer](#option-e-gstreamer)
   - [Option F: OBS Studio](#option-f-obs-studio)
   - [Option G: BUTT (Fallback)](#option-g-butt-fallback)
10. [Recommended Setup Order](#recommended-setup-order)
11. [Testing and Verification](#testing-and-verification)
12. [Troubleshooting](#troubleshooting)
13. [Web Interface](#web-interface)

## Overview

This guide provides an alternative to the FFmpeg-based LANStreamer setup, designed for environments using Dante-enabled mixers or audio interfaces. It uses Dante Virtual Soundcard (DVS) to expose Dante audio channels as Windows audio devices, then offers multiple streaming software options including FFmpeg (recommended), Ezstream, VLC, OBS, and others.

### ✅ **Real-World Testing Status**
- **Steps 1-7**: ✅ **Successfully tested and confirmed working**
- **FFmpeg Direct Streaming**: ✅ **Confirmed working with live audio**
- **Ezstream Setup**: ⚠️ **Known issues** - use FFmpeg approach instead
- **Other options**: 🔄 **Available but not extensively tested**

### 🎯 **Recommended Focus Based on Testing**
Based on what I have personlally tested - For reliable production deployment, focus on:
1. **Option A (Single Stream Testing)** - Working and tested
2. **Option B (Multi-Stream Production)** - Working and tested
3. **Skip Option C (Ezstream)** initially due to known complexity issues

> 📖 **Understanding the Concept**: Before starting, read [LANStreamer Audio Pipeline Concepts](LANStreamer-Audio-Pipeline-Concepts.md) to understand how audio flows from sources to listeners. This is especially important for Dante setups where network audio routing can be complex.

**⚠️ Important**: Dante Virtual Soundcard (DVS) and Dante Via **cannot run simultaneously** on the same system. This guide uses DVS only, which is simpler and more reliable for streaming applications.

### System Architecture
```
[Interpreter Mics] → [Dante Mixer] → [DVS] → [Windows Audio Devices] → [Streaming Software] → [Icecast] → [Web Clients]
     ↓                    ↓           ↓              ↓                      ↓                ↓           ↓
  4 Languages        Dante Network  Virtual      Audio Capture        Encoding/Streaming  Distribution  User Selection
```

### Key Differences from Standard Setup
- **Audio Routing**: Uses Dante Virtual Soundcard to expose Dante channels as Windows audio devices
- **Streaming Options**: Multiple software choices (Ezstream recommended, FFmpeg, VLC, OBS, etc.)
- **Hardware**: Works with Dante-enabled mixers and audio equipment
- **Simplicity**: Single Dante application (DVS only) - no Dante Via conflicts
- **Cost**: Requires DVS license only (more affordable than DVS + Dante Via)
- **Reliability**: Ezstream + WSL provides most stable streaming solution

## Prerequisites

### Hardware Requirements
- Dante-enabled mixer (e.g., Yamaha QL series, Behringer with Dante card, Allen & Heath dLive)
- Computer (Windows/macOS) with network connectivity
- 4 microphones for interpreters
- Ethernet switch/router for Dante network
- Network cables

### Software Requirements
- Dante Virtual Soundcard (DVS) - **Requires License**
- Dante Controller (free) - For audio routing configuration
- Icecast streaming server - **Free**
- Streaming software - **Multiple free options available** (Ezstream, FFmpeg, VLC, OBS, etc.)
- Web browser for testing

### Licensing Considerations
⚠️ **Important**: Only Dante Virtual Soundcard requires a commercial license from Audinate. This makes it more affordable than solutions requiring multiple Dante licenses, while still providing professional-grade audio routing capabilities.

---

## Step 1: Dante Software Installation and Setup

### 1.1 Install Dante Virtual Soundcard (DVS)

1. **Purchase and Download**
   - Visit [Audinate's website](https://www.audinate.com/products/software/dante-virtual-soundcard)
   - Purchase DVS license for your operating system
   - Download the installer

2. **Install DVS**
   - Run the installer with administrator privileges
   - Follow the installation wizard
   - Restart your computer when prompted

3. **Activate License**
   - Launch DVS application
   - Enter your license key when prompted
   - Verify activation status

### 1.2 Install Dante Controller (Free)

1. **Download Dante Controller**
   - Visit [Audinate's Dante Controller page](https://www.audinate.com/products/software/dante-controller)
   - Download the free application (no license required)
   - Install with administrator privileges

2. **Launch Dante Controller**
   - Open Dante Controller application
   - It will scan for Dante devices on your network
   - You should see your Dante mixer and DVS listed

### 1.3 Configure DVS

1. **Set Channel Configuration**
   - Open Dante Virtual Soundcard application
   - Set receive channels to at least 4 (for 4 interpreter languages)
   - Set transmit channels as needed (usually 0 for streaming-only setup)
   - Select your Dante-enabled mixer as the clock source
   - Click "Start" to activate virtual audio devices

2. **Verify Virtual Devices**
   - Check Windows Sound settings (Control Panel → Sound)
   - You should see multiple "Dante Virtual Soundcard" devices:
     - "DVS Receive 1-2" (stereo pair)
     - "DVS Receive 3-4" (stereo pair)
     - Or individual mono devices depending on configuration
   - Note the exact device names for streaming software configuration

### 1.4 Configure Audio Routing with Dante Controller

1. **Open Dante Controller**
   - Launch Dante Controller application
   - Wait for network discovery to complete
   - You should see your Dante mixer (transmitter) and DVS (receiver) in the routing matrix

2. **Create Audio Routes**
   Route each interpreter microphone from your Dante mixer to separate DVS receive channels:

   **In Dante Controller routing matrix:**
   - **Mixer Channel 1** (English Interpreter) → **DVS Receive 1**
   - **Mixer Channel 2** (French Interpreter) → **DVS Receive 2**
   - **Mixer Channel 3** (Portuguese Interpreter) → **DVS Receive 3**
   - **Mixer Channel 4** (Arabic Interpreter) → **DVS Receive 4**

3. **Test Audio Routing**
   - Have interpreters speak into their microphones
   - Monitor audio levels in Dante Controller
   - Check Windows Sound settings to verify audio is reaching DVS devices
   - Use Windows Sound Recorder or similar to test each DVS input individually

---

## Step 2: Icecast Streaming Server Setup

### 2.1 Install Icecast

Follow the same installation process as the standard LANStreamer guide:

#### Windows Installation
1. Download Icecast from [icecast.org](https://icecast.org/download/)
2. Run the installer with administrator privileges
3. Install to default location: `C:\Program Files\Icecast2\`

#### Configuration
1. **Edit Configuration File**
   - Location: `C:\Program Files\Icecast2\etc\icecast.xml`
   - Open with text editor (run as administrator)

2. **Update Security Settings**:
   ```xml
   <authentication>
       <source-password>your-secure-source-password</source-password>
       <relay-password>your-secure-relay-password</relay-password>
       <admin-user>admin</admin-user>
       <admin-password>your-secure-admin-password</admin-password>
   </authentication>
   ```

3. **Set Network Configuration**:
   ```xml
   <hostname>localhost</hostname>
   <listen-socket>
       <port>8000</port>
   </listen-socket>
   ```

4. **Start Icecast**
   - Launch Icecast from Start Menu
   - Verify at `http://localhost:8000/` - you should see the Icecast status page

---

## Step 3: Audio Streaming Software Options

Since DVS exposes each Dante receive channel as separate Windows audio devices, you have multiple software options for streaming to Icecast. Choose the option that best fits your needs and installation capabilities.

### 3.1 Streaming Software Comparison

| Software | Pros | Cons | Best For |
|----------|------|------|----------|
| **FFmpeg** | ✅ **Tested & Working**, single batch file, professional quality, Windows native | Learning curve for configuration | ⭐ **RECOMMENDED: Production environments** |
| **Ezstream** | Purpose-built for Icecast, handles MP3 natively, stdin piping | ⚠️ **Setup complexity issues**, Linux/WSL only, command-line | Avoid initially - use FFmpeg instead |
| **OBS Studio** | GUI-based, multiple sources, familiar to many users | Heavier resource usage, more complex setup | Users comfortable with streaming software |
| **VLC Media Player** | Lightweight, often pre-installed, simple commands | Limited streaming features, basic quality controls | Quick testing and simple setups |
| **GStreamer** | Modular, lightweight, powerful pipeline | Steeper learning curve, verbose syntax | Advanced users, custom pipelines |
| **BUTT** | Simple GUI, designed for radio streaming | One stream per instance, requires multiple installations | Single stream or simple radio broadcasting |
| **Icecast Source Clients** | Purpose-built for Icecast, reliable | Limited availability, platform-specific | Dedicated streaming servers |

---

## Option A: Ezstream + FFmpeg (Recommended for Reliability)

### A.1 Install WSL (Windows Subsystem for Linux)

Since Ezstream is Linux-native and more reliable than FFmpeg's direct Icecast streaming, we'll use WSL:

1. **Enable WSL** (Windows Command Prompt/PowerShell as Administrator)
   ```cmd
   wsl --install
   ```
   - Restart your computer when prompted
   - This installs Ubuntu by default

2. **Update WSL Ubuntu** (Inside WSL/Ubuntu terminal)
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### A.2 Install Ezstream and FFmpeg in WSL

**Run these commands inside WSL/Ubuntu terminal:**

```bash
# Update package list (critical step!)
sudo apt update

# Install Ezstream, FFmpeg, and PulseAudio
sudo apt install ezstream ffmpeg pulseaudio -y
```

### A.3 Setup PulseAudio Bridge (Required for Windows Audio Access)

Since WSL cannot directly access Windows audio devices, we need PulseAudio to bridge the audio.

#### A.3.1 Windows PulseAudio Server Setup

1. **Download PulseAudio for Windows**
   - Visit the official PulseAudio project page
   - Download the latest Windows binary (ZIP file)
   - Extract to `C:\Program Files\PulseAudio`

2. **Configure PulseAudio Server** (Windows)
   - Navigate to `C:\Program Files\PulseAudio\etc\pulse\`
   - Edit `daemon.conf`:
     - Find: `exit-idle-time = 20`
     - Change to: `exit-idle-time = -1`

3. **Configure Network Access** (Windows)
   - Edit `default.pa` file in the same directory
   - Add these lines at the end:
     ```
     ### Added for LANStreamer WSL Setup
     load-module module-native-protocol-tcp auth-anonymous=1
     load-module module-stream-restore
     ```

4. **Start PulseAudio Server** (Windows)
   - Navigate to `C:\Program Files\PulseAudio\bin\`
   - Run `pulseaudio.exe`
   - Leave this running in the background

#### A.3.2 WSL PulseAudio Client Setup

**Run these commands inside WSL/Ubuntu terminal:**

```bash
# Set environment variables for PulseAudio connection
export PULSE_SERVER=tcp:localhost
export PULSE_COOKIE=~/.config/pulse/cookie

# Create config directory if it doesn't exist
mkdir -p ~/.config/pulse
```

**Copy Authentication Cookie:**
- Find the cookie file at: `C:\Users\[YourUsername]\.config\pulse\cookie`
- Copy it to your WSL home directory: `~/.config/pulse/cookie`
- Or use this WSL command:
  ```bash
  cp /mnt/c/Users/[YourUsername]/.config/pulse/cookie ~/.config/pulse/
  ```

### A.4 Create Ezstream Configuration Files

Create separate config files for each language stream:

**English Stream Config** (`english-stream.xml`):
```xml
<ezstream>
  <url>http://localhost:8000/english</url>
  <sourcepassword>your-source-password</sourcepassword>
  <format>MP3</format>
  <filename>-</filename> <!-- stdin -->
  <svrinfoname>English Interpretation</svrinfoname>
  <svrinfourl>http://localhost</svrinfourl>
  <svrinfogenre>Speech</svrinfogenre>
  <svrinfodescription>Live English interpretation stream</svrinfodescription>
  <svrinfobitrate>128</svrinfobitrate>
</ezstream>
```

**French Stream Config** (`french-stream.xml`):
```xml
<ezstream>
  <url>http://localhost:8000/french</url>
  <sourcepassword>your-source-password</sourcepassword>
  <format>MP3</format>
  <filename>-</filename>
  <svrinfoname>French Interpretation</svrinfoname>
  <svrinfourl>http://localhost</svrinfourl>
  <svrinfogenre>Speech</svrinfogenre>
  <svrinfodescription>Live French interpretation stream</svrinfodescription>
  <svrinfobitrate>128</svrinfobitrate>
</ezstream>
```

**Portuguese Stream Config** (`portuguese-stream.xml`):
```xml
<ezstream>
  <url>http://localhost:8000/portuguese</url>
  <sourcepassword>your-source-password</sourcepassword>
  <format>MP3</format>
  <filename>-</filename>
  <svrinfoname>Portuguese Interpretation</svrinfoname>
  <svrinfourl>http://localhost</svrinfourl>
  <svrinfogenre>Speech</svrinfogenre>
  <svrinfodescription>Live Portuguese interpretation stream</svrinfodescription>
  <svrinfobitrate>128</svrinfobitrate>
</ezstream>
```

**Arabic Stream Config** (`arabic-stream.xml`):
```xml
<ezstream>
  <url>http://localhost:8000/arabic</url>
  <sourcepassword>your-source-password</sourcepassword>
  <format>MP3</format>
  <filename>-</filename>
  <svrinfoname>Arabic Interpretation</svrinfoname>
  <svrinfourl>http://localhost</svrinfourl>
  <svrinfogenre>Speech</svrinfogenre>
  <svrinfodescription>Live Arabic interpretation stream</svrinfodescription>
  <svrinfobitrate>128</svrinfobitrate>
</ezstream>
```

### A.5 Create Streaming Script

**Create the script inside WSL/Ubuntu terminal:**

Create `start_ezstream_dvs.sh`:

```bash
#!/bin/bash
echo "Starting LANStreamer DVS streams with Ezstream..."
echo "Make sure Icecast and PulseAudio are running first!"
read -p "Press Enter to continue..."

# Set PulseAudio environment variables
export PULSE_SERVER=tcp:localhost
export PULSE_COOKIE=~/.config/pulse/cookie

# English Stream (DVS Channel via Windows audio bridge)
ffmpeg -f dshow -i audio="DVS Receive  1-2 (Dante Virtual Soundcard)" -f mp3 -ab 128k -ar 44100 -ac 1 - | ezstream -c english-stream.xml &

# French Stream
ffmpeg -f dshow -i audio="DVS Receive  5-6 (Dante Virtual Soundcard)" -f mp3 -ab 128k -ar 44100 -ac 1 - | ezstream -c french-stream.xml &

# Portuguese Stream
ffmpeg -f dshow -i audio="DVS Receive  7-8 (Dante Virtual Soundcard)" -f mp3 -ab 128k -ar 44100 -ac 1 - | ezstream -c portuguese-stream.xml &

# Arabic Stream
ffmpeg -f dshow -i audio="DVS Receive  9-10 (Dante Virtual Soundcard)" -f mp3 -ab 128k -ar 44100 -ac 1 - | ezstream -c arabic-stream.xml &

echo "All streams started!"
echo "Check http://localhost:8000/ to verify streams are running"
echo "Press Ctrl+C to stop all streams"
wait
```

**Make it executable (Linux command in WSL):**
```bash
chmod +x start_ezstream_dvs.sh
```

**Run the script (Linux command in WSL):**
```bash
./start_ezstream_dvs.sh
```

### A.5 Alternative Audio Input Methods

**Option 1: Direct Audio Input (if DVS not accessible in WSL)**

If WSL can't access your DVS devices directly, use ALSA default input:

```bash
# Linux command in WSL - English Stream using default audio input
ffmpeg -f alsa -i default -f mp3 -ab 128k -ar 44100 -ac 1 - | ezstream -c english-stream.xml
```

**Option 2: Windows Audio Bridge**

If you need to capture Windows audio from WSL, you may need to:

1. **Set up PulseAudio in WSL** (Linux commands in WSL):
   ```bash
   sudo apt install pulseaudio
   pulseaudio --start
   ```

2. **List available audio devices** (Linux command in WSL):
   ```bash
   ffmpeg -f pulse -list_devices true -i dummy
   ```

3. **Use specific pulse device** (Linux command in WSL):
   ```bash
   ffmpeg -f pulse -i "device_name" -f mp3 -ab 128k -ar 44100 -ac 1 - | ezstream -c config.xml
   ```

**Benefits of Ezstream Approach:**
- ✅ **Purpose-built** for Icecast streaming
- ✅ **Reliable protocol handling** - no connection issues
- ✅ **Native MP3 support** with proper metadata
- ✅ **Stdin piping** works perfectly with FFmpeg
- ✅ **Modular configuration** - easy to modify per stream
- ✅ **Better error handling** than direct FFmpeg streaming

---

### Option C: Ezstream + FFmpeg (WSL)

### A.1 Install FFmpeg

**Option 1: Winget Installation (Recommended for Windows 10/11)**

1. **Install via Winget** (Easiest method)
   - Open Command Prompt or PowerShell as Administrator
   - Run: `winget install ffmpeg`
   - **✅ PATH is configured automatically** - No manual setup required!
   - Winget installs to: `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg.Microsoft.WinGet.Source_*\bin\`
   - Test installation: `ffmpeg -version`

**✨ Why Winget is Recommended:**
- Automatic PATH configuration (no manual steps)
- Always gets the latest stable version
- Handles updates automatically
- Works on corporate/restricted networks
- No need to choose installation location

**Option 2: Manual Installation** (Only if Winget fails)

⚠️ **Note**: Manual installation requires additional PATH configuration steps that are not needed with Winget.

1. **Download FFmpeg**
   - Go to [ffmpeg.org](https://ffmpeg.org/download.html) or [gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
   - Choose a **static build** for Windows (not source code)
   - Download the **full build** (not essentials) - look for files like `ffmpeg.exe`, `ffprobe.exe`

2. **Extract and Setup**
   - Unzip to a simple location like `C:\ffmpeg\`
   - **Important**: Some builds place executables directly in the root folder (no `bin` subfolder)
   - Verify you can see `ffmpeg.exe` in either `C:\ffmpeg\` or `C:\ffmpeg\bin\`

3. **Add FFmpeg to PATH** (Required for manual installation only)
   - **Open System Properties** → **Advanced** → **Environment Variables**
   - Under "System variables," find **Path**, click **Edit**
   - Add the correct path:
     - If `ffmpeg.exe` is in `C:\ffmpeg\bin\`: Add `C:\ffmpeg\bin`
     - If `ffmpeg.exe` is in `C:\ffmpeg\`: Add `C:\ffmpeg`
   - Click **OK** and restart your terminal

4. **Test Installation**
   ```cmd
   ffmpeg -version
   ```
   - You should see version info printed
   - Verify MP3 support: `ffmpeg -encoders | findstr mp3`
   - You should see `libmp3lame` listed

**Troubleshooting:**
- **If using Winget**: FFmpeg should work immediately after installation. If not, restart your terminal.
- **If using manual installation**: If "ffmpeg is not recognized", check that the PATH points to the folder containing `ffmpeg.exe`
- If static build has no executables: Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) instead
- For remote/corporate PCs: Winget method usually works best

### A.2 Identify Your DVS Audio Devices

Before creating the streaming script, you need to identify the exact names of your DVS audio devices:

1. **List Available Audio Devices**
   ```cmd
   ffmpeg -list_devices true -f dshow -i dummy
   ```

2. **Look for DVS Devices in the Output**
   You should see audio devices like:
   ```
   [dshow @ ...] "DVS Receive  1-2 (Dante Virtual Soundcard)" (audio)
   [dshow @ ...] "DVS Receive  5-6 (Dante Virtual Soundcard)" (audio)
   [dshow @ ...] "DVS Receive  7-8 (Dante Virtual Soundcard)" (audio)
   [dshow @ ...] "DVS Receive  9-10 (Dante Virtual Soundcard)" (audio)
   [dshow @ ...] "DVS Receive 11-12 (Dante Virtual Soundcard)" (audio)
   [dshow @ ...] "DVS Receive 13-14 (Dante Virtual Soundcard)" (audio)
   [dshow @ ...] "DVS Receive 15-16 (Dante Virtual Soundcard)" (audio)
   ```

3. **Note the Exact Device Names**
   - Copy the exact device names (including spaces and special characters)
   - These correspond to the Dante receive channels you configured in Dante Controller
   - Match each device to the language it receives based on your Dante routing

**Example Mapping:**
- `DVS Receive  1-2 (Dante Virtual Soundcard)` → Floor audio
- `DVS Receive  5-6 (Dante Virtual Soundcard)` → English interpretation
- `DVS Receive  7-8 (Dante Virtual Soundcard)` → French interpretation
- `DVS Receive  9-10 (Dante Virtual Soundcard)` → Portuguese interpretation
- `DVS Receive 11-12 (Dante Virtual Soundcard)` → Arabic interpretation

### A.3 Create FFmpeg Streaming Script

Create `start_dvs_streams.bat`:

```batch
@echo off
echo Starting LANStreamer DVS audio streams...
echo Make sure Icecast is running first!
pause

REM English Stream (DVS Channel)
start "English Stream" /min ffmpeg -f dshow -i audio="DVS Receive  5-6 (Dante Virtual Soundcard)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "English" -ice_description "English interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/english

REM French Stream (DVS Channel)
start "French Stream" /min ffmpeg -f dshow -i audio="DVS Receive  7-8 (Dante Virtual Soundcard)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "French" -ice_description "French interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/french

REM Portuguese Stream (DVS Channel)
start "Portuguese Stream" /min ffmpeg -f dshow -i audio="DVS Receive  9-10 (Dante Virtual Soundcard)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "Portuguese" -ice_description "Portuguese interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/portuguese

REM Arabic Stream (DVS Channel)
start "Arabic Stream" /min ffmpeg -f dshow -i audio="DVS Receive 11-12 (Dante Virtual Soundcard)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "Arabic" -ice_description "Arabic interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/arabic

echo All streams started!
echo Check http://localhost:8000/ to verify streams are running
pause
```

### A.4 Variable-Based Multi-Stream Batch File (Recommended)

Since FFmpeg is working directly on Windows, here's a complete variable-based batch file for multiple DVS streams:

**Create `start_dvs_streams.bat`:**

```batch
@echo off
setlocal enabledelayedexpansion

:: ====================================================================
:: === LANStreamer DVS Multi-Stream Configuration ===
:: ====================================================================
:: Configure your settings here - no need to edit the FFmpeg commands below
:: ====================================================================

:: === ICECAST SERVER SETTINGS ===
:: Manual IP override - set this if auto-detection doesn't work or you need a specific network adapter
:: NOTE: Script auto-detects 192.168.x.x addresses. If you're using 10.x.x.x or 172.16-31.x.x networks,
::       or have multiple network adapters, uncomment and set your specific IP below:
set "MANUAL_IP="
:: set "MANUAL_IP=192.168.1.100"
:: set "MANUAL_IP=10.0.0.100"
:: set "MANUAL_IP=172.16.0.100"

:: Auto-detect IP or use manual override
if defined MANUAL_IP (
    set "ICECAST_HOST=%MANUAL_IP%"
    echo Using manual IP: %MANUAL_IP%
) else (
    echo Auto-detecting LAN IP address (looking for 192.168.x.x)...
    for /f "tokens=2 delims=: " %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
        set "TEMP_IP=%%a"
        set "TEMP_IP=!TEMP_IP: =!"
        echo Checking IP: !TEMP_IP!
        echo !TEMP_IP! | findstr /r "^192\.168\." >nul
        if !errorlevel! equ 0 (
            set "ICECAST_HOST=!TEMP_IP!"
            echo Found LAN IP: !TEMP_IP!
            goto :ip_found
        )
    )
    :ip_found
    if not defined ICECAST_HOST (
        echo WARNING: No 192.168.x.x IP found! Using localhost - LAN access will not work.
        echo Please set MANUAL_IP variable with your correct IP address.
        set "ICECAST_HOST=localhost"
    )
)

set "ICECAST_PORT=8000"
set "ICECAST_USER=source"
set "ICECAST_PASSWORD=your-source-password"

:: === DVS AUDIO DEVICES ===
:: Update these with your exact DVS device names from: ffmpeg -list_devices true -f dshow -i dummy
set "ENGLISH_DEVICE=DVS Receive  5-6 (Dante Virtual Soundcard)"
set "FRENCH_DEVICE=DVS Receive  7-8 (Dante Virtual Soundcard)"
set "PORTUGUESE_DEVICE=DVS Receive  9-10 (Dante Virtual Soundcard)"
set "ARABIC_DEVICE=DVS Receive 11-12 (Dante Virtual Soundcard)"

:: === AUDIO ENCODING SETTINGS ===
set "AUDIO_BITRATE=128k"
set "SAMPLE_RATE=44100"
set "CHANNELS=1"
set "CODEC=libmp3lame"

:: ====================================================================
:: === STREAMING COMMANDS (DO NOT EDIT BELOW) ===
:: ====================================================================

echo Starting LANStreamer DVS multi-stream setup...
echo Make sure Icecast is running at http://%ICECAST_HOST%:%ICECAST_PORT%/
echo.
pause

echo Starting English stream...
start "English Stream" /min ffmpeg -f dshow -i audio="%ENGLISH_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "English Interpretation" ^
-ice_description "Live English interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/english

echo Starting French stream...
start "French Stream" /min ffmpeg -f dshow -i audio="%FRENCH_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "French Interpretation" ^
-ice_description "Live French interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/french

echo Starting Portuguese stream...
start "Portuguese Stream" /min ffmpeg -f dshow -i audio="%PORTUGUESE_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "Portuguese Interpretation" ^
-ice_description "Live Portuguese interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/portuguese

echo Starting Arabic stream...
start "Arabic Stream" /min ffmpeg -f dshow -i audio="%ARABIC_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "Arabic Interpretation" ^
-ice_description "Live Arabic interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/arabic

echo.
echo All streams started!
echo Check http://%ICECAST_HOST%:%ICECAST_PORT%/ to verify streams are running
echo Press any key to exit...
pause >nul

endlocal
```

**Configuration Notes:**
- **Password**: Set `ICECAST_PASSWORD` variable once at the top
- **Device Names**: Update the `*_DEVICE` variables with your exact DVS device names (including double spaces)
- **Audio Settings**: Modify bitrate, sample rate, and channels in the variables section
- **Easy Testing**: Change device names to test with different audio sources

### A.4 Using Variables for Easy Configuration (Recommended Approach)

**💡 Pro Tip**: Use variables to make your scripts easier to maintain and troubleshoot. This is especially important for DVS setups where device names can be complex.

**Benefits of Variable-Based Scripts:**
- Easy to change audio devices without rewriting commands
- Quick testing with different audio sources (useful when DVS isn't working)
- Consistent configuration across multiple streams
- Easier troubleshooting and debugging

**Example Variable-Based Script (Windows):**
```batch
@echo off
:: === CONFIGURATION VARIABLES ===
:: DVS device (when working)
set "AUDIO_DEVICE=DVS Receive  5-6 (Dante Virtual Soundcard)"
:: Fallback device for testing
:: set "AUDIO_DEVICE=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)"

set "ICECAST_PASSWORD=your-source-password"
set "ICECAST_HOST=localhost"
set "ICECAST_PORT=8000"

:: English Stream using variables
ffmpeg -f dshow -i audio="%AUDIO_DEVICE%" ^
-acodec libmp3lame -b:a 128k -ar 44100 -ac 1 ^
-content_type audio/mpeg -ice_name "English" ^
-f mp3 icecast://source:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/english
```

**Key Advantages for DVS:**
- **Easy Device Switching**: Switch between DVS and fallback devices for testing
- **Network Troubleshooting**: Use working microphone while fixing DVS network issues
- **Device Name Management**: Handle complex DVS device names with spaces and special characters
- **Quick Testing**: Verify streaming pipeline works before troubleshooting DVS specifically

---

### Option F: OBS Studio

### B.1 Install OBS Studio

1. **Download OBS**
   - Visit [obsproject.com](https://obsproject.com/)
   - Download and install OBS Studio

2. **Install Icecast Plugin**
   - Download "obs-websocket" and "Advanced Scene Switcher" plugins
   - Or use "Multiple Output" plugin for simultaneous streaming

### B.2 Configure OBS for Multiple Streams

1. **Create Audio Sources**
   - Add "Audio Input Capture" source for each DVS device
   - Name them: "English DVS", "French DVS", etc.
   - Select corresponding DVS receive channels

2. **Configure Streaming**
   - Go to Settings → Stream
   - Service: Custom
   - Server: `rtmp://localhost:1935/live` (requires RTMP-to-Icecast bridge)
   - Or use Multiple Output plugin for direct Icecast streaming

3. **Alternative: Use OBS with External Tools**
   - Stream to local RTMP server
   - Use FFmpeg to relay RTMP to multiple Icecast mountpoints

---

### Option D: VLC Media Player

### C.1 Install VLC (if not already installed)

**Windows Command Prompt/PowerShell:**
```cmd
winget install VideoLAN.VLC
```

### C.2 Create VLC Streaming Script

**Create this Windows batch file:** `start_vlc_streams.bat`

```batch
@echo off
echo Starting VLC DVS streams...
echo Make sure Icecast is running first!
pause

REM English Stream
start "English VLC" /min "C:\Program Files\VideoLAN\VLC\vlc.exe" dshow:// :dshow-adev="DVS Receive  5-6 (Dante Virtual Soundcard)" :sout=#transcode{acodec=mp3,ab=128,channels=1,samplerate=44100}:http{mux=mp3,dst=localhost:8000/english} :no-sout-display :intf=dummy

REM French Stream
start "French VLC" /min "C:\Program Files\VideoLAN\VLC\vlc.exe" dshow:// :dshow-adev="DVS Receive  7-8 (Dante Virtual Soundcard)" :sout=#transcode{acodec=mp3,ab=128,channels=1,samplerate=44100}:http{mux=mp3,dst=localhost:8000/french} :no-sout-display :intf=dummy

REM Portuguese Stream
start "Portuguese VLC" /min "C:\Program Files\VideoLAN\VLC\vlc.exe" dshow:// :dshow-adev="DVS Receive  9-10 (Dante Virtual Soundcard)" :sout=#transcode{acodec=mp3,ab=128,channels=1,samplerate=44100}:http{mux=mp3,dst=localhost:8000/portuguese} :no-sout-display :intf=dummy

REM Arabic Stream
start "Arabic VLC" /min "C:\Program Files\VideoLAN\VLC\vlc.exe" dshow:// :dshow-adev="DVS Receive 11-12 (Dante Virtual Soundcard)" :sout=#transcode{acodec=mp3,ab=128,channels=1,samplerate=44100}:http{mux=mp3,dst=localhost:8000/arabic} :no-sout-display :intf=dummy

echo All VLC streams started!
echo Check http://localhost:8000/ to verify streams
pause
```

**Note**: VLC streams directly to HTTP, not Icecast protocol. You may need to configure Icecast to accept HTTP sources or use a different approach.

---

### Option E: GStreamer

### D.1 Install GStreamer

**Windows Command Prompt/PowerShell:**
```cmd
winget install GStreamer.GStreamer
```

### D.2 Create GStreamer Streaming Script

**Create this Windows batch file:** `start_gstreamer_streams.bat`

```batch
@echo off
echo Starting GStreamer DVS streams...
echo Make sure Icecast is running first!
pause

REM English Stream
start "English GStreamer" /min gst-launch-1.0 dshowaudiosrc device-name="DVS Receive  5-6 (Dante Virtual Soundcard)" ! audioconvert ! audioresample ! lamemp3enc bitrate=128 ! shout2send ip=localhost port=8000 password=your-source-password mount=/english

REM French Stream
start "French GStreamer" /min gst-launch-1.0 dshowaudiosrc device-name="DVS Receive  7-8 (Dante Virtual Soundcard)" ! audioconvert ! audioresample ! lamemp3enc bitrate=128 ! shout2send ip=localhost port=8000 password=your-source-password mount=/french

REM Portuguese Stream
start "Portuguese GStreamer" /min gst-launch-1.0 dshowaudiosrc device-name="DVS Receive  9-10 (Dante Virtual Soundcard)" ! audioconvert ! audioresample ! lamemp3enc bitrate=128 ! shout2send ip=localhost port=8000 password=your-source-password mount=/portuguese

REM Arabic Stream
start "Arabic GStreamer" /min gst-launch-1.0 dshowaudiosrc device-name="DVS Receive 11-12 (Dante Virtual Soundcard)" ! audioconvert ! audioresample ! lamemp3enc bitrate=128 ! shout2send ip=localhost port=8000 password=your-source-password mount=/arabic

echo All GStreamer streams started!
echo Check http://localhost:8000/ to verify streams
pause
```

---

### Option G: BUTT (Fallback)

### E.1 Install BUTT

1. **Download BUTT**
   - Visit [butt.sourceforge.net](https://butt.sourceforge.net/)
   - Download the installer for your operating system

2. **Install Application**
   - Run the installer
   - Launch BUTT after installation

### 3.2 Configure BUTT for Each Language Stream

Since DVS exposes each Dante receive channel as a separate Windows audio device, you'll configure BUTT to stream from each DVS device individually.

#### English Stream Configuration (Repeat for Each Language)

1. **Create New Profile**
   - Open BUTT
   - Go to Settings → Main
   - Create a new profile named "English Stream"

2. **Audio Input Settings**
   - **Device**: Select the DVS device corresponding to English interpreter
     - Look for "DVS Receive 1" or "Dante Virtual Soundcard (Receive 1-2)"
     - Choose the specific channel that receives English audio from Dante Controller routing
   - **Sample Rate**: 44100 Hz
   - **Channels**: Mono (1 channel) - suitable for speech interpretation

3. **Stream Settings**
   - **Server Type**: Icecast
   - **Address**: localhost
   - **Port**: 8000
   - **Password**: your-source-password (from icecast.xml)
   - **Mountpoint**: /english
   - **Format**: MP3
   - **Bitrate**: 128 kbps (good quality for speech)
   - **Quality**: Good

4. **Metadata Settings**
   - **Stream Name**: "English Interpretation"
   - **Description**: "Live English audio stream"
   - **Genre**: "Speech"
   - **URL**: (optional)

5. **Save Profile**
   - Save this configuration as "English Stream"

#### Create Profiles for Other Languages

Repeat the above process for each language, changing:
- **French Stream**:
  - Audio Input: "DVS Receive 2" or corresponding DVS device
  - Mountpoint: `/french`
  - Stream Name: "French Interpretation"
- **Portuguese Stream**:
  - Audio Input: "DVS Receive 3" or corresponding DVS device
  - Mountpoint: `/portuguese`
  - Stream Name: "Portuguese Interpretation"
- **Arabic Stream**:
  - Audio Input: "DVS Receive 4" or corresponding DVS device
  - Mountpoint: `/arabic`
  - Stream Name: "Arabic Interpretation"

### 3.3 Running Multiple BUTT Instances

Since BUTT typically runs one stream per instance, you have several options:

**Option 1: Multiple BUTT Installations**
- Install BUTT in different directories
- Run each instance with different profiles

**Option 2: Portable BUTT Versions**
- Download portable versions of BUTT
- Run multiple instances from different folders

**Option 3: Virtual Machines/Sandboxing**
- Use Windows Sandbox or virtual machines
- Run separate BUTT instances in isolated environments

### 3.4 Start All Streams

1. **Launch Each BUTT Instance**
   - Start BUTT with English profile
   - Start second BUTT with French profile
   - Continue for Portuguese and Arabic

2. **Begin Broadcasting**
   - Click "Play" or "Start" in each BUTT instance
   - Verify connection status shows "Connected"

3. **Verify Streams**
   - Check Icecast status page at `http://localhost:8000/`
   - You should see 4 active mountpoints:
     - `/english`
     - `/french`
     - `/portuguese`
     - `/arabic`

---

## Option F: Icecast Source Clients

### F.1 IceS (Icecast Source Client)

**Installation:**
- Download from [icecast.org](https://icecast.org/download/)
- Compile from source or find pre-built binaries

**Configuration:**
Create `ices-english.xml`:
```xml
<?xml version="1.0"?>
<ices>
    <background>1</background>
    <logpath>/var/log/ices</logpath>
    <logfile>ices.log</logfile>
    <loglevel>4</loglevel>
    <consolelog>0</consolelog>

    <stream>
        <server>
            <hostname>localhost</hostname>
            <port>8000</port>
            <password>your-source-password</password>
            <protocol>http</protocol>
        </server>

        <input>
            <module>oss</module>
            <param name="rate">44100</param>
            <param name="channels">1</param>
            <param name="device">/dev/dsp</param>
        </input>

        <instance>
            <hostname>localhost</hostname>
            <port>8000</port>
            <password>your-source-password</password>
            <mount>/english</mount>
            <yp>0</yp>
            <public>0</public>
            <name>English Interpretation</name>
            <description>English language stream</description>
            <genre>Speech</genre>
        </instance>
    </stream>
</ices>
```

### F.2 DarkIce

**Installation:**
```cmd
# Windows: Use WSL or compile from source
# Linux: apt-get install darkice
```

**Configuration:**
Create `darkice-english.cfg`:
```ini
[general]
duration        = 0
bufferSecs      = 5
reconnect       = yes

[input]
device          = /dev/dsp
sampleRate      = 44100
bitsPerSample   = 16
channel         = 1

[icecast2-0]
bitrateMode     = cbr
format          = mp3
bitrate         = 128
server          = localhost
port            = 8000
password        = your-source-password
mountPoint      = english
name            = English Interpretation
description     = English language stream
genre           = Speech
public          = no
```

---

---

## Step 4: FFmpeg Direct Streaming (Recommended)

FFmpeg direct streaming is now the **recommended primary option** since it works reliably with DVS on Windows without requiring WSL or additional tools.

### Option A: Single Stream Testing (stream.bat)

**Perfect for learning, testing, and single-language setups.**

The included `stream.bat` file demonstrates the basic concept with a single stream. This is ideal for:
- **Understanding the pipeline** before setting up multiple streams
- **Testing your DVS configuration** with a working audio device
- **Single-language events** or simple setups
- **Troubleshooting** audio device issues

**How to use stream.bat:**

1. **Edit the batch file** to configure your settings:
   ```batch
   :: Edit these variables at the top of stream.bat
   set "AUDIO_DEVICE=DVS Receive 1-2 (Dante Virtual Soundcard)"
   set "ICECAST_PASSWORD=your-source-password"
   set "STREAM_NAME=english"
   ```

2. **Test with a working device first**:
   ```batch
   :: For testing, use a known working microphone
   set "AUDIO_DEVICE=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)"
   ```

3. **Run the batch file**:
   - Double-click `stream.bat`
   - Check the console output for any errors
   - Visit `http://your-computer-ip:8000/english` to test the stream

4. **Switch to DVS when ready**:
   ```batch
   :: Once testing works, switch to your DVS device
   set "AUDIO_DEVICE=DVS Receive 1-2 (Dante Virtual Soundcard)"
   ```

### Option B: Multi-Stream Production (start_dvs_streams.bat)

**For production use with multiple languages.**

The `start_dvs_streams.bat` file handles 4 simultaneous streams with smart IP detection and variable-based configuration.

**Features:**
- **Auto-detects LAN IP** (192.168.x.x) for network access
- **Manual IP override** for different network configurations
- **Variable-based configuration** - edit settings at the top
- **Professional output** with progress indicators
- **All 4 languages** start automatically

**Configuration:**

1. **Edit the variables** at the top of `start_dvs_streams.bat`:
   ```batch
   :: === ICECAST SERVER SETTINGS ===
   :: Manual IP override - set this if auto-detection doesn't work
   set "MANUAL_IP="
   :: set "MANUAL_IP=192.168.1.100"

   set "ICECAST_PORT=8000"
   set "ICECAST_USER=source"
   set "ICECAST_PASSWORD=your-source-password"

   :: === DVS AUDIO DEVICES ===
   set "ENGLISH_DEVICE=DVS Receive  5-6 (Dante Virtual Soundcard)"
   set "FRENCH_DEVICE=DVS Receive  7-8 (Dante Virtual Soundcard)"
   set "PORTUGUESE_DEVICE=DVS Receive  9-10 (Dante Virtual Soundcard)"
   set "ARABIC_DEVICE=DVS Receive 11-12 (Dante Virtual Soundcard)"
   ```

2. **Update device names** with your exact DVS device names:
   - Run: `ffmpeg -list_devices true -f dshow -i dummy`
   - Copy the exact device names (including spaces)
   - Note the **double space** in "DVS Receive  5-6" - this is important

3. **Set your Icecast password**:
   - Replace `your-source-password` with your actual Icecast source password

4. **Run the multi-stream setup**:
   - Double-click `start_dvs_streams.bat`
   - Review the configuration display
   - Press Enter to start all 4 streams
   - Check the displayed URLs to verify streams

**Stream URLs will be:**
- English: `http://192.168.1.xxx:8000/english`
- French: `http://192.168.1.xxx:8000/french`
- Portuguese: `http://192.168.1.xxx:8000/portuguese`
- Arabic: `http://192.168.1.xxx:8000/arabic`

**Benefits of Variable-Based Approach:**
- **Easy device switching** for testing different audio sources
- **Quick password updates** in one location
- **Consistent settings** across all streams
- **Troubleshooting friendly** - switch to working microphone for testing

---

## Step 5: Alternative Streaming Options

If FFmpeg direct streaming doesn't work for your setup, try these alternatives in order:

## Recommended Setup Order

### ✅ **Proven & Tested (Real-World)**
1. **FFmpeg Direct (Windows)** - ✅ **TESTED & WORKING** ⭐ **HIGHLY RECOMMENDED**
   - **Steps 1-7**: Confirmed working with live audio streaming
   - **Option A & B**: Both single and multi-stream approaches tested
   - **Production Ready**: Use `stream.bat` and `start_dvs_streams.bat`

### ⚠️ **Alternative Options (Use Only If Needed)**
2. **Ezstream + FFmpeg (WSL)** - ⚠️ **Known setup complexity** - avoid initially
3. **VLC** - Quick to test, likely already installed, but limited features
4. **OBS** - If you need GUI and are familiar with streaming software
5. **GStreamer** - For advanced users who need custom pipelines
6. **BUTT** - Multiple instances required, GUI-based fallback only

### 🎯 **Production Deployment Recommendation**
- **Start with Steps 1-7** (confirmed working)
- **Use Option A for testing**, then **Option B for production**
- **Save time** by skipping Ezstream setup initially
- **Focus resources** on what's proven to work reliably

## Troubleshooting All Options

### Common Issues:

1. **Audio Device Names**
   - Check Windows Sound settings for exact DVS device names
   - Device names may include extra characters or spaces

2. **Icecast Connection**
   - Verify Icecast is running: `http://localhost:8000/`
   - Check source password matches in all configurations
   - Ensure mount points are unique for each stream

3. **Audio Quality**
   - Test with different bitrates: 64k, 128k, 192k
   - Verify sample rates match (44100 Hz recommended)
   - Check mono vs stereo settings

4. **Performance**
   - Monitor CPU usage with multiple streams
   - Consider reducing bitrate or sample rate if needed
   - Close unnecessary applications during streaming

---

## Step 4: Web Interface

### 4.1 Create Client Interface

Use the same HTML interface from the standard LANStreamer guide, updating the stream URLs:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LANStreamer - Language Selection</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .language-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        .language-btn {
            padding: 15px 20px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #007bff;
            color: white;
        }
        .language-btn:hover {
            background: #0056b3;
            transform: translateY(-2px);
        }
        .language-btn.active {
            background: #28a745;
        }
        .audio-controls {
            text-align: center;
            margin-top: 20px;
        }
        audio {
            width: 100%;
            margin-top: 15px;
        }
        .status {
            text-align: center;
            margin-top: 15px;
            padding: 10px;
            border-radius: 5px;
            background: #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎧 LANStreamer - Select Your Language</h1>
        
        <div class="language-buttons">
            <button class="language-btn" onclick="selectLanguage('english')">
                🇺🇸 English
            </button>
            <button class="language-btn" onclick="selectLanguage('french')">
                🇫🇷 Français
            </button>
            <button class="language-btn" onclick="selectLanguage('portuguese')">
                🇵🇹 Português
            </button>
            <button class="language-btn" onclick="selectLanguage('arabic')">
                🇸🇦 العربية
            </button>
        </div>
        
        <div class="audio-controls">
            <audio id="audioPlayer" controls style="display: none;">
                Your browser does not support the audio element.
            </audio>
            <div id="status" class="status">
                Please select a language to begin listening
            </div>
        </div>
    </div>

    <script>
        const baseUrl = 'http://localhost:8000'; // Change to your computer's IP for network access
        const audioPlayer = document.getElementById('audioPlayer');
        const statusDiv = document.getElementById('status');
        
        function selectLanguage(language) {
            // Remove active class from all buttons
            document.querySelectorAll('.language-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to selected button
            event.target.classList.add('active');
            
            // Set audio source
            const streamUrl = `${baseUrl}/${language}`;
            audioPlayer.src = streamUrl;
            audioPlayer.style.display = 'block';
            
            // Update status
            statusDiv.textContent = `Now playing: ${language.charAt(0).toUpperCase() + language.slice(1)} interpretation`;
            
            // Auto-play (may require user interaction in some browsers)
            audioPlayer.play().catch(e => {
                statusDiv.textContent = `${language.charAt(0).toUpperCase() + language.slice(1)} stream ready - Click play to listen`;
            });
        }
        
        // Handle audio events
        audioPlayer.addEventListener('loadstart', () => {
            statusDiv.textContent = 'Loading stream...';
        });
        
        audioPlayer.addEventListener('canplay', () => {
            statusDiv.textContent = 'Stream ready - Click play to listen';
        });
        
        audioPlayer.addEventListener('playing', () => {
            statusDiv.textContent = 'Now streaming live audio';
        });
        
        audioPlayer.addEventListener('error', () => {
            statusDiv.textContent = 'Error loading stream. Please check connection.';
        });
    </script>
</body>
</html>
```

### 4.2 Deployment

1. **Save as HTML File**
   - Save the code as `index.html`
   - Place in Icecast web directory or serve via separate web server

2. **Network Access**
   - Replace `localhost` with your computer's IP address for network access
   - Example: `http://192.168.1.100:8000`

---

## Step 5: Testing and Deployment

### 5.1 System Startup Sequence

**Critical Order:**
1. Start Dante Virtual Soundcard
2. Start Dante Via and verify audio routing
3. Start Icecast server
4. Launch all BUTT instances and begin streaming
5. Test web interface

### 5.2 Verification Checklist

- [ ] DVS and Dante Via show active audio routing
- [ ] All interpreter microphones are working and routed correctly
- [ ] Icecast status page shows 4 active mountpoints
- [ ] Each BUTT instance shows "Connected" status
- [ ] Web interface loads and plays each stream
- [ ] Audio quality is clear with acceptable latency
- [ ] Network access works from other devices

### 5.3 Network Configuration

1. **Find Computer's IP Address**
   - Windows: `ipconfig`
   - macOS: `ifconfig`

2. **Update Web Interface**
   - Replace `localhost` with your IP in the HTML file
   - Test access from other devices on the network

3. **Firewall Configuration**
   - Ensure port 8000 is open for Icecast
   - Configure Windows Firewall or macOS firewall as needed

---

## Step 6: Troubleshooting Guide

### 6.1 DVS-Specific Issues

**DVS Not Showing Audio Devices:**
- Verify license activation in DVS application
- Restart DVS application and check "Start" button is pressed
- Check Windows Sound settings (Control Panel → Sound)
- Ensure Dante mixer is on same network and visible in Dante Controller
- Verify DVS receive channel count is set correctly

**Dante Controller Routing Problems:**
- Verify both Dante mixer and DVS appear in routing matrix
- Check network connectivity between devices
- Restart Dante Controller application
- Verify clock synchronization (DVS should sync to mixer)
- Check for Dante network conflicts or duplicate device names

**Audio Dropouts or Latency:**
- Check network switch quality and configuration
- Verify Dante network is on dedicated VLAN if possible
- Adjust buffer sizes in DVS settings
- Monitor network traffic and bandwidth usage
- Ensure no other Dante applications (like Dante Via) are running simultaneously

### 6.2 BUTT Streaming Issues

**BUTT Won't Connect to Icecast:**
- Verify Icecast is running
- Check source password matches icecast.xml
- Confirm mountpoint names are unique
- Test with single BUTT instance first

**No Audio in BUTT:**
- Verify Dante Via routing is active
- Check audio input device selection in BUTT
- Test with system audio playback first
- Monitor audio levels in Dante Via

**Multiple BUTT Instances Conflict:**
- Use different installation directories
- Try portable versions of BUTT
- Consider virtual machine approach
- Check for audio device conflicts

### 6.3 Performance Optimization

**For Professional Deployment:**
- Use dedicated Dante network switch
- Configure QoS for audio traffic
- Monitor network latency and jitter
- Implement redundant network paths

**For Better Audio Quality:**
- Increase BUTT bitrate to 192k or 256k
- Use higher sample rates if supported
- Consider AAC encoding for better compression
- Monitor CPU usage on streaming computer

---

## Summary

This DVS-based LANStreamer setup provides a professional-grade alternative to the FFmpeg approach, particularly suitable for environments already using Dante audio networking. 

### ✅ **Real-World Implementation Success**
This guide has been **successfully implemented and tested** in a live environment:
- **Steps 1-7**: All confirmed working with actual DVS hardware
- **Live Audio Streaming**: Successfully streaming audio through FFmpeg to Icecast
- **Production Ready**: The FFmpeg direct approach (Options A & B) is production-ready
- **Time Efficient**: Focus on proven methods saves implementation time

While it requires commercial software licenses, it offers:

### Key Benefits
- **Professional Audio Routing**: Dante's industry-standard networking
- **Scalability**: Easy to add more languages or audio sources
- **Reliability**: Enterprise-grade audio infrastructure
- **Integration**: Works with existing Dante equipment

### Considerations
- **Cost**: Requires Dante software licenses
- **Complexity**: More components than FFmpeg solution
- **Network Requirements**: Needs proper Dante network configuration
- **Learning Curve**: Requires familiarity with Dante ecosystem

### When to Use This Approach
- Existing Dante infrastructure in venue
- Professional audio requirements
- Need for advanced audio routing capabilities
- Budget allows for commercial software licenses

This system provides broadcast-quality audio streaming with the reliability and features expected in professional environments.

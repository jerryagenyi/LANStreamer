# LANStreamer Manual Setup Guide (XR18 Edition)

A comprehensive step-by-step solution for setting up your multi-language audio streaming system using the Behringer XR18 (or Focusrite Scarlett 18i20), FFmpeg, Icecast, and a web interface.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Hardware Setup](#step-1-hardware-setup)
4. [Step 2: Configure XR18 Mixer](#step-2-configure-xr18-mixer)
5. [Step 3: Software Installation](#step-3-software-installation)
6. [Step 4: Install and Configure FFmpeg](#step-4-install-and-configure-ffmpeg)
7. [Step 5: FFmpeg Streaming (Recommended)](#step-5-ffmpeg-streaming-recommended)
   - [Single Stream Testing](#single-stream-testing)
   - [Multi-Stream Production](#multi-stream-production)
8. [Step 6: Create Web Interface](#step-6-create-web-interface)
9. [Step 7: Testing and Troubleshooting](#step-7-testing-and-troubleshooting)
10. [Step 8: Production Deployment](#step-8-production-deployment)
11. [Conclusion](#conclusion)

## Overview

This guide will help you create a professional audio streaming system for conferences, meetings, or events requiring multiple language channels. The system consists of:

- **Behringer XR18**: Multi-channel USB audio interface
- **Icecast**: Streaming server for audio distribution
- **FFmpeg**: Audio encoding and streaming software
- **Web Interface**: Simple webpage for users to select language streams

> 📖 **Understanding the concept**: For architecture and audio flow, see the main project [docs](../docs/README.md) and [README](../README.md).

### System Architecture
```
[Microphones] → [XR18 Mixer] → [Computer] → [Icecast Server] → [Web Clients]
     ↓              ↓             ↓            ↓              ↓
  4 Languages   USB Audio    FFmpeg Encoding  Stream Distribution  User Selection
```

The XR18 connects to your network router via Ethernet and sends multi-channel audio to a computer via USB. The computer runs Icecast (streaming server) and FFmpeg (audio encoder) to create separate streams for each language, accessible through a web interface.

## Prerequisites

### Hardware Requirements
- Behringer XR18 digital mixer
- Network router with available Ethernet ports
- Computer (Windows/macOS/Linux) with USB port
- 4 microphones for interpreters
- Ethernet cables
- USB cable (usually included with XR18)

### Software Requirements
- Behringer XR18 USB drivers
- X AIR EDIT software (Behringer's control app)
- Icecast streaming server
- FFmpeg audio processing software
- Web browser for testing

---

## Step 1: Hardware Setup

### 1.1 Network Connection
1. **Power on the XR18**: Connect the power adapter and turn on the mixer
2. **Connect to Network**: Use an Ethernet cable to connect the XR18's **Ethernet port** to a **LAN port** on your router
3. **Connect Computer**: Connect your computer to the same router (Ethernet recommended for stability, Wi-Fi acceptable)
4. **Verify Network**: Both devices should be on the same network subnet (e.g., 192.168.1.x)

### 1.2 Audio Setup
1. **Connect Microphones**: Plug interpreter microphones into XR18 inputs 1-4
2. **USB Connection**: Connect the XR18 to your computer using the provided USB cable
3. **Power Sequence**: Always power on the XR18 before connecting USB to avoid driver issues

### 1.3 Install XR18 Drivers and Software

#### Windows Installation
1. **Download Drivers**
   - Visit [Behringer's support page](https://www.behringer.com/product.html?modelCode=P0BI8)
   - Download the latest XR18 USB drivers for Windows
   - Install the drivers and restart your computer

2. **Install X AIR EDIT**
   - Download X AIR EDIT software from Behringer's website
   - Install the application for mixer control

3. **Verify USB Connection**
   - Open Windows Sound settings (Control Panel → Sound)
   - Look for "XR18" or "Behringer XR18" in both Playback and Recording devices
   - If not visible, check USB connection and driver installation

#### macOS Installation
1. **Install X AIR EDIT**
   - Download X AIR EDIT for macOS from Behringer's website
   - Install the application

2. **Verify USB Connection**
   - Open Audio MIDI Setup (Applications → Utilities)
   - Look for "XR18" in the audio devices list
   - The XR18 should appear as both input and output device

#### Linux Installation
1. **Check USB Recognition**
   ```bash
   lsusb | grep -i behringer
   ```
   - You should see the XR18 listed

2. **Install ALSA Utils** (if not already installed)
   ```bash
   sudo apt update
   sudo apt install alsa-utils
   ```

3. **Verify Audio Devices**
   ```bash
   arecord -l
   aplay -l
   ```
   - Look for XR18 in the device list

---

## Step 2: Configure XR18 Mixer

### 2.1 Network Discovery
1. **Launch X AIR EDIT**
   - Open the X AIR EDIT application
   - The software should automatically discover your XR18 on the network
   - If not found, check network connections and ensure both devices are on the same subnet

2. **Connect to Mixer**
   - Click on your XR18 device in the discovery list
   - The mixer interface should load, showing all channels and controls

### 2.2 Audio Routing Setup
1. **Channel Assignment**
   - **Channel 1**: English interpreter microphone
   - **Channel 2**: French interpreter microphone  
   - **Channel 3**: Portuguese interpreter microphone
   - **Channel 4**: Arabic interpreter microphone

2. **USB Routing Configuration**
   - Go to the **Routing** tab in X AIR EDIT
   - Set **USB Send 1-2**: Channel 1 (English) - Stereo pair or mono to both L/R
   - Set **USB Send 3-4**: Channel 2 (French) - Stereo pair or mono to both L/R
   - Set **USB Send 5-6**: Channel 3 (Portuguese) - Stereo pair or mono to both L/R
   - Set **USB Send 7-8**: Channel 4 (Arabic) - Stereo pair or mono to both L/R

3. **Gain and Level Adjustment**
   - Adjust input gain for each microphone channel
   - Ensure levels are appropriate (avoid clipping, maintain good signal-to-noise ratio)
   - Test each microphone and verify audio is reaching the computer via USB

### 2.3 Save Configuration
1. **Save Scene**
   - In X AIR EDIT, go to **Scenes** tab
   - Save your current configuration as "LANStreamer Setup"
   - This allows you to quickly recall settings for future events

---

## Step 3: Software Installation

### 3.1 Install Icecast

#### Windows Installation
1. **Download Icecast**
   - Visit [icecast.org](https://icecast.org/download/)
   - Download the Windows installer
   - Run the installer with administrator privileges

2. **Configuration Location**
   - Default config file: `C:\Program Files\Icecast2\etc\icecast.xml`
   - Default web interface: `http://localhost:8000/`

#### macOS Installation
```bash
# Using Homebrew (recommended)
brew install icecast

# Configuration file location
/usr/local/etc/icecast.xml
```

#### Linux Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install icecast2

# During installation, you'll be prompted to configure:
# - Hostname: localhost
# - Source password: (choose a secure password)
# - Relay password: (choose a secure password)  
# - Administration password: (choose a secure password)

# Configuration file location
/etc/icecast2/icecast.xml
```

### 3.2 Configure Icecast

**Note:** If you start Icecast from the **LANStreamer web app**, it uses port **8200** and source password **hackme** by default. The examples below use port 8000 and placeholder passwords for a standalone Icecast install.

Edit the Icecast configuration file (`icecast.xml`):

```xml
<icecast>
    <location>Your Location</location>
    <admin>admin@yourserver.com</admin>
    
    <limits>
        <clients>100</clients>
        <sources>10</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>

    <authentication>
        <source-password>your-source-password</source-password>
        <relay-password>your-relay-password</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>your-admin-password</admin-password>
    </authentication>

    <hostname>localhost</hostname>
    <listen-socket>
        <port>8000</port>
    </listen-socket>

    <mount type="normal">
        <mount-name>/english</mount-name>
        <username>source</username>
        <password>your-source-password</password>
        <max-listeners>50</max-listeners>
        <dump-file>/tmp/dump-english.mp3</dump-file>
        <burst-size>65536</burst-size>
        <fallback-mount>/silence.mp3</fallback-mount>
        <fallback-override>1</fallback-override>
        <fallback-when-full>1</fallback-when-full>
        <intro>/path/to/english-intro.mp3</intro>
        <hidden>0</hidden>
        <public>0</public>
        <stream-name>English Interpretation</stream-name>
        <stream-description>Live English interpretation stream</stream-description>
        <stream-url>http://yourserver.com</stream-url>
        <genre>Speech</genre>
        <bitrate>128</bitrate>
        <mp3-metadata-interval>8192</mp3-metadata-interval>
    </mount>

    <mount type="normal">
        <mount-name>/french</mount-name>
        <username>source</username>
        <password>your-source-password</password>
        <max-listeners>50</max-listeners>
        <stream-name>French Interpretation</stream-name>
        <stream-description>Live French interpretation stream</stream-description>
        <genre>Speech</genre>
        <bitrate>128</bitrate>
    </mount>

    <mount type="normal">
        <mount-name>/portuguese</mount-name>
        <username>source</username>
        <password>your-source-password</password>
        <max-listeners>50</max-listeners>
        <stream-name>Portuguese Interpretation</stream-name>
        <stream-description>Live Portuguese interpretation stream</stream-description>
        <genre>Speech</genre>
        <bitrate>128</bitrate>
    </mount>

    <mount type="normal">
        <mount-name>/arabic</mount-name>
        <username>source</username>
        <password>your-source-password</password>
        <max-listeners>50</max-listeners>
        <stream-name>Arabic Interpretation</stream-name>
        <stream-description>Live Arabic interpretation stream</stream-description>
        <genre>Speech</genre>
        <bitrate>128</bitrate>
    </mount>

    <fileserve>1</fileserve>
    <paths>
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" destination="/status.xsl"/>
    </paths>

    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>
</icecast>
```

**Important**: Replace `your-source-password`, `your-relay-password`, and `your-admin-password` with secure passwords.

### 3.3 Start Icecast

#### Windows
- Start → Programs → Icecast → Start Icecast
- Or run from command line: `"C:\Program Files\Icecast2\bin\icecast.exe" -c "C:\Program Files\Icecast2\etc\icecast.xml"`

#### macOS/Linux
```bash
# Start Icecast
sudo icecast2 -c /path/to/icecast.xml

# Or as a service (Linux)
sudo systemctl start icecast2
sudo systemctl enable icecast2  # Start automatically on boot
```

### 3.4 Verify Icecast Installation
1. **Open Web Browser**
   - Navigate to `http://localhost:8000/`
   - You should see the Icecast status page
   - No streams will be listed yet (that's normal)

2. **Check Admin Interface**
   - Navigate to `http://localhost:8000/admin/`
   - Login with admin credentials from your config file
   - Verify that mount points are configured correctly

---

## Step 4: Install and Configure FFmpeg

### 4.1 Install FFmpeg

#### Windows Installation

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

#### macOS Installation
```bash
# Using Homebrew (recommended)
brew install ffmpeg

# Verify installation
ffmpeg -version
```

#### Linux Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL/Fedora
sudo yum install ffmpeg
# or
sudo dnf install ffmpeg

# Verify installation
ffmpeg -version
```

### 4.2 Test Audio Input Detection

Before creating streams, verify that FFmpeg can detect your XR18:

#### Windows
```cmd
ffmpeg -list_devices true -f dshow -i dummy
```
Look for "XR18" or "Behringer" in the audio devices list.

#### macOS
```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

#### Linux
```bash
ffmpeg -f alsa -list_devices true -i dummy
# or
arecord -l
```

### 4.3 Create Streaming Scripts

#### Windows Batch Script

Create `start_streams.bat`:

```batch
@echo off
echo Starting LANStreamer audio streams...
echo Make sure Icecast is running first!
pause

REM English Stream (USB channels 1-2)
start "English Stream" /min ffmpeg -f dshow -i audio="XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c0+0.5*c1[english]" -map "[english]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "English" -ice_description "English interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/english

REM French Stream (USB channels 3-4)  
start "French Stream" /min ffmpeg -f dshow -i audio="XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c2+0.5*c3[french]" -map "[french]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "French" -ice_description "French interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/french

REM Portuguese Stream (USB channels 5-6)
start "Portuguese Stream" /min ffmpeg -f dshow -i audio="XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c4+0.5*c5[portuguese]" -map "[portuguese]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "Portuguese" -ice_description "Portuguese interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/portuguese

REM Arabic Stream (USB channels 7-8)
start "Arabic Stream" /min ffmpeg -f dshow -i audio="XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c6+0.5*c7[arabic]" -map "[arabic]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "Arabic" -ice_description "Arabic interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/arabic

echo All streams started!
echo Check http://localhost:8000/ to verify streams are running
pause
```

**Important**: Replace `your-source-password` with the actual password from your Icecast configuration.

### 4.4 Using Variables for Easy Configuration (Recommended Approach)

**💡 Pro Tip**: Use variables to make your scripts easier to maintain and troubleshoot. See the included `stream.bat` file for an example of this approach.

**Benefits of Variable-Based Scripts:**
- Easy to change audio devices without rewriting commands
- Quick testing with different audio sources
- Consistent configuration across multiple streams
- Easier troubleshooting and debugging

**Example Variable-Based Script:**
```batch
@echo off
:: === CONFIGURATION VARIABLES ===
set "AUDIO_DEVICE=XR18"
set "ICECAST_PASSWORD=your-source-password"
set "ICECAST_HOST=localhost"
set "ICECAST_PORT=8000"

:: English Stream using variables
start "English Stream" /min ffmpeg -f dshow -i audio="%AUDIO_DEVICE%" ^
-filter_complex "[0:0]pan=mono|c0=0.5*c0+0.5*c1[english]" ^
-map "[english]" -acodec libmp3lame -b:a 128k -ar 44100 ^
-content_type audio/mpeg -ice_name "English" ^
-f mp3 icecast://source:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/english
```

**Key Advantages:**
- **Easy Device Testing**: Change `AUDIO_DEVICE` to test with different audio sources
- **Quick Password Updates**: Update `ICECAST_PASSWORD` in one place
- **Consistent Settings**: All streams use the same connection parameters
- **Troubleshooting**: Easily switch to a working microphone for testing

#### macOS/Linux Shell Script

Create `start_streams.sh`:

```bash
#!/bin/bash
echo "Starting LANStreamer audio streams..."
echo "Make sure Icecast is running first!"
read -p "Press Enter to continue..."

# English Stream (USB channels 1-2)
ffmpeg -f avfoundation -i ":XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c0+0.5*c1[english]" -map "[english]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "English" -ice_description "English interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/english &

# French Stream (USB channels 3-4)
ffmpeg -f avfoundation -i ":XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c2+0.5*c3[french]" -map "[french]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "French" -ice_description "French interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/french &

# Portuguese Stream (USB channels 5-6)
ffmpeg -f avfoundation -i ":XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c4+0.5*c5[portuguese]" -map "[portuguese]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "Portuguese" -ice_description "Portuguese interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/portuguese &

# Arabic Stream (USB channels 7-8)
ffmpeg -f avfoundation -i ":XR18" -filter_complex "[0:0]pan=mono|c0=0.5*c6+0.5*c7[arabic]" -map "[arabic]" -acodec libmp3lame -b:a 128k -ar 44100 -content_type audio/mpeg -ice_name "Arabic" -ice_description "Arabic interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/arabic &

echo "All streams started!"
echo "Check http://localhost:8000/ to verify streams are running"
echo "Press Ctrl+C to stop all streams"
wait
```

Make it executable:
```bash
chmod +x start_streams.sh
```

---

## Step 5: FFmpeg Streaming (Recommended)

FFmpeg direct streaming is the **recommended approach** for XR18 setups, providing professional-quality audio streaming with reliable performance.

### Single Stream Testing

**Perfect for learning, testing, and single-language setups.**

The included `stream.bat` file demonstrates the basic concept with a single stream. This is ideal for:
- **Understanding the pipeline** before setting up multiple streams
- **Testing your XR18 configuration** with a working audio device
- **Single-language events** or simple setups
- **Troubleshooting** audio device issues

**How to use stream.bat:**

1. **Edit the batch file** to configure your settings:
   ```batch
   :: Edit these variables at the top of stream.bat
   set "AUDIO_DEVICE=XR18"
   set "ICECAST_PASSWORD=your-source-password"
   set "STREAM_NAME=english"
   ```

2. **Test with XR18 device**:
   ```batch
   :: Use your XR18 device name from device detection
   set "AUDIO_DEVICE=XR18"
   ```

3. **Run the batch file**:
   - Double-click `stream.bat`
   - Check the console output for any errors
   - Visit `http://your-computer-ip:8000/english` to test the stream

### Multi-Stream Production

For production use with multiple languages, you can create a multi-stream batch file similar to the DVS version:

**Create `start_xr18_streams.bat`:**

```batch
@echo off
setlocal enabledelayedexpansion

:: === XR18 Multi-Stream Configuration ===
set "ICECAST_HOST=localhost"
set "ICECAST_PORT=8000"
set "ICECAST_USER=source"
set "ICECAST_PASSWORD=your-source-password"

:: === XR18 AUDIO DEVICE ===
set "XR18_DEVICE=XR18"

echo Starting XR18 multi-language streams...
echo Make sure Icecast is running first!
pause

:: English Stream (XR18 USB channels 1-2)
start "English Stream" /min ffmpeg -f dshow -i audio="%XR18_DEVICE%" ^
-filter_complex "[0:0]pan=mono|c0=0.5*c0+0.5*c1[english]" ^
-map "[english]" -acodec libmp3lame -b:a 128k -ar 44100 ^
-content_type audio/mpeg -ice_name "English" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/english

:: French Stream (XR18 USB channels 3-4)
start "French Stream" /min ffmpeg -f dshow -i audio="%XR18_DEVICE%" ^
-filter_complex "[0:0]pan=mono|c0=0.5*c2+0.5*c3[french]" ^
-map "[french]" -acodec libmp3lame -b:a 128k -ar 44100 ^
-content_type audio/mpeg -ice_name "French" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/french

:: Portuguese Stream (XR18 USB channels 5-6)
start "Portuguese Stream" /min ffmpeg -f dshow -i audio="%XR18_DEVICE%" ^
-filter_complex "[0:0]pan=mono|c0=0.5*c4+0.5*c5[portuguese]" ^
-map "[portuguese]" -acodec libmp3lame -b:a 128k -ar 44100 ^
-content_type audio/mpeg -ice_name "Portuguese" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/portuguese

:: Arabic Stream (XR18 USB channels 7-8)
start "Arabic Stream" /min ffmpeg -f dshow -i audio="%XR18_DEVICE%" ^
-filter_complex "[0:0]pan=mono|c0=0.5*c6+0.5*c7[arabic]" ^
-map "[arabic]" -acodec libmp3lame -b:a 128k -ar 44100 ^
-content_type audio/mpeg -ice_name "Arabic" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/arabic

echo All streams started!
echo Check http://%ICECAST_HOST%:%ICECAST_PORT%/ to verify streams
pause
```

**Key Features:**
- **Variable-based configuration** - easy to modify
- **Channel mapping** - uses XR18's USB channel routing
- **Professional audio processing** - proper filtering and encoding
- **Multiple simultaneous streams** - all 4 languages at once

---

## Step 6: Create Web Interface

### 6.1 Create HTML Interface

Create `index.html`:

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
        .language-button {
            display: block;
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            font-size: 18px;
            transition: background-color 0.3s;
        }
        .language-button:hover {
            background-color: #0056b3;
        }
        .status {
            text-align: center;
            margin-top: 20px;
            padding: 10px;
            background-color: #e9ecef;
            border-radius: 5px;
        }
        .instructions {
            margin-top: 20px;
            padding: 15px;
            background-color: #fff3cd;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎧 LANStreamer</h1>
        <h2 style="text-align: center; color: #666;">Select Your Language</h2>
        
        <a href="http://localhost:8000/english" class="language-button">
            🇺🇸 English
        </a>
        
        <a href="http://localhost:8000/french" class="language-button">
            🇫🇷 Français (French)
        </a>
        
        <a href="http://localhost:8000/portuguese" class="language-button">
            🇵🇹 Português (Portuguese)
        </a>
        
        <a href="http://localhost:8000/arabic" class="language-button">
            🇸🇦 العربية (Arabic)
        </a>
        
        <div class="status">
            <p><strong>Status:</strong> <span id="status">Checking streams...</span></p>
        </div>
        
        <div class="instructions">
            <h3>Instructions:</h3>
            <ul>
                <li>Click on your preferred language above</li>
                <li>Your browser will start playing the audio stream</li>
                <li>Adjust volume using your device controls</li>
                <li>If audio doesn't start, try refreshing the page</li>
            </ul>
        </div>
    </div>

    <script>
        // Simple status check
        function checkStatus() {
            fetch('http://localhost:8000/status-json.xsl')
                .then(response => response.json())
                .then(data => {
                    const activeStreams = data.icestats.source ? data.icestats.source.length : 0;
                    document.getElementById('status').textContent = `${activeStreams} streams active`;
                })
                .catch(error => {
                    document.getElementById('status').textContent = 'Server offline';
                });
        }
        
        // Check status on page load
        checkStatus();
        
        // Check status every 30 seconds
        setInterval(checkStatus, 30000);
    </script>
</body>
</html>
```

### 6.2 Host the Web Interface

#### Option 1: Simple HTTP Server (Python)
```bash
# Navigate to the directory containing index.html
cd /path/to/your/html/files

# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

Access at: `http://localhost:8080`

#### Option 2: Use Icecast's Built-in Web Server
1. Copy `index.html` to Icecast's web directory:
   - **Windows**: `C:\Program Files\Icecast2\web\`
   - **Linux**: `/usr/share/icecast2/web/`
   - **macOS**: `/usr/local/share/icecast/web/`

2. Access at: `http://localhost:8000/index.html`

---

## Step 7: Testing and Troubleshooting

### 7.1 System Testing

1. **Start Services in Order**
   - Power on XR18 and connect all cables
   - Start Icecast server
   - Run your streaming script (start_streams.bat or start_streams.sh)
   - Open the web interface

2. **Test Each Language Stream**
   - Have interpreters speak into each microphone
   - Click each language button in the web interface
   - Verify audio is clear and corresponds to the correct language
   - Check that volume levels are appropriate

3. **Load Testing**
   - Open multiple browser tabs/windows
   - Test with multiple devices on the network
   - Monitor system performance and audio quality

### 7.2 Common Issues and Solutions

#### No Audio in Streams
- **Check XR18 USB connection**: Verify the mixer appears in system audio devices
- **Verify routing**: Ensure X AIR EDIT routing sends correct channels to USB
- **Test microphone levels**: Check that interpreters' mics have adequate gain
- **FFmpeg device detection**: Run device detection commands to verify XR18 is recognized

#### Streams Not Appearing in Icecast
- **Check Icecast status**: Visit `http://localhost:8000/` to see if server is running
- **Verify passwords**: Ensure source password in scripts matches Icecast config
- **Check mount points**: Confirm mount points are configured in icecast.xml
- **Firewall issues**: Ensure port 8000 is not blocked

#### Poor Audio Quality
- **Adjust bitrate**: Increase from 128k to 192k or 256k in FFmpeg commands
- **Check input levels**: Ensure microphones aren't clipping or too quiet
- **Network bandwidth**: Verify network can handle multiple streams
- **USB audio quality**: Check XR18 sample rate settings (48kHz recommended)

#### Web Interface Issues
- **CORS errors**: Use proper HTTP server instead of opening HTML file directly
- **Stream URLs**: Verify URLs in HTML match your Icecast configuration
- **Browser compatibility**: Test with different browsers (Chrome, Firefox, Safari)

### 7.3 Performance Optimization

#### System Resources
- **CPU usage**: Monitor FFmpeg processes, consider reducing bitrate if CPU usage is high
- **Memory usage**: Each stream uses additional RAM, ensure adequate system memory
- **Network bandwidth**: Calculate total bandwidth: (bitrate × number of streams × number of listeners)

#### Audio Optimization
- **Latency**: For real-time interpretation, minimize buffer sizes in FFmpeg
- **Quality vs. Bandwidth**: Balance audio quality with available network bandwidth
- **Backup streams**: Consider lower-quality backup streams for poor network conditions

---

## Step 8: Production Deployment

### 8.1 Network Configuration

#### For Local Network Use
- Ensure all client devices are on the same network as the streaming computer
- Configure router to allow multicast traffic if needed
- Set up dedicated VLAN for audio streaming if possible

#### For Internet Streaming
- Configure port forwarding on router (port 8000 for Icecast)
- Consider using a reverse proxy (nginx) for better security
- Set up SSL/TLS certificates for HTTPS streaming
- Update HTML interface URLs to use your public IP or domain name

### 8.2 Security Considerations

1. **Change Default Passwords**
   - Update all Icecast passwords from defaults
   - Use strong, unique passwords for source, relay, and admin accounts

2. **Network Security**
   - Disable unnecessary Icecast features (admin interface if not needed)
   - Use firewall rules to restrict access to streaming ports
   - Consider VPN access for remote administration

3. **Access Control**
   - Implement authentication for stream access if needed
   - Use IP whitelisting for administrative access
   - Monitor access logs for suspicious activity

### 8.3 Monitoring and Maintenance

#### System Monitoring
- Set up monitoring for Icecast server status
- Monitor system resources (CPU, memory, network)
- Create alerts for stream failures or high resource usage

#### Regular Maintenance
- Update software regularly (Icecast, FFmpeg, system updates)
- Test backup procedures and failover systems
- Review and rotate passwords periodically
- Clean up log files to prevent disk space issues

#### Backup and Recovery
- Document complete system configuration
- Create backup scripts for configuration files
- Test recovery procedures regularly
- Maintain spare hardware for critical components

---

## Conclusion

You now have a complete LANStreamer system that can provide real-time multi-language audio streaming for your events. The system is scalable and can be adapted for different numbers of languages or different audio hardware.

### Key Benefits
- **Professional Quality**: Uses industry-standard tools (XR18, Icecast, FFmpeg)
- **Scalable**: Easy to add more languages or handle more listeners
- **Cost-Effective**: Uses mostly free software with professional hardware
- **Reliable**: Proven technology stack used in broadcast environments
- **User-Friendly**: Simple web interface for end users

### Next Steps
- Customize the web interface with your organization's branding
- Set up monitoring and alerting for production use
- Consider implementing user analytics to track stream usage
- Explore advanced features like stream recording or multi-bitrate streaming

For support or questions about this setup, refer to the documentation for each component:
- [Behringer XR18 Manual](https://www.behringer.com/product.html?modelCode=P0BI8)
- [Icecast Documentation](https://icecast.org/docs/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

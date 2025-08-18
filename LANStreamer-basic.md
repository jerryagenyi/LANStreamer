# LANStreamer Manual Setup Guide

A comprehensive step-by-step solution for setting up your multi-language audio streaming system using the Behringer XR18 (or Focusrite Scarlett 18i20), FFmpeg, Icecast, and a web interface.

## Overview

This guide will help you create a professional audio streaming system for conferences, meetings, or events requiring multiple language channels. The system consists of:

- **Behringer XR18**: Multi-channel USB audio interface
- **Icecast**: Streaming server for audio distribution
- **FFmpeg**: Audio encoding and streaming software
- **Web Interface**: Simple webpage for users to select language streams

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
1. **Connect Microphones**: Plug interpreter microphones into XR18 inputs:
   - Input 1: English interpreter
   - Input 2: French interpreter
   - Input 3: Portuguese interpreter
   - Input 4: Arabic interpreter
2. **USB Connection**: Connect the XR18 to your computer using the USB cable
3. **Test Audio**: Speak into each microphone and verify input levels on the XR18

### 1.3 Driver Installation
1. **Download Drivers**: Visit [Behringer's website](https://www.behringer.com) and download XR18 USB drivers for your operating system
2. **Install Drivers**: Run the installer and restart your computer if required
3. **Verify Installation**: Check that the XR18 appears as an audio device in your system settings

---

## Step 2: XR18 Software Configuration

### 2.1 Install X AIR EDIT
1. **Download Software**: Get X AIR EDIT from Behringer's website or app store
2. **Install Application**: Run the installer and follow the setup wizard
3. **Launch Application**: Open X AIR EDIT after installation

### 2.2 Connect to Mixer
1. **Network Discovery**: X AIR EDIT should automatically detect the XR18 on your network
2. **Manual Connection**: If not detected automatically:
   - Click "Connect" or "Find Mixer"
   - Look for XR18 in the device list
   - Select and connect to the mixer
3. **Verify Connection**: You should see the mixer interface with all channels visible

### 2.3 Configure USB Routing
This is the critical step that routes each microphone to a separate USB channel for streaming:

1. **Navigate to Routing**: In X AIR EDIT, go to the **"In/Out"** or **"Routing"** section
2. **Access USB Sends**: Click on the **"USB Sends"** tab
3. **Configure Channel Routing**:
   - **USB Send 1** → **"Ch 1"** (English interpreter microphone)
   - **USB Send 2** → **"Ch 2"** (French interpreter microphone)
   - **USB Send 3** → **"Ch 3"** (Portuguese interpreter microphone)
   - **USB Send 4** → **"Ch 4"** (Arabic interpreter microphone)

4. **Verify Routing**: Each USB send should show the corresponding input channel
5. **Save Configuration**: Save this setup as a scene for future use

### 2.4 Audio Level Adjustment
1. **Set Input Gains**: Adjust the gain for each microphone channel to achieve proper levels
2. **Monitor Levels**: Watch the level meters to avoid clipping (red indicators)
3. **Test Each Channel**: Have interpreters speak into each microphone and verify audio routing

---

## Step 3: Software Installation and Configuration

### 3.1 Install Icecast Streaming Server

#### Windows Installation
1. **Download Icecast**: Visit [icecast.org](https://icecast.org/download/) and download the Windows installer
2. **Run Installer**: Execute the installer with administrator privileges
3. **Choose Installation Path**: Default location is `C:\Program Files\Icecast2\`
4. **Complete Installation**: Follow the setup wizard to completion

#### Configuration
1. **Locate Config File**: Find `icecast.xml` in the installation directory:
   - Windows: `C:\Program Files\Icecast2\etc\icecast.xml`
   - macOS: `/usr/local/etc/icecast.xml`
   - Linux: `/etc/icecast2/icecast.xml`

2. **Edit Configuration**: Open the file with a text editor (run as administrator on Windows)

3. **Update Security Settings**:
   ```xml
   <authentication>
       <source-password>your-secure-source-password</source-password>
       <relay-password>your-secure-relay-password</relay-password>
       <admin-user>admin</admin-user>
       <admin-password>your-secure-admin-password</admin-password>
   </authentication>
   ```

4. **Set Network Configuration**:
   ```xml
   <hostname>localhost</hostname>
   <listen-socket>
       <port>8000</port>
   </listen-socket>
   ```

5. **Start Icecast**:
   - Windows: Use the Start Menu or run `icecast.exe -c icecast.xml`
   - macOS/Linux: Run `icecast2 -c /path/to/icecast.xml`

6. **Verify Installation**: Open browser and go to `http://localhost:8000/` - you should see the Icecast status page

### 3.2 Install FFmpeg

#### Windows Installation
1. **Download FFmpeg**: Visit [ffmpeg.org](https://ffmpeg.org/download.html) and download a static build
2. **Extract Files**: Unzip to a simple path like `C:\ffmpeg\`
3. **Add to PATH** (optional): Add `C:\ffmpeg\bin\` to your system PATH for easier access

#### macOS Installation
```bash
# Using Homebrew (recommended)
brew install ffmpeg

# Or download from ffmpeg.org
```

#### Linux Installation
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
```

### 3.3 Identify Audio Device Names
This step is crucial for FFmpeg to recognize your XR18 channels:

1. **Open Terminal/Command Prompt**
2. **List Audio Devices**:

   **Windows (DirectShow):**
   ```cmd
   ffmpeg -list_devices true -f dshow -i dummy
   ```

   **macOS (AVFoundation):**
   ```bash
   ffmpeg -f avfoundation -list_devices true -i ""
   ```

   **Linux (ALSA/PulseAudio):**
   ```bash
   ffmpeg -f pulse -list_devices true -i ""
   # or
   arecord -l
   ```

3. **Note Device Names**: Look for XR18-related entries. They typically appear as:
   - Windows: `"XR18-USB Audio (1)"`, `"XR18-USB Audio (2)"`, etc.
   - macOS: `"XR18-USB Audio"` with channel specifications
   - Linux: `"hw:CARD=XR18,DEV=0"` or similar

4. **Test Audio Capture**:
   ```bash
   # Test command (replace device name)
   ffmpeg -f dshow -i audio="XR18-USB Audio (1)" -t 5 test.wav
   ```

-----

## Step 4: Audio Streaming with FFmpeg

This step creates the actual audio streams by running FFmpeg commands that capture each microphone channel and send it to Icecast.

### 4.1 Create Streaming Scripts

#### Windows Batch File
1. **Create Batch File**: Create a new text file and save it as `start_streams.bat`
2. **Add Commands**: Copy the following content, replacing device names and passwords:

```batch
@echo off
echo Starting LANStreamer audio streams...
echo Make sure Icecast is running first!
pause

REM English Stream (Channel 1)
start "English Stream" /min ffmpeg -f dshow -i audio="XR18-USB Audio (1)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "English" -ice_description "English interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/english

REM French Stream (Channel 2)
start "French Stream" /min ffmpeg -f dshow -i audio="XR18-USB Audio (2)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "French" -ice_description "French interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/french

REM Portuguese Stream (Channel 3)
start "Portuguese Stream" /min ffmpeg -f dshow -i audio="XR18-USB Audio (3)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "Portuguese" -ice_description "Portuguese interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/portuguese

REM Arabic Stream (Channel 4)
start "Arabic Stream" /min ffmpeg -f dshow -i audio="XR18-USB Audio (4)" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "Arabic" -ice_description "Arabic interpretation" -f mp3 icecast://source:your-source-password@localhost:8000/arabic

echo All streams started!
echo Check http://localhost:8000/ to verify streams are running
pause
```

#### macOS/Linux Shell Script
Create `start_streams.sh`:

```bash
#!/bin/bash
echo "Starting LANStreamer audio streams..."
echo "Make sure Icecast is running first!"
read -p "Press Enter to continue..."

# English Stream
ffmpeg -f avfoundation -i ":0" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "English" -f mp3 icecast://source:your-source-password@localhost:8000/english &

# French Stream
ffmpeg -f avfoundation -i ":1" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "French" -f mp3 icecast://source:your-source-password@localhost:8000/french &

# Portuguese Stream
ffmpeg -f avfoundation -i ":2" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "Portuguese" -f mp3 icecast://source:your-source-password@localhost:8000/portuguese &

# Arabic Stream
ffmpeg -f avfoundation -i ":3" -acodec libmp3lame -b:a 128k -ar 44100 -ac 1 -content_type audio/mpeg -ice_name "Arabic" -f mp3 icecast://source:your-source-password@localhost:8000/arabic &

echo "All streams started in background!"
echo "Check http://localhost:8000/ to verify streams"
```

### 4.2 Command Parameters Explained

- **`start "Name" /min`**: (Windows) Runs FFmpeg in a minimized window with a title
- **`-f dshow/avfoundation`**: Input format for Windows/macOS audio capture
- **`-i audio="device"`**: Specifies the exact audio input device
- **`-acodec libmp3lame`**: Uses LAME MP3 encoder for high-quality audio
- **`-b:a 128k`**: Sets audio bitrate to 128 kbps (good quality for speech)
- **`-ar 44100`**: Sample rate of 44.1 kHz (CD quality)
- **`-ac 1`**: Mono audio (1 channel) - suitable for speech interpretation
- **`-content_type audio/mpeg`**: Sets HTTP content type for browsers
- **`-ice_name "Language"`**: Stream title displayed in Icecast
- **`-ice_description "Description"`**: Stream description for metadata
- **`icecast://source:password@host:port/mountpoint`**: Destination URL

### 4.3 Important Configuration Notes

⚠️ **Before Running:**
1. **Update Device Names**: Replace `"XR18-USB Audio (X)"` with your actual device names from Step 3.3
2. **Update Password**: Replace `your-source-password` with your Icecast source password
3. **Verify Icecast**: Ensure Icecast is running at `http://localhost:8000/`
4. **Test Audio**: Verify interpreters are speaking into their microphones

### 4.4 Running the Streams

1. **Start Icecast First**: Make sure Icecast server is running
2. **Run Script**:
   - Windows: Double-click `start_streams.bat`
   - macOS/Linux: Run `chmod +x start_streams.sh && ./start_streams.sh`
3. **Verify Streams**: Check `http://localhost:8000/` - you should see 4 active mountpoints
4. **Test Playback**: Click on each stream link to verify audio is working

-----

## Step 5: Web Interface Creation

Create a user-friendly web interface that allows clients to easily select and listen to different language streams.

### 5.1 Create the HTML Interface

1. **Choose Location**: Create the HTML file in one of these locations:
   - **Icecast Web Directory**: `C:\Program Files\Icecast2\web\` (Windows) or `/usr/share/icecast2/web/` (Linux)
   - **Separate Web Server**: Any web server directory if you're running Apache/Nginx
   - **Local File**: For testing, you can create it anywhere and open directly in browser

2. **Create HTML File**: Create a new file named `index.html`

3. **Add Interface Code**: Copy the following enhanced interface code:

<!-- end list -->

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Live Audio Streams</title>
    <style>
        body { font-family: sans-serif; text-align: center; margin-top: 50px; }
        .button-container { display: flex; justify-content: center; gap: 20px; }
        button { padding: 20px 40px; font-size: 1.2em; cursor: pointer; }
    </style>
</head>
<body>

    <h1>Select a Language</h1>

    <div class="button-container">
        <button onclick="changeStream('eng')">English</button>
        <button onclick="changeStream('fra')">Français</button>
        <button onclick="changeStream('por')">Português</button>
        <button onclick="changeStream('ara')">عربي</button>
    </div>

    <audio id="audioPlayer" controls autoplay></audio>

    <script>
        const audioPlayer = document.getElementById('audioPlayer');

        function changeStream(language) {
            // Replace 'your-computer-ip' with the local IP address of the streaming server
            const streamUrl = 'http://your-computer-ip:8000/' + language;
            audioPlayer.src = streamUrl;
            audioPlayer.play().catch(e => console.error("Error playing audio:", e));
        }

        // Set an initial stream to play automatically
        window.onload = () => changeStream('eng');
    </script>

</body>
</html>
```

### 5.2 Deployment Options

**Option 1: Icecast Web Directory**
- Place `index.html` in the Icecast web directory:
  - Windows: `C:\Program Files\Icecast2\web\`
  - Linux: `/usr/share/icecast2/web/`
- Access via: `http://your-computer-ip:8000/index.html`

**Option 2: Separate Web Server**
- Use Apache, Nginx, or any web server
- Update stream URLs to point to your Icecast server
- Allows for more advanced web features and customization

**Option 3: Local File**
- For testing: Open HTML file directly in browser
- Update URLs to use your computer's IP address instead of localhost

### 5.3 Network Access Configuration

To allow other devices to access the streams:

1. **Find Your Computer's IP**:
   - Windows: `ipconfig`
   - macOS/Linux: `ifconfig` or `ip addr`

2. **Update Stream URLs**: Replace `localhost` with your IP address in the HTML file

3. **Configure Firewall**: Ensure port 8000 is open for incoming connections

---

## Step 6: Testing and Deployment

### 6.1 System Startup Sequence

**Critical Order:**
1. Start Icecast server first
2. Verify XR18 connection and audio routing
3. Launch FFmpeg streaming scripts
4. Test web interface and audio playback

### 6.2 Verification Checklist

- [ ] Icecast status page shows 4 active mountpoints
- [ ] Each stream plays audio when clicked
- [ ] Web interface works on multiple devices
- [ ] Audio quality is clear and without distortion
- [ ] Network access works from other devices

---

## Step 7: Troubleshooting Guide

### 7.1 Common Issues

**Icecast Won't Start:**
- Check port 8000 isn't in use: `netstat -an | grep 8000`
- Verify configuration file syntax
- Run with administrator/root privileges
- Check firewall settings

**No Audio in Streams:**
- Verify XR18 USB routing in X AIR EDIT
- Check microphone levels and gain settings
- Confirm FFmpeg device names are correct
- Test individual streams one at a time

**FFmpeg Errors:**
- Re-run device detection commands
- Check audio device isn't locked by another application
- Verify Icecast is running before starting streams
- Check source password matches configuration

**Web Interface Issues:**
- Test in different browsers
- Check network connectivity and IP addresses
- Verify stream URLs are accessible
- Clear browser cache and cookies

### 7.2 Performance Tips

**For Better Quality:**
- Increase bitrate: `-b:a 192k` or `-b:a 256k`
- Use higher sample rate: `-ar 48000`
- Consider AAC codec for better compression

**For Lower Bandwidth:**
- Reduce bitrate: `-b:a 96k` or `-b:a 64k`
- Ensure mono audio: `-ac 1`
- Monitor network usage during events

---

## Summary

This comprehensive setup creates a professional multi-language audio streaming system suitable for conferences, meetings, and events requiring real-time interpretation.

### Key Benefits
- **Professional Quality**: Broadcast-grade audio with low latency
- **Scalable Design**: Easy to add more languages or modify configuration
- **Network Efficient**: Optimized for local area network deployment
- **User Friendly**: Simple web interface accessible on any device
- **Cost Effective**: Uses standard networking and audio equipment

### System Workflow
1. **Audio Capture**: Interpreters speak into dedicated XR18 microphone channels
2. **Digital Routing**: XR18 sends each channel via USB to computer
3. **Stream Encoding**: FFmpeg encodes each channel into separate MP3 streams
4. **Distribution**: Icecast serves streams over local network
5. **User Access**: Web interface provides easy language selection

This robust hardware-software combination provides a complete, low-latency, and scalable solution that can be adapted for different numbers of languages, alternative audio hardware, or integration with existing network infrastructure.


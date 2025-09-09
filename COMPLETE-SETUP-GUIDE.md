# 📖 LANStreamer Complete Setup Guide

> **The definitive guide for setting up LANStreamer for professional audio streaming**

## 🚨 **Critical System Requirements & Failure Points**

**Before you start, be aware of these critical areas where the system commonly fails:**

- **🌐 Dynamic IP Addresses**: Router reboots change your IP, breaking all listener connections
- **🔧 Icecast Configuration**: Wrong XML file location or settings prevent streaming
- **🎵 Audio Device Conflicts**: Multiple applications competing for the same audio device
- **🔥 Windows Firewall**: Blocks port 3001, preventing network access
- **📡 Network Discovery**: mDNS doesn't work reliably on Windows 10/11
- **⚡ FFmpeg Installation**: Missing or incorrect FFmpeg installation breaks audio processing
- **🎛️ Audio Pipeline**: Virtual audio cables required for system audio streaming

## 📑 **Table of Contents**

1. [System Requirements](#system-requirements)
2. [Quick Start (Recommended Path)](#quick-start-recommended-path)
3. [Detailed Installation](#detailed-installation)
4. [Network Configuration](#network-configuration)
5. [Audio Setup](#audio-setup)
6. [Icecast Configuration](#icecast-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

---

## 🖥️ **System Requirements**

### **Minimum Requirements:**
- **OS**: Windows 10/11, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Network**: Local network (WiFi or Ethernet)
- **Audio**: Built-in audio or USB audio interface

### **Required Software:**
- **Node.js** 16+ (automatically installed by setup scripts)
- **FFmpeg** (automatically installed by setup scripts)
- **Icecast** (guided installation provided)

### **Optional but Recommended:**
- **VB-Audio Virtual Cable** (for system audio streaming)
- **Static IP configuration** (for professional events)

---

## 🚀 **Quick Start (Recommended Path)**

### **Step 1: Download LANStreamer**

**Option A: Download ZIP** (Easiest)
```
1. Go to: https://github.com/jerryagenyi/LANStreamer
2. Click green "Code" button → "Download ZIP"
3. Right-click ZIP file → "Extract All"
4. Open the extracted LANStreamer folder
```

**Option B: Git Clone** (For Developers)
```bash
git clone https://github.com/jerryagenyi/LANStreamer.git
cd LANStreamer
```

### **Step 2: Install Dependencies**
```
Double-click: INSTALL LANStreamer.bat
```
- ✅ Installs Node.js and dependencies
- ✅ Creates desktop shortcuts
- ✅ No Administrator privileges required

### **Step 3: Network Setup** (Choose One)

**Option A: Windows Hostname Setup** ⭐ **Recommended**
```
Right-click: SETUP Windows Hostname.bat → "Run as administrator"
```
- ✅ Combines static IP + hosts file
- ✅ Creates reliable `lanstreamer.local` hostname
- ✅ Works after router reboots

**Option B: mDNS Setup** (Cross-platform)
```
Right-click: SETUP mDNS.bat → "Run as administrator"
```
- ⚠️ Unreliable on Windows 10/11

### **Step 4: Start LANStreamer**
```
Double-click: Start LANStreamer Server.bat
```

### **Step 5: Access & Test**
- **Admin Dashboard**: `http://lanstreamer.local:3001`
- **Streams Page**: `http://lanstreamer.local:3001/streams`
- **Test from mobile device** on same network

---

## 🔧 **Detailed Installation**

### **Windows Installation**

#### **Prerequisites Check:**
1. **Check Node.js**: Open Command Prompt, type `node --version`
2. **Check FFmpeg**: Type `ffmpeg -version`
3. **Check Network**: Type `ipconfig` to see your IP

#### **Installation Scripts:**

**`INSTALL LANStreamer.bat`**
- Detects and installs Node.js if missing
- Installs all npm dependencies
- Creates desktop shortcut for easy access
- Configures Windows Firewall rules
- Tests network connectivity

**`SETUP Windows Hostname.bat`** ⭐ **Recommended**
- Guides through static IP configuration
- Adds `lanstreamer.local` to Windows hosts file
- Creates reliable hostname that survives reboots
- Requires Administrator privileges

**`SETUP mDNS.bat`**
- Enables Windows mDNS support via registry
- Configures network discovery
- Less reliable than hosts file approach
- Requires Administrator privileges and restart

**`Start LANStreamer Server.bat`**
- Starts the LANStreamer server
- Displays network URLs for sharing
- Filters out VPN addresses
- Shows Icecast status

---

## 🌐 **Network Configuration**

### **The IP Address Problem**

**Issue**: Your router assigns dynamic IP addresses that change when:
- Router restarts
- DHCP lease expires
- Network adapter resets

**Impact**: All listeners lose connection and need new URLs

### **Solutions (Choose One)**

#### **Solution 1: Static IP Address** ⭐ **Most Reliable**

**Windows 10/11:**
1. Press `Win + R`, type `ncpa.cpl`, press Enter
2. Right-click your network adapter → Properties
3. Double-click "Internet Protocol Version 4 (TCP/IPv4)"
4. Select "Use the following IP address"
5. Enter:
   - **IP Address**: `192.168.1.100` (choose unused IP)
   - **Subnet Mask**: `255.255.255.0`
   - **Default Gateway**: `192.168.1.1` (your router's IP)
   - **DNS**: `8.8.8.8` and `8.8.4.4`

**Find Your Network Range:**
```cmd
ipconfig /all
```
Look for "Default Gateway" - usually `192.168.1.1` or `192.168.0.1`

#### **Solution 2: DHCP Reservation** (Router Configuration)

1. **Find MAC Address:**
   ```cmd
   ipconfig /all
   ```
   Look for "Physical Address"

2. **Router Configuration:**
   - Access router: `http://192.168.1.1`
   - Find "DHCP Reservation" or "Static DHCP"
   - Add MAC address → assign specific IP
   - Save and restart router

#### **Solution 3: Hosts File + Static IP** (Windows)

**Automated Setup:**
```
Right-click: SETUP Windows Hostname.bat → "Run as administrator"
```

**Manual Setup:**
1. Set static IP (see Solution 1)
2. Add to hosts file as Administrator:
   ```cmd
   echo 192.168.1.100 lanstreamer.local >> C:\Windows\System32\drivers\etc\hosts
   ```

### **Network Testing**

**Test Local Access:**
```cmd
ping localhost
curl http://localhost:3001
```

**Test Network Access:**
```cmd
ping 192.168.1.100
curl http://192.168.1.100:3001
```

**Test Hostname:**
```cmd
ping lanstreamer.local
```

---

## 🎵 **Audio Setup**

### **Audio Pipeline Overview**

```
[Audio Source] → [Virtual Cable] → [LANStreamer] → [Icecast] → [Network] → [Listeners]
```

### **Audio Sources**

#### **Option 1: Microphone Input** (Simplest)
- Use built-in microphone
- USB microphone
- Audio interface input
- **Setup**: Select microphone in LANStreamer interface

#### **Option 2: System Audio** (Most Popular)
- Stream computer's audio output
- Music, videos, applications
- **Requires**: Virtual audio cable
- **Setup**: Install VB-Audio Virtual Cable

#### **Option 3: Mixed Audio** (Professional)
- Combine microphone + system audio
- Use audio mixing software
- **Examples**: OBS, Voicemeeter, Reaper
- **Setup**: Route mixed output to virtual cable

### **Virtual Audio Cable Setup**

**Why Needed**: Windows doesn't allow direct access to system audio output

**Installation:**
1. **Download**: [VB-Audio Virtual Cable](https://vb-audio.com/Cable/)
2. **Install**: Run as Administrator
3. **Restart**: Computer restart required
4. **Configure**: Set as default playback device

**Configuration:**
1. **Right-click speaker icon** → "Open Sound settings"
2. **Output device**: Select "CABLE Input (VB-Audio Virtual Cable)"
3. **Input device**: Select "CABLE Output (VB-Audio Virtual Cable)"
4. **LANStreamer**: Select "CABLE Output" as audio source

### **Audio Device Troubleshooting**

**Device Not Found:**
- Restart LANStreamer
- Check device connections
- Refresh device list in interface

**No Audio:**
- Check device isn't used by other applications
- Verify correct input/output selection
- Test with different audio source

**Audio Conflicts:**
- Close other audio applications
- Check Windows audio settings
- Restart audio services

---

## 📡 **Icecast Configuration**

### **Icecast Overview**

**What is Icecast**: Open-source streaming media server that handles the actual audio streaming

**LANStreamer's Role**: 
- Provides web interface
- Manages FFmpeg processes
- Configures Icecast automatically
- Handles network detection

### **Icecast Installation**

**Automatic Detection:**
LANStreamer will search for Icecast in common locations:
- `C:\Program Files\Icecast`
- `C:\Program Files (x86)\Icecast`
- Custom installation paths

**Manual Installation:**
1. **Download**: [Icecast for Windows](https://icecast.org/download/)
2. **Install**: Default location recommended
3. **Configure**: LANStreamer handles configuration automatically

**Custom Installation Path:**
1. Install Icecast anywhere
2. Use LANStreamer's "Browse for Icecast" feature
3. Select the folder containing `icecast.exe`

### **Icecast Configuration Files**

**Location**: `config/icecast.xml` (in LANStreamer folder)

**Key Settings:**
```xml
<hostname>192.168.1.100</hostname>
<listen-socket>
    <port>8000</port>
</listen-socket>
<authentication>
    <source-password>lanstreamer123</source-password>
    <admin-password>admin123</admin-password>
</authentication>
```

**Automatic Updates**: LANStreamer updates these settings based on your network configuration

### **Icecast Troubleshooting**

**Icecast Won't Start:**
- Check port 8000 isn't in use
- Verify XML configuration syntax
- Check Windows Firewall settings
- Run as Administrator if needed

**Streams Not Working:**
- Verify Icecast is running
- Check FFmpeg processes
- Test Icecast admin interface: `http://192.168.1.100:8000/admin/`

**Configuration Issues:**
- Delete `config/icecast.xml` to regenerate
- Check file permissions
- Verify network settings match

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **"Page Won't Load" / Connection Issues**

**Symptoms**: Browser shows "This site can't be reached" or similar

**Solutions**:
1. **Check LANStreamer is running**: Look for terminal window
2. **Test locally first**: Try `http://localhost:3001`
3. **Check Windows Firewall**:
   ```cmd
   netsh advfirewall firewall add rule name="LANStreamer" dir=in action=allow protocol=TCP localport=3001
   ```
4. **Verify network connection**: `ping 192.168.1.100`
5. **Check port availability**: `netstat -an | findstr :3001`

#### **IP Address Keeps Changing**

**Symptoms**: URLs stop working after router restart

**Solutions**:
1. **Set static IP** (see Network Configuration section)
2. **Use DHCP reservation** on router
3. **Check power management**: Disable "Allow computer to turn off this device"

#### **Audio Device Not Found**

**Symptoms**: "No audio devices found" or device list empty

**Solutions**:
1. **Refresh device list**: Click refresh button in interface
2. **Check device connections**: Ensure USB devices are connected
3. **Restart LANStreamer**: Close and restart the application
4. **Check Windows audio settings**: Ensure devices are enabled
5. **Install VB-Audio Virtual Cable**: For system audio streaming

#### **Icecast Won't Start**

**Symptoms**: "Icecast server failed to start" error

**Solutions**:
1. **Check port 8000**: Another application might be using it
   ```cmd
   netstat -an | findstr :8000
   ```
2. **Run as Administrator**: Right-click batch file → "Run as administrator"
3. **Check Icecast installation**: Use "Browse for Icecast" feature
4. **Verify XML configuration**: Check `config/icecast.xml` for errors
5. **Windows Firewall**: Allow Icecast through firewall

#### **No Audio in Stream**

**Symptoms**: Stream connects but no audio heard

**Solutions**:
1. **Check audio source**: Verify correct input device selected
2. **Test audio levels**: Look for audio meters in interface
3. **Check virtual cable**: Ensure VB-Audio Virtual Cable is working
4. **Verify FFmpeg**: Check FFmpeg processes are running
5. **Audio device conflicts**: Close other audio applications

#### **mDNS/Hostname Issues**

**Symptoms**: `lanstreamer.local` doesn't resolve

**Solutions**:
1. **Use Windows hostname setup**: Run `SETUP Windows Hostname.bat`
2. **Add to hosts file manually**:
   ```cmd
   echo 192.168.1.100 lanstreamer.local >> C:\Windows\System32\drivers\etc\hosts
   ```
3. **Use IP address directly**: `http://192.168.1.100:3001`
4. **Check network discovery**: Enable in Windows settings

### **Advanced Troubleshooting**

#### **Log Files**

**LANStreamer Logs**: Check terminal output for errors

**Icecast Logs**:
- Location: `logs/` folder in LANStreamer directory
- Files: `access.log`, `error.log`

**Windows Event Logs**: Check Windows Event Viewer for system errors

#### **Network Diagnostics**

**Test Network Connectivity**:
```cmd
# Test local server
curl http://localhost:3001

# Test network access
curl http://192.168.1.100:3001

# Test hostname resolution
nslookup lanstreamer.local

# Check open ports
netstat -an | findstr :3001
netstat -an | findstr :8000
```

**Firewall Testing**:
```cmd
# Temporarily disable Windows Firewall (for testing only)
netsh advfirewall set allprofiles state off

# Re-enable after testing
netsh advfirewall set allprofiles state on
```

#### **Process Management**

**Check Running Processes**:
```cmd
# Check Node.js processes
tasklist | findstr node

# Check FFmpeg processes
tasklist | findstr ffmpeg

# Check Icecast processes
tasklist | findstr icecast
```

**Kill Stuck Processes**:
```cmd
# Kill all Node.js processes (use carefully)
taskkill /f /im node.exe

# Kill FFmpeg processes
taskkill /f /im ffmpeg.exe
```

---

## ⚙️ **Advanced Configuration**

### **Custom Network Settings**

#### **Multiple Network Interfaces**

If you have multiple network adapters (WiFi + Ethernet, VPN, etc.):

1. **Check all interfaces**:
   ```cmd
   ipconfig /all
   ```

2. **Prioritize interface**: Set static IP on preferred interface

3. **Disable unused interfaces**: Temporarily disable VPN/unused adapters

#### **Custom Ports**

**Change LANStreamer Port** (default 3001):
1. Edit `src/config/index.js`
2. Change `PORT` value
3. Update firewall rules
4. Restart LANStreamer

**Change Icecast Port** (default 8000):
1. Edit `config/icecast.xml`
2. Update `<port>` value
3. Restart Icecast

### **Audio Configuration**

#### **Audio Quality Settings**

**Bitrate Options**:
- **64 kbps**: Voice/speech (smallest file size)
- **128 kbps**: Music (good quality)
- **192 kbps**: High quality music
- **320 kbps**: Maximum quality (largest file size)

**Sample Rate**:
- **22050 Hz**: Voice/speech
- **44100 Hz**: CD quality (recommended)
- **48000 Hz**: Professional audio

#### **Multiple Audio Sources**

**Setup Multiple Streams**:
1. Configure different audio devices
2. Create separate stream endpoints
3. Use different mount points in Icecast

### **Security Considerations**

#### **Network Security**

**Firewall Configuration**:
- Only allow necessary ports (3001, 8000)
- Restrict access to local network only
- Consider VPN for remote access

**Password Security**:
- Change default Icecast passwords
- Use strong passwords for admin access
- Regularly update credentials

#### **Access Control**

**Limit Admin Access**:
- Configure Icecast admin restrictions
- Use separate passwords for source/admin
- Monitor access logs

### **Performance Optimization**

#### **System Resources**

**CPU Optimization**:
- Close unnecessary applications
- Use lower bitrates for multiple streams
- Monitor CPU usage during streaming

**Memory Management**:
- Restart LANStreamer periodically for long events
- Monitor memory usage
- Clear browser cache regularly

#### **Network Optimization**

**Bandwidth Considerations**:
- Calculate total bandwidth: (bitrate × number of listeners)
- Monitor network usage
- Consider stream quality vs. bandwidth

**Router Configuration**:
- Enable QoS for streaming traffic
- Prioritize LANStreamer traffic
- Use wired connection when possible

---

## 📚 **Additional Resources**

### **Documentation Links**
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Icecast Documentation](https://icecast.org/docs/)
- [VB-Audio Virtual Cable Guide](https://vb-audio.com/Cable/)

### **Community Support**
- [GitHub Issues](https://github.com/jerryagenyi/LANStreamer/issues)
- [Discussions](https://github.com/jerryagenyi/LANStreamer/discussions)

### **Professional Use**
- Test thoroughly before live events
- Have backup plans ready
- Document your specific configuration
- Train operators on the system

---

*This comprehensive guide covers all aspects of LANStreamer setup and operation. For quick start instructions, see the main README.md file.*

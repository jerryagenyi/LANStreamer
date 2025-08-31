# FFmpeg Installation Guide

> **Complete guide for installing and updating FFmpeg on Windows, macOS, and Linux**

## Overview

FFmpeg is a powerful, open-source multimedia framework that LANStreamer uses for audio/video processing and streaming. This guide provides step-by-step instructions for installing FFmpeg on all supported platforms.

## Quick Status Check

Before installation, check if FFmpeg is already installed:

```bash
ffmpeg -version
```

If FFmpeg is installed, you'll see version information. If not, follow the installation instructions below.

---

## Windows Installation

### Method 1: Official Build (Recommended)

1. **Download FFmpeg**
   - Visit [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html){:target="_blank"}
   - Click "Windows" and then "Windows builds by BtbN"
   - Download the latest `ffmpeg-master-latest-win64-gpl.zip`

2. **Extract and Install**
   ```powershell
   # Create FFmpeg directory
   New-Item -ItemType Directory -Path "C:\ffmpeg" -Force
   
   # Extract downloaded ZIP to C:\ffmpeg
   # (Use Windows Explorer or 7-Zip)
   ```

3. **Add to System PATH**
   ```powershell
   # Add FFmpeg to PATH (Run as Administrator)
   $env:Path += ";C:\ffmpeg\bin"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::Machine)
   ```

   **Alternative GUI Method:**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables"
   - Under "System Variables", select "Path" and click "Edit"
   - Click "New" and add `C:\ffmpeg\bin`
   - Click "OK" to save

4. **Verify Installation**
   ```powershell
   # Restart PowerShell/Command Prompt, then test
   ffmpeg -version
   ```

### Method 2: Using Chocolatey

```powershell
# Install Chocolatey first (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install FFmpeg
choco install ffmpeg -y
```

### Method 3: Using winget

```powershell
# Install using Windows Package Manager
winget install FFmpeg
```

---

## macOS Installation

### Method 1: Using Homebrew (Recommended)

1. **Install Homebrew** (if not already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install FFmpeg**
   ```bash
   # Update Homebrew
   brew update
   
   # Install FFmpeg with common codecs
   brew install ffmpeg
   ```

3. **Verify Installation**
   ```bash
   ffmpeg -version
   which ffmpeg
   ```

### Method 2: Using MacPorts

```bash
# Install MacPorts first, then:
sudo port install ffmpeg +universal
```

### Method 3: Manual Installation

1. Download the latest macOS build from [https://evermeet.cx/ffmpeg/](https://evermeet.cx/ffmpeg/){:target="_blank"}
2. Extract and move to `/usr/local/bin/`
3. Make executable: `chmod +x /usr/local/bin/ffmpeg`

---

## Linux Installation

### Ubuntu/Debian

```bash
# Update package lists
sudo apt update

# Install FFmpeg
sudo apt install ffmpeg -y

# Verify installation
ffmpeg -version
```

### CentOS/RHEL/Fedora

```bash
# For CentOS/RHEL 8+
sudo dnf install epel-release -y
sudo dnf install ffmpeg -y

# For older CentOS/RHEL
sudo yum install epel-release -y
sudo yum install ffmpeg -y

# For Fedora
sudo dnf install ffmpeg -y
```

### Arch Linux

```bash
# Install FFmpeg
sudo pacman -S ffmpeg

# Verify installation
ffmpeg -version
```

### Snap Package (Universal)

```bash
# Install via Snap (works on most Linux distributions)
sudo snap install ffmpeg
```

---

## Updating FFmpeg

### Windows

**Official Build:**
- Download the latest version and replace existing files
- Or use the same installation method as above

**Chocolatey:**
```powershell
choco upgrade ffmpeg -y
```

**winget:**
```powershell
winget upgrade FFmpeg
```

### macOS

**Homebrew:**
```bash
brew update
brew upgrade ffmpeg
```

**MacPorts:**
```bash
sudo port selfupdate
sudo port upgrade ffmpeg
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt upgrade ffmpeg -y
```

**CentOS/RHEL/Fedora:**
```bash
sudo dnf update ffmpeg -y
# or for older systems:
sudo yum update ffmpeg -y
```

**Arch Linux:**
```bash
sudo pacman -Syu ffmpeg
```

---

## Verification and Testing

### Basic Functionality Test

```bash
# Check version and supported formats
ffmpeg -version
ffmpeg -formats
ffmpeg -codecs

# Test basic audio conversion
ffmpeg -f lavfi -i "sine=frequency=1000:duration=5" -c:a aac test_audio.aac
```

### LANStreamer Integration Test

```bash
# Test audio device listing (Windows)
ffmpeg -list_devices true -f dshow -i dummy

# Test audio device listing (macOS)
ffmpeg -f avfoundation -list_devices true -i ""

# Test audio device listing (Linux)
ffmpeg -f alsa -list_devices true -i dummy
```

---

## Troubleshooting

### Common Issues

**"ffmpeg is not recognized as an internal or external command" (Windows)**
- Solution: Ensure FFmpeg is properly added to the system PATH
- Restart Command Prompt/PowerShell after adding to PATH

**Permission denied errors (Linux/macOS)**
- Solution: Use `sudo` for system-wide installation
- Alternative: Install to user directory and update PATH

**Missing codecs or libraries**
- Solution: Install a full build with all codecs
- For Homebrew: `brew install ffmpeg --with-all-codecs` (if available)

**Audio device access issues**
- Windows: May need to run as Administrator
- Linux: Add user to `audio` group: `sudo usermod -a -G audio $USER`
- macOS: Grant microphone permissions in System Preferences

### Getting Help

If installation issues persist:

1. Check the [FFmpeg documentation](https://ffmpeg.org/documentation.html){:target="_blank"}
2. Visit the [FFmpeg community forums](https://ffmpeg.org/contact.html){:target="_blank"}
3. Open an issue on our [LANStreamer repository](https://github.com/jerryagenyi/LANStreamer/issues){:target="_blank"} with:
   - Your operating system and version
   - Installation method attempted
   - Complete error messages

---

## Integration with LANStreamer

Once FFmpeg is installed, LANStreamer will:

- ✅ Detect FFmpeg installation automatically
- ✅ Show green status indicator in the dashboard
- ✅ Enable audio streaming capabilities
- ✅ Support multiple audio formats and devices

### Configuration Options

LANStreamer uses these FFmpeg features:

- **Audio Input**: Various audio devices and file formats
- **Audio Processing**: Real-time encoding and format conversion
- **Streaming**: Direct streaming to Icecast servers
- **Quality Control**: Bitrate and quality adjustments

For advanced FFmpeg configuration with LANStreamer, see the [Technical Specification](../LANStreamer-Technical-Specification.md).

---

## Related Documentation

- [Icecast Installation Guide](./icecast-installation.md)
- [LANStreamer Technical Specification](../LANStreamer-Technical-Specification.md)
- [Audio Pipeline Concepts](../LANStreamer-Audio-Pipeline-Concepts.md)

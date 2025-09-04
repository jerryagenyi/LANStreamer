# FFmpeg Installation Guide

> **Simple 3-step guide to install FFmpeg for audio processing**

## What is FFmpeg?
FFmpeg is the audio processing engine that captures sound from your devices and sends it to Icecast for streaming.

## Quick Install

### Windows (Easiest)
```powershell
# Open Command Prompt or PowerShell as Administrator
winget install FFmpeg
```
**✨ This is the easiest method - automatically handles PATH setup!**

### macOS
```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install ffmpeg -y
```

## Quick Test
```bash
# Check if installed
ffmpeg -version

# Test audio device listing
# Windows
ffmpeg -list_devices true -f dshow -i dummy

# macOS
ffmpeg -f avfoundation -list_devices true -i ""

# Linux
ffmpeg -f alsa -list_devices true -i dummy
```

## Common Issues

**"ffmpeg is not recognized" (Windows)**
- If using winget: Restart your terminal after installation
- If manual install: FFmpeg not added to PATH properly
- Solution: Use winget method (recommended)

**Permission denied (Linux/macOS)**
- Solution: Use `sudo` for installation
- Alternative: Install to user directory

**No audio devices found**
- Windows: May need to run as Administrator
- Linux: Add user to audio group: `sudo usermod -a -G audio $USER`
- macOS: Grant microphone permissions in System Preferences

## Windows Alternative (Manual)
If winget fails:
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg\`
3. Add `C:\ffmpeg\bin` to system PATH
4. Restart terminal

## Need More Help?
- **Official Documentation**: https://ffmpeg.org/documentation.html
- **LANStreamer Issues**: https://github.com/jerryagenyi/LANStreamer/issues

# FFmpeg Installation Guide

> **Simple guide to install FFmpeg for non-technical users**

## What is FFmpeg?
FFmpeg is the audio processing engine that captures sound from your devices and sends it to Icecast for streaming.

## 📥 Easy Installation (Windows)

### Method 1: Automatic Installation (Recommended)
1. **Press** `Windows Key + R`
2. **Type**: `cmd` and press `Ctrl + Shift + Enter` (this opens as Administrator)
3. **Copy and paste**: `winget install ffmpeg`
4. **Press Enter** and wait for installation to complete
5. **Close** the command prompt

**✨ This is the easiest method - automatically handles everything!**

### Method 2: Manual Installation (If Method 1 fails)
1. **Visit**: https://ffmpeg.org/download.html
2. **Click**: "Windows" → "Windows builds by BtbN"
3. **Download**: Latest release (usually `ffmpeg-master-latest-win64-gpl.zip`)
4. **Extract**: Right-click ZIP → "Extract All" → Choose `C:\ffmpeg\`
5. **Add to PATH**:
   - Press `Windows Key + X` → "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path" → "Edit"
   - Click "New" → Add `C:\ffmpeg\bin`
   - Click "OK" on all windows
6. **Restart** your computer


## ✅ Test Your Installation

### Step 1: Check if FFmpeg is installed
1. **Press** `Windows Key + R`
2. **Type**: `cmd` and press Enter
3. **Type**: `ffmpeg -version` and press Enter
4. **You should see**: Version information (like "ffmpeg version 6.0...")

### Step 2: Test audio device detection
1. **In the same command prompt, type**: `ffmpeg -list_devices true -f dshow -i dummy`
2. **You should see**: A list of your audio devices (microphones, speakers, etc.)

> **✅ Success!** If both commands work, FFmpeg is properly installed and ready for LANStreamer.

## Common Issues

**"ffmpeg is not recognized" (Windows)**
- If using winget: Restart your terminal after installation
- If manual install: FFmpeg not added to PATH properly
- Solution: Use winget method (recommended)

**No audio devices found**
- May need to run as Administrator
- Check Windows audio device settings
- Ensure microphone permissions are granted

## Windows Alternative (Manual)
If winget fails:
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg\`
3. Add `C:\ffmpeg\bin` to system PATH
4. Restart terminal

## Need More Help?
- **Official Documentation**: https://ffmpeg.org/documentation.html
- **LANStreamer Issues**: https://github.com/jerryagenyi/LANStreamer/issues

# LANStreamer Troubleshooting Guide

> **Quick fixes for common issues**

## Installation Issues

### Icecast Not Detected
**Problem**: LANStreamer shows "Icecast not found"
**Solutions**:
1. Install Icecast: [Installation Guide](./icecast-installation-simple.md)
2. Check if running: `tasklist | findstr icecast` (Windows)
3. Try starting manually: `cd "C:\Program Files (x86)\Icecast"` then `icecast.exe -c icecast.xml`

### FFmpeg Not Detected
**Problem**: LANStreamer shows "FFmpeg not found"
**Solutions**:
1. Install FFmpeg: [Installation Guide](./ffmpeg-installation-simple.md)
2. Check if installed: `ffmpeg -version`
3. Windows: Use `winget install FFmpeg` (easiest method)

## Streaming Issues

### No Audio in Stream
**Problem**: Stream starts but no sound
**Check these in order**:
1. **Audio source**: Is the microphone/application actually producing sound?
2. **Audio device**: Is the device receiving input? Check Windows sound settings
3. **Device selection**: Is LANStreamer using the correct audio device?
4. **Volume levels**: Are input levels too low? Check audio mixer settings

### Stream Won't Start
**Problem**: "Failed to start stream" error
**Solutions**:
1. **Check Icecast**: Is Icecast running? Try restarting it
2. **Check passwords**: Do source passwords match between LANStreamer and Icecast?
3. **Check ports**: Is port 8000 available? `netstat -ano | findstr :8000`
4. **Check permissions**: Try running as Administrator (Windows)

### Poor Audio Quality
**Problem**: Audio sounds distorted or choppy
**Solutions**:
1. **Lower bitrate**: Try 128kbps instead of 192kbps
2. **Check input levels**: Avoid red/clipping levels in audio mixer
3. **Close other apps**: Free up CPU and memory resources
4. **Check network**: Ensure stable internet connection

## Connection Issues

### Can't Access from Other Devices
**Problem**: Stream works locally but not on phones/other computers
**Solutions**:
1. **Check IP address**: Use your computer's IP (e.g., 192.168.1.100) not localhost
2. **Check firewall**: Allow port 8000 through Windows Firewall
3. **Check network**: Ensure all devices are on same network
4. **Test URL**: Try `http://YOUR-IP:8000/admin/` from another device

### Admin Interface Won't Load
**Problem**: Can't access http://localhost:8000/admin/
**Solutions**:
1. **Check Icecast**: Is it actually running?
2. **Check port**: Something else might be using port 8000
3. **Check browser**: Try different browser or incognito mode
4. **Check URL**: Make sure it's exactly `http://localhost:8000/admin/`

## Audio Device Issues

### Device Not Found
**Problem**: Audio device doesn't appear in LANStreamer
**Solutions**:
1. **Refresh devices**: Click refresh button in LANStreamer
2. **Check connections**: Ensure USB devices are properly connected
3. **Check drivers**: Update audio device drivers
4. **Restart services**: Restart Windows Audio service

### Device Name Changed
**Problem**: Device worked before but now shows different name
**Solutions**:
1. **Re-select device**: Choose the device again in LANStreamer
2. **Check USB ports**: Try different USB port
3. **Update drivers**: Reinstall audio device drivers

## Performance Issues

### High CPU Usage
**Problem**: Computer becomes slow when streaming
**Solutions**:
1. **Lower quality**: Reduce bitrate and sample rate
2. **Close apps**: Close unnecessary programs
3. **Check encoding**: Try different audio codec (MP3 vs AAC)
4. **Hardware upgrade**: Consider more powerful computer

### Memory Issues
**Problem**: "Out of memory" errors
**Solutions**:
1. **Restart LANStreamer**: Close and reopen the application
2. **Restart computer**: Full system restart
3. **Close other apps**: Free up RAM
4. **Check for leaks**: Report persistent memory issues

## Quick Diagnostic Commands

### Windows
```powershell
# Check if Icecast is running
tasklist | findstr icecast

# Check if port 8000 is in use
netstat -ano | findstr :8000

# Check FFmpeg installation
ffmpeg -version

# List audio devices
ffmpeg -list_devices true -f dshow -i dummy
```

### macOS/Linux
```bash
# Check if Icecast is running
ps aux | grep icecast

# Check if port 8000 is in use
netstat -tulpn | grep :8000

# Check FFmpeg installation
ffmpeg -version

# List audio devices (macOS)
ffmpeg -f avfoundation -list_devices true -i ""

# List audio devices (Linux)
ffmpeg -f alsa -list_devices true -i dummy
```

## When to Ask for Help

If you've tried the above solutions and still have issues:

1. **Gather information**:
   - What exactly were you trying to do?
   - What error message did you see?
   - What operating system are you using?
   - What audio devices are you using?

2. **Create an issue**: https://github.com/jerryagenyi/LANStreamer/issues

3. **Include logs**: Copy any error messages or log files

## Need More Help?
- **Installation Guides**: [Icecast](./icecast-installation-simple.md) | [FFmpeg](./ffmpeg-installation-simple.md)
- **Audio Concepts**: [Audio Pipeline Guide](./audio-pipeline-simple.md)
- **Technical Details**: [LANStreamer Technical Specification](../LANStreamer-Technical-Specification.md)
- **Report Issues**: https://github.com/jerryagenyi/LANStreamer/issues

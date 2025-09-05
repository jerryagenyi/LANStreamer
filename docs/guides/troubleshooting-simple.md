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

### Stream Crashes Immediately
**Problem**: Stream starts then immediately stops with error
**Common Causes & Solutions**:
1. **Device mapping error**: Check logs for "Invalid or unavailable audio device"
   - Solution: Refresh device list and re-select your audio device
2. **FFmpeg parameter error**: Look for "Invalid argument" in error logs
   - Solution: Try a different audio device or restart LANStreamer
3. **Permission issues**: "Permission denied" errors
   - Solution: Close other applications using the microphone
4. **Device busy**: "Device or resource busy" errors
   - Solution: Ensure no other applications are using the selected audio device

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

### "Invalid or unavailable audio device" Error
**Problem**: Stream fails with device mapping error
**Solutions**:
1. **Refresh device list**: Click the refresh button to update available devices
2. **Check device connection**: Ensure the device is properly connected and recognized by Windows
3. **Try different device**: Select a different audio device to test if the issue is device-specific
4. **Restart LANStreamer**: Close and restart the application to refresh device mappings
5. **Check device name**: Some devices may appear with different names (e.g., "Immersed Webcam" vs "immersed-webcam")

### Device Conflict Issues
**Problem**: Multiple streams trying to use the same device
**Important Notes**:
- **One device per stream**: LANStreamer prevents multiple streams from using the same audio device simultaneously
- **This is intentional**: Device conflicts can cause audio issues and system instability
- **Solution**: Use different audio devices for multiple streams, or stop one stream before starting another

### Too Many Audio Devices
**Problem**: System becomes unstable with many virtual audio devices
**Recommendations**:
1. **Limit virtual devices**: Avoid running too many virtual audio applications (VoiceMeeter, Virtual Desktop Audio, etc.) simultaneously
2. **Close unused apps**: Shut down audio applications you're not actively using
3. **Restart audio services**: If experiencing issues, restart Windows Audio service
4. **System resources**: More audio devices = more CPU/memory usage

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

## Log Analysis

### Understanding LANStreamer Logs
LANStreamer creates separate log files for different components:

**Log Locations** (in your LANStreamer folder):
- `logs/lanstreamer-YYYY-MM-DD.log` - Main application logs
- `logs/streams-YYYY-MM-DD.log` - Streaming and device detection logs
- `logs/error-YYYY-MM-DD.log` - Error logs and crash reports

**Common Log Patterns**:
- **Device detection**: Look for "Audio device detection completed" and device counts
- **Stream errors**: Search for "Invalid or unavailable audio device" or "Stream failed"
- **FFmpeg issues**: Check for "FFmpeg stderr output" entries
- **Icecast problems**: Look for "Icecast server is not running" messages

**Analyzing Errors**:
1. **Check the error log first**: `logs/error-YYYY-MM-DD.log` contains the most critical issues
2. **Look for patterns**: Repeated errors often indicate configuration issues
3. **Check timestamps**: Correlate errors with when you experienced problems
4. **Device mapping issues**: Search for device names that don't match your actual devices

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

# View recent LANStreamer errors (PowerShell)
Get-Content "logs\error-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 20
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

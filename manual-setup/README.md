# LANStreamer - Manual Setup

This folder contains comprehensive guides and working scripts for setting up LANStreamer manually using batch scripts and FFmpeg.

**Port note:** Scripts and guides here use Icecast port **8000** (common default for a standalone Icecast install). If you use the **LANStreamer web app** to start Icecast, it may use port **8200** (or whatever is in your `icecast.xml`). In that case set `ICECAST_PORT=8200` (or your port) in the batch files.

## 📋 **Setup Guides**

### 🎯 **Recommended: DVS (Dante Virtual Soundcard) Setup**
- **[LANStreamer-basic-dvs.md](LANStreamer-basic-dvs.md)** - ✅ **Tested & Working**
  - Professional Dante-based audio routing
  - Multiple streaming software options (FFmpeg, Ezstream, VLC, OBS)
  - **Real-world tested**: Steps 1-7 confirmed working
  - **Focus on**: FFmpeg Direct Streaming (Options A & B) for reliability

### 🎵 **Alternative: XR18/Scarlett Setup**
- **[LANStreamer-basic-xr18.md](LANStreamer-basic-xr18.md)** - USB Audio Interface Setup
  - Behringer XR18 or Focusrite Scarlett series
  - Direct USB audio routing
  - Simpler setup for non-Dante environments

## 🔧 **Working Scripts**

### Tested & Confirmed Working
- **[start_dvs_streams.bat](start_dvs_streams.bat)** - ✅ **Production Ready**
  - Multi-stream DVS setup with auto IP detection
  - Variable-based configuration for easy customization
  - **Successfully tested** with live audio streaming

- **[stream.bat](stream.bat)** - ✅ **Single Stream Testing**
  - Perfect for learning and troubleshooting
  - Test individual streams before multi-stream setup

## 🎯 **Recommended Approach Based on Real Testing**

### For DVS Users (Professional Setups)
1. **Start with Steps 1-7** in `LANStreamer-basic-dvs.md` (confirmed working)
2. **Use FFmpeg Direct Streaming** (Option A: Single Stream, Option B: Multi-Stream)
3. **Skip Ezstream initially** (known issues) - focus on proven FFmpeg approach
4. **Test with `stream.bat` first**, then move to `start_dvs_streams.bat`

### For XR18/USB Users (Simpler Setups)
1. Follow `LANStreamer-basic-xr18.md` for USB audio interface setup
2. Use provided batch scripts for streaming

## 📝 **Usage Notes**

- **Manual setup** is recommended for users who want to understand the underlying FFmpeg and Icecast components
- **Production environments** benefit from the control and transparency of manual configuration
- **Web application** (in project root) provides a user-friendly alternative for simple deployments

## 🔄 **Integration with Main Project**

These manual setup files complement the main LANStreamer web application:
- **Learning**: Understand the underlying technology before using the web interface
- **Troubleshooting**: Debug issues by testing components individually
- **Production**: Deploy with full control over streaming parameters
- **Custom Setups**: Adapt for specific hardware configurations not covered by the web app

# LANStreamer Installation Guide

## Quick Start

### For New Users:
1. **Run `INSTALL LANStreamer.bat` as Administrator** (Right-click → Run as administrator)
2. **Choose mDNS setup option** when prompted:
   - **Option 1 (Recommended)**: Enable Windows mDNS feature
   - **Option 2**: Install Bonjour Print Services (if Option 1 fails)
   - **Option 3**: Skip mDNS and use IP addresses
3. **Restart your computer** (required for mDNS to work)
4. **Run `Start LANStreamer Server.bat`** to start the server

### For Existing Users:
- Just run `Start LANStreamer Server.bat` to start the server

## Why mDNS is Important

**Problem**: Your router assigns dynamic IP addresses that change when you restart it. This means:
- Listeners have to update their bookmarks every time
- You have to tell people the new IP address
- It's inconvenient for regular users

**Solution**: mDNS creates a stable hostname `lanstreamer.local` that:
- Always points to your current IP address
- Never changes, even when your router restarts
- Makes it easy for listeners to bookmark and access

## What Each Script Does

### `INSTALL LANStreamer.bat`
- ✅ Checks Node.js installation
- ✅ Installs all dependencies
- ✅ Sets up mDNS support (requires admin)
- ✅ Creates desktop shortcut
- ✅ Detects network configuration
- ✅ Option to start server immediately

### `Start LANStreamer Server.bat`
- ✅ Quick server startup
- ✅ Shows access URLs
- ✅ Handles dependency installation (if needed)
- ✅ Network configuration display

## Access URLs

After installation and server start:

- **Admin Dashboard**: `http://[YOUR_IP]:3001`
- **Streams Page (mDNS)**: `http://lanstreamer.local:3001/streams`
- **Streams Page (IP)**: `http://[YOUR_IP]:3001/streams`

## Troubleshooting

### mDNS Not Working?
- Ensure you ran the install script as Administrator
- Restart your computer after installation
- Use the IP address URL as fallback

### Dependencies Issues?
- Run `INSTALL LANStreamer.bat` again
- Check internet connection
- Try: `npm cache clean --force`

### Server Won't Start?
- Check if port 3001 is available
- Ensure Node.js is installed
- Run the install script first

## Network Requirements

- All devices must be on the same local network
- Windows Firewall may need to allow Node.js
- Router should not block mDNS traffic (port 5353)

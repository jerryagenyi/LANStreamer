# Icecast Installation Guide

> **Simple 3-step guide to install Icecast streaming server**

## What is Icecast?
Icecast is the streaming server that broadcasts your audio to listeners. LANStreamer sends audio to Icecast, which then distributes it over the network.

## Quick Install

### Windows (Recommended)
```powershell
# Download installer from https://icecast.org/download/
# Run IcecastWin32-X.X.X-Setup.exe as Administrator
# Default install location: C:\Program Files (x86)\Icecast\
```

### macOS
```bash
brew install icecast
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install icecast2 -y
```

## Quick Test
```bash
# Check if installed
icecast -v

# Start Icecast (Windows)
cd "C:\Program Files (x86)\Icecast"
icecast.exe -c icecast.xml

# Test web interface
# Open: http://localhost:8000/admin/
# Login: admin / hackme (change this!)
```

## Common Issues

**"Address already in use" error**
```bash
# Something else is using port 8000
netstat -tulpn | grep :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
# Kill the process or change Icecast port in config
```

**Can't access admin interface**
- Check if Icecast is running: `tasklist | findstr icecast` (Windows)
- Try: http://localhost:8000/admin/ (login: admin/hackme)
- Check firewall settings

**LANStreamer can't connect**
- Verify source password in icecast.xml matches LANStreamer config
- Check if Icecast is running and accessible
- Default source password is usually "hackme" (change this!)

## Security Note
**⚠️ Change default passwords immediately:**
- Admin password: `hackme` → your secure password
- Source password: `hackme` → your secure password

Edit `icecast.xml` and restart Icecast after changes.

## Need More Help?
- **Official Documentation**: https://icecast.org/docs/
- **LANStreamer Issues**: https://github.com/jerryagenyi/LANStreamer/issues

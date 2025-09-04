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

## 🔧 Configuration & Network Setup

### Essential Configuration Steps

1. **Navigate to Icecast installation directory:**
   ```
   C:\Program Files (x86)\Icecast\
   ```

2. **Edit `icecast.xml` as Administrator**

3. **Change Default Passwords (CRITICAL!):**
   ```xml
   <authentication>
       <source-password>YourSecureSourcePassword123!</source-password>
       <relay-password>YourSecureRelayPassword123!</relay-password>
       <admin-user>admin</admin-user>
       <admin-password>YourSecureAdminPassword123!</admin-password>
   </authentication>
   ```

4. **Network Access Configuration:**
   ```xml
   <!-- Change localhost to your computer's IP for network access -->
   <hostname>192.168.1.100</hostname>  <!-- Replace with your actual IP -->
   ```

   **Find your IP address:**
   ```cmd
   ipconfig
   ```
   Look for IPv4 Address (e.g., 192.168.1.100)

### 🚨 Critical Path Configuration Fix

**If you get "FATAL: could not open error logging" or similar path errors:**

The most common issue is Windows permission errors with relative paths. **Solution: Use absolute paths**

**Replace this in `icecast.xml`:**
```xml
<paths>
    <logdir>./log</logdir>
    <webroot>./web</webroot>
    <adminroot>./admin</adminroot>
</paths>
```

**With this (using your actual Icecast installation path):**
```xml
<paths>
    <!-- Use full absolute paths to avoid Windows permission errors -->
    <logdir>C:\Program Files (x86)\Icecast\log</logdir>
    <webroot>C:\Program Files (x86)\Icecast\web</webroot>
    <adminroot>C:\Program Files (x86)\Icecast\admin</adminroot>
</paths>
```

**Common Error Example:**
```
Error: FATAL: could not open error logging (C:\Program Files (x86)\Icecast\log): No such file or directory
```

**This happens because:**
- Windows permission restrictions on relative paths
- Icecast can't create/access log files in relative directories
- Solution: Always use full absolute paths in Windows installations

## Common Issues & Solutions

**"Address already in use" error**
```bash
# Something else is using port 8000
netstat -tulpn | grep :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
# Kill the process or change Icecast port in config
```

**Can't access admin interface**
- Check if Icecast is running: `tasklist | findstr icecast` (Windows)
- Try: http://localhost:8000/admin/ (login: admin/your-password)
- Try: http://YOUR-IP:8000/admin/ for network access
- Check firewall settings - allow port 8000

**LANStreamer can't connect**
- Verify source password in icecast.xml matches LANStreamer config
- Check if Icecast is running and accessible
- Make sure passwords were changed from default "hackme"

**Windows Firewall Issues**
- Allow Icecast through Windows Firewall on port 8000
- Or temporarily disable firewall for testing

## 🌐 Accessing Icecast Admin Interface

**After starting Icecast, you can access the admin interface:**

**Local Access:**
- URL: `http://localhost:8000/admin/`
- Username: `admin`
- Password: `your-admin-password` (the one you set in icecast.xml)

**Network Access (from other devices):**
- URL: `http://YOUR-IP-ADDRESS:8000/admin/`
- Example: `http://192.168.1.100:8000/admin/`
- Username: `admin`
- Password: `your-admin-password`

**What you can do in admin interface:**
- View connected listeners
- Monitor stream statistics
- Manage mount points
- View server logs
- Control stream sources

**⚠️ Important:** LANStreamer automatically handles stream management, so you typically don't need to use the admin interface for daily operations. It's mainly useful for monitoring and troubleshooting.

## Security Note
**⚠️ Change default passwords immediately:**
- Admin password: `hackme` → your secure password
- Source password: `hackme` → your secure password

Edit `icecast.xml` and restart Icecast after changes.

## Network Discovery
**Good News:** LANStreamer automatically handles network discovery! When you configure Icecast with your IP address, LANStreamer will:
- Automatically detect available streams
- Display them in the web interface
- Handle connection management
- Provide easy sharing URLs for listeners

**No additional configuration needed** - just make sure Icecast is running and accessible on your network.

## Need More Help?
- **Official Documentation**: https://icecast.org/docs/
- **LANStreamer Issues**: https://github.com/jerryagenyi/LANStreamer/issues

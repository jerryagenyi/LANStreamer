# Icecast Installation Guide

> **Simple guide to install Icecast streaming server for non-technical users**

## What is Icecast?
Icecast is the streaming server that broadcasts your audio to listeners. LANStreamer sends audio to Icecast, which then distributes it over the network.

## 📥 Easy Installation (Windows)

### Step 1: Download Icecast
1. **Visit**: https://icecast.org/download/
2. **Find**: "Windows" section
3. **Download**: Click the latest `IcecastWin32-X.X.X-Setup.exe` file
4. **Save**: Download to your Downloads folder

### Step 2: Install Icecast
1. **Right-click** the downloaded file → **"Run as administrator"**
2. **Follow** the installation wizard (click "Next" through all steps)
3. **Accept** default installation location: `C:\Program Files (x86)\Icecast\`
4. **Finish** the installation

### Step 3: Verify Installation
1. **Open File Explorer**
2. **Navigate to**: `C:\Program Files (x86)\Icecast\`
3. **Check**: You should see folders like `bin`, `log`, `web`, etc.

> **✅ That's it!** Icecast is now installed and ready to use with LANStreamer.


## Quick Test
```bash
# Check if installed
cd "C:\Program Files (x86)\Icecast\bin"
icecast.exe -v

# Start Icecast
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
   Look for "IPv4 Address" under your main network adapter (usually Wi-Fi or Ethernet)
   
   **Choose the right IP:**
   - Use the IP from your **main network connection** (Wi-Fi or Ethernet)
   - Avoid VPN IPs (usually 100.x.x.x or 10.x.x.x)
   - Look for addresses starting with `192.168.` or `10.` (local network)
   - Example: `192.168.1.100` or `10.0.0.50`

### 🚨 Critical Path Configuration Fix

**If you get "FATAL: could not open error logging" or similar path errors:**

The most common issue is Windows permission errors with relative paths. **Try these solutions in order:**

#### **Step 1: Try Relative Paths First**
**If this is what you have in `icecast.xml` (notice not preceding dot before the forward slash) :**
```xml
<paths>
    <logdir>/log</logdir>
    <webroot>/web</webroot>
    <adminroot>/admin</adminroot>
</paths>
```

**...then replace it with this (should be the default relative paths but...🤷🏼‍♂️):**
```xml
<paths>
    <logdir>./log</logdir>
    <webroot>./web</webroot>
    <adminroot>./admin</adminroot>
</paths>
```

#### **Step 2: If Relative Paths Don't Work, Use Absolute Paths**
**If you still get errors, use full absolute paths:**
```xml
<paths>
    <!-- Use full absolute paths to avoid Windows permission errors -->
    <logdir>C:\Program Files (x86)\Icecast\log</logdir>
    <webroot>C:\Program Files (x86)\Icecast\web</webroot>
    <adminroot>C:\Program Files (x86)\Icecast\admin</adminroot>
</paths>
```

**Note about `mimetypes`:**
- This file is optional and not present in all Icecast installations
- Only include it if your installation actually has `mime.types` file
- If you get errors about missing `mime.types`, comment out or remove that line

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
netstat -ano | findstr :8000
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

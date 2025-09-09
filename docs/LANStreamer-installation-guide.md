# LANStreamer Installation Guide

## Quick Start

### For New Users:
1. **Run `INSTALL LANStreamer.bat`** (No Administrator required)
2. **Choose hostname setup** (pick one):
   - **Option A**: `SETUP mDNS.bat` (cross-platform, but unreliable on Windows)
   - **Option B**: `SETUP Windows Hostname.bat` ⭐ **Recommended for Windows**
3. **Run `Start LANStreamer Server.bat`** to start the server

> **💡 Windows Users**: The new `SETUP Windows Hostname.bat` script combines static IP setup with hosts file configuration for reliable `lanstreamer.local` access that works even after router reboots!

### For Existing Users:
- Just run `Start LANStreamer Server.bat` to start the server

## Two-Step Installation Process

### Step 1: Basic Installation
- **File**: `INSTALL LANStreamer.bat`
- **Purpose**: Install dependencies and create shortcuts
- **Requirements**: No Administrator privileges needed
- **Safe**: Won't fail due to mDNS issues

### Step 2: mDNS Setup (Optional)
- **File**: `SETUP mDNS.bat`
- **Purpose**: Enable stable hostname (lanstreamer.local)
- **Requirements**: Must run as Administrator
- **Benefit**: Listeners don't need to update IP addresses

## Network Stability Solutions

**Problem**: Your router assigns dynamic IP addresses that change when you restart it. This means:
- Listeners have to update their bookmarks every time
- You have to tell people the new IP address
- Connection loss during live events is unacceptable

**Solutions** (choose the best for your situation):

### **Option 1: mDNS (Cross-Platform)**
- Creates stable hostname `lanstreamer.local`
- Works on mobile devices and macOS/Linux
- **Windows Limitation**: Windows 10/11 has poor mDNS support

### **Option 2: Static IP + Hosts File (Windows-Reliable)**
1. **Set static IP** following [NETWORK-SETUP.md](./NETWORK-SETUP.md)
2. **Add to Windows hosts file** (as Administrator):
   ```cmd
   echo 192.168.1.100 lanstreamer.local >> C:\Windows\System32\drivers\etc\hosts
   ```
3. **Result**: `lanstreamer.local` works reliably on Windows

### **Option 3: Static IP Only**
- Most reliable for professional events
- See [NETWORK-SETUP.md](./NETWORK-SETUP.md) for setup
- Share direct IP: `http://192.168.1.100:3001/streams`

## What Each Script Does

### `INSTALL LANStreamer.bat`
- ✅ Checks Node.js installation
- ✅ Installs all dependencies
- ✅ Creates desktop shortcut
- ✅ Detects network configuration
- ✅ Option to start server immediately
- ✅ No Administrator privileges required
- ✅ Won't fail due to mDNS issues

### `SETUP Windows Hostname.bat` ⭐ **New & Recommended**
- ✅ Combines static IP setup with hosts file configuration
- ✅ Creates reliable `lanstreamer.local` hostname on Windows
- ✅ Works even after router reboots (with static IP)
- ✅ Guided setup process with clear instructions
- ✅ Automatically detects current network configuration
- ✅ Handles existing hosts file entries safely
- ⚠️ Requires Administrator privileges

### `SETUP mDNS.bat`
- ✅ Sets up mDNS support (requires Administrator)
- ✅ Multiple setup options (registry, Bonjour, skip)
- ✅ Enables Network Discovery
- ✅ Separate from main installation

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

## Manual mDNS Setup

If the automatic installer doesn't work, you can enable mDNS manually:

### Option 1: Windows Registry Method
1. **Open Command Prompt as Administrator**
2. **Run this command:**
   ```cmd
   reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters" /v "EnableMDNS" /t REG_DWORD /d 1 /f
   ```
3. **Enable Network Discovery:**
   ```cmd
   netsh advfirewall firewall set rule group="Network Discovery" new enable=Yes
   ```
4. **Restart your computer**

### Option 2: Alternative Methods
- **Install Bonjour Print Services** from Apple (may not work on newer Windows)
- **Use third-party mDNS software** like Avahi for Windows
- **Skip mDNS entirely** and use IP addresses

## Troubleshooting

### mDNS Not Working?
- Ensure you ran the install script as Administrator
- Restart your computer after installation
- Try the manual registry method above
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

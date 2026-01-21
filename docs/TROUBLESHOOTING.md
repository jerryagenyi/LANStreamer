# 🔧 Troubleshooting Guide

Common issues and solutions for LANStreamer.

## Table of Contents
- [Network Connectivity Issues](#network-connectivity-issues)
- [Stream Playback Issues](#stream-playback-issues)
- [Firewall Issues](#firewall-issues)
- [Audio Device Issues](#audio-device-issues)
- [Installation Issues](#installation-issues)

---

## Network Connectivity Issues

### Problem: "This site can't be reached" or Connection Timeout

**Symptoms:**
- Listeners see `ERR_CONNECTION_TIMED_OUT` or "refused to connect"
- Works on host PC (`localhost:3001`) but not on other devices
- Mobile devices can't access the stream page

**Common Causes:**

#### 1. Subnet Mismatch (Most Common)

**What it means:** Your server PC has multiple network adapters (WiFi, Ethernet, VPN) and is showing the wrong IP address.

**How to diagnose:**
1. On the **server PC**, open PowerShell (as Administrator):
   ```powershell
   ipconfig | Select-String -Pattern "IPv4"
   ```
2. You'll see multiple IP addresses like:
   ```
   IPv4 Address. . . . . . . . . . . : 192.168.8.135
   IPv4 Address. . . . . . . . . . . : 192.168.100.108
   ```
3. Check your **router's subnet**:
   - Look at your router's admin panel
   - Or check a working device's IP (Settings → WiFi → Network Details)
   - Example: If router is `192.168.100.1`, your subnet is `192.168.100.x`

**Solution:**
- Use the IP address that matches your router's subnet
- If router is `192.168.100.x`, use `192.168.100.108` (not `192.168.8.135`)
- Share the correct URL: `http://192.168.100.108:3001/streams`

**Why this happens:**
- Multiple network adapters (WiFi + Ethernet, or VPN active)
- LANStreamer auto-detects the first available IP
- Clients are on a different subnet and can't reach it

#### 1b. One PC Shows Two IPs (Dual-Adapter Confusion)

**Symptoms:**
- Server shows two LAN IPs (e.g., `192.168.8.x` and `192.168.100.x`)
- Only one of them works for listeners

**Fix:**
1. On server, list IPs:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
2. Identify the IP that matches the router's subnet (e.g., router `192.168.100.1` → use `192.168.100.x`).
3. Disable/remove the other adapter or extra IP:
   - `ncpa.cpl` → right-click unused adapter → Disable; or
   - Adapter Properties → IPv4 → Advanced → remove the secondary IP; or
   - Switch IPv4 to DHCP if a leftover static `.8` address exists.
4. Share only the subnet-matching URL (e.g., `http://192.168.100.x:3001/streams`).

#### 2. Windows Firewall Blocking Connections

**Solution:**
1. Open PowerShell as **Administrator**
2. Run these commands:
   ```powershell
   netsh advfirewall firewall add rule name="LANStreamer" dir=in action=allow protocol=TCP localport=3001
   netsh advfirewall firewall add rule name="Icecast" dir=in action=allow protocol=TCP localport=8000
   ```
3. Restart LANStreamer server

**Alternative (GUI method):**
1. Windows Security → Firewall & network protection
2. Advanced settings → Inbound Rules → New Rule
3. Port → TCP → Specific ports: `3001, 8000`
4. Allow connection → Apply to all profiles → Name: "LANStreamer"

#### 3. Not on Same Network

**Check:**
- All devices must be on the **same WiFi network** or **same LAN**
- Mobile hotspot creates a separate network - won't work
- VPNs can create separate networks - disable if testing locally

**Test:**
- Ping the server from a client device:
  ```cmd
  ping 192.168.100.108
  ```
- If ping fails, it's a network issue (not LANStreamer)

---

## Stream Playback Issues

### Problem: "Stream format not supported by your browser"

**Symptoms:**
- Error message appears on mobile browsers
- Stream works on desktop but not mobile
- Tried multiple browsers (Chrome, Edge, Brave) - all fail

**Possible Causes:**

1. **Mobile Browser Autoplay Restrictions**
   - Mobile browsers block auto-playing audio
   - **Solution:** User must manually tap the play button

2. **Codec Compatibility**
   - Some mobile browsers don't support certain audio formats
   - **Solution:** Try different browsers or check stream format

3. **Network Issues**
   - Slow connection causing buffer issues
   - **Solution:** Check network speed, try on WiFi instead of mobile data

**Troubleshooting Steps:**
1. Test on desktop browser first (Chrome/Firefox)
2. If desktop works, it's likely a mobile browser limitation
3. Check stream format in dashboard (MP3, AAC, or OGG)
4. Try accessing directly: `http://SERVER-IP:8000/stream_STREAMID` (bypass web player)

---

## Firewall Issues

### Problem: Ports Blocked by Firewall

**Symptoms:**
- LANStreamer starts but clients can't connect
- Works on localhost but not from network

**Solution:**

**Windows Firewall (PowerShell - Administrator):**
```powershell
# Allow LANStreamer web server (port 3001)
netsh advfirewall firewall add rule name="LANStreamer" dir=in action=allow protocol=TCP localport=3001

# Allow Icecast server (port 8000)
netsh advfirewall firewall add rule name="Icecast" dir=in action=allow protocol=TCP localport=8000
```

**Verify rules are active:**
```powershell
netsh advfirewall firewall show rule name="LANStreamer"
netsh advfirewall firewall show rule name="Icecast"
```

**Third-Party Firewalls:**
- If using antivirus with firewall (Norton, McAfee, etc.), add exceptions there too
- Check Windows Defender Firewall AND third-party firewall

---

## Audio Device Issues

### Problem: "No audio devices detected"

**Solution:**
1. Check device is connected and powered on
2. Test device in Windows Sound Settings
3. Restart LANStreamer after connecting device
4. Check device isn't being used by another application

### Problem: FFmpeg crashes when starting stream

**Error:** `exit code: 4294967291` or `exit code: -5`

**Solution:**
1. Device may be in use by another app - close other audio apps
2. Try a different audio device
3. Restart the audio device (unplug/replug USB devices)
4. Check Windows Sound Settings - ensure device is set as default

---

## Installation Issues

### Problem: "npm not found"

**Solution:**
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Choose the LTS version
- Restart terminal/command prompt after installation

### Problem: "Port 3001 already in use"

**Solution:**
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr :3001
   ```
2. Close the application using port 3001
3. Or change LANStreamer port in `.env` file: `PORT=3002`

### Problem: "Icecast installation not found"

**Solution:**
- See [Icecast Installation Guide](guides/icecast-installation.md)
- Ensure Icecast is installed in default location: `C:\Program Files (x86)\Icecast\`
- Or set `ICECAST_EXE_PATH` in `.env` file

---

## Quick Diagnostic Checklist

When troubleshooting, check these in order:

- [ ] **Server is running** - Check terminal shows "Server running on port 3001"
- [ ] **Same network** - All devices on same WiFi/LAN
- [ ] **Correct IP address** - Using IP that matches router's subnet
- [ ] **Firewall rules** - Ports 3001 and 8000 allowed
- [ ] **Icecast running** - Check dashboard shows "Running" status
- [ ] **Stream active** - Stream shows "Running" in dashboard
- [ ] **Test locally first** - `http://localhost:3001/streams` works

---

## Still Having Issues?

1. Check the [Comprehensive Documentation](LANStreamer-Documentation.md)
2. Review [Network Setup Guide](NETWORK-SETUP.md)
3. Check [Installation Guides](guides/README.md)
4. Create an issue on GitHub with:
   - Your OS and Node.js version
   - Error messages (full output)
   - Steps to reproduce
   - Network configuration details

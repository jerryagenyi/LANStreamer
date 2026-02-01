# 🔧 Troubleshooting Guide

Common issues and solutions for LANStreamer.

## Table of Contents
- [Icecast Connection Issues](#icecast-connection-issues) ⭐ **Start Here**
- [Network Connectivity Issues](#network-connectivity-issues)
- [Stream Playback Issues](#stream-playback-issues)
- [Firewall Issues](#firewall-issues)
- [Audio Device Issues](#audio-device-issues)
- [Installation Issues](#installation-issues)

---

## Icecast Connection Issues

### Problem: "Failed to start stream - Connection refused" or "FFmpeg crashed"

**Error Messages:**
- `Failed to start stream: Stream failed to start with all audio formats (MP3, AAC, OGG)`
- `FFmpeg crashed during startup (exit code: 4294967291)` (which is -5, connection refused)
- `FFmpeg crashed during startup (exit code: 2812791304)` (Windows process crash)
- Error output shows only FFmpeg version info with no actual error

**This is the #1 most common issue!** It usually means FFmpeg cannot connect to Icecast.

### Cause 1: Port 8000 Conflict (Most Common)

Another application is using port 8000, preventing Icecast from working properly.

**Common culprits:**
- **Docker Desktop** - Uses port 8000 by default
- **Other streaming servers** - Shoutcast, another Icecast instance
- **Development servers** - Some frameworks use port 8000

**How to diagnose:**
```powershell
# Check what's using port 8000
netstat -ano | findstr ":8000" | findstr "LISTENING"
```

**Example output showing Docker conflict:**
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING    27320  ← Docker
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING    46492  ← Icecast (can't bind properly)
```

**Solutions:**

**Option A: Stop the conflicting application**
- Close Docker Desktop
- Stop other streaming servers
- Kill the process: `taskkill /PID 27320 /F` (replace with actual PID)

**Option B: Change Icecast to use a different port**

1. Edit `icecast.xml` (requires admin/elevated PowerShell):
   ```
   Location: C:\Program Files (x86)\Icecast\icecast.xml
   ```
   
2. Find and change:
   ```xml
   <port>8000</port>
   ```
   to:
   ```xml
   <port>8080</port>
   ```

3. Create `.env` file in LANStreamer folder:
   ```
   ICECAST_PORT=8080
   STREAM_BASE_URL=http://localhost:8080
   ```

4. Restart both Icecast and LANStreamer

5. Update firewall rules for the new port:
   ```powershell
   netsh advfirewall firewall add rule name="Icecast8080" dir=in action=allow protocol=TCP localport=8080
   ```

### Cause 2: Icecast Not Running

**How to diagnose:**
```powershell
# Check if Icecast process exists
tasklist | findstr "icecast"
```

**Solution:**
1. Start Icecast from the LANStreamer dashboard (Icecast Server → Start Server)
2. Or start manually:
   ```powershell
   & "C:\Program Files (x86)\Icecast\bin\icecast.exe" -c "C:\Program Files (x86)\Icecast\icecast.xml"
   ```

### Cause 3: Icecast Log Directory Missing

**Symptoms:**
- Icecast starts but immediately crashes
- Dashboard shows Icecast as "Online" but HTTP requests fail with 500

**Solution:**
1. Create the log directory:
   ```powershell
   New-Item -ItemType Directory -Path "C:\Program Files (x86)\Icecast\log" -Force
   ```
2. Or edit `icecast.xml` to use full paths:
   ```xml
   <logdir>C:\Program Files (x86)\Icecast\log</logdir>
   ```

### Cause 4: Password Mismatch

**Symptoms:**
- FFmpeg error mentions "401 Unauthorized" or "authentication failed"

**Solution:**
1. Check `icecast.xml` for `<source-password>` (default: `hackme`)
2. Ensure `.env` has matching `ICECAST_SOURCE_PASSWORD=hackme`
3. Restart both Icecast and LANStreamer after changes

### Cause 5: Stream Source Limit Reached

**Symptoms:**
- First stream works, second stream fails
- Error mentions "too many sources"

**Note:** When you **start Icecast from the LANStreamer dashboard**, the app generates `icecast.xml` with `<sources>32</sources>`. If only 2 streams work, you are likely using an existing `icecast.xml` (e.g. from a manual Icecast install) that still has the default `<sources>2</sources>`. Edit it as below and restart Icecast.

**Solution:**
1. Edit `icecast.xml`:
   ```xml
   <limits>
       <sources>10</sources>  <!-- Change from 2 to desired number -->
   </limits>
   ```
2. Restart Icecast

**Debugging 5+ streams (when &lt;sources&gt;10&lt;/sources&gt; still fails):**

The app logs and exposes capacity so you can see which limit is hit:

1. **Logs:** Before each stream start you should see `Stream capacity check` with `sourceLimit`, `activeCount`, `remaining`, `configPath`, `aboutToStart`. Check that `sourceLimit` is 10 (or 32) and that `configPath` is the `icecast.xml` you edited.
2. **API:** `GET http://localhost:3001/api/system/config` returns `icecast.sourceLimit`, `icecast.activeStreams`, `icecast.remaining`, `icecast.configPath`. Use this to confirm which config file is used and how many slots the app thinks are free.
3. **If `remaining` is 0 before the 5th stream:** The app is reading a different `icecast.xml` (e.g. dashboard-generated vs system Icecast). Align by either starting Icecast from the dashboard (so the app writes the config) or ensuring `configPath` points at the file you edited.
4. **If `remaining` &gt; 0 but the 5th stream still fails:** Likely Icecast itself (wrong process, different config, or auth). Check Icecast logs and that the Icecast process was restarted after editing the config.

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
   netsh advfirewall firewall add rule name="Icecast8200" dir=in action=allow protocol=TCP localport=8200
   ```
   (Use 8000 and/or 8200 depending on your Icecast port in icecast.xml.)
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

### Problem: Listening page Play button or direct stream URL doesn't work

**Symptoms:**
- Play on `/streams` does nothing or shows "Stream not available"
- Opening the direct stream URL (e.g. `http://localhost:8200/streamId`) in a new tab doesn't play
- Works when testing with manual FFmpeg + curl, but not in the browser

**Cause:** The browser loads the stream from Icecast (port 8200). That can fail due to CORS (different origin), firewall blocking port 8200, or Icecast not being reachable from the browser.

**Solution (built-in):** The listening page uses a **same-origin proxy**. Playback goes through `GET /api/streams/play/:streamId` on the LANStreamer server (port 3001), which proxies to Icecast. So you only need port 3001 open to the browser; no need to open 8200 for listeners.

- **Play button:** Uses the proxy (same origin). If it still fails, ensure Icecast is running and the stream is active; check server logs for "Stream proxy error".
- **Copy URL:** Copies the direct Icecast URL (e.g. `http://192.168.1.244:8200/streamId`) for use in VLC or other players. For that to work from another device, allow Icecast port (8200) in the firewall on the server.

**If playback still fails:**
1. Confirm the stream is running (dashboard shows "Running").
2. Check Icecast is up: `curl -I http://localhost:8200/` should return 200.
3. Check LANStreamer logs for errors when you press Play.

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

# Allow Icecast server (port 8000 and/or 8200 - match your icecast.xml)
netsh advfirewall firewall add rule name="Icecast" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="Icecast8200" dir=in action=allow protocol=TCP localport=8200
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

1. Check the [System Architecture Documentation](LANSTREAMER_SYSTEM_ARCHITECTURE.md) for detailed technical information
2. Review [Network Setup Guide](NETWORK-SETUP.md) for network configuration
3. Check [Installation Guides](guides/README.md) for component setup
4. Create an issue on GitHub with:
   - Your OS and Node.js version
   - Error messages (full output)
   - Steps to reproduce
   - Network configuration details

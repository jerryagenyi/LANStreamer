# LANStreamer - Issue Tracking

**Last Updated:** 2026-01-21

## 🔴 Critical Issues

### 1. FFmpeg Crash (Exit Code 2812791304 / 0xA7F00008)
**Status:** 🔴 Active  
**Priority:** HIGH  
**Description:** FFmpeg crashes immediately when starting streams through LANStreamer, but works fine when:
- Streaming to file: ✅ Works
- Listing devices: ✅ Works
- Manual Icecast test: ❌ HTTP 500 from Icecast

**Findings:**
- Direct device access works (tested with `ffmpeg -f dshow -i audio="CABLE Output..." -t 5 test.mp3`)
- Icecast is reachable (`Test-NetConnection localhost -Port 8000` succeeds)
- Manual Icecast streaming returns `HTTP error 500 Internal Server Error`
- All audio devices fail with same crash code when using LANStreamer

**Possible Causes:**
- Icecast configuration issue (HTTP 500 suggests mountpoint/auth problem)
- FFmpeg command arguments when connecting to Icecast
- Timing issue (FFmpeg connecting before Icecast mountpoint is ready)
- Icecast password/authentication mismatch

**Next Steps:**
- [ ] Check Icecast logs for HTTP 500 details
- [ ] Verify Icecast mountpoint configuration
- [ ] Test with different Icecast password
- [ ] Compare working manual command vs LANStreamer command
- [ ] Check if mountpoint needs to be created first

---

### 2. Stream Limit (Max 2 Streams)
**Status:** 🔴 Active  
**Priority:** MEDIUM  
**Description:** Cannot create more than 2 streams

**Possible Causes:**
- Hardcoded limit in code
- Icecast source limit configuration
- Resource/process limit

**Next Steps:**
- [ ] Check `src/services/StreamingService.js` for stream limits
- [ ] Check `config/icecast.xml` for `<sources>` limit
- [ ] Verify if it's a frontend or backend limit

---

### 3. Mobile Playback Issues
**Status:** 🟡 Partially Fixed  
**Priority:** MEDIUM  
**Description:** Streams don't play on mobile browsers, but direct stream URL works

**Current Status:**
- ✅ Fixed: Removed strict format check that was blocking mobile playback
- ❌ Still broken: Mobile browsers still can't play through web player
- ✅ Workaround: Direct stream URL (`http://IP:8000/stream_ID`) works on mobile

**Next Steps:**
- [ ] Test mobile playback after format check fix
- [ ] Investigate HTML5 audio element compatibility on mobile
- [ ] Check if Content-Type headers are correct
- [ ] Consider adding mobile-specific player fallback

---

### 4. Cross-Subnet Network Access
**Status:** 🔴 Active  
**Priority:** HIGH (for NG-PC deployment)  
**Description:** Listeners on different subnets cannot access streams

**Current Workaround:**
- Users must use the IP address matching their router's subnet
- Example: If router is `192.168.100.x`, use `192.168.100.108:3001/streams` (not `192.168.8.135`)

**Root Cause:**
- Server PC has multiple network adapters (WiFi, Ethernet, VPN)
- LANStreamer auto-detects first available IP
- Clients on different subnets cannot reach the server

**Possible Solutions:**
- [ ] Add network interface selection in dashboard
- [ ] Show all available IPs and let user choose
- [ ] Implement mDNS/Bonjour for automatic discovery
- [ ] Add documentation for multi-subnet scenarios
- [ ] Consider using computer name instead of IP (if DNS works)

**Documentation:**
- ✅ Added to `docs/TROUBLESHOOTING.md` (subnet mismatch section)

---

## 🟡 Known Issues / Limitations

### 5. Icecast HTTP 500 Error
**Status:** 🔴 Active  
**Priority:** HIGH (blocks streaming)  
**Description:** Manual FFmpeg test shows `HTTP error 500 Internal Server Error` when connecting to Icecast

**Error Details:**
```
[http @ 00000227c9157700] HTTP error 500 Internal Server Error
[out#0/mp3 @ 00000227c9139900] Error opening output icecast://source:hackme@localhost:8000/test: Server returned 5XX Server Error reply
```

**Possible Causes:**
- Icecast mountpoint not configured correctly
- Authentication issue (password mismatch)
- Icecast XML configuration error
- Mountpoint path issue

**Next Steps:**
- [ ] Check Icecast error logs (`C:\Program Files (x86)\Icecast\log\error.log`)
- [ ] Verify Icecast XML configuration
- [ ] Test with different mountpoint names
- [ ] Check if mountpoint needs to exist before streaming

---

## ✅ Recently Fixed

- ✅ Error notification timeout increased to 60 seconds
- ✅ Improved error messages to show actual device names
- ✅ Mobile format check removed (was blocking playback)
- ✅ Network troubleshooting guide added
- ✅ Documentation reorganized and simplified

---

## 📝 Notes

- All devices fail with same crash code → suggests system-level issue, not device-specific
- Direct file streaming works → confirms FFmpeg and devices are fine
- Icecast HTTP 500 → suggests Icecast configuration or mountpoint issue
- NG-PC deployment needs cross-subnet solution for production use

---

## 🔧 Quick Reference

**Test Commands:**
```powershell
# Test FFmpeg device access
ffmpeg -f dshow -list_devices true -i dummy

# Test streaming to file
ffmpeg -f dshow -i audio="CABLE Output (VB-Audio Virtual Cable)" -t 5 test.mp3

# Test Icecast connection
ffmpeg -f dshow -i audio="CABLE Output (VB-Audio Virtual Cable)" -acodec libmp3lame -b:a 192k -ar 44100 -ac 2 -f mp3 -content_type audio/mpeg "icecast://source:hackme@localhost:8000/test" -t 10

# Test Icecast port
Test-NetConnection localhost -Port 8000
```

**Log Locations:**
- LANStreamer: `logs/`
- Icecast: `C:\Program Files (x86)\Icecast\log\error.log`

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
- ✅ **Icecast config checked:** No mountpoint restrictions, passwords correct (`hackme`)
- ⚠️ **Icecast logs:** Old (Aug 2025), no recent entries - logs may not be updating

**Root Cause (Likely):**
- HTTP 500 suggests Icecast is rejecting the mountpoint format
- Test used `/test` but LANStreamer uses `/${streamId}` (no extension)
- May need mountpoint to match format (e.g., `/test.mp3` for MP3)

**Next Steps:**
- [x] Check Icecast logs (old, no recent entries)
- [x] Verify Icecast mountpoint configuration (no restrictions found)
- [ ] Test mountpoint with file extension: `icecast://source:hackme@localhost:8000/test.mp3`
- [ ] Test without `-content_type` header (may be causing HTTP 500)
- [ ] Check if Icecast needs mountpoint to be created first
- [ ] Verify Icecast is actually running (restart may be needed)

---

### 2. Stream Limit (Max 2 Streams)
**Status:** ✅ **ROOT CAUSE FOUND**  
**Priority:** MEDIUM  
**Description:** Cannot create more than 2 streams

**Root Cause:**
- ✅ **Found in Icecast config:** `<sources>2</sources>` in `C:\Program Files (x86)\Icecast\icecast.xml`
- This is an Icecast server limit, not a LANStreamer limit

**Fix:**
- Change `<sources>2</sources>` to `<sources>10</sources>` (or desired number)
- Restart Icecast server after change

**Next Steps:**
- [ ] Update Icecast XML: Change `<sources>2</sources>` to higher number
- [ ] Restart Icecast server
- [ ] Test creating 3+ streams

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

**Findings:**
- ✅ Icecast config checked: Passwords correct (`hackme`), no mountpoint restrictions
- ⚠️ Icecast logs are old (Aug 2025) - may not be logging recent errors
- Test command used: `icecast://source:hackme@localhost:8000/test` (no extension)

**Possible Causes:**
- Mountpoint format issue (may need `.mp3` extension for MP3 streams)
- `-content_type` header causing Icecast to reject connection
- Icecast not properly restarted after config changes
- Mountpoint path format incompatible

**Test Commands to Try:**
```powershell
# Test 1: With file extension
ffmpeg -f dshow -i audio="CABLE Output (VB-Audio Virtual Cable)" -acodec libmp3lame -b:a 192k -ar 44100 -ac 2 -f mp3 "icecast://source:hackme@localhost:8000/test.mp3" -t 5

# Test 2: Without content_type header
ffmpeg -f dshow -i audio="CABLE Output (VB-Audio Virtual Cable)" -acodec libmp3lame -b:a 192k -ar 44100 -ac 2 -f mp3 "icecast://source:hackme@localhost:8000/test" -t 5
```

**Next Steps:**
- [x] Check Icecast error logs (old, no recent entries)
- [x] Verify Icecast XML configuration (passwords correct)
- [ ] Test mountpoint with `.mp3` extension
- [ ] Test without `-content_type` header
- [ ] Restart Icecast server (may need fresh start)
- [ ] Check Icecast process is actually running

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

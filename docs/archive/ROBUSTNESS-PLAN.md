# LANStreamer robustness plan

Breaking the system down by domain with explicit failure-mode analysis. Each layer has clear boundaries, enumerated failure modes, and testable mitigation.

---

## Layer 1: Environment detection & setup

### 1.1 Icecast discovery

- **What could go wrong?**
  - Not installed
  - Installed but not in PATH
  - Installed but wrong version (flags changed)
  - Multiple versions on system
  - Config file missing or corrupted
  - Port conflicts (8000 already in use)
  - Permissions issues (can't write to config/logs)
- **How do you test for it?**
  - `which icecast` / `where icecast`
  - `icecast --version` and parse output
  - Try to load/warm-start the config and catch errors
  - Check port availability before starting
- **Mitigation**
  - Clear error messages with install links
  - Prompt to download missing binary
  - Auto-generate config from template
  - Offer alternative port if 8000 taken
  - Validate config before launching

### 1.2 FFmpeg discovery

- **What could go wrong?**
  - Not installed
  - In PATH but lacking codecs (libmp3lame, libopus, etc.)
  - Wrong version (some flag changes between versions)
  - FFmpeg exists but ffprobe doesn't (or vice versa)
- **How do you test for it?**
  - `ffmpeg -version` and parse for codecs
  - `ffprobe -version` for metadata capabilities
  - Try a dummy encode to verify codec support
- **Mitigation**
  - Codec-specific error messages ("You need FFmpeg with libmp3lame")
  - Offer bundled/config instructions for common OSs
  - Graceful degradation if some codecs missing

### 1.3 Audio device discovery

- **What could go wrong?**
  - No audio devices found
  - Device name has special characters that break CLI
  - Device disconnected mid-stream
  - Device name changes between sessions (Windows "Microphone (2)" vs "Microphone (3)")
  - Permission denied (macOS/Windows privacy controls)
- **How do you test for it?**
  - `ffmpeg -list_devices true -f dshow -i dummy` (Windows)
  - `ffmpeg -f avfoundation -list_devices true -i ""` (macOS)
  - `pactl list sources` (Linux PulseAudio)
  - Store device fingerprint/hash to detect renaming
- **Mitigation**
  - Cache device mappings with stable IDs
  - Device aliasing/user-friendly names
  - Graceful reconnection attempts
  - Clear permission prompts

---

## Layer 2: Stream lifecycle management

### 2.1 Stream creation

- **What could go wrong?**
  - Duplicate stream name
  - Invalid characters in stream name (Icecast mount point restrictions)
  - Source limit reached (Icecast default: 2 sources)
  - Port collision if assigning unique ports per stream
- **Testing & mitigation**
  - Validate name against regex before creating
  - Check Icecast `<sources>` limit before creating
  - Pre-flight checks: "Can this stream actually start?"

### 2.2 Stream start (spawn FFmpeg)

- **What could go wrong?**
  - FFmpeg exits immediately (codec issue, device busy)
  - FFmpeg starts but no audio (silent stream)
  - FFmpeg starts but wrong sample rate/channels
  - Icecast rejects the connection (wrong password, mount exists)
- **Testing & mitigation**
  - Health check: verify FFmpeg process stays alive > 5 seconds
  - Probe Icecast mount point to confirm audio is flowing
  - Parse FFmpeg stderr for known error patterns
  - Exponential backoff on retry

### 2.3 Stream stop/cleanup

- **What could go wrong?**
  - FFmpeg won't die (zombie process)
  - Icecast mount point stays active
  - Port not released
  - State desync (UI thinks stopped, but still running)
- **Testing & mitigation**
  - Force-kill if graceful shutdown fails
  - Explicit Icecast mount unregister
  - State reconciliation on startup ("What streams are actually running?")
  - Cleanup orphaned processes on server start

### 2.4 Stream restart (hot reload)

- **What could go wrong?**
  - Old process dies but new one fails to start
  - Brief downtime that drops all listeners
  - Config change invalidates active stream
- **Testing & mitigation**
  - Atomic switch: start new before killing old (if source allows)
  - Graceful handoff with listener notification
  - Rollback on failure

---

## Layer 3: Audio pipeline

### 3.1 Audio capture

- **What could go wrong?**
  - Sample rate mismatch (device 48 kHz, expect 44.1 kHz)
  - Channel mismatch (stereo vs mono)
  - Device goes silent (mic unplugged, app stops granting permission)
  - Clipping/distortion (gain too high)
- **Testing & mitigation**
  - Auto-detect device capabilities and configure accordingly
  - Audio level monitoring (alert if silent for > X seconds)
  - Auto-normalize or gain controls
  - Fall back to default device if selected fails

### 3.2 Encoding

- **What could go wrong?**
  - Wrong codec for format (MP3 vs Opus vs AAC)
  - Bitrate too high for listeners' bandwidth
  - CPU overload (encoding quality too high)
- **Testing & mitigation**
  - Codec compatibility matrix (what works where)
  - Adaptive bitrate based on listener count
  - CPU monitoring, quality stepping down if needed

### 3.3 Icecast integration

- **What could go wrong?**
  - Authentication failure (wrong password in config)
  - Mount point already exists
  - Icecast crashes or restarts
  - Network hiccup between FFmpeg and Icecast
- **Testing & mitigation**
  - Connection health monitoring
  - Auto-reconnect with backoff
  - Heartbeat/ping to detect Icecast aliveness
  - Config validation before use

---

## Layer 4: Listener delivery

### 4.1 Stream discovery

- **What could go wrong?**
  - Listener can't find server (wrong IP, firewall)
  - Server IP changes (DHCP)
  - mDNS/Bonjour not working
- **Testing & mitigation**
  - Display server IP prominently, include QR code
  - Link-local addresses (hostname.local)
  - Simple connectivity test on listener page ("Can I reach the server?")

### 4.2 Playback

- **What could go wrong?**
  - Browser doesn't support codec
  - Buffer underruns (stuttering)
  - High latency (not suitable for translation)
  - Listener device goes to sleep, loses connection
- **Testing & mitigation**
  - Codec fallback cascade (Opus → MP3 → AAC)
  - Adaptive buffering based on network conditions
  - Auto-reconnect with UI indication
  - Latency display (so admin knows if there's an issue)

---

## Layer 5: State & configuration

### 5.1 Persistent state

- **What could go wrong?**
  - Config file corrupted (bad JSON)
  - Config file permissions issue
  - Multiple processes writing to same config
  - Config schema changes break old configs
- **Testing & mitigation**
  - Config validation on load (schema, JSON parse)
  - Backup/rollback before writes
  - Atomic file writes (write temp, then rename)
  - Schema migration path

### 5.2 Runtime state

- **What could go wrong?**
  - State desync (what's running vs. what we think is running)
  - Memory leak in long-running process
  - Event listeners not cleaned up
- **Testing & mitigation**
  - State reconciliation function (ask OS "what's actually running")
  - Regular health checks
  - Explicit cleanup on all state changes

---

## Layer 6: Error handling & diagnostics

### 6.1 Error detection

- **What could go wrong?**
  - FFmpeg error patterns not recognized
  - False positives (normal noise treated as error)
  - Errors swallowed somewhere in the stack
- **Testing & mitigation**
  - Comprehensive error pattern library (errorDiagnostics.js)
  - Error taxonomy (fatal, recoverable, warning, info)
  - Error context (stream name, device, timestamp)

### 6.2 Error recovery

- **What could go wrong?**
  - Retry loop never succeeds (hammering resources)
  - Recovery makes things worse
  - User not informed what's happening
- **Testing & mitigation**
  - Max retry limits with exponential backoff
  - Recovery strategies per error type (some need manual intervention)
  - User-facing messages with actionable next steps

---

## Layer 7: Admin UI

### 7.1 Dashboard

- **What could go wrong?**
  - UI shows stale state (not synced to backend)
  - Controls don't work (but don't show error)
  - Overwhelming amount of information
- **Testing & mitigation**
  - Real-time state sync (Socket.io or polling)
  - Optimistic UI updates with rollback on failure
  - Progressive disclosure (show essentials, details on demand)

### 7.2 Stream controls

- **What could go wrong?**
  - Click "Start" but nothing happens
  - Click "Stop" and it asks "Are you sure?" every time
  - No indication of what's happening (starting... started... failed)
- **Testing & mitigation**
  - Loading states for all async actions
  - Clear success/error feedback
  - Keyboard shortcuts for power users
  - Bulk operations (start all, stop all)

---

## Layer 8: Listener UI

### 8.1 Accessibility

- **What could go wrong?**
  - Not keyboard navigable
  - No screen reader support
  - Poor contrast
  - Small touch targets on mobile
- **Testing & mitigation**
  - WCAG 2.1 AA compliance
  - Keyboard navigation audit
  - Screen reader testing
  - Touch target minimum 44×44 px

### 8.2 Usability

- **What could go wrong?**
  - Too much information (what do I click?)
  - No volume control
  - Can't tell which stream is which
  - No error state ("Why isn't it playing?")
- **Testing & mitigation**
  - Simple primary action: "Play stream"
  - Stream metadata (name, source, listener count)
  - Clear error messages with next steps
  - Mobile-first responsive design

---

## Refactoring path

1. **Layer 1** — Solid environment detection and validation. Everything else depends on this.
2. **Layer 2 (Lifecycle)** — Clean up how streams are created/started/stopped. Core orchestration.
3. **Layer 6 (Errors)** — Build the diagnostic system alongside each layer, not after.
4. **Layer 3 (Audio pipeline)** — Once FFmpeg is reliable, make the audio flow reliable.
5. **Layers 4, 7, 8 (UI/UX)** — Once the backend is solid, improve the UI thoughtfully.

---

## Scope note: internet streaming

Building internet streaming from scratch is reinventing the wheel. For streaming to the world, use:

- YouTube Live (RTMP)
- Twitch (RTMP)
- Restream.io / Castr (multi-platform)

**LANStreamer's strength is local, low-latency, private streaming. Lean into that.**

# Startup sequence: `npm run dev`

Use this to troubleshoot step-by-step. Each step can fail independently.

---

## 1. Command

| Step | What runs | Notes |
|------|------------|--------|
| 1.1 | You run `npm run dev` | |
| 1.2 | npm runs `nodemon src/server.js` | Nodemon watches files and restarts on change |
| 1.3 | Node executes `src/server.js` | Entry point |

**Check:** Terminal shows nodemon starting and no immediate crash.

---

## 2. Module load (synchronous)

When `server.js` is loaded, Node loads these in dependency order:

| Step | Module | Purpose |
|------|--------|--------|
| 2.1 | `config/index.js` | Reads `config/device-config.json` for Icecast port fallback |
| 2.2 | `routes/system.js` | Registers system routes; **starts** `IcecastService.initialize()` (async, does not block) |
| 2.3 | Other route files (streams, settings, auth, contact) | Register API routes |
| 2.4 | `StreamingService.js` | Imports FFmpegService, IcecastService, AudioDeviceService, config |
| 2.5 | `server.js` | Builds Express app, mounts routes, sets up static files and fallback routes |

**Check:** No `Cannot find module` or syntax errors. If Icecast init fails here, you only see a logged error; server still starts.

---

## 3. HTTP server start

| Step | What happens | Where (code) |
|------|----------------|---------------|
| 3.1 | `app.listen(PORT, HOST)` runs | `server.js` ~line 166 |
| 3.2 | PORT = `process.env.PORT` or **3001** | |
| 3.3 | HOST = `process.env.HOST` or **0.0.0.0** | |
| 3.4 | Server binds to `0.0.0.0:3001` | Listens on all interfaces |
| 3.5 | Callback runs: prints "Server is listening...", derives local IPv4, prints dashboard/streams URLs | |

**Check:** Console shows `Server is listening on http://0.0.0.0:3001` and the two URLs. If "Port 3001 already in use", another process has the port.

---

## 4. IcecastService initialization (async, in parallel)

Started when `system.js` was loaded (step 2.2). Runs in background; does **not** start the Icecast process, only discovers config and current status.

| Step | What happens | Can fail if |
|------|----------------|--------------|
| 4.1 | `loadDeviceConfig()` | Reads `config/device-config.json` for cached Icecast paths |
| 4.2 | `validateSavedPath()` or `detectInstallation()` | Finds `icecast.exe` (e.g. under Program Files) |
| 4.3 | `ensureConfigDirectory()` | Ensures config dir exists for generated `icecast.xml` |
| 4.4 | `parseMaxListeners()`, `parsePort()`, `parsePasswords()`, `parseHostname()` | Reads **icecast.xml** (or template); sets port, passwords, hostname |
| 4.5 | `startConfigWatcher()` | Watches icecast.xml for changes |
| 4.6 | `checkRunningStatus()` | Checks if Icecast process is already running (e.g. admin/stats) |

**Check:** Logs show "Icecast Service initialized successfully" (or an error). If init fails, dashboard may still load but Icecast controls/status may be wrong. Check `logs/combined.log`.

---

## 5. User opens dashboard

| Step | What happens | Notes |
|------|----------------|--------|
| 5.1 | Browser requests e.g. `http://localhost:3001/dashboard` | |
| 5.2 | Server serves `public/index.html` | Static file |
| 5.3 | Frontend loads; may call `/api/system/status`, `/api/system/audio-devices`, etc. | |
| 5.4 | `/api/system/status` (or similar) may call `icecastService.ensureInitialized()` then get status | If init failed, status may show error |
| 5.5 | Audio devices list comes from `AudioDeviceService.getAudioDevices()` (FFmpeg probe) | |

**Check:** Dashboard loads; "FFmpeg Ready" and Icecast status (e.g. "Server Offline") appear. If Icecast shows "Server Online" here, Icecast was already running before you opened the dashboard.

---

## 6. User starts Icecast (from dashboard)

| Step | What happens | Notes |
|------|----------------|--------|
| 6.1 | User clicks "Start Server" (or equivalent) | |
| 6.2 | Frontend sends POST to start Icecast (e.g. `/api/system/icecast/start` or similar) | |
| 6.3 | Backend calls `icecastService.start()` | |
| 6.4 | IcecastService writes/updates `icecast.xml` (port, hostname, passwords, etc.), then spawns `icecast.exe -c <path to icecast.xml>` | Port comes from config (e.g. 8000 or 8200) |
| 6.5 | Icecast process binds to its `<port>` (and possibly admin port) | If port in use, Icecast may fail to start |

**Check:** Dashboard shows "Server Online" and port (e.g. 8200). If it stays "Offline", check: port conflict, missing icecast.exe, or bad icecast.xml (see TROUBLESHOOTING.md).

---

## 7. User creates a stream

| Step | What happens | Notes |
|------|----------------|--------|
| 7.1 | User picks device/file, bitrate, etc., and starts stream | |
| 7.2 | Frontend POSTs to streams API (e.g. `/api/streams` with action start) | |
| 7.3 | `StreamingService.startStream()` runs | |
| 7.4 | Service checks Icecast is running (process check; may not hit admin URL) | |
| 7.5 | `buildFFmpegArgs()` builds command: **Icecast URL must use `localhost` and actual port** (from IcecastService) | Regression fix: host is `localhost`, not public hostname |
| 7.6 | FFmpeg process spawned: input = device or file, output = `icecast://source:PASSWORD@localhost:PORT/streamId` | |
| 7.7 | FFmpeg connects to Icecast on localhost:PORT | If Icecast not listening or wrong port → "Connection refused" (e.g. exit -5) |

**Check:** Stream appears as "Running"; no "Connection refused". If refused: Icecast not running, wrong port, or firewall (see TROUBLESHOOTING.md).

---

## Quick checklist (order to verify)

1. **npm run dev** → Process starts, no crash.
2. **Config** → (if present) `config/device-config.json` loads without error.
3. **HTTP server** → "Server is listening on http://0.0.0.0:3001" and URLs printed.
4. **IcecastService init** → "Icecast Service initialized successfully" in logs (or resolve the logged error).
5. **Dashboard** → Page loads; FFmpeg and Icecast status shown.
6. **Start Icecast** → Dashboard shows "Server Online" on the correct port.
7. **Start stream** → Stream starts; no connection refused; audio plays on `/streams`.

---

## Related docs

- **TROUBLESHOOTING.md** – Common failures at each stage (Icecast, network, playback, firewall).
- **NETWORK-SETUP.md** – Static IP, DHCP reservation, sharing URLs with listeners.

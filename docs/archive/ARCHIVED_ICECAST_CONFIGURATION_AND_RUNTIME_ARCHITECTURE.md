# LANStreamer Icecast Configuration & Runtime Architecture

## Overview

This document provides a comprehensive, step-by-step breakdown of how LANStreamer initializes, reads Icecast configuration from `icecast.xml`, and manages runtime behavior. Every process, function call, and file interaction is documented in detail.

---

## Table of Contents

1. [Initial Startup Sequence (`npm run dev`)](#initial-startup-sequence)
2. [Module Loading & Service Instantiation](#module-loading--service-instantiation)
3. [IcecastService Initialization Flow](#icecastservice-initialization-flow)
4. [Configuration Parsing Details](#configuration-parsing-details)
5. [File Watching System](#file-watching-system)
6. [Runtime Port & Config Access](#runtime-port--config-access)
7. [Stream Creation Flow](#stream-creation-flow)
8. [Subsequent Requests & Caching](#subsequent-requests--caching)
9. [Error Handling & Diagnostics](#error-handling--diagnostics)

---

## Initial Startup Sequence (`npm run dev`)

### Step 1: Package.json Script Execution

**File:** `package.json`  
**Script:** `"dev": "nodemon src/server.js"`

```
npm run dev
  └─> nodemon executes: node src/server.js
      └─> Node.js runtime loads src/server.js
```

### Step 2: Server.js Module Loading

**File:** `src/server.js`  
**Line 1-13:** Module imports (synchronous, top-to-bottom)

```javascript
// Execution order:
1. import express from 'express'                    // Load Express framework
2. import path from 'path'                          // Load path utilities
3. import { fileURLToPath } from 'url'             // Load URL utilities
4. import os from 'os'                             // Load OS utilities
5. import readline from 'readline'                 // Load readline for shutdown
6. import systemRouter from './routes/system.js'   // ⚠️ TRIGGERS ICECAST INIT
7. import streamsRouter from './routes/streams.js' // Load streams router
8. import settingsRouter from './routes/settings.js'
9. import contactRouter from './routes/contact.js'
10. import authRouter from './routes/auth.js'
11. import { optionalAuth, authenticateToken } from './middleware/auth.js'
12. import streamingService from './services/StreamingService.js' // ⚠️ INSTANTIATES STREAMING SERVICE
13. import logger from './utils/logger.js'          // Load logger
```

**Critical Point:** When `systemRouter` is imported (line 6), it immediately triggers IcecastService initialization.

### Step 3: Routes/System.js Import Triggers IcecastService Initialization

**File:** `src/routes/system.js`  
**Lines 1-13:** Module-level code execution

```javascript
// This code runs IMMEDIATELY when module is imported (before server starts)
import express from 'express';
import audioDeviceService from '../services/AudioDeviceService.js';
import IcecastService from '../services/IcecastService.js';  // ⚠️ Imports singleton instance

const router = express.Router();
const icecastService = IcecastService;  // Reference to singleton

// ⚠️ THIS RUNS IMMEDIATELY (not waiting for server to start)
icecastService.initialize().catch(error => {
  console.error('Failed to initialize Icecast service:', error.message);
});
```

**Timing:** This `initialize()` call happens **during module import**, before `server.js` finishes loading.

### Step 4: StreamingService Constructor Execution

**File:** `src/services/StreamingService.js`  
**Line 1270:** `export default new StreamingService()` - Singleton instantiation

**Constructor Execution (Lines 16-35):**

```javascript
constructor() {
  // 1. Initialize active streams map
  this.activeStreams = {}
  
  // 2. Reference FFmpegService (singleton, already instantiated)
  this.ffmpegService = FFmpegService
  
  // 3. Set config file path
  this.streamsConfigPath = join(process.cwd(), 'config', 'streams.json')
  
  // 4. Initialize Icecast status tracking
  this.lastIcecastStatus = 'unknown'
  this.icecastDownSince = null
  this.ICECAST_GRACE_PERIOD_SECONDS = 30
  
  // 5. Load persistent streams from disk (synchronous file read)
  this.loadPersistentStreams()  // Reads config/streams.json if exists
  
  // 6. Clean up old streams (synchronous)
  this.cleanupOldStreams()
  
  // 7. Set up periodic cleanup interval (runs every 6 hours)
  this.cleanupInterval = setInterval(() => {
    this.cleanupOldStreams()
  }, 6 * 60 * 60 * 1000)
}
```

**Note:** StreamingService constructor does **NOT** call IcecastService methods yet - it just sets up internal state.

### Step 5: Server.js Continues Loading

**File:** `src/server.js`  
**Lines 18-27:** Express app setup

```javascript
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware registration
app.use(express.json());  // JSON body parser

// Static file serving
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));  // Serves public/ directory
```

**Lines 36-44:** Route registration

```javascript
app.use('/api/auth', authRouter);
app.use('/api/system', systemRouter);    // Routes already loaded, IcecastService.init() in progress
app.use('/api/streams', streamsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', contactRouter);
```

**Lines 168-226:** Server starts listening

```javascript
server = app.listen(PORT, HOST, () => {
  console.log(`Server is listening on http://${HOST}:${PORT}`);
  // ... network interface detection code ...
});
```

**Timing Note:** At this point, IcecastService initialization may still be in progress (it's async).

---

## Module Loading & Service Instantiation

### Service Singleton Pattern

All services are exported as singleton instances:

| Service | File | Export Pattern | Instantiation Time |
|---------|------|----------------|-------------------|
| **IcecastService** | `src/services/IcecastService.js` | `export default new IcecastService()` | When `routes/system.js` imports it |
| **StreamingService** | `src/services/StreamingService.js` | `export default new StreamingService()` | When `server.js` imports it |
| **FFmpegService** | `src/services/FFmpegService.js` | `export default new FFmpegService()` | When StreamingService imports it |
| **AudioDeviceService** | `src/services/AudioDeviceService.js` | `export default new AudioDeviceService()` | When `routes/system.js` imports it |
| **SystemService** | `src/services/SystemService.js` | `module.exports = SystemService` (class) | Instantiated per-request or via middleware |

### Import Dependency Graph

```
server.js
  ├─> routes/system.js
  │     ├─> services/IcecastService.js (singleton created)
  │     │     └─> initialize() called immediately
  │     └─> services/AudioDeviceService.js (singleton created)
  │
  └─> services/StreamingService.js (singleton created)
        └─> services/FFmpegService.js (singleton created)
```

**Key Point:** IcecastService initialization starts **during module import**, not when server starts listening.

---

## IcecastService Initialization Flow

### Entry Point: `initialize()` Method

**File:** `src/services/IcecastService.js`  
**Lines 192-215:** `initialize()` method

```javascript
async initialize() {
  // 1. Check if already initialized (idempotent)
  if (this.state === 'initialized') {
    return;  // Already done, exit early
  }
  
  // 2. Check if initialization in progress
  if (this.initPromise) {
    return this.initPromise;  // Return existing promise
  }
  
  // 3. Start initialization (creates promise)
  this.initPromise = this._doInitialization();
  
  // 4. Wait for completion
  try {
    await this.initPromise;
    this.state = 'initialized';
    logger.icecast('Icecast Service initialized successfully');
  } catch (error) {
    this.state = 'error';
    this.initPromise = null;  // Allow retry
    throw error;
  }
}
```

### Internal Initialization: `_doInitialization()` Method

**File:** `src/services/IcecastService.js`  
**Lines 220-270:** `_doInitialization()` method

**Step-by-step execution:**

#### Step 1: Load Device Config (Fast Path)

**Lines 224-245:**

```javascript
// Try to load cached device-config.json
let installation = await this.loadDeviceConfig();
// File: config/device-config.json
// Method: loadDeviceConfig() → getDeviceConfigPath() → fs.readJson()

if (installation && await this.validateSavedPath(installation.paths.exe)) {
  // ✅ Cached path is valid - use it (fast path)
  this.paths = installation.paths;
  // Sets: this.paths.exe, this.paths.config, this.paths.accessLog, this.paths.errorLog
} else {
  // ❌ Cached path invalid or missing - detect fresh
  installation = await this.detectInstallation();
  // Searches: C:\Program Files (x86)\Icecast, C:\Program Files\Icecast, etc.
  // Validates: icecast.exe exists, icecast.xml exists, directories exist
  // Returns: { paths: { exe, config, accessLog, errorLog }, version, source }
  
  this.paths = installation.paths;
  
  // Save for next time
  await this.saveDeviceConfig(installation);
  // Writes: config/device-config.json with paths and port
}
```

**Files Accessed:**
- `config/device-config.json` (read)
- `C:\Program Files (x86)\Icecast\bin\icecast.exe` (validate)
- `C:\Program Files (x86)\Icecast\icecast.xml` (validate)

#### Step 2: Ensure Config Directory Exists

**Lines 247-250:**

```javascript
if (this.paths.config) {
  await this.ensureConfigDirectory();
  // Creates: C:\Program Files (x86)\Icecast\logs\ if missing
  // Creates: C:\Program Files (x86)\Icecast\web\ if missing
}
```

#### Step 3: Parse Configuration from icecast.xml

**Lines 252-259:** Configuration parsing (all async, runs in parallel where possible)

```javascript
// Parse max listeners
this.maxListeners = await this.parseMaxListeners();
// Reads: icecast.xml
// Extracts: <clients>100</clients>
// Sets: this.maxListeners = 100

// Parse port (CRITICAL - this is the main port extraction)
this.actualPort = await this.parsePort();
// Reads: icecast.xml
// Extracts: <listen-socket><port>8200</port></listen-socket>
// Sets: this.actualPort = 8200
// Saves: config/device-config.json (updates port field)

// Parse passwords (never cached to disk for security)
await this.parsePasswords();
// Reads: icecast.xml
// Extracts: <source-password>hackme</source-password>
// Extracts: <admin-password>hackme</admin-password>
// Sets: this.sourcePassword = 'hackme'
// Sets: this.adminPassword = 'hackme'

// Parse hostname
await this.parseHostname();
// Reads: icecast.xml
// Extracts: <hostname>localhost</hostname>
// Sets: this.hostname = 'localhost'
```

#### Step 4: Start File Watcher

**Line 259:**

```javascript
this.startConfigWatcher();
// Sets up: fs.watch() on icecast.xml
// Watches: C:\Program Files (x86)\Icecast\icecast.xml
// On change: Re-parses all config values automatically
```

#### Step 5: Check Running Status

**Line 261:**

```javascript
await this.checkRunningStatus();
// Checks: Is icecast.exe process running? (tasklist)
// Checks: Is port listening? (netstat)
// Checks: Is admin interface accessible? (HTTP GET to /admin/stats.xml)
// Sets: this.isRunning = true/false
```

---

## Configuration Parsing Details

### Port Parsing: `parsePort()` Method

**File:** `src/services/IcecastService.js`  
**Lines 612-654:** `parsePort()` method

**Detailed execution:**

```javascript
async parsePort() {
  // 1. Check if icecast.xml exists
  if (!this.paths.config || !await fs.pathExists(this.paths.config)) {
    logger.warn('Icecast config file not found, using default port from config');
    await this._saveDeviceConfigPort(config.icecast.port);
    return config.icecast.port;  // Fallback: 8000
  }

  // 2. Read icecast.xml file (synchronous file I/O)
  const configContent = await fs.readFile(this.paths.config, 'utf8');
  // File: C:\Program Files (x86)\Icecast\icecast.xml
  // Content: Full XML file as string

  // 3. Parse port using regex (matches <listen-socket>...</listen-socket> block)
  let port = null;
  const portMatch = configContent.match(/<listen-socket>[\s\S]*?<port>(\d+)<\/port>[\s\S]*?<\/listen-socket>/);
  
  if (portMatch) {
    // ✅ Found port in <listen-socket> block
    port = parseInt(portMatch[1]);  // Extract number: 8200
    logger.icecast('Parsed port from icecast.xml', { port, configPath: this.paths.config });
  } else {
    // Fallback: Look for any <port> tag
    const simplePortMatch = configContent.match(/<port>(\d+)<\/port>/);
    if (simplePortMatch) {
      port = parseInt(simplePortMatch[1]);
      logger.icecast('Found port in config (simple match)', { port });
    }
  }

  // 4. Sync port to device-config.json (cache)
  if (port) {
    await this._saveDeviceConfigPort(port);
    // Method: _saveDeviceConfigPort()
    // Reads: config/device-config.json (if exists)
    // Updates: { port: 8200, lastValidated: "2026-01-27T..." }
    // Writes: config/device-config.json (with updated port)
    return port;
  }

  // 5. No port found - use fallback
  logger.warn('Could not parse port from icecast.xml, using fallback port 8000');
  const fallbackPort = 8000;
  await this._saveDeviceConfigPort(fallbackPort);
  return fallbackPort;
}
```

**Files Modified:**
- `config/device-config.json` (port field updated)

### Password Parsing: `parsePasswords()` Method

**File:** `src/services/IcecastService.js`  
**Lines 734-777:** `parsePasswords()` method

```javascript
async parsePasswords() {
  // 1. Check if icecast.xml exists
  if (!this.paths.config || !await fs.pathExists(this.paths.config)) {
    this.sourcePassword = 'hackme';
    this.adminPassword = 'hackme';
    return;
  }

  // 2. Read icecast.xml
  const configContent = await fs.readFile(this.paths.config, 'utf8');

  // 3. Parse source-password
  const sourcePasswordMatch = configContent.match(/<source-password>([^<]+)<\/source-password>/);
  if (sourcePasswordMatch) {
    this.sourcePassword = sourcePasswordMatch[1].trim();  // Extract: "hackme"
    logger.icecast('Parsed source-password from icecast.xml');
  } else {
    this.sourcePassword = 'hackme';  // Default fallback
  }

  // 4. Parse admin-password
  const adminPasswordMatch = configContent.match(/<admin-password>([^<]+)<\/admin-password>/);
  if (adminPasswordMatch) {
    this.adminPassword = adminPasswordMatch[1].trim();
    logger.icecast('Parsed admin-password from icecast.xml');
  } else {
    this.adminPassword = 'hackme';  // Default fallback
  }
}
```

**Important:** Passwords are **NEVER** written to `device-config.json` - they're only stored in memory (`this.sourcePassword`, `this.adminPassword`).

### Hostname Parsing: `parseHostname()` Method

**File:** `src/services/IcecastService.js`  
**Lines 779-800:** `parseHostname()` method

```javascript
async parseHostname() {
  if (!this.paths.config || !await fs.pathExists(this.paths.config)) {
    this.hostname = 'localhost';
    return;
  }

  const configContent = await fs.readFile(this.paths.config, 'utf8');
  const hostnameMatch = configContent.match(/<hostname>([^<]+)<\/hostname>/);
  
  if (hostnameMatch) {
    this.hostname = hostnameMatch[1].trim();  // Extract: "localhost"
    logger.icecast('Parsed hostname from icecast.xml', { hostname: this.hostname });
  } else {
    this.hostname = 'localhost';  // Default fallback
  }
}
```

---

## File Watching System

### Watcher Initialization: `startConfigWatcher()` Method

**File:** `src/services/IcecastService.js`  
**Lines 822-857:** `startConfigWatcher()` method

```javascript
startConfigWatcher() {
  // 1. Check if icecast.xml exists
  if (!this.paths.config || !existsSync(this.paths.config)) {
    return;  // Can't watch non-existent file
  }

  try {
    // 2. Stop existing watcher if any
    if (this.configWatcher) {
      this.configWatcher.close();
    }

    // 3. Start file watcher (Node.js fs.watch API)
    this.configWatcher = watch(this.paths.config, async (eventType, filename) => {
      // This callback runs when icecast.xml changes
      
      if (eventType === 'change') {
        logger.icecast('icecast.xml changed, re-parsing configuration...');
        
        // 4. Re-parse ALL config values
        try {
          this.actualPort = await this.parsePort();        // Re-read port
          await this.parsePasswords();                     // Re-read passwords
          await this.parseHostname();                      // Re-read hostname
          this.maxListeners = await this.parseMaxListeners(); // Re-read max listeners
          
          logger.icecast('Configuration re-parsed successfully', {
            port: this.actualPort,
            hostname: this.hostname
          });
        } catch (error) {
          logger.error('Error re-parsing icecast.xml:', error.message);
        }
      }
    });

    logger.icecast('Started watching icecast.xml for changes', { path: this.paths.config });
  } catch (error) {
    logger.warn('Could not start file watcher for icecast.xml:', error.message);
  }
}
```

**File Watched:** `C:\Program Files (x86)\Icecast\icecast.xml`  
**Event:** `'change'` (file modified)  
**Action:** Re-parse all config values and update in-memory cache

**Important:** File watcher runs **continuously** in the background. No polling - uses OS-level file system events.

---

## Runtime Port & Config Access

### Getting the Port: `getActualPort()` Method

**File:** `src/services/IcecastService.js`  
**Lines 566-605:** `getActualPort()` method

**Execution flow (synchronous, fast):**

```javascript
getActualPort() {
  // Priority 1: Return cached value (fastest - no file I/O)
  if (this.actualPort) {
    return this.actualPort;  // ✅ Most common path - returns immediately
  }

  // Priority 2: Try synchronous parse (if paths available but not yet parsed)
  if (this.paths && this.paths.config) {
    try {
      if (existsSync(this.paths.config)) {
        const configContent = fs.readFileSync(this.paths.config, 'utf8');
        
        // Parse port synchronously
        const portMatch = configContent.match(/<listen-socket>[\s\S]*?<port>(\d+)<\/port>[\s\S]*?<\/listen-socket>/);
        if (portMatch) {
          const port = parseInt(portMatch[1]);
          this.actualPort = port;  // Cache it
          return port;
        }
      }
    } catch (error) {
      logger.debug('Could not parse port synchronously:', error.message);
    }
  }

  // Priority 3: Fallback to default
  return 8000;  // Only used if icecast.xml can't be read
}
```

**Performance:**
- **Initialized:** Returns `this.actualPort` immediately (0ms, no I/O)
- **Not initialized:** Reads `icecast.xml` synchronously (~1-5ms)
- **Fallback:** Returns 8000 (0ms)

### Getting Passwords: `getSourcePassword()` & `getAdminPassword()`

**File:** `src/services/IcecastService.js`  
**Lines 801-810:** Password getters

```javascript
getSourcePassword() {
  return this.sourcePassword || 'hackme';  // In-memory, always fast
}

getAdminPassword() {
  return this.adminPassword || 'hackme';  // In-memory, always fast
}
```

**Performance:** Always returns in-memory value (0ms, no I/O)

### Getting Hostname: `getHostname()`

**File:** `src/services/IcecastService.js`  
**Lines 815-817:** Hostname getter

```javascript
getHostname() {
  return this.hostname || 'localhost';  // In-memory, always fast
}
```

---

## Stream Creation Flow

### When User Starts a Stream

**API Request:** `POST /api/streams/start`  
**File:** `src/routes/streams.js`  
**Lines 12-29:**

```javascript
router.post('/start', async (req, res) => {
  // 1. Get stream config from request body
  const streamConfig = req.body;
  
  // 2. Call StreamingService (singleton)
  const stream = await streamingService.startStream(streamConfig);
  // This is where port/password are actually used
});
```

### StreamingService.startStream() Method

**File:** `src/services/StreamingService.js`  
**Lines 101-219:** `startStream()` method

**Step-by-step:**

```javascript
async startStream(streamConfig) {
  // 1. Validate stream config
  if (!streamConfig || (!streamConfig.deviceId && !streamConfig.inputFile)) {
    throw new Error('Invalid stream configuration');
  }

  // 2. Check if Icecast is running
  const isRunning = await IcecastService.isIcecastRunning();
  // Method: isIcecastRunning()
  // Checks: tasklist | findstr icecast.exe
  // Returns: boolean

  if (!isRunning) {
    throw new Error('Icecast server is not running');
  }

  // 3. Generate stream ID
  const streamId = streamConfig.id || `stream_${Date.now()}`;

  // 4. Check for device conflicts
  // ... conflict detection logic ...

  // 5. Build FFmpeg arguments (THIS IS WHERE PORT/PASSWORD ARE USED)
  const ffmpegArgs = this.buildFFmpegArgs(streamId, streamConfig);
  // Method: buildFFmpegArgs() - see below
}
```

### Building FFmpeg Arguments: `buildFFmpegArgs()` Method

**File:** `src/services/StreamingService.js`  
**Lines 411-498:** `buildFFmpegArgs()` method

```javascript
buildFFmpegArgs(streamId, streamConfig, formatIndex = 0) {
  // 1. Get Icecast config from IcecastService (runtime read)
  const icecastHost = IcecastService.getHostname();
  // Returns: this.hostname (from icecast.xml) or 'localhost'
  // Performance: In-memory lookup (0ms)

  const icecastPort = IcecastService.getActualPort();
  // Returns: this.actualPort (from icecast.xml) or 8000
  // Performance: In-memory lookup (0ms)

  const icecastSourcePassword = IcecastService.getSourcePassword();
  // Returns: this.sourcePassword (from icecast.xml) or 'hackme'
  // Performance: In-memory lookup (0ms)

  // 2. Build Icecast URL
  const icecastUrl = `icecast://source:${icecastSourcePassword}@${icecastHost}:${icecastPort}/${streamId}`;
  // Example: icecast://source:hackme@localhost:8200/stream_1234567890

  // 3. Build FFmpeg command arguments
  let args = [
    '-f', 'dshow',
    '-i', `audio="${streamConfig.deviceId}"`,
    '-acodec', 'libmp3lame',
    '-ab', '192k',
    '-ar', '44100',
    '-ac', '2',
    '-f', 'mp3',
    icecastUrl,  // ⚠️ Uses port/password from icecast.xml
    '-loglevel', 'error'
  ];

  return args;
}
```

**Critical Point:** Every stream uses `IcecastService.getActualPort()` and `IcecastService.getSourcePassword()` - these read from in-memory cache, not from files.

---

## Subsequent Requests & Caching

### API Request Flow

**Example:** `GET /api/system/icecast-status`

```
1. HTTP Request arrives
   └─> Express routes to: src/routes/system.js

2. Route handler executes
   └─> GET /api/system/icecast-status
       └─> Calls: icecastService.getStatus()

3. getStatus() method (src/services/IcecastService.js, line 971)
   └─> Uses: this.actualPort (in-memory, already set)
   └─> Uses: this.getHostname() (in-memory, already set)
   └─> Uses: this.getAdminPassword() (in-memory, already set)
   └─> Makes HTTP request to: http://localhost:8200/admin/stats.xml
       └─> Uses cached values - NO file I/O
```

### Port Access in Different Files

| File | Method | How Port is Retrieved |
|------|--------|----------------------|
| `StreamingService.js` | `buildFFmpegArgs()` | `IcecastService.getActualPort()` → Returns `this.actualPort` (cached) |
| `FFmpegService.js` | `buildFFmpegArgs()` | `IcecastService.getActualPort()` → Returns `this.actualPort` (cached) |
| `routes/api.js` | `GET /api/config` | `icecastService.getActualPort()` → Returns `this.actualPort` (cached) |
| `routes/setup.js` | `POST /api/setup/configure-icecast` | `icecast.getActualPort()` → Returns `this.actualPort` (cached) |
| `errorDiagnostics.js` | `diagnoseConnectionError()` | Gets port from `context.icecastPort` (passed from caller) |

**Key Point:** All files use the same method (`getActualPort()`), which returns the cached value. No file directly reads `icecast.xml` at runtime.

---

## Error Handling & Diagnostics

### Connection Refused Error Flow

**Scenario:** User tries to start stream, but Icecast is not running

```
1. POST /api/streams/start
   └─> StreamingService.startStream()
       └─> Checks: IcecastService.isIcecastRunning() → false
       └─> Throws: Error("Icecast server is not running")

2. Error caught by route handler
   └─> Returns: 500 status with error message

3. If FFmpeg tries to connect anyway:
   └─> FFmpeg process starts
   └─> FFmpeg tries: icecast://source:hackme@localhost:8200/stream_123
   └─> Connection refused (exit code -5)
   └─> StreamingService catches FFmpeg error
       └─> Calls: errorDiagnostics.diagnose(stderr, exitCode, context)
           └─> context.icecastPort = IcecastService.getActualPort() (8200)

4. errorDiagnostics.diagnoseConnectionError()
   └─> Reads: context.icecastPort (8200)
   └─> Returns: Detailed error message explaining WHY connection failed
       - "Connection Refused - Icecast is not running"
       - Shows port: 8200
       - Suggests: Check if Icecast is running, check port conflicts
       - Provides: Diagnostic commands (netstat, tasklist)
```

### Error Message Details

**File:** `src/utils/errorDiagnostics.js`  
**Lines 251-306:** `diagnoseConnectionError()` method

The error message now includes:
- **Likely Cause:** Determined from error type (ECONNREFUSED, timeout, etc.)
- **Specific Solutions:** Step-by-step troubleshooting
- **Port Number:** Shows actual port being used (8200)
- **Diagnostic Commands:** `netstat -ano | findstr :8200`
- **Technical Details:** Exit code, target URL, error type

---

## Configuration Storage & Sync

### Storage Locations

| Location | Purpose | When Updated | Security |
|----------|---------|--------------|----------|
| `C:\Program Files (x86)\Icecast\icecast.xml` | **Source of Truth** | Manual edit or Icecast config | Read-only by LANStreamer |
| `config/device-config.json` | **Port Cache** | Auto-synced on startup and file changes | Contains port only |
| `IcecastService.actualPort` | **Runtime Cache** | Set during initialization | In-memory only |
| `IcecastService.sourcePassword` | **Runtime Cache** | Set during initialization | In-memory only, never written to disk |
| `IcecastService.adminPassword` | **Runtime Cache** | Set during initialization | In-memory only, never written to disk |
| `IcecastService.hostname` | **Runtime Cache** | Set during initialization | In-memory only |

### Sync Behavior

**On Startup:**
1. Read `icecast.xml` → Parse port/passwords/hostname
2. Update `device-config.json` (port only)
3. Cache all values in memory

**When `icecast.xml` Changes:**
1. File watcher detects change
2. Re-read `icecast.xml` → Re-parse all values
3. Update in-memory cache
4. Update `device-config.json` (port only)
5. Log: "Configuration re-parsed successfully"

**No Restart Required:** Changes are picked up automatically (except port changes may require Icecast restart to take effect).

---

## Concurrent Operations

### What Runs Concurrently

**During Initialization:**
- ✅ `parseMaxListeners()` and `parsePort()` can run in parallel (both read same file)
- ✅ `parsePasswords()` and `parseHostname()` can run in parallel
- ⚠️ File watcher starts **after** initial parsing completes

**During Runtime:**
- ✅ Multiple API requests can call `getActualPort()` simultaneously (read-only, thread-safe)
- ✅ File watcher runs in background (doesn't block requests)
- ✅ Stream creation uses cached values (no file I/O)

### Thread Safety

All service methods are **thread-safe** because:
- Node.js is single-threaded (event loop)
- All operations are async/await (no race conditions)
- Cached values are set once during initialization
- File watcher updates cache atomically

---

## Summary: Complete Flow Diagram

```
npm run dev
│
├─> Node.js loads src/server.js
│   │
│   ├─> Module imports (synchronous)
│   │   ├─> routes/system.js imports IcecastService
│   │   │   └─> IcecastService singleton created
│   │   │       └─> icecastService.initialize() called (async, non-blocking)
│   │   │           │
│   │   │           ├─> _doInitialization() starts
│   │   │           │   ├─> loadDeviceConfig() → Reads config/device-config.json
│   │   │           │   ├─> detectInstallation() → Searches for Icecast
│   │   │           │   ├─> saveDeviceConfig() → Writes config/device-config.json
│   │   │           │   ├─> parsePort() → Reads icecast.xml → Sets this.actualPort = 8200
│   │   │           │   ├─> parsePasswords() → Reads icecast.xml → Sets passwords
│   │   │           │   ├─> parseHostname() → Reads icecast.xml → Sets hostname
│   │   │           │   ├─> startConfigWatcher() → Watches icecast.xml
│   │   │           │   └─> checkRunningStatus() → Checks if Icecast is running
│   │   │           │
│   │   │           └─> Initialization completes (state = 'initialized')
│   │   │
│   │   └─> services/StreamingService.js singleton created
│   │       └─> Constructor runs
│   │           ├─> loadPersistentStreams() → Reads config/streams.json
│   │           └─> cleanupOldStreams() → Cleans up stale streams
│   │
│   └─> Express app setup
│       ├─> Middleware registration
│       ├─> Route registration
│       └─> Server starts listening on port 3001
│
└─> Server ready (IcecastService may still be initializing in background)

─────────────────────────────────────────────────────────────

Runtime (After Initialization):

API Request: POST /api/streams/start
│
├─> routes/streams.js handler
│   └─> streamingService.startStream()
│       ├─> IcecastService.isIcecastRunning() → Checks process
│       └─> buildFFmpegArgs()
│           ├─> IcecastService.getActualPort() → Returns 8200 (cached)
│           ├─> IcecastService.getSourcePassword() → Returns 'hackme' (cached)
│           └─> Builds: icecast://source:hackme@localhost:8200/stream_123
│
└─> FFmpeg process starts with Icecast URL

─────────────────────────────────────────────────────────────

File Change Detection:

User edits: C:\Program Files (x86)\Icecast\icecast.xml
│
├─> File watcher detects 'change' event
│   └─> Callback executes (async)
│       ├─> parsePort() → Re-reads icecast.xml → Updates this.actualPort
│       ├─> parsePasswords() → Re-reads icecast.xml → Updates passwords
│       ├─> parseHostname() → Re-reads icecast.xml → Updates hostname
│       └─> Logs: "Configuration re-parsed successfully"
│
└─> Next API request uses new cached values (no restart needed)
```

---

## Key Architecture Principles

1. **Single Source of Truth:** `icecast.xml` is authoritative - LANStreamer never modifies it (except via `configure()` method)
2. **Runtime Reading:** All config read at runtime, not from env vars or hardcoded values
3. **In-Memory Caching:** Parsed values cached in `IcecastService` instance (fast lookups)
4. **File Watching:** Automatic sync when `icecast.xml` changes
5. **Security:** Passwords never written to disk, only stored in memory
6. **Performance:** `getActualPort()` returns cached value (0ms) - no file I/O at runtime
7. **Idempotent:** Initialization can be called multiple times safely
8. **Self-Healing:** If `device-config.json` is corrupted, system re-reads from `icecast.xml` on next startup

---

## File Access Summary

### Files Read During Initialization

| File | When | Method | Purpose |
|------|------|--------|---------|
| `config/device-config.json` | Startup | `loadDeviceConfig()` | Load cached Icecast paths |
| `C:\Program Files (x86)\Icecast\icecast.xml` | Startup | `parsePort()`, `parsePasswords()`, `parseHostname()` | Read port, passwords, hostname |
| `config/device-config.json` | After parsing | `_saveDeviceConfigPort()` | Update port cache |
| `config/streams.json` | Startup | `StreamingService.loadPersistentStreams()` | Load saved stream definitions |

### Files Watched

| File | Watcher | Event | Action |
|------|---------|-------|--------|
| `C:\Program Files (x86)\Icecast\icecast.xml` | `fs.watch()` | `'change'` | Re-parse all config values |

### Files Written

| File | When | Method | Content |
|------|------|--------|---------|
| `config/device-config.json` | After port parsing | `_saveDeviceConfigPort()` | Updates `port` field only |
| `config/device-config.json` | After installation detection | `saveDeviceConfig()` | Saves Icecast paths and port |

---

This architecture ensures that LANStreamer always uses the correct port, passwords, and hostname from `icecast.xml`, with automatic synchronization and fast runtime access.

# Icecast Configuration Architecture

## Philosophy: Icecast.xml is the Single Source of Truth

**LANStreamer does NOT duplicate Icecast configuration.** All Icecast settings are read from `icecast.xml` at runtime.

## What LANStreamer Reads from icecast.xml

| Setting | Method | When Read |
|---------|--------|-----------|
| **Port** | `IcecastService.getActualPort()` | On startup, cached in memory |
| **Source Password** | `IcecastService.getSourcePassword()` | On startup, cached in memory |
| **Admin Password** | `IcecastService.getAdminPassword()` | On startup, cached in memory |
| **Hostname** | `IcecastService.getHostname()` | On startup, cached in memory |
| **Max Listeners** | `this.maxListeners` | On startup, cached in memory |

## File Watching

LANStreamer watches `icecast.xml` for changes and automatically re-parses:
- **Location**: `C:\Program Files (x86)\Icecast\icecast.xml`
- **Auto-reload**: When you edit `icecast.xml`, LANStreamer detects it and re-parses
- **No restart needed**: Changes are picked up automatically (except port changes may require Icecast restart)

## How It Works

### On Startup (`npm run dev`):

```
1. IcecastService.initialize()
   └─> parsePort() → Reads icecast.xml → Sets this.actualPort
   └─> parsePasswords() → Reads icecast.xml → Sets this.sourcePassword, this.adminPassword
   └─> parseHostname() → Reads icecast.xml → Sets this.hostname
   └─> startConfigWatcher() → Watches icecast.xml for changes
```

### Runtime:

All code uses:
- `IcecastService.getActualPort()` - Returns cached port (no file I/O)
- `IcecastService.getSourcePassword()` - Returns cached password
- `IcecastService.getAdminPassword()` - Returns cached password
- `IcecastService.getHostname()` - Returns cached hostname

### When icecast.xml Changes:

```
File watcher detects change
  └─> Re-parses port, passwords, hostname
  └─> Updates in-memory cache
  └─> Logs: "Configuration re-parsed successfully"
```

## What's NOT in config/index.js

**Removed:**
- ❌ `config.icecast.adminPassword` - Read from icecast.xml
- ❌ `config.icecast.sourcePassword` - Read from icecast.xml
- ❌ `config.icecast.host` - Read from icecast.xml
- ❌ `config.icecast.paths` - Auto-detected and cached in device-config.json

**Kept (fallback only):**
- ✅ `config.icecast.port` - Only used as fallback if icecast.xml can't be read

## Error Messages

Connection refused errors now explain **WHY**:

- **"Connection Refused - Icecast is not running"** → Most common cause
- **"Port X is blocked or in use"** → Docker/other app conflict
- **"Port mismatch"** → LANStreamer using different port than Icecast
- **"Connection Timeout"** → Icecast running but not responding

Each error includes:
- Likely cause
- Specific solutions
- Commands to diagnose (netstat, tasklist)
- Port number being used

## Benefits

✅ **Single source of truth** - icecast.xml is authoritative  
✅ **No duplication** - LANStreamer doesn't duplicate Icecast config  
✅ **Auto-sync** - File watching keeps LANStreamer in sync  
✅ **Security** - Passwords never cached to disk  
✅ **Clear errors** - Error messages explain WHY connection failed

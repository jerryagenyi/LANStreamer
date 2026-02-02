---
type: hook
trigger: before_code_modification
---

# Pre-Code Write Hook

Before modifying ANY code file:

1. **READ** the file completely using the Read tool
2. **UNDERSTAND** the existing patterns and architecture
3. **CHECK** for related test files in `tests/unit/` or `tests/integration/`
4. **VERIFY** dependencies are installed (`npm install` if needed)
5. **ASK** if modification aligns with project architecture

## LANStreamer-Specific Checks

### Core Architecture Files

- **src/services/StreamingService.js** - Core FFmpeg process management
  - Check format fallback logic (MP3→AAC→OGG)
  - Port detection: lines 312, 355, 1083 (auto-detects Icecast port from config, default 8000)
  - DirectShow device name mapping on Windows (line 447)
  - Windows exit code handling (unsigned to signed conversion)

- **src/services/IcecastService.js** - Icecast integration
  - Verify XML config generation patterns
  - Stream mount point management

- **src/utils/errorDiagnostics.js** - Error pattern matching
  - First-match-wins pattern order is critical (lines 43-198)
  - Do not reorder without testing all error scenarios

### Related Test Files

- `tests/unit/StreamingService.test.js` - StreamingService tests
- `tests/unit/IcecastService.test.js` - IcecastService tests
- `tests/unit/errorDiagnostics.test.js` - errorDiagnostics tests
- `tests/integration/` - Integration tests for multi-component workflows

### Configuration Files

- `.env` - Environment variables (use `env.example` as template)
- `config/streams.json` - Persistent stream definitions
- `config/device-config.json` - Cached Icecast/FFmpeg paths
- `config/icecast.xml` - Icecast server configuration (auto-generated)

### Patterns

See CLAUDE.md for workflow, branch flow, and critical patterns (port, error diagnostics, Windows exit codes). If uncertain about patterns, **STOP** and ask user before proceeding.

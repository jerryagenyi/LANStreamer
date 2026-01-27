---
type: hook
trigger: before_code_modification
---

# Pre-Code Write Hook

Before modifying ANY code file:

1. **READ** the file completely using the Read tool
2. **UNDERSTAND** the existing patterns and architecture
3. **CHECK** for related test files
4. **VERIFY** dependencies are installed
5. **ASK** if modification aligns with project architecture

## LANStreamer-Specific Checks

- **StreamingService.js**: Core FFmpeg process management - check format fallback logic (MP3→AAC→OGG)
- **IcecastService.js**: Icecast integration - verify XML config generation patterns
- **errorDiagnostics.js**: Error pattern matching - respect first-match-wins order

If uncertain about patterns, **STOP** and ask user before proceeding.

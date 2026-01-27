# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**Project Type:** Node.js audio streaming server
**Key Technologies:** FFmpeg, Icecast, Express.js, Socket.io

**Architecture:**
- `src/services/StreamingService.js` → Core FFmpeg process management
- `src/services/IcecastService.js` → Icecast integration
- `src/utils/errorDiagnostics.js` → Error pattern matching and user-friendly messages

## Development Workflow

1. **Check hooks** in `.claude/hooks/` before any modification
2. **Start server:** `npm start`
3. **Test stream:** Login → Create stream → Verify playback on `/streams`
4. **Check logs:** `logs/combined.log`

## Auto-Skill Selection

| Situation | Use |
|-----------|-----|
| FFmpeg errors or device issues | `@ffmpeg-expert` |
| Node.js process/spawn issues | `@nodejs-streaming` |
| Icecast connection/mount issues | `@icecast-expert` |
| Code needs review | `@code-reviewer` agent |
| Complex multi-step tasks | `@task-manager` agent |

## Critical Patterns

**Port Detection:** `StreamingService.js` lines 312, 355, 1083
- Auto-detects Icecast port from config, default 8000

**Error Diagnostics:** `errorDiagnostics.js` lines 43-198
- First-match-wins pattern order is critical
- Do not reorder without testing all error scenarios

**Windows Exit Codes:**
- FFmpeg exit codes are unsigned, require conversion to signed
- Example: 0xA7F00008 needs special handling

## Configuration

- `.env` - Environment variables (use `env.example` as template)
- `config/streams.json` - Persistent stream definitions
- `config/device-config.json` - Cached Icecast/FFmpeg paths
- `config/icecast.xml` - Icecast server configuration (auto-generated)

## Known Gotchas

- **Startup order:** Start Icecast before creating streams
- **DirectShow devices:** Windows requires device name mapping (line 447 in StreamingService.js)
- **Source limit:** Icecast defaults to 2 concurrent streams, edit `<sources>` in icecast.xml

## Troubleshooting

For detailed error diagnostics and patterns, reference: `ERROR_DIAGNOSTICS_ANALYSIS_REPORT.md`

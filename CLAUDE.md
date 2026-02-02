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

### Branch workflow (do not bypass)

- **main** is the stable release branch. **Never add anything to main directly** without going through a feature branch and **dev** first.
- **dev** is the integration branch. All changes land here (via merge or PR) before they can go to main.
- **Feature branches** are created from **main** (or **dev**) when starting new work. Pull from main into your feature branch if you need latest: `git fetch origin main && git merge origin/main` (or rebase).
- **Flow:** main → create `feature/xyz` → work → **merge feature into dev locally** → test → push dev → merge dev into main (release).

### Merge feature into dev locally (recommended)

Merge your feature into **dev** locally so you can test the combined state before pushing. Then push dev.

```bash
git checkout dev
git pull origin dev
git merge feature/<your-feature-branch>
# Fix conflicts if any, then:
npm test
git push origin dev
```

Example: `git merge feature/start-all-and-unique-names`. After pushing dev, you can open a PR (feature → dev) for record-keeping or merge the PR on the remote; the code is already on dev.

1. **Check hooks** in `.claude/hooks/` before any modification
2. **Start server:** `npm start`
3. **Test stream:** Login → Create stream → Verify playback on `/streams`
4. **Check logs:** `logs/combined.log`

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

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for error diagnostics and patterns. Run `npm test` before releases.

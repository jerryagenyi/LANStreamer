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

## UI rules (enforced)

- **Design tokens are the single source of truth**: `public/assets/css/tokens.css` (`--tok-*`, dark default + `[data-theme="light"]`). Tailwind maps them (`tailwind.config.js` → `bg-surface-1`, `text-muted`, `border-line`, `text-accent`, `rounded-pill`, `shadow-glow`…). **Never hardcode hex colors or dark-only Tailwind grays in new UI code** — use the semantic tokens so both themes work.
- **Shared components live in `public/assets/css/ui.css`**: `.btn-primary/secondary/ghost/danger`, `.play-btn`, `.copy-btn` (IconButton), `.channel-badge`, `.stream-row`, `.live-chip`, `.eq`, `.mq` (marquee), `.tok-label`. New variants need a shared definition there first — no one-off button styles.
- **One icon family**: Material Symbols Rounded, locally served. Icon-only buttons must have `aria-label` + `title`. Replace decorative emoji used as UI icons; content emoji is fine.
- **Sharing the listener page happens in ONE place** (header share card: open / copy / QR via `LSShare`). Never per-stream share buttons — we share the page, not individual mounts.
- **Notifications**: transient confirmations via the page toast; stream failures stay visible near the stream; never `alert()`. Don't report success before the server confirms.
- **Offline rule**: no runtime CDN dependencies — fonts/icons/styles all self-hosted (`build:css`, `vendor:fonts`).
- After changing classes anywhere: run `npm run build:css`.

## Telemetry (PostHog)

- `src/services/TelemetryService.js` — opt-in only; **never** capture personal data, audio, stream names, or paths. Events: `app_start`, `stream_started` (format), `stream_stopped`, `stream_failed` (error category), `telemetry_enabled/disabled`. Distinct ID = anonymous install UUID from `config/telemetry.json`.
- Enabled only when user consented (first-run Electron prompt; toggle in tray menu) **and** `POSTHOG_KEY` env is set (`POSTHOG_HOST` optional). No-op otherwise — keep it that way for any new events.
- Skipped entirely under `NODE_ENV=test`. All calls are fire-and-forget with catch: telemetry must never break the app.
- Docs: README "Telemetry & Privacy" (user-facing) + this section (dev-facing).

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

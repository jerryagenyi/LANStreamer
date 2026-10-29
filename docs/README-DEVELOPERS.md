# LANStreamer — Developer Guide

Technical documentation for anyone working **on** LANStreamer (running from source, testing, contributing). If you just want to install and use the app, see the main [README](../README.md).

---

## 🚀 Technical Quick Start

**Prerequisites:** Node.js 18+, plus FFmpeg and Icecast available on your machine (see [Installation Guides](guides/README.md); paths can be overridden with `ICECAST_EXE_PATH` / `ICECAST_CONFIG_PATH` in `.env`).

```bash
# Clone and install
git clone https://github.com/jerryagenyi/LANStreamer.git
cd LANStreamer
npm install

# Configure (optional — sane defaults; needed to change admin credentials/secrets)
cp env.example .env

# Start the backend with live reload
npm run dev

# Or run the Electron desktop app on top of the backend
npm run electron:dev
```

Then open `http://localhost:3001/dashboard` (login: `admin` / `lanstreamer123` by default — see the **Security Setup — Admin Login** section in the main [README](../README.md) for changing these).

To update a source checkout later: `git pull` (work happens on `dev`, releases on `main` — see [Contributing](#-contributing)) followed by `npm install` if dependencies changed.

### 📜 npm Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Run the backend server (`src/server.js`) |
| `npm run dev` | Backend with nodemon auto-restart |
| `npm run electron:dev` | Launch the Electron desktop app (`electron/main.js`) |
| `npm run electron:smoke` | Electron smoke test — boots the app, waits for load, prints `SMOKE_OK`, exits |
| `npm run electron:build:win` | Build the Windows installer + portable package (`release/`, via electron-builder; runs `scripts/prepare-telemetry-key.mjs` first) |
| `npm test` | Run the Jest test suite |
| `npm run test:coverage` | Jest with coverage report |
| `npm run build:css` | Rebuild the Tailwind bundle (`public/assets/vendor/tailwind.css`) — run after any class/token change |
| `npm run vendor:fonts` | Self-host font files into `public/assets/vendor/fonts` |
| `npm run setup` | First-time setup helper (`scripts/setup.js`) |
| `npm run screenshots` | Generate the screenshot suite (`scripts/generate-screenshots.js`) |

---

## 📁 Project Structure

```
LANStreamer/
├── electron/                        # Desktop app shell (main.js: window, tray, lifecycle)
├── src/                             # Backend (Node.js/Express)
│   ├── app.js                       # Express app + page routes (/dashboard, /streams, /docs, /login)
│   ├── server.js                    # Standalone server entry (npm start)
│   ├── routes/                      # API + system routes
│   ├── services/                    # StreamingService, IcecastService, TelemetryService, ...
│   └── utils/                       # errorDiagnostics and friends
├── public/                          # Frontend (dashboard, listener page, docs page)
│   ├── assets/css|js/               # Design tokens, shared UI CSS, shared JS (toasts, QR share, ...)
│   ├── assets/vendor/               # Self-hosted Tailwind build + fonts (no runtime CDNs)
│   └── components/                  # Frontend components (FFmpegStreamsManager, ...)
├── tests/                           # Jest suite (unit/ integration/ scenarios/ + fixtures/)
├── scripts/                         # Verification, diagnostics, build helpers
├── config/                          # Runtime config, auto-generated (streams.json, icecast.xml, telemetry.json, ...)
├── docs/                            # Documentation (this file lives here)
├── manual-setup/                    # Hardware-specific setup guides
├── Start LANStreamer Server.bat     # Windows one-click start from a source/ZIP copy
└── Update LANStreamer.bat           # Windows update script for ZIP installs
```

---

## 🏗️ Architecture Notes

LANStreamer orchestrates three core components:

1. **Audio Input** — any detected audio device (microphone, audio interface, virtual audio cable)
2. **FFmpeg** — reads audio channels, encodes, and pushes to the streaming server
3. **Icecast** — open-source streaming server that broadcasts to network clients

Key modules:

- `src/services/StreamingService.js` — core FFmpeg process management (spawn, port detection, exit-code handling)
- `src/services/IcecastService.js` — Icecast integration (start/stop, config generation, LAN host detection)
- `src/utils/errorDiagnostics.js` — error pattern matching → user-friendly messages (first-match-wins order is load-bearing)
- `electron/main.js` — desktop shell: runs the Express server **in-process**, opens the dashboard window, hides to tray on window close (streams keep running for listeners), tree-kills FFmpeg/Icecast on quit, port fallback (3001 → 3002 …) if the port is busy, first-run telemetry consent dialog

Deep dives: [System Architecture](LANSTREAMER_SYSTEM_ARCHITECTURE.md) (all services, flows, configuration) and [APP-FLOW.md](APP-FLOW.md) (every page, user flow, and component). [CLAUDE.md](../CLAUDE.md) holds the enforced patterns and UI rules you must follow when changing code.

---

## ⚙️ System Requirements (Development)

- **Node.js 18+** (the packaged desktop app drops this requirement for end users)
- **FFmpeg + Icecast** installed separately for now (bundling is planned); see [Installation Guides](guides/README.md)
- **OS:** develop on Windows/macOS/Linux — the web UI and Electron app are cross-platform, though audio device naming (DirectShow on Windows) differs
- **CI** (`.github/workflows/ci.yml`): runs on every push/PR to `main` and `dev`, on `ubuntu-latest` with Icecast installed — executes the design-token integrity check (`scripts/check-design-tokens.mjs`) and the full Jest suite (`npm test`). Branch protection requires green CI before merge.

---

## 🧪 Testing

### Automated suite (Jest)

```bash
npm test                # run everything
npm run test:coverage   # with coverage report
```

Jest runs with `--experimental-vm-modules` (the project is ESM — `"type": "module"`). Test layout:

| Folder | Contents |
|--------|----------|
| `tests/unit/` | `StreamingService`, `IcecastService`, `errorDiagnostics` unit tests |
| `tests/integration/` | Server startup, auth, admin-localhost lock, stream create/start/reorder/proxy, start-all, spawn errors |
| `tests/scenarios/` | Error-scenario coverage |
| `tests/fixtures/` | Shared fixtures (`tests/setup.js` is the global setup) |

### Electron smoke test

```bash
npm run electron:smoke   # boots the real app, waits for dashboard load, prints SMOKE_OK, exits 0
```

### Verification & diagnostic scripts (`scripts/`)

Puppeteer-driven checks against the live app (start the server first) — each was built to verify a specific fix round:

- `verify-auth.mjs` — admin login gate (wrong/right credentials, token storage, authed calls, public listener surface)
- `verify-conflict.mjs` — the canonical E2E: device-conflict busy error, edit-frees-device, blocked stream then starts; asserts ZERO orphaned ffmpeg afterwards
- `verify-chplay.mjs`, `verify-banner.mjs` — listener channel-row play button; event-banner cover + lightbox
- `verify-flat.mjs`, `verify-header.mjs` — flat cards (no shadow/hover/animation) and sticky-header layering (toasts/menus above the bar, opaque bg)
- `verify-sticky-scroll.mjs` — BEHAVIORAL sticky check (computed-style checks pass even when sticky is dead): scrolls both pages, asserts header `top === 0` and no horizontal overflow
- `verify-host.mjs`, `verify-offline.mjs` — LAN-IP detection overrides stale saved hosts; app renders with ALL non-localhost requests aborted (offline proof)
- `verify-lightselect.mjs`, `verify-rowalign.mjs` — light-mode dropdown contrast; stream-row action icons pinned in a fixed RIGHT column (stable right edge across rows and live→stopped flips; ⋯ popup opens leftward inside the card)
- `verify-fixes.mjs`, `verify-p2p3.mjs`, `verify-p4.mjs`, `verify-round3.mjs` — earlier redesign/fix rounds
- `diag-listener.mjs`, `diag-toggle.mjs`, `diag-processes.ps1` — console/network forensics on the listener page, collapse-toggle timing, and stray FFmpeg/Icecast process inspection
- `check-design-tokens.mjs` — the CI-enforced UI integrity linter (see below)

Also in `scripts/`: `setup.js` (first-run setup), `generate-screenshots.js` / `generate-screenshot-suite.mjs` (screenshot suite), `stitch-screenshot-pdf.py`, `vendor-fonts.mjs`, `prepare-telemetry-key.mjs` (build step for the Windows package).

The manual test plan lives in [TEST-PLAN.md](TEST-PLAN.md).

---

## 🎨 UI Rules & Integrity Linter (CI-enforced)

- **Design tokens are the single source of truth** (`public/assets/css/tokens.css`); Tailwind maps them to semantic classes. Never hardcode hex colors or dark-only grays in new UI code.
- **Shared components live in `public/assets/css/ui.css`** — new variants need a shared definition there first.
- **Toasts stack** via `LSToasts.show(...)`; never hand-roll `position:fixed` toasts. Never use `alert()`.
- **No runtime CDN dependencies** — fonts/icons/styles are self-hosted (`npm run vendor:fonts`, `npm run build:css`). `verify-offline.mjs` enforces this.
- **Sharing the listener page happens in ONE place** (header share card with open/copy/QR via `LSShare`) — never per-stream share buttons.
- **Flat surfaces (2026-10-29, explicit owner rule):** cards get NO hover effects, NO shadows, NO animations; collapse chevrons snap. The ONLY shadowed surface is the sticky header (`0 2px 8px rgba(0,0,0,.15)`). Status indicators (LIVE pip, eq bars, boot dots) and button accents are controls and keep their motion.
- **Z-index ladder (keep to it):** menu-pop/bell panel 120 · scrim 130 · drawer 140 · lightbox 150 · **toasts 200** · boot overlay 9999 — everything above the sticky header (100). Anything below 100 will be hidden behind the header.
- **`position: sticky` dies silently** in TWO ways — and `getComputedStyle(el).position === 'sticky'` proves NEITHER: (1) any ancestor with `overflow: hidden/auto/scroll` becomes the containing block instead of the page; (2) the sticky element's parent is only as tall as the element itself (e.g. a flex item like `#header-container`) — zero slack, nothing to stick within. Fix (2) by making the parent sticky (`#header-container{position:sticky;top:0}` in ui.css). Always verify BEHAVIORALLY — scroll the page and assert the header's `getBoundingClientRect().top === 0` (`scripts/verify-sticky-scroll.mjs`).
- **Buttons cannot nest.** A `<button>` inside a `<button>` gets ejected by the HTML parser (icons fly out of rows). Use `span[role=button]` + `stopPropagation` for controls inside a toggle (see the Audio-inputs rescan in `public/index.html`).
- **Bust the asset cache on every change:** all local CSS/JS includes carry `?v=N` per page — bump it on every page whenever that asset changes, or open tabs serve stale code mixed with new markup (has caused multiple false bug reports).
- `node scripts/check-design-tokens.mjs` fails CI on **new** violations; existing debt is grandfathered in `scripts/design-token-baseline.json` (update deliberately with `--update-baseline` and say why in the commit).
- Component showcase (dev-only) at `/showcase.html` — new UI must match a pattern shown there.

The full, current rules are in [CLAUDE.md](../CLAUDE.md) — read them before touching UI.

---

## 📊 Telemetry Implementation (PostHog)

- `src/services/TelemetryService.js` — **opt-in only**; sends nothing unless (a) the user consented (first-run Electron prompt; toggle in the tray menu) **and** (b) `POSTHOG_KEY` is set in the environment (`POSTHOG_HOST` optional). No-op otherwise — keep it that way for any new events.
- Events: `app_start`, `stream_started` (format), `stream_stopped`, `stream_failed` (error *category* only), `telemetry_enabled`/`telemetry_disabled`. Every event carries a fixed `app: lanstreamer` tag (the maintainer's PostHog project is shared across apps).
- **Never** capture personal data, audio, stream names, or file paths. Distinct ID = anonymous install UUID stored in `config/telemetry.json`.
- Skipped entirely under `NODE_ENV=test`. All calls are fire-and-forget with `catch` — telemetry must never break the app.
- Consent prompt lives in `electron/main.js` (`maybeAskTelemetryConsent`); the build injects the key via `scripts/prepare-telemetry-key.mjs`.
- User-facing wording lives in the **Telemetry & Privacy** section of the main [README](../README.md) — keep the two in sync when changing what is collected.

---

## 🤝 Contributing

**Branch workflow (do not bypass):**

- `main` is the stable release branch — **never commit to main directly**. It is PR-protected: `enforce-prs.yml` auto-reverts any main commit that wasn't merged via a PR with green CI.
- `dev` is the integration branch — all changes land here before main.
- Flow: `main` → create `feature/xyz` → work → merge feature into `dev` locally → `npm test` → push `dev` → merge `dev` → PR → `main` (release).

**Pre-review gate for streaming features:** every PR that adds or changes streaming behavior (stream lifecycle, proxying, device capture, listener fanout, start-all, queueing) must answer the 7 hostile conditions in [pressure-checklist.md](pressure-checklist.md) in the PR description for the changed code path.

**Before submitting:** run `npm test`, and `npm run build:css` if you touched any classes. For bug reports, include your OS, Node.js version, and steps to reproduce.

---

## 🛠️ Developer Troubleshooting & Gotchas

- **Startup order:** Icecast must be running before streams are created (the app auto-starts it; keep the order if you refactor).
- **Icecast source limit:** Icecast defaults to 2 concurrent streams — raise `<sources>` in the generated `config/icecast.xml` when testing many streams.
- **Windows FFmpeg exit codes are unsigned** and need conversion to signed (e.g. `0xA7F00008`) — handled in `StreamingService.js`; don't remove.
- **DirectShow device names:** Windows requires device name mapping when spawning FFmpeg.
- **Logs:** `logs/combined.log` (winston, daily rotation) is the first place to look when a stream fails silently.
- **Port detection:** Icecast port is auto-detected from config, default 8000.
- **Zombie processes:** on Windows, killing the server does not kill FFmpeg/Icecast children — the Electron shell tree-kills them (`taskkill /T /F`); when testing from source, check Task Manager or run `scripts/diag-processes.ps1`.
- **Kill order invariant:** `killProcessTree` must run `taskkill /PID <pid> /T /F` BEFORE any `.kill()` on the child — a lone SIGTERM only ends the `cmd.exe` wrapper (streams spawn with `shell:true`) and orphans FFmpeg holding the audio device exclusively. Every path that stops a stream (stop, restart-failure, update, delete) must go through `killProcessTree`, never a bare `.kill()`. `verify-conflict.mjs` asserts zero orphans after its run.
- **Step-by-step server boot order** for `npm run dev` is documented in [STARTUP-SEQUENCE.md](STARTUP-SEQUENCE.md).

---

## 📚 Developer Documentation

| Document | Description |
|----------|-------------|
| [System Architecture](LANSTREAMER_SYSTEM_ARCHITECTURE.md) | ⭐ Complete technical documentation — all services, flows, and architecture |
| [APP-FLOW.md](APP-FLOW.md) | Every page, user flow (mermaid), wireframe, and component |
| [STARTUP-SEQUENCE.md](STARTUP-SEQUENCE.md) | Process order for `npm run dev`; troubleshoot each step |
| [TEST-PLAN.md](TEST-PLAN.md) | Manual + automated test plan |
| [pressure-checklist.md](pressure-checklist.md) | Pre-review gate for streaming PRs |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Deep troubleshooting (network, firewall, Icecast, playback) |
| [CLAUDE.md](../CLAUDE.md) | Enforced patterns, UI rules, and contribution workflow |
| [docs index](README.md) | Full documentation index |

---

**LANStreamer** — developer documentation. For usage, installation, and the listener experience, see the main [README](../README.md).

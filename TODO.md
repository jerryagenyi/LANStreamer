# LANStreamer – TODO

Context: [CLAUDE.md](CLAUDE.md), [docs/APP-FLOW.md](docs/APP-FLOW.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Delete items when done.

---

## To do (priority order)

- [ ] **UI redesign (in progress)** — Dark + light mode, modern/futuristic (reference: Stemtracks dribbble.com/shots/25182834 — near-black surfaces, hairline borders, single accent, pill buttons, uppercase micro-labels). Foundation: centralized design tokens (`public/assets/css/tokens.css`) so light/dark + theming have one source of truth; listener-page mini-player pattern (Mobbin: Sonos/Spotify); a11y pass (aria labels, focus rings, 44px targets, WCAG AA).

- [ ] **Centralize notifications/alerts** — All toasts/modals from one module so styling + z-index + behaviour change in one place.

- [ ] **Internet broadcast tunnel (explore; only if feasible)** — Optional outbound-only tunnel so listeners outside the LAN can listen (e.g. self-hosted frp/ngrok-style relay on a VPS the operator controls). Must stay opt-in, off by default — LANStreamer's core is local, low-latency, private. Research latency + NAT constraints before committing.

- [ ] **Explore: Listener song requests** — Anyone on the network can request a song; admin grants; listed on listener page. (From PR #12.)

- [ ] **Phase 2: cross-platform abstraction** — Device discovery per OS (dshow/avfoundation/pulse; StreamingService hardcodes dshow), config/logs in OS app-data dirs, retire .bat scripts.

- [ ] **Phase 3: bundle binaries** — FFmpeg (target 9.x, GPL build) + **Icecast 2.5.0** (2.4.4 EOL 2026-12-31!) with checksums, LICENSES + disclosure file.

- [ ] **Phase 4: test/CI** — Playwright `_electron` + listener-page web E2E + axe-core + GitHub Actions 3-OS matrix (use `npm run electron:smoke`); electron-updater replaces UpdateService/.bat at packaging.

- [ ] **Phase 6: packaging** — Windows NSIS/portable first; unsigned DMG later for savvy Mac users. Telemetry disclosure + LICENSES in installer.

---

## Done (2026-10-28 revival)

- Reconciled dev/main; merged error-handling branch (structured errors, Test Source, modal timing, delete-race fix) — 68/68 tests.
- Branch cleanup: local = dev only; remote = main + dev.
- Dead code removed: SystemService.js, WebSocketService.js, FFmpegService.js.
- **Offline UI**: Tailwind compiled + fonts self-hosted (build:css / vendor:fonts); CSP `'self'` only.
- **Phase 1 Electron**: thin wrapper (in-process Express, tray-minimize, Stop All & Quit, tree-kill, --smoke mode); electron:dev / electron:build:win.
- **Stale-hostname bug fixed**: admin/stats/listmounts/health polls use localhost + AbortSignal timeouts; listener URLs use getPreferredLANHost; icecast.xml hostname auto-syncs at startup. (Machine IP changes no longer break the dashboard.)
- **Log spam fixed**: installation scan cached 30s, security check cached 15s, routine logs demoted to debug.
- **Dismissible notices**: Quick Start, Security Warning, Virtual Audio (LSNotices helper; localStorage; Show stubs).
- **Editable SVG logo set**: logo.svg / logo-light.svg / logo-mark.svg.
- **Telemetry (PostHog)**: voluntary, first-run prompt, settings toggle, anonymous install ID, queue-and-flush; docs in README + CLAUDE.md; no-money/open-source notice added.

---

## Reference

- Run `npm test` before releases; `npm run build:css` after changing Tailwind classes.
- Versions (2026-10): FFmpeg 9.0.2 latest (app runs on 8.x, fine); Icecast 2.5.0 latest — **2.4.4 EOL 2026-12-31**.

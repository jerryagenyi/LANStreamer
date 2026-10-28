# LANStreamer – TODO

Context: [CLAUDE.md](CLAUDE.md), [docs/APP-FLOW.md](docs/APP-FLOW.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Delete items when done.

---

## To do (priority order)

- [ ] **Latency management** — [docs/LATENCY.md](docs/LATENCY.md) has the research. Next: generate `icecast.xml` with `burst-on-connect 0` + small `queue-size`, then measure end-to-end (clap test) before/after; surface a "latency tips" link on the dashboard pointing at the operator-side guidance (5 GHz, dedicated AP, QoS, wired operator, AP placement — user-side, beyond our control).

- [ ] **Minimum PC specs + cross-OS test story** — README section: minimum requirements (x64, 4 GB RAM, Node 18+ for source runs, FFmpeg, Icecast; packaged app drops the Node requirement). Cross-OS testing: GitHub Actions windows/macos/ubuntu matrix runs the suite + `electron:smoke` online (Phase 4); locally, Playwright covers the web pages on all three OSes; no credible downloadable "test on every PC" tool exists beyond VMs + the CI matrix.

- [ ] **UI redesign — dashboard deep pass** — Restyle remaining dashboard sections (Icecast panel, event/contact panels, header) to the broadcast language on tokens; a11y sweep (aria, focus rings, 44px targets).

- [ ] **Centralize notifications/alerts** — All toasts/modals from one module so styling + z-index + behaviour change in one place.

- [ ] **Internet broadcast tunnel (explore; only if feasible)** — Optional outbound-only tunnel so listeners outside the LAN can listen (e.g. self-hosted frp/ngrok-style relay on a VPS the operator controls). Must stay opt-in, off by default — LANStreamer's core is local, low-latency, private. Research latency + NAT constraints before committing.

- [ ] **Explore: Listener song requests** — Anyone on the network can request a song; admin grants; listed on listener page. (From PR #12.)

- [ ] **Phase 2: cross-platform abstraction** — Device discovery per OS (dshow/avfoundation/pulse; StreamingService hardcodes dshow), config/logs in OS app-data dirs, retire .bat scripts.

- [ ] **Phase 3: bundle binaries** — FFmpeg 9.x (GPL build) + Icecast 2.5.0 with checksums, LICENSES + disclosure file. (2.4.4 EOL 2026-12-31; portable 2.5.0 already validated at ~/Tools/icecast-2.5.0.)

- [ ] **Phase 4: test/CI** — Playwright `_electron` + listener-page web E2E + axe-core + GitHub Actions 3-OS matrix (use `npm run electron:smoke`); electron-updater replaces UpdateService/.bat at packaging. Add E2E regression: machine IP change must not break status polling (covered by localhost polls; test the contract).

- [ ] **Phase 6: packaging** — Windows NSIS/portable first; unsigned DMG later for savvy Mac users. Telemetry disclosure + LICENSES in installer. Telemetry key ships via `electron:build:win` (auto-injected from POSTHOG_KEY; also reads ~/.secrets/posthog on dev machines).

---

## Done (2026-10-28 revival)

- **Listener page redesigned** — broadcast rows + persistent mini-player (eq bars, both themes, a11y labels); theming foundation (tokens.css, dark/light toggle, pill buttons, logo variants).
- **Stale-stream / can't-create-stream fixed** — starting a stream now auto-starts Icecast (was: wall-of-text "cannot connect" error). Troubleshooting doc updated.
- **Doubled audio devices fixed** — FFmpeg 9 changed device-listing format (`[dshow @]`→`[in#0 @]`); parsers updated for both formats + PowerShell fallback output de-duplicated. (Note: `[^]]` regex classes mis-parse on this Node — always use `[^\]]`.)
- **Add-stream modal decluttered** — Pro-Tip/Virtual-Audio notices moved behind an info icon popover (links to manual-setup docs); redundant "Maximum 50 characters" hints removed (counter exists).
- **Delete-stream toast** — waits 900ms, verifies the stream is actually gone via status API, then shows `Stream "<name>" deleted`.
- **Electron: external links** (e.g. "Listen to Streams") open in the system browser.
- **Telemetry key for packaged builds** — `electron:build:win` injects POSTHOG_KEY from the build environment into the app (scripts/prepare-telemetry-key.mjs); resolution order env → config/telemetry.json → bundled.
- Reconciled dev/main; merged error-handling branch (68/68 tests); branch cleanup (local = dev only).
- Dead code removed (SystemService, WebSocketService, FFmpegService); offline UI (vendored Tailwind + fonts, CSP 'self').
- Phase 1 Electron wrapper (tray, Stop All & Quit, tree-kill, --smoke); stale-hostname bug fixed (localhost polls + hostname auto-sync); log spam fixed; dismissible notices; SVG logo set; env.example; repo cleanup; docs index.

---

## Reference

- Run `npm test` before releases; `npm run build:css` after changing Tailwind classes.
- Versions (2026-10): FFmpeg 9.0.2 latest (app runs on 8.x, fine); Icecast 2.5.0 latest — **2.4.4 EOL 2026-12-31**.

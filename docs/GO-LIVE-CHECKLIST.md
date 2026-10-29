# 🚀 Go-Live Checklist — before bundling & shipping LANStreamer

Working document for the first packaged release of the **Electron desktop app**. Current version: `1.2.4` (package.json) — target for the next release: **1.3.0**. Work through every section; tick items only with evidence (test run, screenshot, command output).

> Run the automated suite first — it clears most regressions in minutes:
> `npm test` (85 tests) → then `npm run electron:smoke` → then the verify scripts in [README-DEVELOPERS.md](./README-DEVELOPERS.md) against a fresh server.

---

## 1. Clean-slate functional pass (on the dev machine)

Start from a pristine state — most "bugs" this project has hit were dirty-state artifacts (leftover servers, stale config, cached tabs).

- [ ] Kill every LANStreamer instance first: `netstat -ano | findstr :3001 :3002 :8200` → nothing listening; `tasklist | findstr /i "ffmpeg icecast"` → nothing running
- [ ] Fresh app launch (`npm run electron:dev`): dashboard window opens, boot screen resolves, version label shows
- [ ] Login: wrong password rejected; `admin` / `lanstreamer123` accepted; logout works; token survives app restart (7-day session)
- [ ] First-run banner shows while defaults are active; disappears after changing credentials via `.env`
- [ ] Stream lifecycle: **Add stream** (Save, stays stopped) → **Go live** → status LIVE + uptime ticking → **Stop** → **Retry** → edit (change input) → duplicate → reorder (Move up/down) → delete. No button ever hangs (all mutating calls have timeouts)
- [ ] Start All / Stop All with 2+ streams
- [ ] Every stop/quit leaves **zero orphaned `ffmpeg.exe`** in Task Manager (this was the zombie-device bug — verify after every stop path, including edit-while-live and quit-while-live)
- [ ] Error path: start a stream on a device already held by another app → friendly busy error with **Change input** / **Retry**, full diagnostic collapsed behind a link to /docs
- [ ] Audio inputs card (under the streams card): collapsed by default, opens/closes, rescan works without toggling the card, IN USE / IDLE / MISSING statuses correct
- [ ] Event details + feedback contact cards save and show on the listener page; banner upload → cover display → lightbox; remove image → bundled default banner appears
- [ ] Icecast info card shows running status, listeners count, uptime

## 2. Listener experience (real devices, not just devtools)

- [ ] Open `http://<LAN-IP>:3001/streams` on **Android Chrome, iOS Safari, and a desktop browser**
- [ ] Channel rows show LIVE chips, uptime, bitrate; visible play circles; icon flips play ⇄ pause correctly on every tap (pause→play flip was a real bug — test the cycle)
- [ ] Switching channels mid-play; big player reflects the change; mini-player on mobile while scrolled
- [ ] Kill the stream on the dashboard while a listener is playing → listener sees "went off air — waiting…", grace countdown, then "off air, will resume"; restart the stream → auto-resumes without user action
- [ ] Pause a listener → it never auto-resumes until they press play
- [ ] QR code: scan with a phone camera → opens the listener page directly
- [ ] Both themes (dark/light) on every listener surface — dark-on-dark / light-on-light contrast bugs are this project's most-reported class
- [ ] 3+ simultaneous listeners for 15+ minutes: audio stays in sync, no memory creep in Task Manager (node + ffmpeg)

## 3. Security pre-flight

- [ ] Change the default admin credentials (`ADMIN_USERNAME` / `ADMIN_PASSWORD` / `JWT_SECRET` in `.env`) and confirm the banner retires
- [ ] From a **different machine** on the LAN: `/streams` loads (public) but `/dashboard` and admin APIs are refused (localhost lock) — `curl http://<LAN-IP>:3001/dashboard` from another device must NOT render the dashboard
- [ ] Listener page never displays credentials anywhere
- [ ] `git status` clean of secrets; `electron/telemetry-key.json` and `.env` are gitignored (verify: `git check-ignore electron/telemetry-key.json .env`)
- [ ] Rate-limited telemetry endpoint sane: `for i in {1..35}; do curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3001/api/telemetry/client-event -H "Content-Type: application/json" -d "{\"event\":\"playback_stalled\"}"; done` → ends in 429

## 4. Telemetry (PostHog — eu.posthog.com)

- [ ] `node scripts/prepare-telemetry-key.mjs` reports "Injected for packaged build" (bundles the key from the credential store; file gitignored)
- [ ] With telemetry ON (tray toggle): events visible in PostHog Live within ~30s — `lanstreamer_app_start`, `stream_started` / `stream_failed` when you exercise streams
- [ ] Trigger a listener playback failure (or run `scripts/verify-client-telemetry.mjs`) → `lanstreamer_client_*` events arrive with `surface=listener`
- [ ] With telemetry OFF (tray toggle): no events arrive at all; app behaves identically (telemetry must never affect function)
- [ ] README "Telemetry & Privacy" matches what's actually collected (it does as of this writing — re-read after any telemetry change)

## 5. Resilience & environment

- [ ] Quit app mid-stream (tray → Stop All & Quit) → zero orphaned processes; relaunch → auto-start streams restore (if `autoStart` set)
- [ ] Close the window (not quit) → app hides to tray, streams keep serving; listeners confirm audio continues
- [ ] Change network (different subnet / hotspot): share card + QR update to the new LAN IP; old links fail gracefully
- [ ] Port collision: start a second instance → it must not corrupt the first (single-instance lock) and the "port in use" guidance appears in /docs
- [ ] Windows Firewall prompt on first run: accept for **Private networks**; listener on another device confirms reachability
- [ ] Offline check: `node scripts/verify-offline.mjs` — app fully renders with all non-localhost requests blocked (fonts/assets vendored)
- [ ] Reboot the operator PC with the app configured: relaunch and confirm streams/config persist (config/ survives)

## 6. Packaging (NSIS installer + portable)

- [ ] `npm test` green immediately before building
- [ ] `node scripts/prepare-telemetry-key.mjs` run in the same session (no stale key)
- [ ] `npm run electron:build:win` → produces installer + portable in `dist/`
- [ ] **Install on a clean Windows machine (or VM) that has never run the project** — this is the single most important check. Then on that machine:
  - [ ] App launches, dashboard opens, login works, version shows correctly (from package.json, not "unknown")
  - [ ] First-run telemetry consent dialog appears (bundled key resolves) — test BOTH Allow and Decline paths
  - [ ] With FFmpeg + Icecast installed per the guides: create a stream and go live; a phone plays it
  - [ ] FFmpeg/Icecast missing → errors are the friendly classified kind pointing at the guides (not stack traces)
- [ ] Confirm the build does NOT contain `.env`, `config/` from the dev machine, or `public/uploads/` (inspect the NSIS contents or a fresh install's resources)
- [ ] SmartScreen will warn on an unsigned exe — decide: accept for now (document in release notes: "More info → Run anyway") or invest in code signing later
- [ ] Portable build: runs from a folder without installing; config lands somewhere sensible and persists between runs

## 7. Release: version, tag, notes on GitHub

- [ ] Bump `version` in **package.json** (`1.2.4` → `1.3.0` — new features, no breaking change) and rebuild so the installer embeds it
- [ ] Move `[Unreleased]` in [CHANGELOG.md](./CHANGELOG.md) to `## [1.3.0] - <date>`; write the user-facing highlights (Electron app, admin login, redesign, listener page, telemetry opt-in, default event banner)
- [ ] Update README if anything user-facing changed (credentials section, download link once releases exist)
- [ ] Merge `dev` → `main` via PR (never push straight to main); CI green on the PR
- [ ] Tag and push: `git tag v1.3.0 && git push origin v1.3.0`
- [ ] Create the GitHub release with the installers attached and real release notes:
  ```bash
  gh release create v1.3.0 dist/*.exe dist/*.yml \
    --title "LANStreamer v1.3.0 — desktop app" \
    --notes-file release-notes-v1.3.0.md
  ```
- [ ] Release notes template (user-facing, non-technical): **What's new** (5–8 bullets) · **Installing** (prereqs: FFmpeg + Icecast with guide links; SmartScreen note) · **Upgrading from a source/ZIP install** · **Known issues** · **Telemetry disclosure** (opt-in, what's collected, how to decline)
- [ ] Smoke the release as a stranger would: fresh VM, download the installer **from the GitHub release page**, install, run one stream end-to-end
- [ ] Post-release: watch PostHog for `app_start` from install IDs that aren't yours; triage `stream_failed` / `lanstreamer_client_*` events as user reports come in

## 8. Deferred (explicitly NOT blocking this release)

- Code signing certificate (SmartScreen reputation builds over time; signing is a follow-up)
- Bundling FFmpeg + Icecast into the installer
- macOS/Linux packaging (source-only for now)
- Auto-update via electron-updater (update checks point at GitHub releases today)
- PWA for listeners (deliberately removed — DHCP IP changes break it; see docs)

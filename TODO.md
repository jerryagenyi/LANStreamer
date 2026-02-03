# LANStreamer – TODO

Context: [CLAUDE.md](CLAUDE.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Delete when done.

---

## To do (priority order)

- [x] **Lock admin to localhost** — Admin UI only on localhost; listeners use LAN IP. Implemented: `requireLocalhostAdmin` middleware; listener page and APIs (config, status, play, contact-details) allowed from LAN; integration tests in `lock-admin-localhost.test.js`.

- [x] **Verify 5+ streams** — Confirmed 6/6 live (VB-Cable A/B, mics). Root cause of "5th fails" was bad device choice, not Icecast limit.

- [x] **Unique stream names** — No duplicate display names (create/update); case-insensitive, trimmed.

- [x] **Start/Stop All button** — Start all stopped/error streams; Stop all running; API `POST /api/streams/start-all`; partial-failure toast with names + first error; 150ms delay between success/error toasts.

- [x] **Listener page uses LAN IP** — Copy URLs and listener page use `config.host` from getPreferredLANHost / icecast.xml. Docs: "Which IP is my LAN / WiFi?" in TROUBLESHOOTING.md.

- [x] **Mobile** — Listener page, "Listen to Streams" header link, and Copy URL use correct LAN IP. HeaderComponent fetches config.host; TROUBLESHOOTING.md "Action Required: Mobile Listener Setup". _QA: Test with real device on same WiFi._

- [x] **Workflow/docs** — Branch workflow: feature → merge into dev locally → push dev → PR dev→main (remote only). Local branches: dev + features only; `main` deleted locally (remote-only). AGENTS.md removed; refs point to CLAUDE.md. PR #6 updated with lock-admin-localhost changes.

- [x] **Notification types** — For duplicate stream name or duplicate source, use a simple modal ("stream already exists") without troubleshooting link; for real failures, existing error handling with diagnosis/link. Implemented in FFmpegStreamsManager: isDuplicateError(), showDuplicateModal(); used for start, restart, update, start-all.

- [x] **Source validation & clear errors** — On stream failure, backend errorDiagnostics provides category (device, connection, auth, etc.), title, solutions; API returns shortMessage; frontend shows error + troubleshooting link. Optional "Test source" button deferred.

- [x] **Timing of Modals** — Alert modals should appear only after the action is performed, not before. All success modals now have 1-second delay after UI updates.

- [x] **Listener: dismiss without reload** — New-stream notification dismisses overlay without full reload (don't stop playback). Hot reload only for the affected stream. Implemented: `dismissNewStreamNotification()` calls `loadStreams()` to refresh without page reload.

- [x] **Error alert UX** — Structured error from API (shortMessage = diagnosis title); centred toast with message + link to troubleshooting guide; Start All partial failure lists failed names (up to 5 + "and N more") and first error. Duplicate errors use simple modal without link.

- [x] **Stability** — Confirm 3+ streams stay stable (see TROUBLESHOOTING.md). _CONFIRMED working._

- [x] **Device change mid-stream / Play after edit** — Play proxy now checks Icecast response status; non-200 returns 502 with clear message so listener page no longer shows "Authentication Failed". Listener page shows "Stream not running. Start it on the dashboard, then try Play again." No refresh or delete/recreate needed. _See TROUBLESHOOTING.md §1c._

- [x] **Stream labels (optional)** — Streams show S1, S2, S3 from server order; label in `getStats()` and on listener page / dashboard.

- [x] **Sortable streams (optional)** — Up/down buttons on dashboard; `POST /api/streams/reorder`; order persisted in `config/streams.json` (`_order`); listener page uses same order and S1/S2/S3 labels without refresh.

- [x] **Contact: WhatsApp** — Country code enforced (digits 10–15, no leading zero); validation backend + ContactManager; `wa.me/<digits>` built on listener page; placeholder "e.g. +44 7123 456789 (country code required)". Not working

- [x] **Update notification UX** — Bell icon in header; auto-check on load (HeaderComponent.checkForUpdates); when updateAvailable=true bell shows badge and "Update Available"; click opens modal with update info and link to release. Single button id header-update-bell-btn; manual check on click when no update yet.

- [x] **Event Details & Your Contact components** — Not working as they should; details not saving for contact, and the event details collapsible doesn't open after saving details.

- [x] **UI/UX polish (optional)** — [docs/UI-UX-RECOMMENDATIONS.md](docs/UI-UX-RECOMMENDATIONS.md).

---

## Reference

- Run `npm test` before releases; [STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md) for troubleshooting.
- **Future refactor:** ErrorFactory consistency, remove/trim FFmpegService.js, device mapping extraction, split large HTML/JS — see inline notes in codebase.

---

## Earlier (historical)

Notification timing, LANStreamer.bat updater, Claude hooks, custom-instructions, capacity NaN fix, config capacity fields, shortMessage + troubleshooting link.

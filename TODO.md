# LANStreamer – TODO

Context: [CLAUDE.md](CLAUDE.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Delete when done.

---

## To do (priority order, numbered)

1. [x] **Lock admin to localhost** — Admin UI (login, dashboard, streams admin) only on localhost; listeners use LAN IP. Implemented: `requireLocalhostAdmin` middleware; listener page and APIs (config, status, play, contact-details) allowed from LAN; integration tests in `lock-admin-localhost.test.js`.

2. [ ] **Notification types** — Different types of notification: for duplicate stream name or duplicate source, use a simple modal (“stream already exists”) without troubleshooting link; for real failures, use existing error handling with diagnosis/link.

3. [ ] **Source validation & clear errors** — On stream failure, check if source (device/file) is viable and say so in the error. Optional: “Test source” button per source. _Note: Test source button + Show test tools toggle and structured errors implemented; QA pending._

4. [ ] **Timing of Modals** — Alert modals should appear only after the action is performed, not before.

5. [ ] **Listener: dismiss without reload** — New-stream notification dismisses overlay without full reload (don’t stop playback). Hot reload only for the affected stream.

6. [ ] **Error alert UX** — Show structured error from API (cause + diagnosis: title, solutions); optional collapsible Details and FFmpeg output; centred modal or large toast when stream fails; link to troubleshooting guide. _Note: Implemented (structured modal, diagnosis, stderr in Technical details, scenario tests); QA pending._ _Edge cases: Start All partial failure — toast lists failed stream names (up to 5 + “and N more”) and first error reason; test API response shape and frontend message._

7. [ ] **Stability** — Confirm 3+ streams stay stable (see TROUBLESHOOTING.md).

8. [ ] **Device change mid-stream / Play after edit** — After changing a stream’s device mid-stream, Play on listener page can show “Authentication Failed”; workaround: Start stream on dashboard, refresh listener page. _See TROUBLESHOOTING.md. Should not require delete/recreate._

9. [ ] **Stream labels (optional)** — e.g. prefix streams S1, S2, S3; or better naming idea.

10. [ ] **Sortable streams (optional)** — Drag-and-drop or up/down to reorder stream list on admin dashboard; persist order (e.g. in config). Works with Stream labels; affects frontend for listeners without refresh.

11. [ ] **Contact: WhatsApp** — Enforce country code, build `wa.me/<digits>` link.

12. [ ] **UI/UX polish (optional)** — [docs/UI-UX-RECOMMENDATIONS.md](docs/UI-UX-RECOMMENDATIONS.md).

13. [ ] **Update notification UX** — Show notification bell icon when update available; click to open modal with update info and link to latest release. Current: button shows "Updates" and runs manual check on click; should auto-check on load and show bell when updateAvailable=true.

---

## Done

1. **Lock admin to localhost** — Middleware blocks admin pages and admin APIs from non-localhost; listener page and listener APIs allowed from LAN; 403 HTML/JSON; TROUBLESHOOTING.md "Admin only on localhost".
2. **Verify 5+ streams** — Confirmed 6/6 live; root cause of "5th fails" was bad device choice, not Icecast limit.
3. **Unique stream names** — No duplicate display names (create/update); case-insensitive, trimmed.
4. **Start/Stop All button** — Start all stopped/error streams; Stop all running; API `POST /api/streams/start-all`; partial-failure toast with names + first error; 150ms delay between success/error toasts.
5. **Listener page uses LAN IP** — Copy URLs and listener page use `config.host` from getPreferredLANHost / icecast.xml. Docs: "Which IP is my LAN / WiFi?" in TROUBLESHOOTING.md.
6. **Mobile** — Listener page, "Listen to Streams" header link, and Copy URL use correct LAN IP. HeaderComponent fetches config.host; TROUBLESHOOTING.md "Action Required: Mobile Listener Setup". _QA: Test with real device on same WiFi._
7. **Workflow/docs** — Branch workflow: feature → merge into dev locally → push dev → PR dev→main (remote only). Local branches: dev + features only; `main` deleted locally (remote-only). AGENTS.md removed; refs point to CLAUDE.md. PR #6 updated with lock-admin-localhost changes.

**Earlier:** Notification timing, LANStreamer.bat updater, Claude hooks, custom-instructions, capacity NaN fix, config capacity fields, shortMessage + troubleshooting link.

---

## Reference

- Run `npm test` before releases; [STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md) for troubleshooting.
- **Future refactor:** ErrorFactory consistency, remove/trim FFmpegService.js, device mapping extraction, split large HTML/JS — see inline notes in codebase.

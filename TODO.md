# LANStreamer – Current state and notes

**Last updated:** 2026-01-31

---

## Current state

- **Streaming:** Working (FFmpeg → Icecast with localhost for source URL; spawn with `shell: true` on Windows).
- **Copy URL:** Correct port (8200 or your Icecast port) via `GET /api/system/config`.
- **Listening page:** Play uses same-origin proxy `/api/streams/play/:streamId`; Copy URL gives direct Icecast URL.
- **Tests:** Unit and integration tests in place; see [docs/TEST-PLAN.md](docs/TEST-PLAN.md). Run with `npm test`.
- **Docs:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md), [docs/STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md), [docs/NETWORK-SETUP.md](docs/NETWORK-SETUP.md).

---

## Max 2 streams (Icecast source limit)

**Symptom:** Only the first one or two streams start; the next fails (e.g. “too many sources”).

**Cause:** Icecast’s default `<sources>` in `icecast.xml` is **2**. When you **start Icecast from the LANStreamer dashboard**, the app writes a generated config with `<sources>32</sources>`. If you still see only 2 streams:

- You may be using an **existing** `icecast.xml` (e.g. from a manual Icecast install) that was never updated.
- Or Icecast was started outside the app with that config.

**Fix:** See **Cause 5: Stream Source Limit Reached** in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md): edit `<limits><sources>` in `icecast.xml` to 10 (or more), then restart Icecast. To allow up to 10 streams, use `<sources>10</sources>`.

**Testing:** To verify more than 2 streams: start Icecast from the LANStreamer dashboard (so the app writes `icecast.xml` with `<sources>32</sources>`), then create 3–10 streams from the UI. If you use an external Icecast, set `<sources>10</sources>` (or higher) in its config first.

---

## To do / verify (priority order)

1. **More than 4 streams fails:** Icecast was edited to `<sources>10</sources>` and restarted, but creating the 5th stream still errors. Investigate and fix so 5+ streams can be created (check Icecast limit, credentials, connection).
2. **Start All button:** Streams persist after shutdown/restart; we have “Stop All” but no “Start All”. Add a “Start All” button to start all persisted (stopped) streams at once.
3. **Lock admin to localhost:** Bind the app so the admin UI is only reachable via localhost (not on the LAN IP). Listeners use the listener page via IP; admin stays on the server machine.
4. **Streams/listener page must use IP (not localhost):** The listener page (`/streams`) cannot use `localhost:3001` because external users/listeners are on different devices. Ensure the listener page and all Copy URLs use the server's LAN IP (from config) so listeners can access streams from their devices. Verify that `localhost:3001` references in listener-facing code are replaced with dynamic host detection.
5. **Duplicate stream names:** Disallow using the same stream name for streams that are already live. We have protection for sources (devices) but not for stream names — add validation so live streams must have unique names.
6. **Error alert (FFmpeg output):** For the stream-error alert (e.g. "Verify icecast.xml hostname…"): make the FFmpeg output section **collapsible**; make the alert **wider** and **taller**; **centre** the alert on the page.
7. **Multiple streams (stability):** Confirm that 3+ streams can be created and stay stable (backend + Icecast source limit; see "Max 2 streams" above).
8. **Mobile playback:** Verify the listener page and Play/Copy URL work on mobile phones. Consider adding tests or checks for mobile browsers if feasible (e.g. CI with mobile viewport or real-device testing).
9. **Update LANStreamer.bat:** Script references `update_exclude.txt` (missing); deletes TODO.md and assumes old layout (e.g. dev-docs\tests). Review: add or fix exclude list, align preserved/cleaned files with current project (TODO.md, tests/, jest), ensure updater doesn't break dev installs.
10. **Claude hooks (.claude/hooks):** Hooks are outdated (post hook says "no tests" but we have `npm test`). Either update hooks to match current workflow and ensure they're used in dev, or remove the hooks folder if not supported by the environment.
11. **.claude/custom-instructions.md:** Content is generic frontend-architect (React/Vue, ULTRATHINK); project is Node + simple HTML. Review: align with LANStreamer (e.g. when editing public/streams.html) or keep as optional frontend guidelines.
12. **.claude/settings.local.json (optional):** Local permissions only; add/remove tool permissions as needed for your dev setup.

---

## Related

- **Regression analysis (historical):** The long regression checklist was completed or superseded by the fixes above. Details were in `ERROR_DIAGNOSTICS_ANALYSIS_REPORT.md` if needed for reference.
- **Next steps:** Run `npm test` before releases; use [docs/STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md) for step-by-step troubleshooting.

---

## Refactor (Future) - Code Quality Improvements

*These items are for future code quality improvements. Focus on stability items above first.*

| Priority | Area | Issue | Suggested Fix |
|----------|------|--------|---------------|
| **HIGH** | FFmpegService.js | Duplicate of StreamingService, unused, wrong mount point | Remove FFmpegService.js or fix to be a thin wrapper |
| **HIGH** | Device mapping | 50+ hardcoded device mappings in StreamingService.js:522-566 | Extract to dynamic detection service or config file |
| **MEDIUM** | startFFmpegProcess | 145-line function with complex timeout/promise logic | Extract spawn wrapper, simplify error handling |
| **MEDIUM** | Inline HTML/JS | index.html & streams.html are 1240+ lines with inline scripts | Extract JS to separate files, use components |
| **MEDIUM** | IP detection | Server.js:172-211 has 50-line IP detection block inline | Extract to `src/utils/network.js` |
| **LOW** | Console logs | Debug console.log statements throughout | Remove or condition with debug flag |
| **LOW** | Duplicate formats | getAudioFormats() in both services (AAC format differs) | Consolidate to shared module |

# LANStreamer – TODO (working checklist)

Context: [CLAUDE.md](CLAUDE.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (incl. Icecast source limit). Delete this file when done.

---

## To do / verify (priority order)

- [ ] 1. **More than 4 streams fails:** Icecast was edited to `<sources>10</sources>` and restarted, but creating the 5th stream still errors. Investigate and fix so 5+ streams can be created (check Icecast limit, credentials, connection).
- [ ] 2. **Start All button:** Streams persist after shutdown/restart; we have “Stop All” but no “Start All”. Add a “Start All” button to start all persisted (stopped) streams at once.
- [ ] 3. **Lock admin to localhost:** Bind the app so the admin UI is only reachable via localhost (not on the LAN IP). Listeners use the listener page via IP; admin stays on the server machine.
- [ ] 4. **Streams/listener page must use IP (not localhost):** The listener page (`/streams`) cannot use `localhost:3001` because external users/listeners are on different devices. Ensure the listener page and all Copy URLs use the server's LAN IP (from config) so listeners can access streams from their devices. Verify that `localhost:3001` references in listener-facing code are replaced with dynamic host detection.
- [ ] 5. **Duplicate stream names:** Disallow using the same stream name for streams that are already live. We have protection for sources (devices) but not for stream names — add validation so live streams must have unique names.
- [x] 5a. **Notification timing and duration:** (a) Success notifications (e.g. "Stream deleted successfully") sometimes appear before the UI has updated — defer them until after the next paint (e.g. requestAnimationFrame) so the list/UI updates first. (b) Tiered auto-dismiss: short (e.g. 4s) for info and success; long (e.g. 60s) for errors so users can read troubleshooting details. Apply in FFmpegStreamsManager and the global showNotification used by the dashboard.
- [ ] 6. **Error alert (stream failure):** For the stream-error alert (e.g. connection refused, all formats failed): (a) make the **FFmpeg raw output** section **collapsible** (so the diagnostic message is visible first); (b) **restructure** so the "Quick fixes" list isn’t a wall of text — e.g. show title + likely cause first, then "What to try" as a collapsible or short list; (c) make the alert **wider**, **taller**, and **centred** on the page.
- [ ] 7. **Multiple streams (stability):** Confirm that 3+ streams can be created and stay stable (backend + Icecast source limit; see docs/TROUBLESHOOTING.md).
- [ ] 8. **Mobile playback:** Verify the listener page and Play/Copy URL work on mobile phones. Consider adding tests or checks for mobile browsers if feasible (e.g. CI with mobile viewport or real-device testing).
- [ ] 9a. **Listener page: new streams without stopping playback:** When the listener page detects new streams it shows a "New stream available — tap to refresh" overlay; clicking it does a full page reload, which stops the current stream. Change so: (a) clicking the notification only **dismisses** the overlay (no reload) — the list is already updated by the poll, so playback can continue; (b) optionally, update the list in a **component-like** way (only append new stream cards to the DOM, remove cards for streams that disappeared) so existing cards and their state are untouched and playback is never interrupted.
- [x] 9. **Update LANStreamer.bat:** Script references `update_exclude.txt` (missing); deletes TODO.md and assumes old layout (e.g. dev-docs\tests). Review: add or fix exclude list, align preserved/cleaned files with current project (TODO.md, tests/, jest), ensure updater doesn't break dev installs.
- [x] 10. **Claude hooks (.claude/hooks):** Hooks are outdated (post hook says "no tests" but we have `npm test`). Either update hooks to match current workflow and ensure they're used in dev, or remove the hooks folder if not supported by the environment.
- [x] 11. **.claude/custom-instructions.md:** Content is generic frontend-architect (React/Vue, ULTRATHINK); project is Node + simple HTML. Review: align with LANStreamer (e.g. when editing public/streams.html) or keep as optional frontend guidelines.
- [ ] 12. **.claude/settings.local.json (optional):** Local permissions only; add/remove tool permissions as needed for your dev setup.
- [ ] 13. **UI/UX polish (optional):** See [docs/UI-UX-RECOMMENDATIONS.md](docs/UI-UX-RECOMMENDATIONS.md) for button styling, icons, live badge, accessibility. Do after stability items above.
- [ ] 14. **Contact: WhatsApp country code:** In the contact section, enforce a country code for the WhatsApp number (e.g. require +234, +1, +44). Store the full international number; when displaying on the front page (listener/streams), build the link as `https://wa.me/<digits only>` (e.g. `https://wa.me/2347060532629`). Backend and ContactManager already strip non-digits for validation — add explicit “must start with + and country code” validation and use the same digits-only value for the wa.me URL.

---

## Related

- **Regression analysis (historical):** The long regression checklist was completed or superseded by the fixes above. Details were in `ERROR_DIAGNOSTICS_ANALYSIS_REPORT.md` if needed for reference.
- **Next steps:** Run `npm test` before releases; use [docs/STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md) for step-by-step troubleshooting.
- **UI/UX ideas:** [docs/UI-UX-RECOMMENDATIONS.md](docs/UI-UX-RECOMMENDATIONS.md) — dashboard buttons, icons, animations, accessibility.

---

## Refactor (Future) - Code Quality Improvements

*These items are for future code quality improvements. Focus on stability items above first.*

| Priority | Area | Issue | Suggested Fix |
|----------|------|--------|---------------|
| **HIGH** | Error handling | Inconsistent error patterns; plain `new Error()` with ad-hoc properties instead of using LANStreamerError classes | Refactor to consistently use ErrorFactory, add STREAM_LIMIT_EXCEEDED code, ensure all errors use the framework |
| **HIGH** | FFmpegService.js | Duplicate of StreamingService, unused, wrong mount point | Remove FFmpegService.js or fix to be a thin wrapper |
| **HIGH** | Device mapping | 50+ hardcoded device mappings in StreamingService.js:522-566 | Extract to dynamic detection service or config file |
| **MEDIUM** | startFFmpegProcess | 145-line function with complex timeout/promise logic | Extract spawn wrapper, simplify error handling |
| **MEDIUM** | Inline HTML/JS | index.html & streams.html are 1240+ lines with inline scripts | Extract JS to separate files, use components |
| **MEDIUM** | IP detection | Server.js:172-211 has 50-line IP detection block inline | Extract to `src/utils/network.js` |
| **LOW** | Console logs | Debug console.log statements throughout | Remove or condition with debug flag |
| **LOW** | Duplicate formats | getAudioFormats() in both services (AAC format differs) | Consolidate to shared module |

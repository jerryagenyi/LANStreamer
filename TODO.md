# LANStreamer – TODO (working checklist)

Context: [CLAUDE.md](CLAUDE.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (incl. Icecast source limit). Delete this file when done.

---

## 🚨 CURRENT INVESTIGATION (2026-02-01) - Resume Point

### Issue: "5th stream fails" - ROOT CAUSE FOUND

**NOT an Icecast source limit problem!** The issue was a **device selection error**, not a source limit.

#### What We Discovered:

1. **Icecast config is correct:** `<sources>10</sources>` in `C:\Program Files (x86)\Icecast\icecast.xml`
2. **Diagnostics working:** `Stream capacity check: sourceLimit=10 activeCount=X remaining=Y` logs correctly
3. **Real problem:** User selected "OBS Virtual Camera (Audio)" device which **doesn't exist** on their system
4. **FFmpeg error:** `Could not find audio only device with name [OBS Virtual Camera (Audio)]` → Exit code 4294967291 (-5 = Access Denied/I/O error)
5. **Why error handling failed:** FFmpeg stderr was empty, so diagnostics couldn't provide specific guidance

#### What Was Completed:
- ✅ Added `parseSourceLimit()` to IcecastService - reads `<sources>` from icecast.xml
- ✅ Added capacity check logging: `Stream capacity check: sourceLimit=X activeCount=Y remaining=Z`
- ✅ Enhanced `/api/system/config` with `sourceLimit`, `activeStreams`, `remaining`, `configPath`
- ✅ Simplified error messages (by Cursor) - backend sends `shortMessage` (diagnosis title), frontend shows link to troubleshooting guide
- ✅ Enhanced TROUBLESHOOTING.md with exit code -5, empty stderr, 5th stream scenarios
- ✅ Added `err.shortMessage` to error objects for clean UI display
- ✅ Added TROUBLESHOOTING_GUIDE_URL constant in FFmpegStreamsManager.js

#### What's In Progress (Cursor was working on):
- Frontend changes to show `shortMessage + troubleshooting guide link` in error toasts
- FFmpegStreamsManager.js partially updated (TROUBLESHOOTING_GUIDE_URL constant added)
- streams.js updated to send `shortMessage` if available

#### Next Steps When You Return:

1. **After reboot with VB-Cable installed:**
   - You'll have more virtual audio devices (VB-Cable A, VB-Cable B) to test with
   - Test creating 5+ streams with actual working devices
   - The capacity check will now correctly track active streams

2. **Complete frontend error message simplification:**
   - FFmpegStreamsManager.js needs to be updated to use `shortMessage` + show troubleshooting link
   - The notification system should show: `[diagnosis.title] See the [troubleshooting guide] for steps.`
   - Make FFmpeg output section collapsible (TODO #6)

3. **Verify the 5+ streams actually work:**
   - Start 4 streams with working devices
   - Create 5th stream
   - Confirm all 5 stream successfully

#### Key Files Modified Recently:
- `src/services/IcecastService.js` - added parseSourceLimit(), getSourceLimit()
- `src/services/StreamingService.js` - added capacity check, err.shortMessage
- `src/routes/system.js` - enhanced /config endpoint with capacity info
- `src/routes/streams.js` - send shortMessage to client
- `docs/TROUBLESHOOTING.md` - added exit code -5, empty stderr diagnostics
- `public/components/FFmpegStreamsManager.js` - added TROUBLESHOOTING_GUIDE_URL constant (partial)

#### Current Server State:
- Background task `b01f2ac` is running the server on port 3001
- Icecast is running on port 8200 with 4 sources connected
- 4 streams are active and running

#### Commands to Reference:
```bash
# Check capacity/status
curl http://127.0.0.1:3001/api/system/config
curl http://127.0.0.1:3001/api/streams/status

# Check Icecast stats (with auth)
curl http://127.0.0.1:8200/admin/stats.xml -u admin:hackme

# Run tests
npm test

# Start server (after stopping any existing instance)
npm start
```

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

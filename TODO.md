# LANStreamer – TODO

Context: [CLAUDE.md](CLAUDE.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Delete when done.

---

## To do (priority order)

- [x] **Verify 5+ streams** — Confirmed 6/6 live (VB-Cable A/B, mics). Root cause of "5th fails" was bad device choice, not Icecast limit.
- [ ] **Notification types** — different types of notification is needed. if it is information about a duplicate stream name or duplicate source selected when creating a stream, it should just be a simple modal that says the stream already exists. no need to add the link to troubleshoot - its not a troubleshooting isseu, its just a notification. If its a troubleshooting issue, then the error handling logic should come into play.
- [ ] **Source validation & clear errors** — On stream failure, check if source (device/file) is viable and say so in the error. Optional: "Test source" button per source. _Note: Test source button + Show test tools toggle and structured errors implemented; QA pending._
- [ ] **Timing of Modals** — Alert modals appear even before the action is performed - they should only appear after the action is performed.
- [ ] **Listener: dismiss without reload** — New-stream notification dismisses overlay without full reload (don't stop playback).
- [x] **Unique stream names** — No duplicate names for live streams.
- [x] **Start/Stop All button** — Start all persisted (stopped) streams at once. Stop for vice versa.
- [ ] **Lock admin to localhost** — Admin UI only on localhost; listeners use LAN IP.
- [x] **Listener page uses LAN IP** — Copy URLs and listener page use server LAN IP (config.host from getPreferredLANHost / icecast.xml hostname). Docs: “Which IP is my LAN / WiFi?” in TROUBLESHOOTING.md.
- [ ] **Error alert UX** — Show structured error from API (cause + diagnosis: title, solutions); optional collapsible Details and FFmpeg output; centred modal or large toast when stream fails; link to troubleshooting guide. _Note: Implemented (structured modal, diagnosis, stderr in Technical details, scenario tests); QA pending._ _Edge cases to test: Start All partial failure — toast lists failed stream names (up to 5 + “and N more”) and first error reason; write test for API response `{ failed, results: [{ name, success, error }] }` and frontend message construction._
- [ ] **Stability** — Confirm 3+ streams stay stable (see TROUBLESHOOTING.md).
- [ ] **Mobile** — Verify listener page and Play URL on mobile. _Note: Config now prefers LAN IP (192.168.x.x from WiFi) for listener URLs (debug: network vs localhost vs LAN IP). See TROUBLESHOOTING.md “Listener page not loading on mobile”._
- [ ] **Device change mid-stream / Play after edit** — After changing a stream's device mid-stream, Play on listener page can show "Authentication Failed"; workaround: Start stream on dashboard, refresh listener page. _See TROUBLESHOOTING.md. Should not require delete/recreate._
- [ ] **Stream labels (optional)** — e.g. prefix streams S1, S2, S3; or better naming idea.
- [ ] **Sortable streams (optional)** — Drag-and-drop or up/down to reorder stream list on admin dashboard; persist order (e.g. in config). Works with Stream labels (S1, S2, S3): labels can follow display order so reordering updates which stream is S1, S2, etc. Also this affects frontend for listeners without refreshing the page.
- [ ] **Contact: WhatsApp** — Enforce country code, build `wa.me/<digits>` link.
- [ ] **UI/UX polish (optional)** — [docs/UI-UX-RECOMMENDATIONS.md](docs/UI-UX-RECOMMENDATIONS.md).

**Done:** Notification timing, LANStreamer.bat updater, Claude hooks, custom-instructions, capacity NaN fix, config capacity fields, shortMessage + troubleshooting link.

---

## Reference

- Run `npm test` before releases; [STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md) for troubleshooting.
- **Future refactor:** ErrorFactory consistency, remove/trim FFmpegService.js, device mapping extraction, split large HTML/JS — see inline notes in codebase.

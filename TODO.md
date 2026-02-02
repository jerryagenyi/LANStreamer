# LANStreamer – TODO

Context: [CLAUDE.md](CLAUDE.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Delete when done.

---

## To do (priority order)

- [x] **Verify 5+ streams** — Confirmed 6/6 live (VB-Cable A/B, mics). Root cause of "5th fails" was bad device choice, not Icecast limit).
- [ ] **Source validation & clear errors** — On stream failure, check if source (device/file) is viable and say so in the error. Optional: "Test source" button per source. _Note: Test source button + Show test tools toggle and structured errors implemented; QA pending._
- [ ] **Timing of Modals** — Alert modals appear even before the action is performed - they should only appear after the action is performed.
- [ ] **Listener: dismiss without reload** — New-stream notification dismisses overlay without full reload (don't stop playback).
- [ ] **Unique stream names** — No duplicate names for live streams.
- [ ] **Start All button** — Start all persisted (stopped) streams at once.
- [ ] **Lock admin to localhost** — Admin UI only on localhost; listeners use LAN IP.
- [ ] **Listener page uses LAN IP** — Copy URLs and listener page use server LAN IP, not localhost.
- [ ] **Error alert UX** — Show structured error from API (cause + diagnosis: title, solutions); optional collapsible Details and FFmpeg output; centred modal or large toast when stream fails; link to troubleshooting guide. _Note: Implemented (structured modal, diagnosis, stderr in Technical details, scenario tests); QA pending._
- [ ] **Stability** — Confirm 3+ streams stay stable (see TROUBLESHOOTING.md).
- [ ] **Mobile** — Verify listener page and Play URL on mobile.
- [ ] **Stream labels (optional)** — e.g. prefix streams S1, S2, S3; or better naming idea.
- [ ] **Contact: WhatsApp** — Enforce country code, build `wa.me/<digits>` link.
- [ ] **UI/UX polish (optional)** — [docs/UI-UX-RECOMMENDATIONS.md](docs/UI-UX-RECOMMENDATIONS.md).

**Done:** Notification timing, LANStreamer.bat updater, Claude hooks, custom-instructions, capacity NaN fix, config capacity fields, shortMessage + troubleshooting link.

---

## Reference

- Run `npm test` before releases; [STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md) for troubleshooting.
- **Future refactor:** ErrorFactory consistency, remove/trim FFmpegService.js, device mapping extraction, split large HTML/JS — see inline notes in codebase.

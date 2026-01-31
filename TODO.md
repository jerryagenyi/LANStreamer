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

## Related

- **Regression analysis (historical):** The long regression checklist was completed or superseded by the fixes above. Details were in `ERROR_DIAGNOSTICS_ANALYSIS_REPORT.md` if needed for reference.
- **Next steps:** Run `npm test` before releases; use [docs/STARTUP-SEQUENCE.md](docs/STARTUP-SEQUENCE.md) for step-by-step troubleshooting.

# Handover — critical review of LANStreamer (2026-11-16)

Written by Claude (Claude Code desktop session) at Jerry's request. Purpose: any agent
or person can pick this up cold and know what was found, what is proven, what is only
suspected, and what to do next.

- **Branch reviewed:** `feature/dante-dvs-support` @ `0a1035d` (2 commits ahead of `origin/main`, both telemetry/docs — **no DVS code on it**).
- **Released in the field:** v2.0.0 (GitHub release 2026-11-01). The Nigeria reports are about v2.0.0.
- **Trigger:** field report "1–2 s latency first try, next day same equipment 6 s" + "DVS still doesn't work"; Zcode proposed cutting v2.1.0 (telemetry + docs only).
- **Verdict in one line:** do **not** cut v2.1.0 as it stands — its purpose is remote latency diagnosis and the two things that make that possible (listener heartbeat, app version) are broken. Fix the P0 list below first; it is small.

## 0. STATUS UPDATE — 2026-11-16 evening (read this first; it supersedes parts of §1, §5, §6, §7)

### What changed since the review was written

| Item | State |
|---|---|
| F1 listener POST from LAN, F2 real `appVersion`, F3 lifecycle events (`sid`, `stream_crashed`, restart starts), F8 heartbeat aggregation (`client_buffer_summary`), `ll_fallback` event | **Done, committed, pushed** (`c12b6ef` + follow-ups by a second agent working from this handover) |
| F9 shared PostHog project | **Resolved differently:** LANStreamer now has its own PostHog organisation/project (**353182**). Verified: dev events arrive there with `appVersion 2.0.0`, `osVersion`, `schema 1`. `node scripts/posthog-query.mjs status` works with no env prefix. |
| **Root cause of "1 s wired / 5–6 s Wi-Fi" found and fixed** (new finding F13 below) | **Done in the working tree, NOT committed** |
| `CLAUDE.md` telemetry section (opt-out, event contract) | Updated, not committed |

**Uncommitted at the time of writing:** `public/assets/js/lowlatency.js`, `public/streams.html`, `src/routes/telemetry.js`, `tests/integration/telemetry-client.test.js`, `tests/unit/lowlatency.test.js` (new), `scripts/verify-ll-reconnect.mjs` (new), `CLAUDE.md`, `docs/TROUBLESHOOTING.md`, this file. Full suite with these changes: **22 suites / 122 tests pass**.

### F13 — The player gave up on low latency after any network error (PROVEN, FIXED) — this is the Nigeria latency bug

New field facts (2026-11-16): on the same stream a **wired laptop measured ~1 s** while **Wi-Fi listeners — Chrome on a phone, Edge on a laptop — sat at 5–6 s**; first test was 1–2 s.
- The wired result clears everything up to the server (virtual cable, capture, FFmpeg, Icecast). §5's H1 is out.
- Chrome and Edge both support the low-latency (MSE) player, which is bounded at ~2.5 s by design. Sitting at 5–6 s means those listeners were no longer on it.
- Cause, in `public/assets/js/lowlatency.js` `_fetch`: **any** fetch/read error called `onError`, and the page's `onError` (`public/streams.html`) switches to plain `<audio src>` for the rest of the page load, silently. A clean server close did nothing at all (player dead). One Wi-Fi drop was enough; the slow path then falls further behind with every hiccup and never returns to live.
- Fix: a dropped/refused/closed connection now **reconnects on the MSE path** (300 ms, 800 ms, 1.5 s, 3 s, then every 5 s while the channel stays selected; parser state and stale queue discarded; backoff resets after 10 s of healthy data). `onError` → fallback remains only for real MSE failures (SourceBuffer error, constructor/append failure).
- Proof: unit tests `tests/unit/lowlatency.test.js` (watched fail first: `onError` called with `TypeError: network error`), and a **real Chromium run** with `node scripts/verify-ll-reconnect.mjs` → after a cut connection: `reconnects 1`, `mode mse`, `fallback no`, buffer 0.57 s, playback continuous; after an 8 s outage: stalled during it, then live again on MSE at 0.48 s.
- New telemetry: heartbeats carry `reconnects`; the summary carries `reconnectsMax` (how rough the listeners' Wi-Fi is). The PostHog dashboard does not chart it yet.
- **Not verified:** a real phone on real weak Wi-Fi; Firefox; behaviour when Icecast restarts mid-stream. The harness simulates drops on loopback only.
- **Workaround for v2.0.0 in the field today:** reload the page on the slow device (or tap the channel off and on).
- Still open on the same theme: `SEEK_ABOVE = 2.5 s` lets an MSE listener on a rough link hover up to ~2.5 s of buffer (≈3.5 s end-to-end) before a hard snap. Tune only after `mseAheadMax`/`snapsMax` data exists.

### New issues found this round

1. **PR [#16](https://github.com/jerryagenyi/LANStreamer/pull/16) "Instrument application with PostHog"** was opened by the PostHog wizard bot (branch `posthog/wizard-01a1e4f6be68`), CI failing. It adds an OpenTelemetry **log exporter that reads the key from env and is not gated by the operator's telemetry switch**, new dependencies with `^` ranges, and ~15 extra events (`admin_login_succeeded/failed`, `contact_details_updated`, …). It conflicts with the privacy contract and the consent toggle. **Recommendation: close without merging**; if any event is wanted, add it through `TelemetryService.capture` by hand.
2. **CI on `main` has been red since 2026-11-01** (PR #15 merge; `enforce-prs` also failed). Locally `node scripts/check-design-tokens.mjs` reports 6 violations above baseline in files untouched today (`public/index.html`, `public/showcase.html`, `public/components/FFmpegStreamsManager.js`). The release path (dev → PR → main with green CI) is blocked until these are fixed or the baseline is deliberately updated.
3. **Installs in the field (v2.0.0) still report to the OLD project** (ChurchAfrica's org, id 320407) with the old baked key, and will until they install a new build. Querying their history needs the ChurchAfrica org's key. `package.json` still says `2.0.0` — bump to `2.1.0` at release or the new build is indistinguishable from the old one.
4. **Offline venues** — see "Offline telemetry" below; not built.

### Offline telemetry — how data gets out when the PC is never online (BUILT 2026-11-16, in this branch)

Built by OpenClaude from a written brief, then reviewed, corrected and verified in the primary session.

1. **Local journal.** `TelemetryService.capture()` writes every event to `<dataDir>/telemetry-journal.jsonl` first (`src/services/TelemetryJournal.js`). Capped at 10,000 events; a torn last line after a power cut is skipped; turning telemetry off deletes it.
2. **Send later.** One delivery path: journal → uploader → PostHog `/batch/` (own `fetch`, 10 s timeout). Events keep their original time and use the journal id as the event uuid, so a repeat send is de-duplicated. Runs 4 s after start, 5 s after an event, every 60 s, and at shutdown (3 s cap). Events sent >5 min late carry `delivery: 'late'`. `sent_at` is included so PostHog corrects a wrong PC clock.
3. **Hand-carry.** Dashboard → Admin account → **Export diagnostics** downloads `lanstreamer-diagnostics-<id>-<date>.json` (`GET /api/telemetry/diagnostics/export`, admin + localhost only). Each export is logged in `<dataDir>/telemetry-delivery.json` (last 50). `node scripts/import-diagnostics.mjs [--dry-run] <file>` validates the (untrusted) file and replays it with `delivery: 'handcarry'`.
4. **Reminder.** `GET /api/telemetry/diagnostics/status` returns `remind: true` when events from an earlier session are still waiting after the start-up upload attempt. The dashboard then shows a 30 s toast and a permanent line next to the button. We only know the file was exported, not that it was sent.

Fixed in review (each with a failing test first): unsent events could be deleted when the journal was full during an upload; a full journal was rewritten in full on every event; the reminder never fired because the dashboard asked before the first upload attempt finished (`settled` flag + one re-check).

Verified: 25 suites / 154 tests; linter 0 new; a **live upload to project 353182** (event dated two hours earlier arrived with that time, `delivery: late`, one copy after a deliberate double send); a **real dashboard run as an offline PC** (throwaway data folder, unreachable PostHog host, three events seeded from the day before): reminder toast shown, status line "4 events waiting", export logged, status then "Nothing waiting", importer dry-run read the file.

Not verified / not done: the packaged Electron build; a real PC with no internet for days; a real `import-diagnostics` run without `--dry-run`; light theme of the new button; tray menu item (skipped); the `telemetry_disabled` event is still never sent (pre-existing: capture is already off when it fires). `posthog-node` is now only a fallback when the journal cannot be written; removing the dependency is a later clean-up.

### Questions for Nigeria — plain-language version (replaces §6)

Already answered: Wi-Fi listeners were a phone on Chrome and a laptop on Edge; the cabled listener was a laptop.

1. **When a phone is 5–6 seconds behind, refresh the page on that phone and press play again. Is it back to about 1 second?** (Yes/No — and if yes, does it stay at 1 second for the next few minutes?)
2. **How many computers are running LANStreamer?** We saw two start at the same minute on Nov 5, and a third later that day. (Just a number, and whether any PC has both the installed version and the plug-and-play version.)
3. **Dante: when you open the "audio source" list in LANStreamer, do you see anything with "DVS" or "Dante" in its name?** (Yes/No — a screenshot of the list is perfect.)
4. **If yes: what happens when you press Start on a stream using that DVS source?** (Screenshot of the message.)
5. **In the Dante Virtual Soundcard window, is the "Audio Interface" set to WDM or ASIO?** (It must be WDM for LANStreamer to see it.)

### TODO towards the next release (v2.1.0) — updated 2026-11-16 late evening

Done since the status table above was written:
- [x] F13 Wi-Fi reconnect fix committed (`81dc67e`).
- [x] The 6 design-token violations fixed (`a3b598e`; baseline ratcheted down in `ac13188`). `node scripts/check-design-tokens.mjs` → "0 new". The three `prompt()` copy fallbacks now go through `LSShare.copy()`; the showcase uses tokens (`--tok-virtual`, `--tok-virtual-dim` are new).

- [x] Offline telemetry built, reviewed and verified (journal → send later → "Export diagnostics" file + export log + start-up reminder). See "Offline telemetry" above.

**v2.1.0 RELEASED 2026-11-17** — https://github.com/jerryagenyi/LANStreamer/releases/tag/v2.1.0 (tag on `c0c6c6d`, `main`). Release PR #17 (squash) + field-testing guide PR #18. Assets: `LANStreamer.Setup.2.1.0.exe`, `LANStreamer.Standalone.2.1.0.exe`, `SHA256SUMS.txt` (checked after download). Built on the maintainer PC from `main` with the git-ignored `public/uploads` moved aside; package inspected (no uploads/config/secrets, bundled key = LANStreamer EU project, guide has the Testing section, version 2.1.0) and smoke-started with a throwaway profile (pages up, bundled FFmpeg probe end-to-end OK, journal writes). NOT done: the real-phone Wi-Fi acceptance test below, upgrade-over-2.0.0 test, clean-VM/SmartScreen test.

Release checklist status:
- [x] Merged into `dev`, CI green on `dev` and `main` (first green since 2026-11-01; the Linux test run surfaced nothing hidden).
- [x] PR #16 closed without merging on Jerry's instruction (2026-11-17), with the reasons in a comment — the biggest one is `enableExceptionAutocapture`, which would send stack traces containing file paths, i.e. Windows user names. The branch `posthog/wizard-01a1e4f6be68` still exists on the remote.
- [x] Version bumped to 2.1.0; dashboard shows it next to the logo (`GET /api/system/version`).
- [x] Release PR #17 with pressure-checklist answers; merged.
- [ ] Release acceptance test (§7 #8) on the packaged build with a **real phone on Wi-Fi**: `client_buffer_summary` arrives in project 353182 with `appVersion 2.1.0`; walk out of Wi-Fi range and back — audio must return near-live without a reload and `reconnectsMax` must be > 0. Then unplug the PC's internet, stream for a minute, restart with internet: the offline events must arrive with their original times.
- [ ] Add `reconnectsMax` and the `delivery` breakdown to the PostHog "LANStreamer field health" dashboard (prompt given to Jerry for PostHog AI). One test event `lanstreamer_offline_selftest` (distinct id `selftest-install`) exists in project 353182 from the live check; exclude or ignore it.
- [ ] Tell Nigeria: install v2.1.0, then run the field-testing guide (`docs/FIELD-TESTING.md`): cabled + Wi-Fi together, 1-hour test, reload check. DVS question still open: what happens on Start with "DVS Receive 1-2" (their video shows the DVS channels in the source list, so WDM mode is on).

After the release:
- [ ] DVS, once Nigeria questions 3–5 are answered (§4 F6/F7 unchanged).
- [ ] v2.2: capture buffer (F5), device identity (F6), remaining security items (F11).

## 1. State of the working tree (as of the original review — see §0 for current state)

| Item | State |
|---|---|
| `scripts/posthog-query.mjs` | **Modified, uncommitted** — one-line fix (query payload must be `{ query: { kind: 'HogQLQuery', query } }`). Without it every query returns HTTP 400. |
| This file | New, uncommitted. |
| Everything else | Untouched. A temporary probe test was created and deleted. Nothing committed, nothing pushed. |

Test suite on this branch: `18 suites / 99 tests` pass (`node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit`).

## 2. How to reproduce the checks

```bash
# PostHog (read-only). The key is project-scoped, so the project id must be given:
POSTHOG_PROJECT_ID=320407 node scripts/posthog-query.mjs "SELECT event, count() FROM events WHERE event LIKE 'lanstreamer_%' GROUP BY event" --json
```

- Use `--json`: the table printer drops every column except timestamp/event/properties.
- Do not read `~/.secrets/*` directly from an agent — a guard hook (`~/.zcode/hooks/guard-secrets.py`) blocks any tool call that names the path. The script above is the working route. Owner action: add `POSTHOG_PROJECT_ID=320407` to the secrets file so the env prefix is not needed.
- The PostHog project (320407) is **shared with ChurchAfrica** — filter on `event LIKE 'lanstreamer_%'`.

```bash
# Capture-buffer measurement (what the app does today vs with a buffer size set):
vendor/ffmpeg/ffmpeg.exe -hide_banner -fflags nobuffer -flags low_delay -probesize 32k -analyzeduration 0 -f dshow -i audio="CABLE Output (VB-Audio Virtual Cable)" -af ashowinfo -t 4 -f null -
# then repeat with  -audio_buffer_size 50  before -f dshow ; compare nb_samples per frame
```

OpenClaude (z.ai GLM) was used for three read-only audits:
`openclaude -p --tools "Read,Grep,Glob" --max-turns 45 "<prompt>"`. It cannot parse Zcode's
session logs (`~/.zcode/cli/rollout/*.jsonl`, ~10 MB single-line records) — use a small
Node script on `request.messages` instead.

## 3. What PostHog actually contains (all time, LANStreamer only)

| Event | Count | Installs | Note |
|---|---|---|---|
| `app_start` | 82 | 7 | |
| `stream_stopped` | 31 | 4 | |
| `stream_started` | 16 | 6 | half as many as stops — see F3 |
| `client_playback_stalled/error/reconnect_grace` | 12 | **1** | all from the dev machine on 2026-10-29 — see F1 |
| `telemetry_enabled` | 7 | 7 | |
| `stream_failed` | **0** | — | see F3 |

- Every event has `appVersion: "unknown"` (F2). `$geoip_disable: true`, no `$ip` stored.
- Install ids are per data directory, so installer + portable on one PC count as two "installs".
- Field installs (ids abbreviated): `d804` (first seen Nov 3 11:24 UTC), `8c1f` (Nov 3 14:50), `7b9d` (Nov 5 16:57).
- **Nov 5 (the day of the "5, 6 seconds" message):** `8c1f` and `d804` both started within a minute of each other (15:06/15:07 UTC), both streamed MP3 from ~15:08; `8c1f` stopped 15:34; both restarted 15:41/15:42; a brand-new install `7b9d` appeared 16:57 and started a stream 16:59. There are **no events at all** on Nov 5 before 15:06 UTC, so the "under 2 s" report (10:19 on the screenshot) has no matching session that day — it was either an earlier day, a machine with no internet, or the screenshot time zone differs.
- None of this says anything about latency, source or bitrate — v2.0.0 does not send them.

## 4. Findings

Legend: **PROVEN** = reproduced or measured in this session. **CONFIRMED** = read in code by Claude. **REPORTED** = from the OpenClaude audit, not independently re-read. **HYPOTHESIS** = unproven.

### F1 — Listener telemetry is blocked for every real listener (PROVEN) — P0
`src/app.js:38` mounts `requireLocalhostAdmin` before the `/api` gate. `src/middleware/requireLocalhost.js:55-61` allows non-localhost requests only when `req.method === 'GET'`. `POST /api/telemetry/client-event` from a phone therefore gets **403** and never reaches the relay (`src/routes/telemetry.js:37`).
Probe (supertest, `X-Test-Remote-Address: 192.168.1.100`): localhost → `200 {"captured":true}`; LAN phone → `403 "Admin access is only allowed from localhost"`, zero captures. PostHog agrees: the only client events ever recorded came from the dev machine.
Consequence: the 30 s `buffer_report` heartbeat that v2.1.0 is built around will not arrive from any phone. `tests/integration/telemetry-client.test.js` passes because it posts from localhost.
Fix: allow that one POST path in `isListenerPathAllowed`; add a regression test that posts with `X-Test-Remote-Address`.

### F2 — `appVersion` is "unknown" on every production event (CONFIRMED) — P0
`src/services/TelemetryService.js:217` uses `process.env.npm_package_version`, which only exists under `npm run …`. Same pattern at `src/app.js:132` (REPORTED: also feeds `BinaryProbeService.js:87`). Not fixed on this branch, so "ask Nigeria to upgrade to v2.1+" could not be verified from the data.
Fix: read the version from `package.json` once (or `app.getVersion()` passed in from `electron/main.js`).

### F3 — Stream lifecycle events are unbalanced and failures are invisible (CONFIRMED in part, REPORTED in part) — P0
- `stream_started` fires only in `startStream` (`StreamingService.js:349`). `restartStream` (`:917`) is used by boot auto-start (`:100`), Start All (`:1348`), bitrate edit (`:1184`), Retry, and resume-from-sleep (`electron/main.js:485`) and emits nothing (REPORTED; consistent with 31 stops vs 16 starts).
- `stream_stopped` (`:884`) carries no stream/session id, so starts and stops cannot be paired.
- `stream_failed` (`:374`) fires only when all three formats fail at start. An FFmpeg process dying mid-service emits nothing (REPORTED). "Zero `stream_failed`" therefore proves nothing.
Fix: emit from the single place a process is actually spawned/exits; add `stream_crashed` (exit code category, uptime); add a random per-start `sid`.

### F4 — The latency explanation in the docs is overclaimed (CONFIRMED) — P0 (docs)
`docs/LATENCY.md:51` says the app "exonerates itself by construction". That holds only while the listener is on the MSE path. It ignores:
1. **Silent, sticky fallback.** Any MSE error switches the listener to plain `<audio src>` for the rest of the page load with no UI signal (`public/streams.html:933-941`). That path is the documented 4–6 s one.
2. **iPhone/Safari** are always on that path (`public/assets/js/lowlatency.js:34-39`).
3. **Burst size on that path.** Two config sources disagree: bundled template 16 KB (`vendor/icecast/icecast.xml:12`, `src/utils/binaries.js:48`) vs `IcecastService.generateConfigFile()` 64 KB (`src/services/IcecastService.js:2495`) and any operator-installed stock Icecast (64 KB; the app deliberately reuses a running stock instance — `src/utils/vendorPaths.js:127-130`). 64 KB at the default 96 kbps (`StreamingService.js:616`) is ≈5.5 s pre-pushed on join.
4. **Capture buffer** (F5).
The same claim was copied into README, TROUBLESHOOTING and `public/docs.html`. Normal-latency numbers also disagree across surfaces (REPORTED: README "~1 s" and "1–1.5 s", docs.html "1.5–2.5 s", LATENCY.md "0.8–1.2 s").

### F5 — DirectShow capture runs with 500 ms buffers; 50 ms is available (PROVEN) — P1
`buildFFmpegArgs` (`StreamingService.js:666-681`) sets no `-audio_buffer_size`. Measured with the bundled FFmpeg 9.0.2 on three devices (free VB-CABLE, VB-Cable A, USB mic): **500 ms chunks** with the app's flags, **50 ms** with `-audio_buffer_size 50`. LATENCY.md lists capture flags as "✅ SHIPPED".
This is the same on the free and the paid cable here, so it does **not** explain a 4 s difference between them — it is a flat ~0.45 s that can be removed for everyone. Ship it separately from the telemetry release so its effect is attributable; make it a setting with a safe fallback (some devices reject small buffers).

### F6 — Device identity is fragile; this is also the DVS blocker (CONFIRMED) — P1
`validateAndGetDeviceName` (`StreamingService.js:713-865`) resolves the stored slug through `AudioDeviceService.cachedDevices`; on a cache miss or empty cache it falls back to a hard-coded map of the developer's own devices, then to guesses: any id containing `vb-audio` + `cable` becomes `CABLE Output (VB-Audio Virtual Cable)` (`:810-820`), anything else becomes a fabricated `Microphone (Title Case Of Slug)` (`:838-857`). A stream can therefore open a **different device than configured** or fail, depending on whether devices were enumerated before the start (boot auto-start, resume, Start All are the risky paths — cold-cache behaviour itself was not executed in this session).
Fix: persist the exact DirectShow name (ideally the `@device_cm_…` alternative name) in the stream config; on a miss, re-enumerate; never guess.

### F7 — DVS: nothing has been built, and stereo pairs need a channel selector (CONFIRMED) — P1
- Branch name aside, there is no Dante/DVS code in `src/` or `public/` (REPORTED by grep; consistent with the 2-commit diff).
- The project's own manual guide (`manual-setup/LANStreamer-basic-dvs.md:379-388, 547-556`) shows DVS exposes **stereo pairs** (`DVS Receive  1-2 (Dante Virtual Soundcard)`) and captured them with `-ac 1`. The app hard-codes `-ac 2` and has no per-stream channel choice, so two interpreters on one pair would come out as one language per ear. Real DVS support needs: channel select (L / R / mix-to-mono via a `pan` filter), F6, and DVS-aware error text (`errorDiagnostics.js` only knows VB-Audio — REPORTED).
- DVS in **ASIO mode exposes no Windows devices** — it must be in WDM mode to appear in the list. Put this at the top of the DVS guide.
- What "doesn't work" in Nigeria is unknown (device missing from the list? start error? silence? two languages mixed?). Ask before building — see §6.

### F8 — Heartbeat cost and volume (CONFIRMED) — P1, do together with F1
Once F1 is fixed, each listener posts every 30 s and each post awaits `IcecastService.getStatus()` (`src/routes/telemetry.js:68-73`), which makes 3–4 HTTP calls to the Icecast admin endpoint plus an XML parse (`IcecastService.js:1113-1171`, `:2703-2722`). 100 listeners ≈ 200 posts/min ≈ 700 admin calls/min on the machine doing real-time capture, and ≈24,000 PostHog events per 2-hour service into a free, shared project. The rate-limit map (`telemetry.js:35`) is never pruned.
Fix: cache the listener count for ≥30 s; aggregate server-side into one event per stream per minute (count, modes, median/max `ahead`, underruns) instead of relaying every phone.

### F9 — PostHog project is shared with ChurchAfrica (PROVEN) — P1, before the next build is cut
Project 320407 holds ChurchAfrica events (`attendance_checked_in`, `member_created`, `$identify` …) alongside LANStreamer's. The ingest key is baked into a public desktop binary, so anyone can write into that project; the read key now on this machine reads both products. Create a separate PostHog project for LANStreamer and bake **its** key into the next build (the key only changes for new builds, so this is the cheap moment).

### F10 — Tooling shipped without being run (PROVEN)
`scripts/posthog-query.mjs` could never have worked: wrong query payload (fixed here), project auto-resolve fails with a project-scoped key (403), table printer hides columns, and `POSTHOG_HOST` in the secrets file is the ingest host shared with the app. F1, F2, F3 share the same root cause: verified on the dev machine via localhost/npm, never from a second device against the packaged build. `docs/GO-LIVE-CHECKLIST.md` stands at 4 checked / 66 unchecked with v2.0.0 already released.

### F11 — Security items (mixed)
- **Icecast source password is logged** (CONFIRMED): `StreamingService.js:689-703` logs `icecastUrl` and the full command. Bundled Icecast is loopback-only with random credentials, so impact is local — but `logs/combined.log` is exactly what users are asked to send for support. Redact.
- **Static JWT secret until the admin password is changed** (CONFIRMED `src/config/index.js:56`, rotation only at `src/routes/auth.js:137`) and **no Host-header check** in `requireLocalhost.js` (CONFIRMED). Together with documented default credentials this leaves a DNS-rebinding path to the admin API from a web page opened on the streaming PC (HYPOTHESIS — exploit not attempted). Cheap fixes: mint a random JWT secret at first run; reject requests whose `Host` is not localhost/127.0.0.1/own LAN IP.
- **Unescaped stream name in `innerHTML`** on the listener page (CONFIRMED `public/streams.html:854-867`, also `data-n="${name}"`). Operator-supplied, so low risk, but a name containing `<` or `"` breaks the row. Escape it. Contact/about fields: REPORTED same pattern (`:1616-1703`).
- **Play proxy has no connection cap** (REPORTED `src/routes/streams.js:152-182`).
- Good and verified by reading: admin APIs unreachable from LAN, no `trust proxy`, args-array spawn, `contextIsolation: true`.

### F12 — Smaller items
- `CLAUDE.md:90` says telemetry is "opt-in only"; code and README are opt-out since 2026-11-01. An agent following CLAUDE.md will "fix" the wrong thing. Also worth a deliberate decision: opt-out analytics with a persistent install id for UK/EU/Nigerian users is a consent question, not just a wording one (not legal advice).
- Telemetry never leaves an offline venue: the queue is in memory only (`TelemetryService.js:45` `this.queue` is unused; posthog-node drops after retries). The installs that matter most are the least visible.
- Bundled Icecast caps listeners at 100 (`vendor/icecast/icecast.xml:3`); not checked whether the UI warns near the cap.
- Packaged builds cannot self-update (REPORTED `UpdateService.js`): portable users in the field stay on v2.0.0 until someone tells them.
- CI is ubuntu-only for a DirectShow app; no packaged-build smoke, no test for `lowlatency.js` (REPORTED `.github/workflows/ci.yml:12`).

## 5. The Nigeria 6 s report — what can and cannot be said

Cannot be determined from data (v2.0.0 sends no latency, source or bitrate). The reporter named the one change: switching to the free VB-CABLE, "noticed it had more delay". Ranked candidates:

| # | Candidate | Fits "5–6 s"? | Evidence | How to test |
|---|---|---|---|---|
| H1 | Delay upstream of the app (what plays into the cable, cable settings, "Listen to this device") | yes | reporter's own statement; capture path measured identical for free vs paid cable here | ask what feeds the cable; swap back and compare |
| H2 | Listener on the slow path: iPhone/Safari, or silent MSE fallback | yes, exactly the documented 4–6 s | code (F4.1, F4.2); no field signal either way | ask which phone/browser each day; on-page debug readout |
| H3 | 64 KB Icecast burst in use (stock/own Icecast or regenerated config) — only matters with H2 | yes at 96 kbps | code (F4.3) | read `burst-size` from the active `icecast.xml` on that PC |
| H4 | Wrong device opened after a cold start (F6) | possible | code only | compare device shown in UI with `Full FFmpeg command` line in `logs/combined.log` |

## 6. Questions for Jerry / the Nigeria team (unblock before coding)

1. Which phone and browser was used to judge latency on each day? Same phone both days?
2. On Nov 5 two installs ran at the same time (`8c1f`, `d804`), then a third (`7b9d`) appeared — two PCs, or installer + Standalone on one PC?
3. What plays audio into the virtual cable (mixer USB, Zoom, a browser, vMix)? Which "paid" cable was the fast one?
4. DVS: is it in WDM mode? Does the device appear in LANStreamer's source list? What exactly happens on Start (error text or screenshot)? One interpreter per Dante channel?
5. Can they send `logs/combined.log` from the slow session (note F11: it contains the local Icecast source password — harmless off-machine, but redact going forward)?

## 7. Recommended order of work

**P0 — before any v2.1.0 tag (all small):**
1. F1 allow the client-event POST from LAN + regression test.
2. F2 real app version on every event.
3. F3 start/stop/crash events from the spawn/exit points, with a per-start `sid`.
4. F8 cache listener count; cut heartbeat volume (aggregate server-side).
5. F9 separate PostHog project; bake the new key.
6. F4 correct the "exonerates itself" wording in all four doc surfaces; reconcile the normal-latency numbers to one statement.
7. Add `mode`-change telemetry: an `ll_fallback` event with the error name, plus coarse platform (ios/android/desktop).
8. **Acceptance test for the release:** packaged build on the PC, a real phone on Wi-Fi playing for 2 minutes, then confirm in PostHog: non-"unknown" version, a `stream_started` with bitrate/sourceHash, and `client_*` events from that phone. Do not tag until this passes.

**P1 — v2.2 (behaviour changes, kept out of the telemetry release on purpose):**
9. F5 `-audio_buffer_size` (default ~50–100 ms, setting + fallback).
10. F6 persist exact device names; remove the guesser and the hard-coded map.
11. F7 DVS: channel selector (L/R/mono), DVS guide (WDM mode first), DVS-aware diagnostics — after §6 Q4 is answered.
12. One burst-size source of truth (16 KB) and a startup warning when the active Icecast config has a larger one.
13. F11 redact the source password in logs; random JWT secret at first run; Host check; escape names.

**P2 — worth doing, not urgent:**
14. Field diagnostics that do not need the internet: a debug line on the listener page (mode, buffered-ahead, underruns — e.g. behind `?debug=1`) and a "Copy diagnostics" button in the dashboard (version, active Icecast config values, FFmpeg command with secrets redacted, last errors). This is the fastest way to turn a WhatsApp anecdote into facts.
15. Try `ManagedMediaSource` for iPhone (iOS 17.1+) so iPhones can use the low-latency path — needs testing on a real device; unverified.
16. A measured end-to-end number: a built-in test-tone stream whose beeps the listener page timestamps against the server clock, giving encode→player latency without guesswork.
17. Windows CI job + packaged-build smoke; a test for `lowlatency.js`.
18. Update `CLAUDE.md` telemetry section (opt-out, new events) and fix `scripts/posthog-query.mjs` properly (project id, column printing, separate query host).

## 8. Not verified in this session

- Anything on a second physical device or the packaged v2.0.0 build (all runtime checks were supertest or bundled-FFmpeg on the dev PC).
- Cold-cache device resolution (F6) was read, not executed.
- The DNS-rebinding path (F11) was not attempted.
- OpenClaude's REPORTED items were only spot-checked; treat line numbers there as pointers.
- Zcode's last session was recovered from its log only as the list of user requests (UI tweaks → Nigeria report → PostHog key → "check with Claude" → DVS not yet integrated). Its "Round NN" log location was not found.

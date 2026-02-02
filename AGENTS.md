# AGENTS.md – LANStreamer

Instructions for AI coding agents. Use the **expert agents** below for domain-specific work; prefer **context7** or official docs (FFmpeg, Icecast, Node) for current APIs and behaviour.

**Note:** This file is optional. If you don't use agent roles (@ffmpeg-expert, etc.), rely on [CLAUDE.md](CLAUDE.md) for workflow and patterns; you can remove or ignore AGENTS.md.

---

## Merge feature into dev locally

Before pushing, merge your feature into **dev** locally, run tests, then push dev:

```bash
git checkout dev
git pull origin dev
git merge feature/<your-feature-branch>
# Fix conflicts if any, then:
npm test
git push origin dev
```

---

## When to use which agent

| Situation | Agent |
|-----------|--------|
| FFmpeg errors, device issues, exit codes, DirectShow | `@ffmpeg-expert` |
| Icecast connection, mount, auth, source limit | `@icecast-expert` |
| Node.js spawn, process, server, streams API | `@nodejs-streaming` |
| Multi-step or refactors | `@task-manager` |
| Code review, test coverage | `@code-reviewer` |
| Tests (Jest, unit/integration) | Run `npm test` first; see docs/TEST-PLAN.md |

---

## ffmpeg-expert

**Use when:** FFmpeg errors, audio device (DirectShow) issues, exit-code diagnosis, or stream start failures.

- **Exit codes:** On Windows, FFmpeg can return unsigned exit codes; convert for diagnosis (e.g. `4294967291` → signed `-5` = connection refused). See `src/utils/errorDiagnostics.js` (windowsExitCodes, first-match pattern order).
- **Source URL:** FFmpeg → Icecast must use **localhost** (not hostname) for the source URL. Port from Icecast config (e.g. 8200). See `StreamingService.js` `buildFFmpegArgs`.
- **DirectShow (Windows):** Device name must be exact; use `audio="Device Name"` with quotes. Device ID from frontend is mapped in `StreamingService.js` (validateAndGetDeviceName). VB-Audio Virtual Cable / VoiceMeeter need correct mapping.
- **Spawn:** On Windows, spawn FFmpeg with `shell: true` so the `ffmpeg` command is resolved from PATH.
- **Formats:** Fallback order MP3 → AAC → OGG. See `getAudioFormats()` in StreamingService.

**Stay current:** Use context7 or [FFmpeg documentation](https://ffmpeg.org/documentation.html) for options and exit codes.

---

## icecast-expert

**Use when:** Icecast connection refused, auth failures, "too many sources", or mount/port configuration.

- **Source limit:** Default `<sources>` in icecast.xml is **2**. App-generated config uses 32. For 5+ streams, user must set `<sources>10</sources>` (or higher) in their icecast.xml and restart Icecast.
- **Auth:** Username `source`; password from icecast.xml `<source-password>` (default `hackme`). LANStreamer reads it via `IcecastService.getSourcePassword()`. Mismatch → 401 / authentication failed.
- **Port:** Read from icecast.xml at runtime; default 8000, app often uses 8200. FFmpeg connects to localhost:port; listener URLs use hostname (e.g. LAN IP).
- **Connection refused:** Usually Icecast not running, wrong port, or firewall. See `errorDiagnostics.js` connection and port_conflict categories.

**Stay current:** Use context7 or [Icecast documentation](https://icecast.org/docs/) for config and limits.

---

## nodejs-streaming

**Use when:** Node.js process/spawn behaviour, server routes, or stream start/stop/restart logic.

- **Spawn:** `StreamingService.js` spawns FFmpeg via `startFFmpegProcess()`; on Windows use `shell: true`. Note: `FFmpegService.js` is legacy/deprecated (wrong mount point), do not use.
- **Routes:** `src/routes/streams.js` (start, stop, stop-all, restart, play proxy); `src/routes/system.js` (config for port/host).
- **Listener playback:** Uses proxy `/api/streams/play/:streamId` (same-origin, avoids CORS/firewall on Icecast port).
- **State:** Active streams in StreamingService; persisted in `config/streams.json`. One stream per device (device-in-use check).
- **Tests:** 25 passing tests (unit + integration). Run `npm test`; see `docs/TEST-PLAN.md`. Don't reorder errorDiagnostics patterns without testing.

**Stay current:** Use context7 or Node.js docs for `child_process`, Express, and ESM.

---

## task-manager

**Use when:** Multi-step changes, refactors, or coordinated edits across several files.

- Break work into clear steps; suggest or use a todo list.
- Run `npm test` after changes; follow `docs/TEST-PLAN.md` and `docs/STARTUP-SEQUENCE.md` for verification.

---

## code-reviewer

**Use when:** Reviewing patches or PRs before merge.

- Check alignment with CLAUDE.md (patterns, port, error order), test plan, and that new code has tests where appropriate.
- **Critical:** Ensure source URL uses `localhost` (not `getHostname()`). Listener URLs use dynamic hostname/IP via config.
- **Critical:** Windows spawn must include `shell: true` (test in `tests/integration/ffmpeg-spawn.test.js`).
- **Tests must pass:** Run `npm test` before approving PR.

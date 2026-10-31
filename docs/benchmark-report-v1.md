# LANStreamer benchmark report v1 — vs devops practices DB

Date: 2026-10-28 · Procedure: devops `benchmark-practices` skill (Mode B,
repo filesystem) · DB: 155 records (141 live) post 2026-10-28 promotion.
Reviewer: ZCode agent, evidence from the committed dev tree (90819e7),
not any dirty working state.

**Purpose:** first run of the devops↔LANStreamer flywheel — LANStreamer is
the practices DB's first verified external consumer. Gaps found here feed
back into the DB as draft records (noted at the end).

Scope: Express API surface (~68 routes across 7 routers), streaming core
(FFmpeg/Icecast services), uploads, listener static pages, shutdown/startup
path. Out of scope: Electron shell, PWA assets.

## Verdict: SHIP on LAN · FIX BEFORE ANY WIDER EXPOSURE

0 blockers (LAN threat model) · 3 should-fix · 1 nice · 4 compliant ·
3 undetermined · 2 DB gaps surfaced.

## Should-fix (fix before exposing beyond the LAN)

1. **Upload extension/content-type allowlist missing** (uploads land in a
   static-served dir) — `src/routes/contact.js:18` writes to
   `public/uploads/events`, served by `express.static` (`src/app.js:25`);
   `filename()` keeps the user-controlled extension (`contact.js:27-31`,
   `settings.js:25-32`). `event_<ts>.html` / `.svg` = stored scriptable
   content any LAN device can be lured to. `path.basename` blocks traversal
   (good) but nothing restricts type. Fix: multer `fileFilter` allowlist
   (jpg/png/webp/mp3 per route) + serve uploads with
   `Content-Disposition: attachment` or a separate non-executable handler.
   *(No devops record exists for upload validation — gap #1 below.)*
2. **Rate limiting configured but not wired** — `src/config/index.js:95-96`
   defines RATE_LIMIT_* (100/15min defaults) but no limiter middleware is
   applied anywhere (no express-rate-limit dep, no usage). Remaining
   auth/login/setup endpoints are unlimited. Violates **SEC-AUTH-001**
   (rate-limit every auth endpoint) — mitigated by LAN-only exposure and
   the localhost admin lock, but the config suggests an intent that was
   never landed. Fix: wire `express-rate-limit` on `/api/auth`, `/api/setup`.
3. **Config persistence is not atomic** — `config/streams.json` and
   `data/streams.json` written in place by StreamingService (no tmp+rename
   found). A crash mid-write corrupts stream definitions. Violates the
   atomic-write discipline referenced by **REL-ASY-009** / **DATA-001**
   (wrap multi-write state changes atomically; for file stores that means
   write-temp-then-rename). Fix: `fs.writeFile(tmp)` + `fs.rename`.

## Nice

4. **PERF-006 (health checks must mean work, not liveness)** —
   `src/app.js:30` `/api/health` exists and is used by tests; verify it
   reflects Icecast/FFmpeg ability (current shape undetermined from route
   stub — if it only returns 200, add a degraded state when the source
   engine is down).

## Compliant (evidence)

- **Graceful shutdown wired** — SIGINT/SIGTERM handlers stop streams then
  exit (`src/server.js:72,127-135`), services stop ordered with timeout
  (`src/app.js` shutdown). *(Pattern has no DB record — gap #2.)*
- **Admin surface locked to localhost** — `requireLocalhostAdmin`
  middleware (`src/app.js:27`), integration-tested
  (`tests/integration/lock-admin-localhost.test.js`). Authorization
  boundary consistent with **SEC-AUTHZ-001/002** intent.
- **REL-ASY-009 (test by making the world miserable)** — errorScenarios,
  stream-start-error, ffmpeg-spawn, reorder tests exist
  (`tests/integration/`, `tests/scenarios/`) — genuinely strong for this
  category.
- **Upload size limits set** — 2MB images / 200MB music
  (`contact.js:36-40`, `settings.js:33-37`).

## Undetermined (check next round)

- **REL-ASY-001 (non-essential out of request cycle)** — is FFmpeg spawn
  async relative to the HTTP response? Tests suggest yes; not verified
  line-level.
- **REL-ASY-006 (timeouts/backoff on downstream)** — Icecast/FFmpeg
  dependency timeouts not audited.
- JWT middleware remains (`src/middleware/auth.js`) after the auth-removal
  commit — confirm no dead privileged path still trusts it.

## DB gaps surfaced (feed back into devops)

1. **Upload validation record** — allowlist type+extension, randomize
   stored name, never serve user uploads as executable content. (Source
   candidate: this benchmark + OWASP unrestr. upload guidance.)
2. **Graceful shutdown record** — SIGTERM → stop accepting → drain/stop
  children → bounded timeout → exit; health endpoint flips first.
   (Source candidates: LANStreamer server.js, 12-factor disposability.)

Both are queued as draft candidates for the next ingestion round, keeping
SCHEMA rule 1 in mind: this report is the source, so future LANStreamer
compliance is self-consistent, not independent.

## Scorecard

| severity | count |
|---|---|
| blocker | 0 |
| should (fix) | 3 |
| nice | 1 |
| compliant evidenced | 4 |
| undetermined | 3 |
| DB gaps surfaced | 2 |

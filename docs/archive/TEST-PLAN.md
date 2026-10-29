# Test Plan for LANStreamer

**Status:** Implemented — unit and integration tests guard resolved regressions  
**Created:** 2026-01-31  
**Updated:** 2026-01-31  
**Framework:** Jest + Supertest  

---

## Resolved Issues This Plan Guards Against

| Issue | Guard | Test Location |
|-------|--------|----------------|
| Copy URL wrong port (8000 vs 8200) | GET `/api/system/config` returns `icecast.port` | `tests/integration/config-endpoint.test.js` |
| Listening page Play / direct URL not working | GET `/api/streams/play/:streamId` proxy exists and responds | `tests/integration/stream-proxy.test.js` |
| Source URL must use localhost (not getHostname()) | `buildFFmpegArgs` Icecast URL contains `localhost` | `tests/unit/StreamingService.test.js` |
| FFmpeg spawn without `shell: true` on Windows | Spawn options include `shell: true` on Windows | `tests/integration/ffmpeg-spawn.test.js` |
| Connection refused / exit -5 diagnosis | `errorDiagnostics.diagnose` returns connection category for -5 and 4294967291 | `tests/unit/errorDiagnostics.test.js` |

---

## Installation

```bash
npm install
# Jest, supertest, @types/jest are in devDependencies
```

---

## Test Structure

```
tests/
├── setup.js                              # Jest setup, NODE_ENV=test
├── unit/
│   ├── StreamingService.test.js          # buildFFmpegArgs: localhost, port, spawn options
│   ├── IcecastService.test.js            # getActualPort, getHostname fallbacks
│   └── errorDiagnostics.test.js           # diagnose: connection, Windows exit codes
├── integration/
│   ├── server.startup.test.js            # Server starts, /api/health
│   ├── config-endpoint.test.js           # GET /api/system/config → icecast.port
│   ├── stream-proxy.test.js              # GET /api/streams/play/:streamId
│   └── ffmpeg-spawn.test.js              # Spawn with shell:true on Windows
└── e2e/
    └── (future) stream.creation.test.js  # Full flow when needed
```

---

## Critical Tests (Priority Order)

### Priority 1: Regression prevention

| Test | File | Purpose |
|------|------|---------|
| **FFmpeg spawn with shell:true on Windows** | `tests/integration/ffmpeg-spawn.test.js` | Prevents spawn() PATH bug on Windows |
| **Config endpoint returns icecast.port** | `tests/integration/config-endpoint.test.js` | Prevents Copy URL using wrong port |
| **Stream proxy route exists** | `tests/integration/stream-proxy.test.js` | Prevents listening page Play from breaking |
| **buildFFmpegArgs uses localhost** | `tests/unit/StreamingService.test.js` | Prevents source URL hostname regression |
| **errorDiagnostics connection for -5** | `tests/unit/errorDiagnostics.test.js` | Ensures connection-refused diagnosis and Windows exit code |

### Priority 2: Unit coverage

| Component | Tests | Edge cases |
|-----------|--------|------------|
| `StreamingService.js` | buildFFmpegArgs host=localhost, port from IcecastService, format fallback | streamId with safe chars; formatIndex out of range |
| `IcecastService.js` | getActualPort(), getHostname() fallbacks | No config file → fallback port |
| `errorDiagnostics.js` | diagnose(-5), diagnose(4294967291), pattern match | Empty stderr; unknown exit code |

### Priority 3: Integration

| Test | Assertion |
|------|-----------|
| Server startup | App loads; GET /api/health returns 200 |
| GET /api/system/config | 200; body.icecast.port is number; body.icecast.host present |
| GET /api/streams/play/:id | 502 when Icecast unreachable, or 200 when reachable; no crash |
| FFmpeg spawn (Windows) | spawn() called with options including shell: true |

### Manual / E2E: Multiple streams (Icecast source limit)

Not automated (requires running server + devices or test files). To confirm the app and backend support more than 2 streams:

1. Start the app (`npm start`) and start Icecast from the dashboard (so generated `icecast.xml` has `<sources>32</sources>`).
2. Create 3–10 streams from the UI (use different audio devices, or one device per stream if you have multiple).
3. Check that streams start and play; no "too many sources" from Icecast. See [TODO.md](../TODO.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) (Cause 5) if you hit the limit.

---

## Edge Cases (Explicit)

| Scenario | Expected behaviour |
|----------|--------------------|
| GET /api/system/config before IcecastService init | 200 with fallback port or ensureInitialized() |
| GET /api/streams/play/nonexistent_mount | 502 (proxy error) or 200; no uncaught exception |
| streamId with special characters in proxy | Encoded in URL; no path traversal |
| errorDiagnostics.diagnose('', 4294967291, {}) | Returns connection category (Windows unsigned -5) |
| errorDiagnostics.diagnose('', -5, { icecastPort: 8200 }) | Solutions mention port 8200 |
| buildFFmpegArgs with inputFile | Args contain icecast://...@localhost:... |

---

## Test Coverage Goals

| Component | Target | Priority |
|-----------|--------|----------|
| `StreamingService.js` | 70% (spawn, buildFFmpegArgs) | HIGH |
| `IcecastService.js` | 60% (getActualPort, getHostname) | MEDIUM |
| `errorDiagnostics.js` | 80% (patterns, exit codes) | MEDIUM |
| Routes | 50% (config, proxy, health) | MEDIUM |

---

## CI/CD Pipeline (Future)

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

---

## Branch Protection (To Configure)

1. Protected branch: `main`
2. Require status checks to pass: `tests` (unit + integration)
3. Do not allow bypassing

---

## Running Tests

```bash
npm test                 # All tests
npm test -- unit         # Unit only
npm test -- integration  # Integration only
npm test -- --coverage   # With coverage
```

---

## Notes

- **Source URL:** FFmpeg → Icecast always uses **localhost** (same machine). Listener URLs are **dynamic** (config/host) for subnets.
- **Listening page:** Play uses same-origin proxy `/api/streams/play/:streamId`; Copy URL uses direct Icecast URL with correct port from config.
- Tests run with `NODE_ENV=test`; server does not call `listen()` in test so supertest can attach to the app.

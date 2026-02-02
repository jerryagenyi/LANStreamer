---
type: hook
trigger: after_code_modification
---

# Post-Code Write Hook

After modifying code:

1. **RUN** relevant tests using `npm test`
2. **CHECK** for syntax errors (try `node -c` on modified files)
3. **VERIFY** the change compiles/runs with `npm start`
4. **UPDATE** related documentation if needed
5. **REPORT** what was changed and test results

## Test Commands

The project has a comprehensive test suite using Jest:
- `npm test` - Run all tests once
- `npm test -- --watch` - Watch mode for development
- `npm test -- --coverage` - Generate coverage report
- `npm test -- unit` - Run only unit tests
- `npm test -- integration` - Run only integration tests
- `npm test -- e2e` - Run only end-to-end tests

Test organization:
- `tests/unit/` - Isolated unit tests for individual functions/modules
- `tests/integration/` - Tests that verify multiple components working together
- `tests/e2e/` - End-to-end tests simulating real user workflows

## LANStreamer-Specific Workflow

- **Start server**: `npm start` to verify changes
- **Test stream**: Login → Create stream → Verify playback on `/streams`
- **Check logs**: `logs/combined.log` for errors
- **Patterns**: See CLAUDE.md for workflow and critical patterns.

## When to Run Specific Tests

- Modified `src/services/` → Run `npm test -- unit` (StreamingService.test.js, IcecastService.test.js)
- Modified `src/utils/` → Run `npm test -- unit` (errorDiagnostics.test.js)
- Modified API endpoints → Run `npm test -- integration`
- Modified server startup → Run `npm test -- integration` (server.startup.test.js)
- Full workflow changes → Run `npm test` (all tests)

If tests fail or errors occur, **FIX immediately** before considering task complete.

---
type: hook
trigger: after_code_modification
---

# Post-Code Write Hook

After modifying code:

1. **RUN** relevant tests (if test suite exists - note: LANStreamer has no tests configured)
2. **CHECK** for syntax errors (try `node -c` on modified files)
3. **VERIFY** the change compiles/runs with `npm start`
4. **UPDATE** related documentation if needed
5. **REPORT** what was changed and test results

## LANStreamer-Specific Workflow

- **Start server**: `npm start` to verify changes
- **Test stream**: Login → Create stream → Verify playback on `/streams`
- **Check logs**: `logs/combined.log` for errors
- **Use domain skills**: `@ffmpeg-expert`, `@nodejs-streaming`, `@icecast-expert` for issues

If tests fail or errors occur, **FIX immediately** before considering task complete.

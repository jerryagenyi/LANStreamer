# Archive — superseded documentation

Historical documents kept for reference. **None of this describes the current
app** — each line says what replaced it. Current documentation: [../README.md](../README.md).

| File | What it was | Superseded by |
|------|-------------|---------------|
| `LANSTREAMER_SYSTEM_ARCHITECTURE.md` | Complete pre-Electron architecture (server-first app) | [../README-DEVELOPERS.md](../README-DEVELOPERS.md) + the Electron shell itself (`electron/main.js`); predates admin auth, the 2026-10 redesign, and binary bundling |
| `STARTUP-SEQUENCE.md` | Pre-Electron boot sequence | Startup is now owned by the Electron main process (ordered teardown, port fallback, orphan sweep — see `electron/main.js`) |
| `TEST-PLAN.md` | Early manual test plan | The Jest suite (`npm test`) + [../GO-LIVE-CHECKLIST.md](../GO-LIVE-CHECKLIST.md) + the `scripts/verify-*.mjs` inventory in the developer guide |
| `UI-UX-RECOMMENDATIONS-2026-10.md` | Design analysis that fed the 2026-10 redesign | The redesign SHIPPED — the live token system (`public/assets/css/tokens.css`) and [../APP-FLOW.md](../APP-FLOW.md) are the current truth |
| `REDESIGN-PLAN.md` | The shipped redesign's plan | Same — shipped 2026-10 (see [../CHANGELOG.md](../CHANGELOG.md)) |
| `ROBUSTNESS-PLAN.md` | 2026-02 robustness plan (8 layers) | Largely implemented (kill-order, error diagnostics, persistence); open items live in [../../TODO.md](../../TODO.md) and [../GO-LIVE-CHECKLIST.md](../GO-LIVE-CHECKLIST.md) |
| `UI-UX-RECOMMENDATIONS.md` | Earlier (pre-2026-10) UI analysis | Same as the 2026-10 version above |
| `ARCHIVED_ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md` | 2026-01 Icecast-focused architecture | Icecast bundling + the generated-config system (`src/utils/vendorPaths.js`) replaced the "configure Program Files icecast.xml" world |

# LANStreamer redesign adoption plan

Source: `LANStreamer-redesign/` (designer mock, 2026-10-28) — interactive HTML/CSS
mocks (dashboard + listener) with a shared token sheet. This plan merges it into
the shipped app WITHOUT losing the behavior we built this cycle (notification
bell, boot screen, off-air auto-resume, error classification, stacked toasts,
/docs, telemetry, Electron, tests).

## Why this is an upgrade (per screen)

Dashboard
1. **Status strip** (On air x/7 · Listeners+peak · Icecast :port · Needs attention)
   replaces status scattered across the header pill and collapsed sidebar cards.
   The operator's first glance now answers "is the event healthy?"
2. **Security banner demoted to warning** (not error-red) with a direct
   "Change password" action — it stops competing with real stream failures.
3. **Grouped + filterable stream list** ("On air" / "Ready", All·Live·Issues)
   — the live row can no longer hide among seven stopped ones.
4. **Source names truncate at the END with tooltip** — replaces the marquee;
   listeners/operators read the distinguishing part of the name first.
5. **Error rows are actionable inline** (cause + fix hint + "Change input" /
   "Retry") instead of a collapsed toggle; the full diagnostic stays in a
   details disclosure behind it (fed by our `errorShort` classification).
6. **One play/stop + "⋯" menu** (copy link, edit, duplicate, delete) — Delete
   is no longer one misclick from Play; Stop is a red square, unmistakable
   vs Play.
7. **New stream as a side drawer**: source list marks which device is already
   in use, quality chosen by purpose (Speech 96 / Standard 128 / Music 192),
   explicit **Save** (stopped) vs **Go live**, and an auto-start toggle
   (maps to the existing `autoStart` config field).
8. **Share card** (QR + LAN URL + copy) promoted to the sidebar at full size.
9. **Audio inputs always visible** with IN USE / IDLE / MISSING per device.
10. **Friendly empty state** with a 3-step guide.

Listener
1. **One big play + channel picker** with language badges (EN/FR/ES) — designed
   for interpretation events, the app's actual purpose; far friendlier than a
   list of identical rows.
2. Help line for the two real "no sound" causes (wrong Wi-Fi, silent mode).
3. Mobile mini-player pinned on scroll; ON AIR pill in the top bar.

Design system
- Space Grotesk + JetBrains Mono typography; warning split from danger;
  `--onair` red reserved for the ON AIR badge; text label on every chip
  (color never the sole signal); focus-visible rings; reduced-motion honored.

## What we keep from the current build (mock lacks it)
Notification bell + panel, boot screen + failure state, typed/linked stacked
toasts (LSToasts), 15s off-air grace + auto-resume + last-stream memory,
device-error classification (errorShort), /docs page, real QR endpoint,
duplicate-source guard, collapse persistence, telemetry consent, Electron,
71-test suite, showcase page.

## Decisions (recommended, reversible)
| Topic | Mock | Ours | Decision |
|---|---|---|---|
| Fonts | Google Fonts CDN | vendored Inter | **Adopt Space Grotesk + JetBrains Mono, vendored** (offline rule; extend `vendor:fonts` script) |
| Icons | inline stroke SVGs | Material Symbols (vendored) | **Keep Material Symbols** — already offline + enforced; adopt only the brand mark |
| Theme default | light | dark | **Keep dark default** + system preference (existing user expectation) |
| Toasts | bottom-right, tag-replace, max 4 | top-center stack, tags, types, links | **Adopt bottom-right placement + styling; keep LSToasts engine** (types/links/bell integration) |
| Device name overflow | end-truncate + tooltip | marquee | **Adopt end-truncate; drop marquee** |
| Tailwind | none (pure CSS) | Tailwind + tokens | **Keep Tailwind** this pass; port the mock's component CSS into `ui.css` (ripping out Tailwind now would rewrite everything we just stabilized) |

## Phases (each: build → GUI-verify both themes → tests → commit)

**P1 — Token merge (small, low risk).** Port the mock's palette values
(light+dark), warn/danger/onair split, radius+shadow scale, vendored fonts
into `tokens.css`/`tailwind.config.js`; update `/showcase.html`; regenerate
screenshots for the designer. Nothing structural changes yet.

**P2 — Dashboard structure (large).** Status strip, security banner restyle,
grouped+filtered list, new row anatomy (⋯ menu, red stop, end-truncated
source), errbox with inline actions + details, empty state, share card,
audio-inputs card (real IN USE/IDLE/MISSING chips). Bell/boot/collapsibles
stay. Reorder keeps up/down (inside ⋯ menu) until P5.

**P3 — New-stream drawer (medium).** Replaces the modal. Radio-card sources
annotated "Used by S5" from live streams; purpose-based quality; auto-start
toggle → existing `autoStart` field; **Save-as-stopped needs one small backend
endpoint** (persist stream without starting; today streams only persist on a
successful start).

**P4 — Listener page (medium-large).** Hero + big play + channel picker +
help line + scroll-pinned mini-player + ON AIR pill, with ALL current
playback logic ported onto it (grace, auto-resume, last-stream, toasts, boot,
play-failure notices).

**P5 — Polish (optional).** Drag-handle reorder (keep keyboard fallback),
listener peak tracking (session localStorage), real input level meters
(requires an FFmpeg per-device probe — skip rather than show fake levels).

## Explicitly not adopted
- Google Fonts CDN links (offline rule) — vendored instead.
- Decorative QR in the mock (we keep the real `/api/system/qr`).
- Fake level-meter widths (either real backend probe in P5 or omitted).
- Pure-CSS rewrite / Tailwind removal (revisit after P4 if desired).

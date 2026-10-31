# LANStreamer — UI/UX redesign

Open `dashboard.html` or `listener.html` in any browser (no build step). Use the moon icon to switch light/dark; resize to see mobile.

Files
- `styles.css` — shared design tokens (light + dark) and components. Drop-in replacement for the current token sheet.
- `app.js` — theme memory, stacked/tagged toasts, icons.
- `dashboard.html` — admin dashboard (interactive mock: start/stop, filter, new-stream drawer, overflow menu, empty state).
- `listener.html` — public listener page.

## What changed and why

Admin dashboard
1. **Status strip at the top** — on-air count, listeners, Icecast status and "needs attention" are visible at a glance instead of buried in collapsed sidebar cards.
2. **Security banner is actionable** — plain-language risk + a direct "Change password" button, in warning (not error) colour so it doesn't compete with real stream failures.
3. **Live streams grouped first** — "On air" and "Ready" sections; no more hunting for the one live row among seven.
4. **Full source names** — the old rows truncated the *start* of device names ("tput (VB-Audio…"). Names now truncate at the end with a tooltip.
5. **Errors explain the fix** — the error row shows cause + "Change input" / "Retry" inline, instead of a collapsed "Audio Device Not Found" toggle.
6. **Fewer icons per row** — one play/stop button + a "⋯" menu (copy link, edit, duplicate, delete). Delete no longer sits one click from Play. Up/down arrows replaced by a drag handle on hover.
7. **Stop is visually distinct from Play** (red square vs neutral play), so the live row is unmistakable.
8. **New stream as a side drawer** — input list shows which device is already in use and a live level meter; quality chosen by purpose (Speech / Standard / Music); optional auto-start.
9. **Share card** — QR + copyable LAN address replaces the cramped "Listen to streams:" header pill.
10. **Audio inputs always visible** — status (in use / idle / missing) per device instead of a "Component unavailable" collapsed panel.
11. **Filters** (All / Live / Issues) and a friendlier empty state with a 3-step guide.

Listener page
1. **One big play button** with the current channel, live timer, listener count, waveform and volume.
2. **Channel picker** for multi-room / multi-language events (designed for interpretation use).
3. **Help line** for the most common "no sound" causes.
4. **Mobile mini-player** stays pinned at the bottom after scrolling.
5. Event artwork is themed from tokens instead of a fixed illustration; About/Contact are native, keyboard-accessible disclosures.

Design system
- Typography: Space Grotesk (UI) + JetBrains Mono (IDs, bitrates, timers).
- Warning colour now separate from error; `--onair` reserved for the ON AIR badge.
- Visible focus rings, `prefers-reduced-motion` respected, colour never the only status signal (text labels on every chip).

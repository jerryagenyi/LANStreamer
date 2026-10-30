# UX Audit — LANStreamer (2026-10-30)

Holistic assessment using the IxDF framework (7 UX factors · 5 usability characteristics · 5 interaction dimensions). Evidence: fresh screenshots of all surfaces (this file's sibling evidence in `screenshots/ux-*.png`), a year of operator feedback (Jerry's rounds), and the shipped 2026-10 redesign. Audited state: dev tip `a2fa9f8`.

**Personas** (from actual usage): **Jerry-operator** — sets up streams at events, semi-technical, wants zero babysitting mid-event. **Event listener** — congregation/meeting attendee, any phone, zero patience, opens a link once. **Novice operator** — gets the app from GitHub, first event next week.

---

## Executive summary

**Overall: 68/85 — B (Good).** The redesign landed a genuinely strong operator console (status strip, classified actionable errors, forgiving listener page with auto-resume). The product's biggest UX liability is not visual — it is **time**: measured ~5 s end-to-end audio latency (user report; browser-buffer dominated) directly undermines the core same-room interpretation use case. Second: the first-run path now stacks up to four gates before the operator controls anything. Third: accessibility is untested systematically.

---

## 1. UX Factors (29/35)

| Factor | Score | Evidence |
|---|---|---|
| Useful | 5 | Solves a real, otherwise-expensive problem (interpretation hardware); persistent streams, auto-start, QR sharing |
| Usable | 4 | Core flows (add stream → go live → share) are short; icon-only controls with tooltips everywhere; ⋯ menus group row actions |
| Findable | 4 | Status strip answers "is it working?" at a glance; share surface is one card; in-app /docs discoverable from error boxes |
| Credible | 3.5→4* | Opt-in telemetry well disclosed; per-install credentials now minted; *the latency itself and (pending) unsigned-installer SmartScreen warning erode trust |
| Desirable | 4 | Post-redesign token system, both themes, flat surfaces read as intentional |
| Accessible | 3 | aria-labels on icon buttons, color-scheme per theme; but no systematic keyboard/focus/contrast pass (see issues) |
| Valuable | 5 | Free/OSS, LAN-private, no listener install — clear value story |

## 2. Usability Characteristics (20/25)

| Characteristic | Score | Evidence |
|---|---|---|
| Effectiveness | 5 | Stream lifecycle (create/live/stop/retry/edit/duplicate/reorder) all work; conflict + error paths verified E2E repeatedly |
| Efficiency | 4 | One-click go-live; Start All; rescan without opening the card; row actions never shift |
| Engagement | 4 | Eq/status motion only where meaningful (and frozen on pause); boot screen resolves fast |
| Error Tolerance | 4.5 | Best-in-class errors: classified cause + plain-language fix + inline Change input/Retry + collapsed diagnostics + /docs link. Half point off: dirty-state traps (leftover instances, device holders) still confuse — mitigated by the new port-fallback dialog + orphan sweep |
| Ease of Learning | 3 | First-run stacks gates (login → credentials dialog → telemetry prompt → default-creds banner); concepts like "virtual audio cable" arrive unexplained outside guides |

## 3. Interaction Dimensions (19/25)

| Dimension | Score | Evidence |
|---|---|---|
| Words | 4 | Friendly, short microcopy; listener errors say what to do ("ask the operator to check it"); minor jargon residue (bitrate chips, "S1" labels) |
| Visual | 4 | Consistent tokens, both themes verified; default event banner removes the broken-looking empty state |
| Physical/Space | 4 | Listener mobile layout solid (mini-player, touch-sized rows); dashboard is desktop-first (acceptable — operator uses a PC) |
| Time | 3 | **The latency lives here.** ~5 s reported (≈3–4.5 s browser buffer + encoder/icecast contributions); the fix (MSE player + FFmpeg flags + proxy tweaks) is planned and specced — see docs/LATENCY.md + the Claude latency review |
| Behavior | 4 | Buttons respond with toasts + row state; play/pause icons reflect reality (incl. the pause-flip and eq-freeze fixes); auto-resume behavior matches user intent |

---

## 4. Prioritized issues

| # | Severity | Issue | Where |
|---|---|---|---|
| 1 | **Critical** | Audio latency (~5 s → target ≤1 s) undermines the core same-room use case; users hear it as "broken" | Listener playback path |
| 2 | High | First-run gate stack: login + show-once credentials dialog + telemetry prompt + default-creds banner before first stream | Electron shell + dashboard |
| 3 | Medium | No systematic accessibility pass (focus order, visible focus rings, contrast ratios, keyboard-only stream start) | All surfaces |
| 4 | Medium | Unsigned installer will trigger SmartScreen — first impression for exe users is a security warning (SHA256SUMS + notes mitigate partially) | Release |
| 5 | Low | Dashboard on phones stacks but is cramped — operators occasionally want a status glance from their phone | Dashboard responsive |
| 6 | Low | /docs page is long unbroken text; collapsible sections would help scanning | public/docs.html |

## 5. Redesign proposals (evolution, not revolution — the 2026-10 redesign holds)

1. **Latency round (P1, specced):** MSE-based listener player with ~0.3–0.5 s buffer + drift resync; FFmpeg low-delay flags; proxy `flushHeaders`/`setNoDelay`; Icecast burst 16 KB. Measure with a clap test before/after. Expected 5 s → ~1 s.
2. **First-run sequence (P2):** replace the native-dialog stack with one in-dashboard welcome card: "1. save your admin login (shown once, copy button) → 2. telemetry choice → 3. create your first stream". Native dialogs remain the fallback.
3. **Accessibility sweep (P3):** axe pass on both surfaces, visible focus rings (tokens already have accent), keyboard path for play/stop/add-stream, contrast audit in light theme.
4. **Listener trust nicety (P4):** small "live" indicator pulse is already there; consider showing stream *labels* more prominently than S-numbers on the picker.

## 6. Research recommendations

- **Clap-test latency measurement** (planned with the latency round) — replaces anecdote with frames.
- **One real-event observation** of a novice operator (where do they hesitate?).
- **axe-core automated a11y** in CI (also on the go-live checklist).

## 7. Roadmap fit

Issue #1 is the already-planned latency round. #2 is a small Electron/dashboard round. #3 pairs with the pre-release a11y item in GO-LIVE-CHECKLIST. #4 is release hygiene (SHA256SUMS step exists). Nothing here invalidates the current design direction.

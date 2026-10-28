# Pressure Checklist (pre-review gate for streaming features)

Adopted from the devops practices database (playbook: pressure-checklist,
originally from system-design-book@ Ch 0.3), 2026-10-28.

**Gate rule:** every PR that adds or changes streaming behavior (stream
lifecycle, proxying, device capture, listener fanout, start-all, queueing)
must answer these 7 conditions for the changed code path in the PR
description — not in the reviewer's head. A design that only survives on
paper (untested fallbacks, guessed timeout numbers) counts as failing.

1. **Load is uneven** — month end, holiday peaks, campaign spikes.
   Design target: peak-to-average ratio (often 3x+).
2. **A dependency is SLOW, not down** — 8 seconds. Worse than down:
   callers keep waiting, resources fill, failure travels upward.
   Ask: what is my capacity at concurrency ÷ 8s?
   (LANStreamer shape: Icecast slow-but-alive, FFmpeg device stalls,
   SMB/network drive source reads.)
3. **Data is 10x expected** — the table you never thought would grow.
   Ask: do indexes, partitions, and queries survive 10x?
   (LANStreamer shape: config/streams.json entries, uploads dir, logs.)
4. **A machine disappears mid-write / mid-transaction** — is the
   invariant preserved? (atomicity, durable execution)
   (LANStreamer shape: FFmpeg killed mid-spawn, stream state file
   rewritten during crash, lock-file races.)
5. **The network is poor** — high latency, packet loss, flaky mobile.
   Round-trip count becomes the dominant cost.
   (LANStreamer shape: listener page over WAN/LAN, QR-share links.)
6. **The same request arrives twice** — user tapped Send again.
   Ask: idempotency key? dedupe committed with the side effect?
   (LANStreamer shape: start/stop double-clicks, start-all re-entry,
   reorder + delete racing.)
7. **Traffic is hostile** — someone is enumerating endpoints,
   spamming auth routes, replaying webhooks.
   (LANStreamer shape: LAN exposure, uploads endpoint abuse.)

## Why a fixed set

So quality doesn't depend on who happens to be in the room. The same
seven questions every time, and the answers live in the PR record, not in
chat scrollback.

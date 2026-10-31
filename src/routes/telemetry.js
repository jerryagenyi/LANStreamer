import express from 'express';
import telemetry from '../services/TelemetryService.js';

const router = express.Router();

/**
 * Listener-browser failure telemetry, relayed through the operator's server.
 *
 * Listeners never hold a PostHog key and never decide consent — the server
 * owns both (TelemetryService). The listener page fire-and-forgets failures
 * here; if telemetry is disabled the events are dropped silently.
 *
 * Privacy: same rules as server-side telemetry — no stream names, no file
 * paths, no user identity. Stream label (e.g. "S1") + media error code +
 * browser platform is all a failure report carries.
 */

const CLIENT_EVENTS = new Set([
  'playback_error',    // audio element failed while playing a channel
  'playback_stalled',  // buffering stall (deduped client-side)
  'reconnect_grace',   // the stream disappeared mid-listen; grace window opened
  'offair_giveup',     // grace expired without the stream returning
  'load_failed'        // the listener page could not load the stream list
]);
const MAX_PROPS = 8;
const MAX_STR = 160;

// Tiny in-memory rate limit: LAN app, single instance. 30 events/min/IP is far
// above any real listener's failure rate and stops a misbehaving tab from
// spamming the PostHog project.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const hits = new Map(); // ip -> { count, windowStart }

router.post('/client-event', (req, res) => {
  try {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    let h = hits.get(ip);
    if (!h || now - h.windowStart > RATE_WINDOW_MS) {
      h = { count: 0, windowStart: now };
      hits.set(ip, h);
    }
    if (++h.count > RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many events' });
    }

    const { event, properties = {} } = req.body || {};
    if (!CLIENT_EVENTS.has(event)) {
      return res.status(400).json({ error: 'Unknown event' });
    }

    // Copy a bounded, primitive-only subset — client strings are untrusted
    const props = { surface: 'listener' };
    let count = 0;
    for (const [k, v] of Object.entries(properties)) {
      if (count >= MAX_PROPS) break;
      if (typeof v === 'string') props[k] = v.slice(0, MAX_STR);
      else if (typeof v === 'number' || typeof v === 'boolean') props[k] = v;
      count++;
    }

    // capture() is a no-op unless the operator consented + key resolves
    telemetry.capture(`client_${event}`, props);
    return res.json({ ok: true, captured: telemetry.getConsentState().enabled });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to record event' });
  }
});

export default router;

import express from 'express';
import telemetry from '../services/TelemetryService.js';
import IcecastService from '../services/IcecastService.js';

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
  'buffer_report',     // 30s heartbeat while playing — AGGREGATED below, never relayed one-by-one
  'll_fallback',       // a browser that supports MSE silently dropped to the plain-src slow path
  'reconnect_grace',   // the stream disappeared mid-listen; grace window opened
  'offair_giveup',     // grace expired without the stream returning
  'load_failed'        // the listener page could not load the stream list
]);
const MAX_PROPS = 10;
const MAX_STR = 160;

// Tiny in-memory rate limit: LAN app, single instance. 30 events/min/IP is far
// above any real listener's failure rate and stops a misbehaving tab from
// spamming the PostHog project.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const hits = new Map(); // ip -> { count, windowStart }

// --- Heartbeat aggregation -------------------------------------------------
// Relaying every 30s phone heartbeat was ~24,000 PostHog events per 2-hour
// service (into a shared free project) and an Icecast admin poll per post on
// the machine doing real-time capture. Instead: collect a window, emit ONE
// client_buffer_summary per minute that keeps every signal the bisect needs
// (how deep were buffers, per playback-path, per platform, worst underruns).
const SUMMARY_INTERVAL_MS = 60_000;
const LISTENERS_CACHE_MS = 30_000;
const hbWindow = [];
let listenersCache = { value: null, at: 0 };

/** Listener count for summaries, cached — never more than one Icecast admin
 *  poll per 30s no matter how many phones are reporting. Best-effort. */
async function currentListeners() {
  if (Date.now() - listenersCache.at < LISTENERS_CACHE_MS) return listenersCache.value;
  try {
    const status = await IcecastService.getStatus();
    if (typeof status?.listeners === 'number') {
      listenersCache = { value: status.listeners, at: Date.now() };
    }
  } catch { /* keep the old cached value */ }
  return listenersCache.value;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function median(sorted) {
  if (!sorted.length) return null;
  const mid = sorted.length >> 1;
  const m = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return +(m.toFixed(2));
}

/** Emit the window summary (one client_buffer_summary) and reset the window.
 *  Exported for tests and for shutdown flushes. Empty window = no event. */
export async function flushListenerSummary() {
  const reports = hbWindow.splice(0);
  if (!reports.length) return;

  const aheadAll = reports.map(r => num(r.ahead)).filter(a => a !== null).sort((a, b) => a - b);
  const ofMode = (mode) => reports.filter(r => r.mode === mode);
  const aheadMaxAmong = (rs) => {
    const vals = rs.map(r => num(r.ahead)).filter(a => a !== null);
    return vals.length ? Math.max(...vals) : null;
  };
  const maxOf = (key) => {
    const vals = reports.map(r => num(r[key])).filter(a => a !== null);
    return vals.length ? Math.max(...vals) : null;
  };

  const src = ofMode('src');
  const props = {
    surface: 'listener',
    reports: reports.length,
    mse: ofMode('mse').length,
    src: src.length,
    // src on iOS/Safari is EXPECTED (no MP3-in-MSE there); src on any other
    // platform means the low-latency path silently failed mid-session — that
    // is the signal worth an alert.
    srcFallback: src.filter(r => r.plat !== 'ios').length,
    ios: reports.filter(r => r.plat === 'ios').length,
    android: reports.filter(r => r.plat === 'android').length,
    desktop: reports.filter(r => r.plat === 'desktop').length,
    streams: new Set(reports.map(r => r.streamId).filter(Boolean)).size,
  };
  if (aheadAll.length) {
    props.aheadMedian = median(aheadAll);
    props.aheadMax = aheadAll[aheadAll.length - 1];
  }
  const mseMax = aheadMaxAmong(ofMode('mse'));
  if (mseMax !== null) props.mseAheadMax = mseMax;
  const srcMax = aheadMaxAmong(src);
  if (srcMax !== null) props.srcAheadMax = srcMax;
  const uMax = maxOf('underruns');
  if (uMax !== null) props.underrunsMax = uMax;
  const sMax = maxOf('snaps');
  if (sMax !== null) props.snapsMax = sMax;
  const listeners = await currentListeners();
  if (typeof listeners === 'number') props.listeners = listeners;

  telemetry.capture('client_buffer_summary', props);
}

setInterval(() => { flushListenerSummary().catch(() => {}); }, SUMMARY_INTERVAL_MS).unref?.();

router.post('/client-event', async (req, res) => {
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

    if (event === 'buffer_report') {
      // Aggregate, don't relay: the summary fires on the interval (or via
      // flushListenerSummary) with the listener count attached there.
      hbWindow.push(props);
      return res.json({ ok: true, captured: telemetry.getConsentState().enabled });
    }

    // capture() is a no-op unless the operator consented + key resolves
    telemetry.capture(`client_${event}`, props);
    return res.json({ ok: true, captured: telemetry.getConsentState().enabled });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to record event' });
  }
});

/**
 * @route GET /api/telemetry/consent
 * @description Current telemetry state for the dashboard Admin account card
 *   switch. Admin-only (the whole router sits behind the auth gate except the
 *   explicitly-allowlisted client-event POST).
 * @access Private (admin)
 */
router.get('/consent', async (req, res, next) => {
  try {
    await telemetry.init(); // idempotent: state + key loaded before reading
    const { enabled, consented } = telemetry.getConsentState();
    return res.json({ enabled, consented, configured: !!telemetry.getKey() });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/telemetry/consent
 * @description Toggle telemetry from the dashboard (same path as the tray
 *   menu toggle). Body: { enabled: boolean }.
 * @access Private (admin)
 */
router.post('/consent', async (req, res, next) => {
  try {
    const enabled = req.body?.enabled === true;
    telemetry.setConsented(enabled);
    const { consented } = telemetry.getConsentState();
    return res.json({ ok: true, enabled, consented });
  } catch (error) {
    next(error);
  }
});

export default router;

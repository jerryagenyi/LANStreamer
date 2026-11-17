/**
 * TelemetryJournal — the local, crash-safe half of offline telemetry.
 *
 * Every telemetry event is written here FIRST (one JSON line per event in
 * <dataDir>/telemetry-journal.jsonl). An event leaves the journal only when
 * PostHog has confirmed receiving it (HTTP 200 on /batch/), so anything the
 * running app never managed to send survives restarts, dead networks and
 * power cuts — ready for a later automatic upload or a hand-carried export.
 *
 * Delivery bookkeeping lives next to it in <dataDir>/telemetry-delivery.json
 * (which ids were already exported, lastUploadAt, dropped-by-cap counter,
 * and the last 50 export log entries). All writes are best-effort: telemetry
 * must never break the app, so every fs error is swallowed.
 *
 * No singletons here — TelemetryService owns the instance; tests inject
 * { dir, now, transport }.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const JOURNAL_FILE = 'telemetry-journal.jsonl';
const STATE_FILE = 'telemetry-delivery.json';
const EXPORT_LOG_MAX = 50;

function freshState() {
  return { exportedIds: [], lastUploadAt: null, droppedEvents: 0, exports: [] };
}

/**
 * Real upload transport: POST a PostHog-shaped batch to /batch/.
 * The key is resolved at SEND time (never stored here, never logged).
 * Resolves true only when PostHog confirms receipt (2xx).
 */
export function createPostHogBatchTransport({ getKey, getHost }) {
  return async function transport(events) {
    try {
      const key = getKey();
      if (!key || typeof fetch !== 'function') return false;
      const host = String(getHost() || 'https://us.i.posthog.com').replace(/\/+$/, '');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(`${host}/batch/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // sent_at = this PC's clock now. PostHog compares it with its own
          // clock and shifts every event by the difference, so a venue PC
          // with a wrong date (no internet, no time sync) still lands right.
          body: JSON.stringify({ api_key: key, batch: events, sent_at: new Date().toISOString() }),
          signal: controller.signal,
        });
        return res.ok;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  };
}

export class TelemetryJournal {
  /**
   * @param {object} opts
   * @param {string} opts.dir            directory for journal + delivery state
   * @param {number} [opts.maxEvents=10000] hard cap; oldest events dropped past it
   * @param {() => number} [opts.now=Date.now] injectable clock
   */
  constructor({ dir, maxEvents = 10000, now = Date.now } = {}) {
    if (!dir) throw new Error('TelemetryJournal requires a dir');
    this.dir = dir;
    this.maxEvents = maxEvents;
    this.now = now;
    this.journalPath = path.join(dir, JOURNAL_FILE);
    this.statePath = path.join(dir, STATE_FILE);
    this._events = null;   // lazy: [{ id, ts, event, props }] oldest-first
    this._state = null;    // lazy
    this._exportedIds = null;
    this._uploading = false;
  }

  // --- loading -------------------------------------------------------------

  _load() {
    if (this._events !== null) return;
    this._events = [];
    try {
      const raw = fs.readFileSync(this.journalPath, 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const rec = JSON.parse(trimmed);
          if (rec && typeof rec.id === 'string' && typeof rec.ts === 'string' &&
              typeof rec.event === 'string') {
            this._events.push({ id: rec.id, ts: rec.ts, event: rec.event, props: rec.props || {} });
          }
        } catch { /* torn line (crash mid-write) — skip it */ }
      }
    } catch { /* no journal yet */ }
    try {
      const st = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      this._state = {
        exportedIds: Array.isArray(st.exportedIds) ? st.exportedIds.filter((x) => typeof x === 'string') : [],
        lastUploadAt: typeof st.lastUploadAt === 'string' ? st.lastUploadAt : null,
        droppedEvents: Number.isFinite(st.droppedEvents) ? st.droppedEvents : 0,
        exports: Array.isArray(st.exports) ? st.exports : [],
      };
    } catch {
      this._state = freshState();
    }
    this._exportedIds = new Set(this._state.exportedIds);
  }

  _saveState() {
    this._state.exportedIds = [...this._exportedIds];
    this._atomicWrite(this.statePath, JSON.stringify(this._state, null, 2));
  }

  /** temp file + rename: readers see either the old or the new full file. */
  _atomicWrite(filePath, data) {
    const tmp = `${filePath}.tmp`;
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, filePath);
  }

  /** Rewrite the journal from memory; drops exported-id markers of
   *  records that are no longer on disk. */
  _rewriteJournal() {
    this._atomicWrite(this.journalPath, this._events.map((e) => JSON.stringify(e)).join('\n') + (this._events.length ? '\n' : ''));
    if (this._exportedIds.size) {
      const alive = new Set(this._events.map((e) => e.id));
      for (const id of [...this._exportedIds]) {
        if (!alive.has(id)) this._exportedIds.delete(id);
      }
    }
    this._saveState();
  }

  // --- recording -----------------------------------------------------------

  /**
   * Append an event. Returns its id, or null when the disk failed (the
   * caller treats that as "could not record" and may fall back).
   */
  record({ event, props }) {
    try {
      this._load();
      const rec = {
        id: crypto.randomUUID(),
        ts: new Date(this.now()).toISOString(),
        event,
        props: { ...(props || {}) },
      };
      fs.mkdirSync(this.dir, { recursive: true });
      fs.appendFileSync(this.journalPath, JSON.stringify(rec) + '\n');
      this._events.push(rec);
      if (this._events.length > this.maxEvents) {
        // Trim a tenth at once: a PC that stays offline sits at the cap for
        // weeks, and a full-file rewrite per event would block the process
        // that also proxies the audio. One rewrite per maxEvents/10 events.
        const keep = this.maxEvents - Math.floor(this.maxEvents / 10);
        const cut = this._events.length - keep;
        this._events = this._events.slice(cut);
        this._state.droppedEvents += cut;
        this._rewriteJournal();
      }
      return rec.id;
    } catch {
      return null;
    }
  }

  // --- pending / status ------------------------------------------------------

  _pendingEvents() {
    this._load();
    return this._events.filter((e) => !this._exportedIds.has(e.id));
  }

  /** Pending = on disk AND not already included in an export. */
  status() {
    const pending = this._pendingEvents();
    return {
      pendingCount: pending.length,
      pendingSince: pending.length ? pending[0].ts : null,
      lastUploadAt: this._state.lastUploadAt,
      lastExportAt: this._state.exports.length ? this._state.exports[this._state.exports.length - 1].exportedAt : null,
      exports: this._state.exports.slice(-5),
    };
  }

  /** Remind-worthy: still pending, from BEFORE the given epoch ms (app start). */
  pendingBefore(epochMs) {
    if (!Number.isFinite(epochMs)) return 0;
    return this._pendingEvents().filter((e) => Date.parse(e.ts) < epochMs).length;
  }

  // --- upload ----------------------------------------------------------------

  /**
   * One delivery pass: hand the oldest undelivered events to `transport` in
   * batches; remove a batch from disk ONLY when the transport resolved true.
   * A failed batch stops the pass — the next trigger retries. Never throws.
   * @returns {Promise<{sent: number, skipped: boolean}>}
   */
  async upload({ transport, installId, batchSize = 100, lateAfterMs = 300_000 } = {}) {
    if (this._uploading || typeof transport !== 'function') {
      return { sent: 0, skipped: this._uploading };
    }
    this._uploading = true;
    let sent = 0;
    try {
      this._load();
      while (this._events.length) {
        const recs = this._events.slice(0, batchSize);
        const batch = recs.map((r) => {
          const properties = { ...r.props, $geoip_disable: true };
          if (this.now() - Date.parse(r.ts) > lateAfterMs) properties.delivery = 'late';
          return {
            event: r.event,
            properties,
            distinct_id: installId,
            timestamp: r.ts,   // original time — not upload time
            uuid: r.id,        // repeat uploads de-duplicate server-side
          };
        });
        let ok = false;
        try { ok = (await transport(batch)) === true; } catch { ok = false; }
        if (!ok) break;
        // Remove by id, not by count: record() can run while the batch is in
        // flight, and at the cap it evicts from the front of the list.
        const delivered = new Set(recs.map((r) => r.id));
        this._events = this._events.filter((e) => !delivered.has(e.id));
        this._rewriteJournal();
        sent += recs.length;
        this._state.lastUploadAt = new Date(this.now()).toISOString();
        this._saveState();
      }
    } catch { /* never break the app */ }
    finally {
      this._uploading = false;
    }
    return { sent, skipped: false };
  }

  // --- hand-carry export -------------------------------------------------------

  /**
   * Bundle EVERY event still on disk (including previously exported ones —
   * the file is the operator's safety copy until PostHog confirms receipt).
   * Marks the ids as exported and appends an export log entry — but only
   * when there was anything to export.
   */
  exportBundle({ installId, appVersion, platform, osVersion, arch } = {}) {
    this._load();
    const events = this._events.map((e) => ({ id: e.id, ts: e.ts, event: e.event, props: e.props }));
    const bundle = {
      format: 'lanstreamer-diagnostics',
      formatVersion: 1,
      exportedAt: new Date(this.now()).toISOString(),
      installId,
      appVersion,
      platform,
      osVersion,
      arch,
      eventCount: events.length,
      firstEventAt: events.length ? events[0].ts : null,
      lastEventAt: events.length ? events[events.length - 1].ts : null,
      droppedEvents: this._state.droppedEvents,
      events,
    };
    if (events.length) {
      for (const e of this._events) this._exportedIds.add(e.id);
      this._state.exports.push({
        exportedAt: bundle.exportedAt,
        eventCount: events.length,
        firstEventAt: bundle.firstEventAt,
        lastEventAt: bundle.lastEventAt,
      });
      if (this._state.exports.length > EXPORT_LOG_MAX) {
        this._state.exports = this._state.exports.slice(-EXPORT_LOG_MAX);
      }
      this._saveState();
    }
    return bundle;
  }

  /** Telemetry turned OFF: delete every local trace of journaled events. */
  destroy() {
    try { fs.rmSync(this.journalPath, { force: true }); } catch { /* ignore */ }
    try { fs.rmSync(this.statePath, { force: true }); } catch { /* ignore */ }
    this._events = [];
    this._state = freshState();
    this._exportedIds = new Set();
  }
}

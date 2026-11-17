import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { createRequire } from 'module';
import logger from '../utils/logger.js';
import { dataDir } from '../utils/vendorPaths.js';
import { appVersion } from '../utils/appVersion.js';
import { TelemetryJournal, createPostHogBatchTransport } from './TelemetryJournal.js';

const require = createRequire(import.meta.url);

/**
 * Voluntary, privacy-minimal product telemetry (PostHog).
 *
 * Principles (documented in README "Telemetry & Privacy"):
 *  - ON unless the operator turns it off (opt-out; first run is a notice).
 *  - Anonymous install ID only — no IP logging, no machine/user names, never
 *    audio, never stream names, never file paths.
 *  - Queue-and-flush: a LAN-first app is often offline; telemetry must never
 *    block or break anything. Every call is try/caught.
 *
 * Collected event properties: event name, timestamp, app version, event
 * schema version, OS + architecture, anonymous install ID, and for failures
 * the error category (from errorDiagnostics). Stream started additionally
 * carries the output format, bitrate, source kind (device/file) and a
 * one-way source hash (10 hex chars, sha256 over a per-install random salt +
 * the device/file label — comparable WITHIN an install only, never
 * reversible or comparable across installs).
 * Listener-page events (failures + the 30s buffer heartbeat, which the relay
 * enriches with the current listener count) go through routes/telemetry.js.
 * stream_stopped also carries session length in minutes. Nothing else is
 * collected. Every event also carries
 * the fixed app=lanstreamer tag (the maintainer's PostHog project is shared
 * with other apps; the tag is how insights tell this app's events apart).
 * See docs/APP-FLOW.md and README.
 *
 * Config: config/telemetry.json { installId, consented: boolean|null }
 * Env: POSTHOG_KEY (project API key), POSTHOG_HOST (default us.i.posthog.com).
 */
class TelemetryService {
  constructor() {
    this.configPath = path.join(dataDir(), 'telemetry.json');
    this.client = null;
    this.installId = null;
    this.consented = null; // null = undecided, true/false = user choice
    this.queue = [];
    this.enabled = false;
  }

  init() {
    if (process.env.NODE_ENV === 'test' || this._initialized) return; // never in tests, once per process
    this._initialized = true;
    try {
      this._appStartedAt = Date.now();
      this._loadState();
      this._maybeStartClient();
      this._ensureJournal();
      if (this.enabled) {
        this.capture('app_start', {});
        this._scheduleUpload(4_000); // startup delivery attempt (clears offline backlogs)
        this._startFlushInterval();
      }
    } catch (error) {
      logger.debug(`Telemetry init skipped: ${error.message}`);
    }
  }

  _loadState() {
    let state = {};
    try {
      if (fs.existsSync(this.configPath)) {
        state = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch {
      state = {};
    }
    this.installId = state.installId || crypto.randomUUID();
    this.consented = typeof state.consented === 'boolean' ? state.consented : null;
    // Per-install random salt for sourceHash (below) — persisted so hashes stay
    // comparable WITHIN an install (morning vs afternoon stream = same source?),
    // while never being comparable across installs (no global dictionary attack
    // on common device names).
    this.sourceHashSalt = state.sourceHashSalt || crypto.randomUUID();
    // Key/host resolution order:
    //   1. env (dev: POSTHOG_KEY / POSTHOG_HOST, typically via .env)
    //   2. config/telemetry.json (operator-configurable at runtime)
    //   3. electron/telemetry-key.json (injected at build time so packaged
    //      apps ship telemetry with zero user configuration)
    this._configKey = state.posthogKey || this._readSecretsStore()?.posthogKey || this._readBundledKey()?.posthogKey || null;
    this._configHost = state.posthogHost || this._readSecretsStore()?.posthogHost || this._readBundledKey()?.posthogHost || null;
    if (!state.installId || !state.sourceHashSalt) this._saveState();
  }

  _readBundledKey() {
    // Candidates: dev checkout (cwd), packaged app (inside the asar — Electron's
    // patched fs reads through it), and unpacked resources as a fallback. Without
    // the asar path, distributed installs on machines WITHOUT ~/.secrets can
    // never enable telemetry (the key only exists inside the packaged app).
    const candidates = [
      path.join(process.cwd(), 'electron', 'telemetry-key.json'),
      process.resourcesPath ? path.join(process.resourcesPath, 'app.asar', 'electron', 'telemetry-key.json') : null,
      process.resourcesPath ? path.join(process.resourcesPath, 'app', 'electron', 'telemetry-key.json') : null
    ].filter(Boolean);
    for (const bundledPath of candidates) {
      try {
        if (fs.existsSync(bundledPath)) {
          return JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
        }
      } catch { /* try next candidate */ }
    }
    return null;
  }

  /**
   * Machine credential store convention (this operator's setup):
   * ~/.secrets/posthog with KEY=VALUE lines, sectioned per product —
   * LS_POSTHOG_PROJECT_TOKEN (LANStreamer ingest key; the legacy unprefixed
   * name is honoured for old setups) and an optional host line. Hosts fall
   * back across sections because the operator's projects share one region.
   * Values are never logged.
   */
  _readSecretsStore() {
    try {
      const secretsPath = path.join(os.homedir(), '.secrets', 'posthog');
      if (!fs.existsSync(secretsPath)) return null;
      const lines = fs.readFileSync(secretsPath, 'utf8').split('\n');
      const map = {};
      for (const line of lines) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (m) map[m[1]] = m[2];
      }
      const key = map.LS_POSTHOG_PROJECT_TOKEN || map.POSTHOG_PROJECT_TOKEN;
      if (!key) return null;
      const host = map.LS_POSTHOG_HOST || map.POSTHOG_HOST || map.CA_POSTHOG_HOST;
      return {
        posthogKey: key,
        ...(host ? { posthogHost: host } : {}),
      };
    } catch { /* ignore */ }
    return null;
  }

  getKey() {
    return process.env.POSTHOG_KEY || this._configKey;
  }

  getHost() {
    return process.env.POSTHOG_HOST || this._configHost || 'https://us.i.posthog.com';
  }

  _saveState() {
    try {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify({
        installId: this.installId,
        sourceHashSalt: this.sourceHashSalt,
        consented: this.consented,
        posthogKey: this._configKey || undefined,
        posthogHost: this._configHost || undefined,
      }, null, 2));
    } catch (error) {
      logger.debug(`Telemetry state not saved: ${error.message}`);
    }
  }

  _maybeStartClient() {
    const key = this.getKey();
    // OPT-OUT model (owner decision 2026-11-01): telemetry is ON unless the
    // operator explicitly turned it off (consented === false). A fresh install
    // (consented null) sends; the first-run dialog is an informational notice
    // with a one-click "Turn off", and the dashboard/tray toggles flip it.
    if (!key || this.consented === false) {
      this.enabled = false;
      return;
    }
    try {
      // Lazy import so a missing/broken SDK never affects the app
      const { PostHog } = require('posthog-node');
      this.client = new PostHog(key, {
        host: this.getHost(),
        flushAt: 10,
        flushInterval: 30_000,
      });
      this.enabled = true;
    } catch (error) {
      logger.debug(`PostHog client not started: ${error.message}`);
      this.enabled = false;
    }
  }

  getConsentState() {
    return { installId: this.installId, consented: this.consented, enabled: this.enabled };
  }

  /** User decision from the first-run prompt (or settings/tray toggle). */
  setConsented(value) {
    this.consented = Boolean(value);
    this._saveState();
    // OFF means OFF: delete every local trace of journaled events and stop
    // journaling. The journal only exists while telemetry is enabled.
    if (this.consented === false) this._destroyJournal();
    this._maybeStartClient();
    if (this.enabled) this._ensureJournal();
    if (this.enabled && !this._flushTimer) this._startFlushInterval();
    this.capture(value ? 'telemetry_enabled' : 'telemetry_disabled', {});
    if (this.client) this.client.flush().catch(() => {});
    return this.getConsentState();
  }

  /** One-way fingerprint of an audio source label (device or file), salted
   *  with a per-install random salt. Stable within an install (so two events
   *  can be compared: "same source or not?"), meaningless across installs. */
  sourceHash(label) {
    try {
      if (!label) return 'none';
      return crypto.createHash('sha256').update(`${this.sourceHashSalt}\0${String(label)}`).digest('hex').slice(0, 10);
    } catch {
      return 'none';
    }
  }

  capture(event, properties = {}) {
    if (!this.enabled) return;
    const name = `lanstreamer_${event}`;
    const props = {
      app: 'lanstreamer',
      appVersion: appVersion(),
      schema: 1, // event-property schema version — bump when shapes change
      platform: process.platform,
      // OS build (e.g. Windows 10.0.26100) — machine SPEC, shared by
      // millions of installs; machine IDENTITY (hostname/serials/user
      // names) is what we never send.
      osVersion: os.release(),
      arch: process.arch,
      ...properties,
    };
    // ONE delivery path: journal FIRST, the uploader delivers it later.
    // The journal only exists outside unit tests (tests inject a client
    // without init()); when journaling itself fails we fall back to the
    // in-memory SDK client rather than dropping the event.
    if (this._journal) {
      try {
        if (this._journal.record({ event: name, props })) {
          this._scheduleUpload();
          return;
        }
      } catch { /* fall through to the client */ }
    }
    if (!this.client) return;
    try {
      this.client.capture({ distinctId: this.installId, event: name, properties: props });
    } catch (error) {
      logger.debug(`Telemetry capture failed (ignored): ${error.message}`);
    }
  }

  /** Local journal of undelivered events (created once telemetry is enabled). */
  _ensureJournal() {
    if (this._journal || !this.enabled) return;
    try {
      this._journal = new TelemetryJournal({ dir: dataDir() });
      this._transport = createPostHogBatchTransport({
        getKey: () => this.getKey(),
        getHost: () => this.getHost(),
      });
    } catch (error) {
      logger.debug(`Telemetry journal not started: ${error.message}`);
      this._journal = null;
    }
  }

  _destroyJournal() {
    try { this._journal?.destroy(); } catch { /* ignore */ }
    this._journal = null;
  }

  /** Debounced upload trigger — a few seconds after the last event. */
  _scheduleUpload(delayMs = 5_000) {
    if (this._uploadTimer) return;
    this._uploadTimer = setTimeout(() => {
      this._uploadTimer = null;
      this._runUpload();
    }, delayMs);
    this._uploadTimer.unref?.();
  }

  /** One delivery pass. Marks the startup attempt done (for the remind logic). */
  async _runUpload() {
    if (this._uploadInFlight) return;
    this._uploadInFlight = true;
    try {
      if (this._journal && this.enabled) {
        await this._journal.upload({ transport: this._transport, installId: this.installId });
      }
    } catch { /* never break the app */ }
    finally {
      this._uploadInFlight = false;
      this._startupUploadDone = true;
    }
  }

  /** Local-delivery status for the dashboard "Export diagnostics" card. */
  diagnosticsStatus() {
    const out = {
      enabled: this.enabled,
      pendingCount: 0,
      pendingSince: null,
      lastUploadAt: null,
      lastExportAt: null,
      exports: [],
      remind: false,
      settled: true,
    };
    try {
      if (!this._journal) return out;
      const s = this._journal.status();
      Object.assign(out, s);
      out.enabled = this.enabled;
      const startedAgo = this._appStartedAt ? Date.now() - this._appStartedAt : Infinity;
      // Remind only about PREVIOUS-session events the startup upload attempt
      // (or a 15s timeout) failed to clear — never about this session's traffic.
      // settled = the answer below is final for this start. The dashboard
      // usually loads before the first upload attempt; it asks again when
      // this is false, otherwise the reminder would never be shown.
      out.settled = Boolean(this._startupUploadDone) || startedAgo >= 15_000;
      out.remind = out.settled && this._journal.pendingBefore(this._appStartedAt) > 0;
    } catch { /* never break the app */ }
    return out;
  }

  /** Hand-carry bundle (null when telemetry is off / no journal). */
  exportDiagnostics() {
    if (!this.enabled || this.consented === false || !this._journal) return null;
    try {
      return this._journal.exportBundle({
        installId: this.installId,
        appVersion: appVersion(),
        platform: process.platform,
        osVersion: os.release(),
        arch: process.arch,
      });
    } catch (error) {
      logger.debug(`Diagnostics export failed: ${error.message}`);
      return null;
    }
  }

  _startFlushInterval() {
    if (this._flushTimer) return;
    this._flushTimer = setInterval(() => {
      this._runUpload();
      if (this.client) this.client.flush().catch(() => {});
    }, 60_000);
    this._flushTimer.unref?.();
  }

  async shutdown() {
    try {
      // Session boundary marker — pairs with app_start so remote data shows
      // install session lengths without inferring from gaps.
      this.capture('app_stop', {});
      // Final journal upload, capped at 3s so shutdown never hangs on a
      // dead network — unsent events stay journaled for the next start.
      await Promise.race([this._runUpload(), new Promise((resolve) => setTimeout(resolve, 3000))]);
      if (this.client) await this.client.shutdown();
    } catch { /* ignore */ }
  }
}

export default new TelemetryService();

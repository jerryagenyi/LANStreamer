import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import logger from '../utils/logger.js';

const require = createRequire(import.meta.url);

/**
 * Voluntary, privacy-minimal product telemetry (PostHog).
 *
 * Principles (documented in README "Telemetry & Privacy"):
 *  - OFF until the user allows it in the first-run prompt (or POSTHOG_KEY absent).
 *  - Anonymous install ID only — no IP logging, no machine/user names, never
 *    audio, never stream names, never file paths.
 *  - Queue-and-flush: a LAN-first app is often offline; telemetry must never
 *    block or break anything. Every call is try/caught.
 *
 * Collected event properties: event name, timestamp, app version, OS +
 * architecture, anonymous install ID, and for failures the error category
 * (from errorDiagnostics) — nothing else. See docs/APP-FLOW.md and README.
 *
 * Config: config/telemetry.json { installId, consented: boolean|null }
 * Env: POSTHOG_KEY (project API key), POSTHOG_HOST (default us.i.posthog.com).
 */
class TelemetryService {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'telemetry.json');
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
      this._loadState();
      this._maybeStartClient();
      if (this.enabled) {
        this.capture('app_start', {});
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
    // Key/host may come from env (dev) or this config file (packaged Electron,
    // where a .env next to the exe is not a thing users can rely on):
    //   { "posthogKey": "phc_...", "posthogHost": "https://eu.i.posthog.com" }
    this._configKey = state.posthogKey || null;
    this._configHost = state.posthogHost || null;
    if (!state.installId) this._saveState();
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
    if (!key || this.consented !== true) {
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
    this._maybeStartClient();
    if (this.enabled && !this._flushTimer) this._startFlushInterval();
    this.capture(value ? 'telemetry_enabled' : 'telemetry_disabled', {});
    if (this.client) this.client.flush().catch(() => {});
    return this.getConsentState();
  }

  capture(event, properties = {}) {
    if (!this.enabled || !this.client) return;
    try {
      this.client.capture({
        distinctId: this.installId,
        event: `lanstreamer_${event}`,
        properties: {
          appVersion: process.env.npm_package_version || 'unknown',
          platform: process.platform,
          arch: process.arch,
          ...properties,
        },
      });
    } catch (error) {
      logger.debug(`Telemetry capture failed (ignored): ${error.message}`);
    }
  }

  _startFlushInterval() {
    if (this._flushTimer) return;
    this._flushTimer = setInterval(() => {
      if (this.client) this.client.flush().catch(() => {});
    }, 60_000);
    this._flushTimer.unref?.();
  }

  async shutdown() {
    try {
      if (this.client) await this.client.shutdown();
    } catch { /* ignore */ }
  }
}

export default new TelemetryService();

#!/usr/bin/env node
/**
 * Prepare the build-time telemetry key before electron-builder packages the app.
 *
 * Key sources, in order: POSTHOG_KEY (+ optional POSTHOG_HOST) env, else the
 * machine credential store (~/.secrets/posthog, sectioned per product —
 * LS_POSTHOG_PROJECT_TOKEN / LS_POSTHOG_HOST, legacy unprefixed fallback) —
 * the same store TelemetryService reads at runtime, so the maintainer's
 * machine can package telemetry without exporting anything. LANStreamer builds
 * MUST bake the LANStreamer org's project key, never another product's.
 *
 * Writes electron/telemetry-key.json, which ships inside the packaged app.
 * TelemetryService falls back to this file when neither env vars nor the
 * operator's config/telemetry.json provide a key — so distributed installs
 * send (consented) telemetry with zero user configuration.
 *
 * The file is gitignored (never committed). If no key resolves, any stale
 * file is removed so the build simply ships without telemetry.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, '..', 'electron', 'telemetry-key.json');

let key = process.env.POSTHOG_KEY || '';
let host = process.env.POSTHOG_HOST || '';

if (!key) {
  try {
    const store = path.join(os.homedir(), '.secrets', 'posthog');
    if (fs.existsSync(store)) {
      const map = {};
      for (const line of fs.readFileSync(store, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (m) map[m[1]] = m[2];
      }
      // Store is sectioned per product (LS_/CA_ prefixes). LANStreamer builds
      // bake the LANStreamer project's ingest key; hosts fall back across
      // sections because the operator's projects share one region.
      key = map.LS_POSTHOG_PROJECT_TOKEN || map.POSTHOG_PROJECT_TOKEN || '';
      host = host || map.LS_POSTHOG_HOST || map.POSTHOG_HOST || map.CA_POSTHOG_HOST || '';
    }
  } catch { /* store unreadable — treat as no key */ }
}

if (!key) {
  if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  console.log('[telemetry-key] No key found (POSTHOG_KEY env or ~/.secrets/posthog) — packaging without telemetry.');
} else {
  fs.writeFileSync(outFile, JSON.stringify({ posthogKey: key, ...(host ? { posthogHost: host } : {}) }, null, 2));
  console.log(`[telemetry-key] Injected for packaged build (${key.slice(0, 7)}…${host ? ', host ' + host : ''}).`);
}

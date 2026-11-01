#!/usr/bin/env node
/**
 * Prepare the build-time telemetry key before electron-builder packages the app.
 *
 * Key sources, in order: POSTHOG_KEY (+ optional POSTHOG_HOST) env, else the
 * machine credential store (~/.secrets/posthog: POSTHOG_PROJECT_TOKEN /
 * POSTHOG_HOST) — the same store TelemetryService reads at runtime, so the
 * maintainer's machine can package telemetry without exporting anything.
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
      for (const line of fs.readFileSync(store, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (!m) continue;
        if (m[1] === 'POSTHOG_PROJECT_TOKEN' && !key) key = m[2];
        if (m[1] === 'POSTHOG_HOST' && !host) host = m[2];
      }
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

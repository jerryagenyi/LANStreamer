#!/usr/bin/env node
/**
 * Prepare the build-time telemetry key before electron-builder packages the app.
 *
 * Reads POSTHOG_KEY (and optional POSTHOG_HOST) from the environment and writes
 * electron/telemetry-key.json, which ships inside the packaged app. The
 * TelemetryService falls back to this file when neither env vars nor the user's
 * config/telemetry.json provide a key — so end users send (consented) telemetry
 * without configuring anything.
 *
 * The file is gitignored (never committed). If POSTHOG_KEY is unset, any stale
 * file is removed so the build simply ships without telemetry.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, '..', 'electron', 'telemetry-key.json');

const key = process.env.POSTHOG_KEY;
const host = process.env.POSTHOG_HOST;

if (!key) {
  if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  console.log('[telemetry-key] POSTHOG_KEY not set — packaging without telemetry.');
} else {
  fs.writeFileSync(outFile, JSON.stringify({ posthogKey: key, ...(host ? { posthogHost: host } : {}) }, null, 2));
  console.log('[telemetry-key] injected for packaged build.');
}

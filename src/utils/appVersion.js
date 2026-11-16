import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let cached = null;

/**
 * The app's version, read from package.json (which ships inside the packaged
 * app). Do NOT use process.env.npm_package_version for this: npm only sets it
 * under `npm run …`, so a packaged Electron build reported "unknown" on every
 * telemetry event and binary-probe pin.
 */
export function appVersion() {
  if (cached) return cached;
  try {
    cached = String(require('../../package.json').version || '') || 'unknown';
  } catch {
    cached = process.env.npm_package_version || 'unknown';
  }
  return cached;
}

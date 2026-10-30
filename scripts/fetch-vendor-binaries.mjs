#!/usr/bin/env node
/**
 * Populate vendor/ with the binaries the installer bundles (run before
 * electron-builder — npm run electron:build:win does it automatically).
 * Core logic lives in src/utils/binaries.js (shared with the runtime
 * download-on-demand tier). This CLI adds the build-time conveniences:
 * FFmpeg from the pinned official download (or --ffmpeg-from-path), the
 * Icecast kit from the validated local portable / Program Files, and the
 * GPL license texts.
 *
 * vendor/ is gitignored — binaries live in builds/releases, not in git.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import {
  downloadPinnedFFmpeg,
  installFFmpegFromZip,
  installIcecastKit,
  fetchLicenseTexts
} from '../src/utils/binaries.js';

const root = path.resolve(import.meta.dirname, '..');
const vendor = path.join(root, 'vendor');
const args = new Set(process.argv.slice(2));

const ICECAST_KIT_SOURCES = [
  process.env.ICECAST_KIT_DIR,
  path.join(os.homedir(), 'Tools', 'icecast-2.5.0'), // validated portable 2.5.0
  'C:\\Program Files (x86)\\Icecast',
  'C:\\Program Files\\Icecast'
].filter(Boolean);

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';

// ---- FFmpeg (pinned official essentials build; --ffmpeg-from-path for offline builds) ----
const ffmpegExe = path.join(vendor, 'ffmpeg', 'ffmpeg.exe');
if (fs.existsSync(ffmpegExe) && !args.has('--force')) {
  console.log(`[ffmpeg] already vendored (${mb(fs.statSync(ffmpegExe).size)}) — use --force to refresh`);
} else if (args.has('--ffmpeg-from-path')) {
  const where = execSync('where ffmpeg', { encoding: 'utf8', windowsHide: true }).trim().split('\n')[0].trim();
  fs.mkdirSync(path.dirname(ffmpegExe), { recursive: true });
  fs.copyFileSync(where, ffmpegExe);
  console.log(`[ffmpeg] copied from PATH (${where}, ${mb(fs.statSync(ffmpegExe).size)}) — NOTE: unpinned, build-machine binary`);
} else if (process.env.FFMPEG_ZIP && fs.existsSync(process.env.FFMPEG_ZIP)) {
  installFFmpegFromZip(vendor, process.env.FFMPEG_ZIP, null);
  console.log(`[ffmpeg] extracted from FFMPEG_ZIP=${process.env.FFMPEG_ZIP}`);
} else {
  console.log('[ffmpeg] downloading pinned official essentials build…');
  const lastPct = { v: -1 };
  await downloadPinnedFFmpeg(vendor, (bytes, total) => {
    const pct = Math.floor((bytes / total) * 100);
    if (pct >= lastPct.v + 10) { lastPct.v = pct; console.log(`  ${pct}% (${mb(bytes)})`); }
  });
  console.log(`[ffmpeg] vendored + SHA256 verified (${mb(fs.statSync(ffmpegExe).size)})`);
}

// ---- Icecast (validated local kit — official pinned kit download is the GO-LIVE-CHECKLIST follow-up) ----
if (fs.existsSync(path.join(vendor, 'icecast', 'bin', 'icecast.exe')) && !args.has('--force')) {
  console.log('[icecast] already vendored — use --force to refresh');
} else {
  const src = ICECAST_KIT_SOURCES.find(p => fs.existsSync(path.join(p, 'bin', 'icecast.exe')));
  if (!src) throw new Error('[icecast] no local kit found — set ICECAST_KIT_DIR or install to a standard location, then re-run');
  installIcecastKit(vendor, src);
  console.log(`[icecast] kit copied from ${src} + clean stock template written (no local credentials ship)`);
}

// ---- GPL compliance ----
await fetchLicenseTexts(vendor);
console.log('[licenses] GPL texts + source-offer README written into vendor/licenses/');

console.log(`\nvendor/ ready at ${path.relative(root, vendor)} (gitignored — ships via electron-builder extraResources)`);

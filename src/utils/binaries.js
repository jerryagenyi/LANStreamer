/**
 * Binary provisioning — the single source of truth for FFmpeg/Icecast vendoring.
 * Used by scripts/fetch-vendor-binaries.mjs (build time) AND the dashboard's
 * download-on-demand tier (runtime, for the rare case where neither the
 * bundled kit nor a system install exists).
 *
 * Supply-chain rule (maintainer's min-release-age mindset): the FFmpeg zip
 * URL is a ROLLING "latest release" link, so its SHA256 is PINNED below.
 * When FFmpeg publishes a new build the check fails on purpose — re-download
 * from the official domain, verify, and update the pin consciously.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { vendorDir, dataDir, vendoredFfmpegPath, vendoredIcecastExePath } from './vendorPaths.js';

export const PINNED_FFMPEG = {
  url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
  sha256: '60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba',
  size: 114768076
};

const LICENSE_SOURCES = [
  {
    name: 'GPL-3.0.txt', expect: 'GNU GENERAL PUBLIC LICENSE',
    urls: ['https://www.gnu.org/licenses/gpl-3.0.txt', 'https://raw.githubusercontent.com/spdx/license-list-data/main/text/GPL-3.0-only.txt']
  },
  {
    name: 'GPL-2.0.txt', expect: 'GNU GENERAL PUBLIC LICENSE',
    urls: ['https://www.gnu.org/licenses/gpl-2.0.txt', 'https://raw.githubusercontent.com/spdx/license-list-data/main/text/GPL-2.0-only.txt']
  }
];

/** Clean stock template — never ship a local install's real credentials. */
export const ICECAST_TEMPLATE = `<icecast>
  <limits>
    <clients>100</clients>
    <sources>10</sources>
    <queue-size>524288</queue-size>
    <client-timeout>30</client-timeout>
    <header-timeout>15</header-timeout>
    <source-timeout>10</source-timeout>
    <burst-on-connect>1</burst-on-connect>
    <burst-size>65535</burst-size>
  </limits>
  <authentication>
    <source-password>hackme</source-password>
    <relay-password>hackme</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>hackme</admin-password>
  </authentication>
  <hostname>localhost</hostname>
  <listen-socket>
    <port>8200</port>
    <!-- LOOPBACK ONLY: listeners reach audio through the app's :3001 play
         proxy; binding the LAN would expose Icecast's own admin plane to
         anyone who knows the stock kit values this template ships with.
         The app randomizes the passwords below per install at generation
         time (vendorPaths.ensureVendoredIcecastConfig). -->
    <bind-address>127.0.0.1</bind-address>
  </listen-socket>
  <fileserve>1</fileserve>
  <paths>
    <logdir>./log</logdir>
    <webroot>./web</webroot>
    <adminroot>./admin</adminroot>
    <alias source="/" destination="/status.xsl"/>
  </paths>
  <logging>
    <accesslog>access.log</accesslog>
    <errorlog>error.log</errorlog>
    <loglevel>3</loglevel>
    <logsize>10000</logsize>
    <logarchive>0</logarchive>
  </logging>
  <security>
    <chroot>0</chroot>
  </security>
</icecast>
`;

export function writeIcecastTemplate(root) {
  fs.writeFileSync(path.join(root, 'icecast', 'icecast.xml'), ICECAST_TEMPLATE);
}

/**
 * Copy an Icecast kit directory (e.g. the validated 2.5.0 portable) into
 * <root>/icecast, stripping installer junk, then write the clean template.
 */
export function installIcecastKit(root, srcDir) {
  if (!fs.existsSync(path.join(srcDir, 'bin', 'icecast.exe'))) {
    throw new Error(`No Icecast kit at ${srcDir} (expected bin/icecast.exe)`);
  }
  const dest = path.join(root, 'icecast');
  fs.cpSync(srcDir, dest, { recursive: true });
  for (const junk of ['$PLUGINSDIR', 'Uninstall.exe', 'doc', 'log', 'logs']) {
    fs.rmSync(path.join(dest, junk), { recursive: true, force: true });
  }
  writeIcecastTemplate(root);
}

/** Verify + extract a downloaded FFmpeg essentials zip; returns the exe dest. */
export function installFFmpegFromZip(root, zipPath, expectedSha256) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
  if (expectedSha256 && actual !== expectedSha256) {
    throw new Error(`FFmpeg zip hash mismatch — expected ${expectedSha256.slice(0, 12)}…, got ${actual.slice(0, 12)}…. Refusing to install (pinned supply-chain check). Re-pin consciously after verifying a new official build.`);
  }
  const dest = path.join(root, 'ffmpeg', 'ffmpeg.exe');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ffmpeg-'));
  try {
    // Expand-Archive, not tar: in Git Bash environments GNU tar shadows Windows
    // bsdtar and misreads "C:\..." as a remote host spec ("Cannot connect to C:")
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
      { stdio: 'ignore', windowsHide: true, timeout: 300000 }
    );
    const found = execSync(`dir /s /b "${tmpDir}\\ffmpeg.exe"`, { encoding: 'utf8', windowsHide: true }).trim().split('\n')[0].trim();
    fs.copyFileSync(found, dest);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return dest;
}

/**
 * Download the pinned FFmpeg build with hash verification.
 * onProgress(bytes, total) feeds the dashboard progress display.
 * Buffered in memory (~110 MB, one-time desktop download) — simpler and
 * avoids stream-plumbing edge cases.
 */
export async function downloadPinnedFFmpeg(root, onProgress) {
  const res = await fetch(PINNED_FFMPEG.url);
  if (!res.ok) throw new Error(`FFmpeg download failed: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || PINNED_FFMPEG.size;
  const chunks = [];
  let seen = 0;
  for await (const chunk of res.body) {
    chunks.push(chunk);
    seen += chunk.length;
    try { onProgress?.(seen, total); } catch { /* progress is advisory */ }
  }
  const buf = Buffer.concat(chunks);
  const actual = crypto.createHash('sha256').update(buf).digest('hex');
  if (actual !== PINNED_FFMPEG.sha256) {
    throw new Error(`FFmpeg download failed the pinned hash check (expected ${PINNED_FFMPEG.sha256.slice(0, 12)}…, got ${actual.slice(0, 12)}…). The upstream build likely changed — re-verify and re-pin in src/utils/binaries.js.`);
  }
  const tmpZip = path.join(os.tmpdir(), `ffmpeg-${Date.now()}.zip`);
  fs.writeFileSync(tmpZip, buf);
  try {
    return installFFmpegFromZip(root, tmpZip, null); // hash already verified
  } finally {
    fs.rmSync(tmpZip, { force: true });
  }
}

/**
 * GPL compliance: license texts + a written-offer README inside vendor/, so
 * they ship inside the installer via extraResources.
 */
export async function fetchLicenseTexts(root) {
  const dir = path.join(root, 'licenses');
  fs.mkdirSync(dir, { recursive: true });
  for (const { name, urls, expect } of LICENSE_SOURCES) {
    const dest = path.join(dir, name);
    if (fs.existsSync(dest)) continue;
    let text = null, lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'LANStreamer-build/1.0 (GPL compliance fetch)' }, signal: AbortSignal.timeout(20000) });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status} from ${url}`); continue; }
        const t = await res.text();
        if (!t.includes(expect)) { lastErr = new Error(`sanity check failed for ${url}`); continue; }
        text = t;
        break;
      } catch (err) { lastErr = err; }
    }
    if (text === null) throw new Error(`License download failed (${name}): ${lastErr?.message}`);
    fs.writeFileSync(dest, text);
  }
  fs.writeFileSync(path.join(dir, 'README.md'), `# Bundled binaries — licenses and source offer

This distribution bundles GPL-licensed binaries:

- **FFmpeg** (gyan.dev essentials build, ${PINNED_FFMPEG.url}) — GPLv3. Source: official builds at gyan.dev/ffmpeg/builds/ (source code links published there) or https://ffmpeg.org/download.html
- **Icecast** (2.5.x Windows kit, icecast.org) — GPLv2. Source: https://icecast.org/download/

Complete license texts are the GPL-2.0.txt / GPL-3.0.txt files in this
directory. The corresponding source code is available from the official
upstream download pages above (written offer: maintainers of LANStreamer
will provide or point to the exact source on request).
`);
}

/**
 * Runtime probe for the dashboard download-on-demand tier:
 * which tier resolved — vendored, system, or missing entirely.
 */
export function binariesStatus() {
  const ffmpegVendored = !!vendoredFfmpegPath();
  let ffmpegSystem = false;
  if (!ffmpegVendored) {
    try { execSync('ffmpeg -version', { stdio: 'ignore', windowsHide: true }); ffmpegSystem = true; } catch { /* absent */ }
  }
  const icecastVendored = !!vendoredIcecastExePath();
  let icecastSystem = false;
  if (!icecastVendored) {
    const candidates = [
      process.env.ICECAST_EXE_PATH,
      'C:\\Program Files (x86)\\Icecast\\bin\\icecast.exe',
      'C:\\Program Files\\Icecast\\bin\\icecast.exe'
    ].filter(Boolean);
    icecastSystem = candidates.some(p => fs.existsSync(p));
  }
  return {
    ffmpeg: ffmpegVendored ? 'vendored' : (ffmpegSystem ? 'system' : 'missing'),
    icecast: icecastVendored ? 'vendored' : (icecastSystem ? 'system' : 'missing'),
    canStream: (ffmpegVendored || ffmpegSystem) && (icecastVendored || icecastSystem),
    vendorRoot: vendorDir()
  };
}

/** Writable vendor root for on-demand downloads (packaged: userData, never the read-only resources dir). */
export function downloadTargetRoot() {
  return path.join(dataDir(), 'vendor');
}

/**
 * Download-on-demand job (dashboard tier): fetch the pinned FFmpeg build into
 * the writable data-dir vendor root. Progress is polled via downloadJobState()
 * — the POST returns immediately and the download runs detached.
 * Icecast stays a guided external install (official installer) — see the
 * dashboard card copy.
 */
const job = { running: false, bytes: 0, total: 0, error: null, done: false, finishedAt: null };

export function downloadJobState() {
  return { ...job };
}

export async function startBinaryDownload() {
  if (job.running) return job;
  job.running = true;
  job.error = null;
  job.done = false;
  job.bytes = 0;
  job.total = PINNED_FFMPEG.size;
  const root = downloadTargetRoot();
  downloadPinnedFFmpeg(root, (bytes, total) => {
    job.bytes = bytes;
    job.total = total;
  })
    .then(async () => {
      try { await fetchLicenseTexts(root); } catch { /* licenses are best-effort here */ }
      job.done = true;
      job.finishedAt = Date.now();
    })
    .catch(err => {
      job.error = err.message;
      job.finishedAt = Date.now();
    })
    .finally(() => {
      job.running = false;
    });
  return job;
}

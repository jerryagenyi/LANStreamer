#!/usr/bin/env node
/**
 * Populate vendor/ with the binaries the installer bundles (run before
 * electron-builder — npm run electron:build:win does it automatically).
 *
 *   vendor/ffmpeg/ffmpeg.exe   ← official gyan.dev essentials build (download)
 *   vendor/icecast/            ← full Icecast Windows kit (copy from a local
 *                                 install; layout: bin/icecast.exe + dlls,
 *                                 admin/, web/, mime.types, icecast.xml)
 *
 * vendor/ is gitignored — binaries live in builds/releases, not in git.
 * Licenses: FFmpeg (gyan builds) and Icecast are GPL — keep the attribution
 * note in the release notes when shipping.
 *
 * Usage:
 *   node scripts/fetch-vendor-binaries.mjs            # download ffmpeg, copy icecast from Program Files
 *   node scripts/fetch-vendor-binaries.mjs --ffmpeg-from-path   # also copy local ffmpeg instead of downloading
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const root = path.resolve(import.meta.dirname, '..');
const vendor = path.join(root, 'vendor');
const args = new Set(process.argv.slice(2));

/**
 * CLEAN template config — ALWAYS overwrites whatever icecast.xml came with the
 * copied kit: a local install's xml carries real passwords/hostname/mounts
 * that must never ship inside an installer. Stock values only; LANStreamer
 * rewrites <paths> to absolute locations at runtime (vendorPaths.js).
 */
const ICECAST_TEMPLATE = `<icecast>
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
    <bind-address>0.0.0.0</bind-address>
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

const FFMPEG_ZIP_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
const ICECAST_SOURCES = [
  process.env.ICECAST_KIT_DIR,
  'C:\\Program Files (x86)\\Icecast',
  'C:\\Program Files\\Icecast'
].filter(Boolean);

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
const copyDir = (from, to) => fs.cpSync(from, to, { recursive: true });

// ---- FFmpeg ----
async function fetchFfmpeg() {
  const dest = path.join(vendor, 'ffmpeg', 'ffmpeg.exe');
  if (fs.existsSync(dest) && !args.has('--force')) {
    console.log(`[ffmpeg] already vendored (${mb(fs.statSync(dest).size)}) — use --force to refresh`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (args.has('--ffmpeg-from-path')) {
    const where = execSync('where ffmpeg', { encoding: 'utf8' }).trim().split('\n')[0].trim();
    fs.copyFileSync(where, dest);
    console.log(`[ffmpeg] copied from PATH (${where}, ${mb(fs.statSync(dest).size)})`);
    return;
  }

  console.log(`[ffmpeg] downloading ${FFMPEG_ZIP_URL} …`);
  const tmpZip = path.join(os.tmpdir(), `ffmpeg-${Date.now()}.zip`);
  const res = await fetch(FFMPEG_ZIP_URL);
  if (!res.ok) throw new Error(`ffmpeg download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmpZip));
  console.log(`[ffmpeg] downloaded ${mb(fs.statSync(tmpZip).size)} — extracting ffmpeg.exe only`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ffmpeg-'));
  // Expand-Archive, NOT tar: Git-Bash GNU tar treats "C:\..." as a remote host
  // spec and fails; PowerShell extraction is PATH-independent
  execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`, { stdio: 'ignore', timeout: 120000 });
  const found = execSync(`dir /s /b "${tmpDir}\\ffmpeg.exe"`, { encoding: 'utf8' }).trim().split('\n')[0].trim();
  fs.copyFileSync(found, dest);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(tmpZip, { force: true });
  console.log(`[ffmpeg] vendored (${mb(fs.statSync(dest).size)})`);
}

// ---- Icecast ----
function fetchIcecast() {
  const dest = path.join(vendor, 'icecast');
  const marker = path.join(dest, 'bin', 'icecast.exe');
  if (fs.existsSync(marker) && !args.has('--force')) {
    console.log('[icecast] already vendored — use --force to refresh');
    return;
  }
  for (const src of ICECAST_SOURCES) {
    if (fs.existsSync(path.join(src, 'bin', 'icecast.exe'))) {
      copyDir(src, dest);
      // logs/history from the source install are not ours to ship
      for (const junk of ['log', 'logs', 'Uninstall.exe', 'doc']) {
        fs.rmSync(path.join(dest, junk), { recursive: true, force: true });
      }
      console.log(`[icecast] copied kit from ${src} (bin/, admin/, web/, mime.types, icecast.xml template)`);
      return;
    }
  }
  throw new Error('[icecast] no local kit found — install Icecast (icecast.org) or set ICECAST_KIT_DIR, then re-run');
}

fs.mkdirSync(vendor, { recursive: true });
await fetchFfmpeg();
fetchIcecast();
// Always rewrite the template — never trust the source install's xml
fs.writeFileSync(path.join(vendor, 'icecast', 'icecast.xml'), ICECAST_TEMPLATE);
console.log('[icecast] clean stock template written (no local passwords/hostname shipped)');
console.log(`\nvendor/ ready at ${path.relative(root, vendor)} (gitignored — ships via electron-builder extraResources)`);

/**
 * Vendored-binary resolution — the "works on every PC" layer.
 *
 * The installer bundles FFmpeg + the Icecast kit under resources/vendor/ so a
 * fresh machine needs NOTHING installed. Resolution order (first hit wins):
 *
 *   1. LANSTREAMER_VENDOR_DIR env (tests / custom layouts)
 *   2. Electron packaged app: <resourcesPath>/vendor   (extraResources in build)
 *   3. Dev checkout: <repo>/vendor                     (populated by scripts/fetch-vendor-binaries.mjs)
 *   4. null → fall back to system PATH / standard installs (legacy behavior)
 *
 * Layout inside the vendor dir:
 *   vendor/ffmpeg/ffmpeg.exe
 *   vendor/icecast/bin/icecast.exe (+ dlls), admin/, web/, mime.types, icecast.xml (template)
 *
 * The bundled Icecast needs a WRITABLE config + logdir (Program-Files style
 * EPERM problems must not follow us into the bundle), so the vendored icecast
 * config lives in the data dir (LANSTREAMER_DATA_DIR, else <repo>/config):
 *   <dataDir>/icecast/icecast.xml  +  <dataDir>/icecast/log/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function vendorDir() {
  const candidates = [
    process.env.LANSTREAMER_VENDOR_DIR,
    process.resourcesPath ? path.join(process.resourcesPath, 'vendor') : null, // Electron main (packaged)
    path.join(__dirname, '..', '..', 'vendor') // dev checkout
  ];
  for (const dir of candidates) {
    if (dir && fs.existsSync(dir)) return dir;
  }
  return null;
}

export function vendoredFfmpegPath() {
  const dir = vendorDir();
  if (!dir) return null;
  const exe = path.join(dir, 'ffmpeg', 'ffmpeg.exe');
  return fs.existsSync(exe) ? exe : null;
}

export function vendoredIcecastExePath() {
  const dir = vendorDir();
  if (!dir) return null;
  const exe = path.join(dir, 'icecast', 'bin', 'icecast.exe');
  return fs.existsSync(exe) ? exe : null;
}

export function dataDir() {
  // Packaged Electron sets LANSTREAMER_DATA_DIR to userData (writable, per-user);
  // everything else (CLI/dev) uses the repo config/ dir.
  return process.env.LANSTREAMER_DATA_DIR || path.join(__dirname, '..', '..', 'config');
}

/**
 * Base dir for operator uploads (event banners, lobby music). Packaged apps
 * cannot write into public/ (it lives inside the read-only asar), so uploads
 * go to the data dir and are served from there; dev keeps public/uploads so
 * existing URLs and files stay put.
 */
export function uploadsBase() {
  if (process.env.LANSTREAMER_DATA_DIR) return path.join(dataDir(), 'uploads');
  return path.join(__dirname, '..', '..', 'public', 'uploads');
}

/**
 * Create the writable vendored Icecast config if missing: copy the kit's
 * template and rewrite <logdir>/<webroot>/<adminroot> to absolute paths —
 * logdir into the writable data dir, web assets stay on the read-only kit.
 * Returns the config path (existing or freshly written). Idempotent.
 */
export function ensureVendoredIcecastConfig() {
  const dir = vendorDir();
  const exe = vendoredIcecastExePath();
  if (!dir || !exe) return null;

  const kitDir = path.join(dir, 'icecast');
  const template = path.join(kitDir, 'icecast.xml');
  if (!fs.existsSync(template)) return null;

  const icecastDataDir = path.join(dataDir(), 'icecast');
  const logDir = path.join(icecastDataDir, 'log');
  const configPath = path.join(icecastDataDir, 'icecast.xml');

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(logDir, { recursive: true });
    let xml = fs.readFileSync(template, 'utf8');
    // Replace every occurrence (active or commented) — absolute paths kill all
    // cwd dependence and point logs at a writable location.
    xml = xml
      .replace(/<logdir>[\s\S]*?<\/logdir>/g, `<logdir>${logDir}</logdir>`)
      .replace(/<webroot>[\s\S]*?<\/webroot>/g, `<webroot>${path.join(kitDir, 'web')}</webroot>`)
      .replace(/<adminroot>[\s\S]*?<\/adminroot>/g, `<adminroot>${path.join(kitDir, 'admin')}</adminroot>`);
    fs.writeFileSync(configPath, xml);
  }
  return configPath;
}

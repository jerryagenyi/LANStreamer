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
import { execSync } from 'node:child_process';
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
 * Create the writable vendored Icecast config if missing. Path rewrites only
 * (logdir → data dir, web/admin assets stay on the read-only kit) — EVERYTHING
 * ELSE stays exactly as the stock template ships it. Deliberate decision
 * (Jerry, 2026-10-30, recorded in GO-LIVE-CHECKLIST §0.1): the packaged app
 * must behave like a plain Icecast install with no hidden divergence — stock
 * credentials, stock binding, stock port. Security is handled by advice (the
 * dashboard banner calls out stock credentials; README documents changing
 * them), not by silently diverging. Two stock instances on one machine are
 * interchangeable, which also makes multi-install machines just work.
 *
 * Conflict recovery only: if OUR port is later held by an instance that
 * rejects our (stock) credentials, claimVendoredIcecastPort moves our
 * generated file to the next free port — recovery, not divergence.
 * Idempotent: an existing config (incl. operator edits) is never rewritten
 * beyond that port claim.
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
    // cwd dependence and point logs at a writable location. That is the ONLY
    // transformation: passwords/bind/port stay stock (see decision above).
    xml = xml
      .replace(/<logdir>[\s\S]*?<\/logdir>/g, `<logdir>${logDir}</logdir>`)
      .replace(/<webroot>[\s\S]*?<\/webroot>/g, `<webroot>${path.join(kitDir, 'web')}</webroot>`)
      .replace(/<adminroot>[\s\S]*?<\/adminroot>/g, `<adminroot>${path.join(kitDir, 'admin')}</adminroot>`)
      + '\n<!-- lanstreamer-generated: port may be auto-reclaimed on conflict, everything else is yours -->\n';
    fs.writeFileSync(configPath, xml);
    // no logger import here on purpose: config/index.js depends on this module
    console.log('[vendorPaths] generated bundled Icecast config (stock values, writable paths)');
  }
  // NOTE: no port claim here on purpose — detection-time claiming would dodge
  // an operator's STOCK instance, which is interchangeable with ours and
  // therefore fine to use as-is. Claiming happens only in the start path,
  // reached when the credential probe already proved the listener isn't ours.
  return configPath;
}

function isGeneratedByUs(configPath) {
  try {
    return /lanstreamer-generated/.test(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Conflict recovery (runs at detection AND start): if our config's port is
 * held by a listener that is NOT interchangeable with us (different
 * credentials — a stock-vs-stock collision needs nothing, we just use the
 * running instance), move OUR generated file to the next free port. Returns
 * true when the port changed (caller must re-parse port + passwords).
 */
export function claimVendoredIcecastPort(configPath, base = 8200, span = 10) {
  try {
    const xml = fs.readFileSync(configPath, 'utf8');
    const current = Number(xml.match(/<port>(\d+)<\/port>/)?.[1]);
    if (!current) return false;
    if (!isLoopbackOccupiedSync(current)) return false; // free or ours
    const next = findFreeLoopbackPort(Math.max(current + 1, base), span);
    if (next === current) return false;
    fs.writeFileSync(configPath, xml.replace(/<port>\d+<\/port>/, `<port>${next}</port>`));
    console.log(`[vendorPaths] bundled Icecast port ${current} occupied by a non-interchangeable listener — reclaimed ${next}`);
    return true;
  } catch {
    return false;
  }
}

function isLoopbackOccupiedSync(port) {
  return listeningPorts().has(port);
}

/**
 * First port in [start, start+attempts) that nothing is listening on.
 * net.createServer().listen() is ASYNC — an EADDRINUSE lands a tick later, so
 * a "sync" bind probe always reports free. Parse netstat instead: one spawn,
 * deterministic, genuinely synchronous.
 */
export function findFreeLoopbackPort(start, attempts) {
  const taken = listeningPorts();
  for (let port = start; port < start + attempts; port++) {
    if (!taken.has(port)) return port;
  }
  return start; // fall through with the default; bind failures surface in the dashboard
}

/** Set of local TCP ports with a listener (any address — 0.0.0.0 covers loopback). */
function listeningPorts() {
  const ports = new Set();
  try {
    const out = execSync('netstat -an -p tcp', { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    for (const m of out.matchAll(/TCP\s+\S+?:(\d+)\s+\S+\s+LISTENING/gi)) {
      ports.add(Number(m[1]));
    }
  } catch { /* netstat unavailable — treat everything as free */ }
  return ports;
}

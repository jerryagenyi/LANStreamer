/**
 * Functional binary probe — proves FFmpeg (and the Icecast kit) can do THIS
 * APP'S exact job before we rely on them, replacing "check the system specs"
 * (which can't predict compiled-in codecs) with a staged self-test:
 *
 *   A. dshow indev present + audio devices enumerable      (~0.3 s)
 *   B. encoder chain available (libmp3lame / aac / libvorbis) (~0.3 s)
 *   C. end-to-end: 2 s of real dshow audio encoded to MP3 and pushed
 *      through a temporary loopback Icecast                (~3–5 s)
 *
 * Result tiers:
 *  - ok                → pin {path, origin, codec} and use the candidate
 *  - device-issue      → binaries are fine; the machine has a device problem
 *                        (unplugged/misbehaving capture device) — runtime UX
 *  - fail              → every candidate failed A/B, or C failed for
 *                        non-device reasons → surface full-download prompt
 *
 * Scheduling: runs once at first app start (never blocks server start), then
 * only when the pin is invalid (missing file, app version changed, pinned
 * path vanished). Never on every start — device contention + latency.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';
import crypto from 'crypto';
import { execFile, spawn } from 'child_process';
import logger from '../utils/logger.js';
import { dataDir, vendoredFfmpegPath, vendoredIcecastExePath } from '../utils/vendorPaths.js';

const PROBE_SCHEMA = 1;
const PIN_FILE = () => path.join(dataDir(), 'binary-probe.json');
const OVERALL_TIMEOUT_MS = 25_000;

const execFileP = (cmd, args, timeoutMs = 8000) =>
  new Promise((resolve) => {
    try {
      execFile(cmd, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) =>
        resolve({ err, stdout, stderr: String(stderr || '') }));
    } catch (err) {
      resolve({ err, stdout: '', stderr: '' });
    }
  });

function isFreeLoopback(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}

async function freeProbePort() {
  for (let port = 18300; port < 18320; port++) {
    if (await isFreeLoopback(port)) return port;
  }
  return 18300;
}

class BinaryProbeService {
  constructor() {
    this._running = null;
  }

  getPin() {
    try {
      if (!fs.existsSync(PIN_FILE())) return null;
      return JSON.parse(fs.readFileSync(PIN_FILE(), 'utf8'));
    } catch {
      return null;
    }
  }

  _savePin(pin) {
    try {
      fs.mkdirSync(path.dirname(PIN_FILE()), { recursive: true });
      fs.writeFileSync(PIN_FILE(), JSON.stringify(pin, null, 2));
    } catch (error) {
      logger.debug(`Probe pin not saved: ${error.message}`);
    }
  }

  /** Cheap per-start validation: no probe needed unless something changed. */
  needsProbe(appVersion) {
    const pin = this.getPin();
    if (!pin || pin.schemaVersion !== PROBE_SCHEMA) return true;
    if (pin.appVersion !== appVersion) return true;
    if (pin.result === 'ok' && pin.ffmpeg?.path && !fs.existsSync(pin.ffmpeg.path)) return true;
    return false;
  }

  /** Fire-and-forget: never block boot on the probe. */
  ensureProbed(appVersion) {
    if (this.needsProbe(appVersion)) {
      this._running = this._run(appVersion).catch((error) => {
        logger.warn(`Binary probe crashed (ignored): ${error.message}`);
        return null;
      });
    }
    return this._running;
  }

  async _run(appVersion) {
    const started = Date.now();
    const candidates = [];
    const vendored = vendoredFfmpegPath();
    if (vendored) candidates.push({ path: vendored, origin: 'vendored' });
    const sys = await execFileP('ffmpeg', ['-version'], 4000);
    if (!sys.err) candidates.push({ path: 'ffmpeg', origin: 'system' });

    const report = { schemaVersion: PROBE_SCHEMA, appVersion, timestamp: new Date().toISOString(), candidates: [] };

    for (const candidate of candidates) {
      const a = await this.stageA(candidate.path);
      const b = await this.stageB(candidate.path);
      const entry = { ...candidate, dshow: a.dshowOk, audioDevices: a.audioDevices, encoders: b, stage: 'AB' };

      let codec = null;
      for (const preferred of ['libmp3lame', 'aac', 'libvorbis']) {
        if (b[preferred]) { codec = preferred; break; }
      }
      if (!a.dshowOk || !codec) {
        entry.result = 'fail';
        report.candidates.push(entry);
        continue;
      }

      const c = await this.stageC(candidate.path, a.devices, codec);
      entry.stage = 'C';
      entry.endToEnd = c.result;
      entry.result = c.result === 'ok' ? 'ok' : c.result;
      report.candidates.push(entry);
      if (c.result === 'ok') {
        report.result = 'ok';
        report.ffmpeg = { path: candidate.path, origin: candidate.origin, codec };
        break; // first passing candidate wins (vendored is tried first)
      }
      // device-issue means binaries are fine — keep them pinned as usable
      if (c.result === 'device-issue') {
        report.result = 'device-issue';
        report.ffmpeg = { path: candidate.path, origin: candidate.origin, codec };
        break;
      }
    }

    if (!report.result) report.result = 'fail';
    report.durationMs = Date.now() - started;
    logger.info(`Binary probe: ${report.result} (${report.durationMs}ms) — ${JSON.stringify(report.candidates.map(c => ({ origin: c.origin, result: c.result })))}`);
    this._savePin(report);
    return report;
  }

  /** Stage A: dshow indev + device enumeration. Exit code 1 is NORMAL here.
   *  Line-based parse handles both output formats: FFmpeg 8
   *  `[dshow @ ...] "Name" (audio)` and FFmpeg 9 `[in#0 @ ...] "Name" (audio)`
   *  (FFmpeg 9 dropped the "DirectShow audio devices" section header). */
  async stageA(ffmpegPath) {
    const { err, stderr } = await execFileP(ffmpegPath, ['-f', 'dshow', '-list_devices', 'true', '-i', 'dummy'], 8000);
    const devices = [];
    for (const m of stderr.matchAll(/^\[.*?\]\s*"([^"]+)"\s*\(audio\)\s*$/gm)) devices.push(m[1]);
    const dshowOk = devices.length > 0 || /DirectShow (audio|video) devices/i.test(stderr);
    return { dshowOk, audioDevices: devices.length, devices };
  }

  /** Stage B: encoder chain present for our fallback formats. */
  async stageB(ffmpegPath) {
    const { stdout } = await execFileP(ffmpegPath, ['-encoders'], 8000);
    return {
      libmp3lame: /\blibmp3lame\b/.test(stdout),
      aac: /\baac\b/.test(stdout),
      libvorbis: /\blibvorbis\b/.test(stdout)
    };
  }

  /**
   * Stage C: the real job for 2 seconds — dshow → codec → icecast sink against
   * a throwaway loopback Icecast with random credentials. Device-open errors
   * are classified as machine problems, not binary problems.
   */
  async stageC(ffmpegPath, devices, codec) {
    const icecastExe = vendoredIcecastExePath();
    if (!icecastExe || !devices.length) return { result: devices.length ? 'skip' : 'device-issue' };

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-probe-'));
    let icecast = null;
    try {
      const port = await freeProbePort();
      const password = crypto.randomBytes(8).toString('hex');
      const config = path.join(tmp, 'icecast.xml');
      fs.writeFileSync(config,
        `<icecast><limits><clients>2</clients><sources>2</sources></limits>` +
        `<authentication><source-password>${password}</source-password><admin-password>${password}</admin-password></authentication>` +
        `<hostname>localhost</hostname>` +
        `<listen-socket><port>${port}</port><bind-address>127.0.0.1</bind-address></listen-socket>` +
        `<paths><logdir>${tmp.replace(/\\/g, '/')}</logdir></paths>` +
        `<logging><loglevel>4</loglevel></logging></icecast>`);

      icecast = spawn(icecastExe, ['-c', config], { stdio: 'ignore', windowsHide: true });
      // wait for the port to accept connections (max ~4s)
      let up = false;
      for (let i = 0; i < 20 && !up; i++) {
        await new Promise(r => setTimeout(r, 200));
        up = await new Promise((resolve) => {
          const sock = net.connect(port, '127.0.0.1');
          sock.once('connect', () => { sock.destroy(); resolve(true); });
          sock.once('error', () => resolve(false));
        });
      }
      if (!up) return { result: 'fail', reason: 'probe-icecast-not-listening' };

      // Try up to 2 devices: a broken first capture device must not fail the probe
      let lastDeviceError = false;
      for (const device of devices.slice(0, 2)) {
        const sink = `icecast://source:${password}@127.0.0.1:${port}/probe`;
        const { err, stderr } = await execFileP(ffmpegPath, [
          '-f', 'dshow', '-i', `audio=${device}`,
          '-t', '2', '-acodec', codec, '-b:a', '128k', '-ar', '44100', '-ac', '2',
          '-f', codec === 'libmp3lame' ? 'mp3' : (codec === 'aac' ? 'adts' : 'ogg'),
          sink
        ], 15000);
        if (!err) return { result: 'ok', device };
        const deviceError = /could not (find|open|run)|cannot open|error opening|no such (device|audio)/i.test(stderr);
        if (!deviceError) return { result: 'fail', reason: 'end-to-end', stderr: stderr.slice(-300) };
        lastDeviceError = true;
      }
      return lastDeviceError ? { result: 'device-issue' } : { result: 'fail', reason: 'no-device' };
    } finally {
      try { if (icecast?.pid) spawn('taskkill', ['/pid', String(icecast.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch { /* ignore */ }
      setTimeout(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } }, 1000).unref?.();
    }
  }
}

export default new BinaryProbeService();

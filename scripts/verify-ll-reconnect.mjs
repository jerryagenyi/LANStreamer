#!/usr/bin/env node
/**
 * Real-browser harness for the listener player's connection-loss behaviour
 * (public/assets/js/lowlatency.js). Unit tests use fakes; MSE itself can only
 * be proven in a browser.
 *
 *   node scripts/verify-ll-reconnect.mjs [port=3977]
 *   open http://127.0.0.1:3977/ in Chrome/Edge → Play → use the buttons
 *
 * Serves a live MP3 (bundled FFmpeg, 440 Hz tone, real-time) and lets you
 * simulate Wi-Fi trouble:
 *   GET /drop          cut every open stream connection (a blip)
 *   GET /outage?ms=N   cut connections AND refuse new ones for N ms
 * The page shows mode / buffered-ahead / reconnects / fallback live.
 * Pass: after a drop or outage the tone resumes, reconnects goes up, mode
 * stays "mse", fallback stays "no", and ahead settles back under ~1 s.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = parseInt(process.argv[2], 10) || 3977;
const ffmpeg = path.join(root, 'vendor', 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

const live = new Set(); // { res, proc }
let outageUntil = 0;

function cutAll() {
  for (const c of live) {
    try { c.proc.kill(); } catch { /* gone */ }
    try { c.res.socket?.destroy(); } catch { /* gone */ }
  }
  live.clear();
}

const PAGE = `<!doctype html><meta charset="utf-8"><title>LL reconnect harness</title>
<body style="font-family:sans-serif;max-width:560px;margin:2rem auto">
<h3>Low-latency reconnect harness</h3>
<audio id="a"></audio>
<p><button id="play">Play</button> <button id="drop">Drop connection</button> <button id="outage">8 s outage</button></p>
<pre id="out">idle</pre>
<script src="/lowlatency.js"></script>
<script>
  const a = document.getElementById('a');
  window.fellBack = null;
  window.ll = null;
  document.getElementById('play').onclick = () => {
    window.ll = new LSLowLatency(a, { onError: (e) => { window.fellBack = String(e && (e.name || e.message) || e); } });
    window.ll.load('/play');
    a.play();
  };
  document.getElementById('drop').onclick = () => fetch('/drop');
  document.getElementById('outage').onclick = () => fetch('/outage?ms=8000');
  window.snapshot = () => {
    const s = window.ll ? window.ll.stats() : {};
    return { mode: s.mode || 'none', ahead: s.bufferedAhead, reconnects: s.reconnects, underruns: s.underruns,
             snaps: s.snaps, fallback: window.fellBack || 'no', currentTime: +a.currentTime.toFixed(2),
             paused: a.paused, rate: a.playbackRate, readyState: a.readyState };
  };
  setInterval(() => { document.getElementById('out').textContent = JSON.stringify(window.snapshot(), null, 1); }, 500);
</script>`;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(PAGE); }
  if (url.pathname === '/lowlatency.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(path.join(root, 'public', 'assets', 'js', 'lowlatency.js')));
  }
  if (url.pathname === '/drop') { cutAll(); res.writeHead(200); return res.end('dropped'); }
  if (url.pathname === '/outage') {
    outageUntil = Date.now() + (parseInt(url.searchParams.get('ms'), 10) || 8000);
    cutAll(); res.writeHead(200); return res.end('outage');
  }
  if (url.pathname === '/play') {
    if (Date.now() < outageUntil) return req.socket.destroy(); // network is "down"
    const proc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-re', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '96k', '-flush_packets', '1', '-f', 'mp3', '-'], { windowsHide: true });
    const conn = { res, proc };
    live.add(conn);
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
    res.flushHeaders();
    proc.stdout.pipe(res);
    const done = () => { live.delete(conn); try { proc.kill(); } catch { /* gone */ } };
    req.on('close', done);
    proc.on('exit', () => { live.delete(conn); try { res.end(); } catch { /* gone */ } });
    return;
  }
  res.writeHead(404); res.end();
}).listen(port, '127.0.0.1', () => console.log(`harness ready: http://127.0.0.1:${port}/`));

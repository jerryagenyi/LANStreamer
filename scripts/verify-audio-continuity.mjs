/** 30-second audio-continuity evidence: (1) proxy stream chunk-arrival gaps,
 *  (2) in-browser MSE player event log — underruns, snaps, bufferedAhead trace.
 *  Distinguishes upstream stalls (ffmpeg/icecast/proxy) from player-side
 *  snap-to-live skips (each snap = audible skip by design). */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const base = process.env.BASE_URL || 'http://localhost:3001';
const DURATION_MS = 30000;
const out = {};

// --- 1) Upstream: fetch the play proxy for 30s, timestamp every chunk
{
  const status = await (await fetch(base + '/api/streams/status')).json();
  const id = status.streams.find(s => s.status === 'running')?.id;
  if (!id) throw new Error('no running stream');
  const t0 = Date.now();
  const res = await fetch(`${base}/api/streams/play/${encodeURIComponent(id)}`, { cache: 'no-store' });
  const reader = res.body.getReader();
  const arrivals = [];
  let bytes = 0;
  const timer = setTimeout(() => reader.cancel().catch(() => {}), DURATION_MS);
  for (;;) {
    try {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      arrivals.push({ t: Date.now() - t0, b: value.length });
    } catch { break; }
  }
  clearTimeout(timer);
  // gap analysis: any inter-chunk silence > 250ms means the upstream stalled
  const gaps = [];
  for (let i = 1; i < arrivals.length; i++) {
    const gap = arrivals[i].t - arrivals[i - 1].t;
    if (gap > 250) gaps.push({ afterMs: arrivals[i - 1].t, gapMs: gap });
  }
  out.upstream = {
    seconds: +((arrivals.at(-1)?.t || 0) / 1000).toFixed(1),
    chunks: arrivals.length,
    totalKB: +(bytes / 1024).toFixed(0),
    avgKBs: +(bytes / 1024 / ((arrivals.at(-1)?.t || 1) / 1000)).toFixed(1),
    gapsOver250ms: gaps.length,
    worstGapMs: gaps.length ? Math.max(...gaps.map(g => g.gapMs)) : 0,
    gapList: gaps.slice(0, 8)
  };
}

// --- 2) Player: MSE page for 30s, log every waiting/stalled/seeked + ahead trace
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto(base + '/streams', { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('.chrow:not(.off)', { timeout: 20000 });
await sleep(2000);
await page.click('.chrow:not(.off) .chplay');
await sleep(2000);
await page.evaluate(() => {
  window.__evlog = [];
  const sl = streamListener, a = sl.audioPlayer;
  for (const ev of ['waiting', 'stalled', 'seeked', 'error']) a.addEventListener(ev, () => window.__evlog.push({ ev, t: Date.now(), ahead: sl.llPlayer ? sl.llPlayer.stats().bufferedAhead : null }));
  window.__trace = [];
  window.__tr = setInterval(() => {
    if (sl.llPlayer) window.__trace.push(sl.llPlayer.stats().bufferedAhead);
  }, 250);
});
await sleep(DURATION_MS);
out.player = await page.evaluate(() => {
  clearInterval(window.__tr);
  const trace = window.__trace;
  const snaps = window.__evlog.filter(e => e.ev === 'seeked');
  const underruns = window.__evlog.filter(e => e.ev === 'waiting' || e.ev === 'stalled');
  return {
    aheadMin: Math.min(...trace), aheadMax: Math.max(...trace),
    aheadAvg: +(trace.reduce((s, x) => s + x, 0) / trace.length).toFixed(2),
    zeroAheadSamples: trace.filter(x => x === 0 || x === null).length,
    seekedCount: snaps.length, underrunCount: underruns.length,
    events: window.__evlog.slice(0, 15)
  };
});
await browser.close();

console.log(JSON.stringify(out, null, 2));
const upstreamClean = out.upstream.gapsOver250ms === 0;
console.log(upstreamClean
  ? 'UPSTREAM CLEAN (no delivery gaps > 250ms) — breaks are player-side'
  : 'UPSTREAM HAS GAPS — delivery stalls exist');

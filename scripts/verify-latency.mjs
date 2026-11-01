/** Latency verification: MSE player vs plain src — buffered-ahead + time-to-first-audio.
 *  Also sanity-checks the play/pause cycle still works through the MSE path. */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const base = process.env.BASE_URL || 'http://localhost:3001';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 300000, args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const out = {};

const page = await browser.newPage();
await page.goto(base + '/streams', { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('.chrow:not(.off)', { timeout: 20000 });

// --- A) MSE path: click play, measure time-to-first-audio + buffered-ahead over 20s
const t0 = Date.now();
await page.click('.chrow:not(.off) .chplay');
await page.waitForFunction(() => {
  const a = streamListener.audioPlayer;
  return a && !a.paused && a.currentTime > 0;
}, { timeout: 30000 });
out.mseFirstAudioMs = Date.now() - t0;

const samples = [];
for (let i = 0; i < 10; i++) {
  await sleep(2000);
  samples.push(await page.evaluate(() => {
    const sl = streamListener;
    const llp = sl.llPlayer;
    if (llp) return llp.stats();
    const a = sl.audioPlayer;
    const b = a.buffered;
    return { mode: 'plain-src', bufferedAhead: b.length ? +(b.end(b.length - 1) - a.currentTime).toFixed(2) : null };
  }));
}
out.mseSamples = samples;
out.mseMode = samples[0]?.mode;
out.mseMaxAhead = Math.max(...samples.map(s => s.bufferedAhead ?? 0));
out.mseAvgAhead = +(samples.reduce((s, x) => s + (x.bufferedAhead ?? 0), 0) / samples.length).toFixed(2);

// --- B) pause/resume cycle through the MSE path still works (BEFORE the
//        baseline switch below, which intentionally leaves the MSE path)
await page.click('.chrow[aria-current="true"] .chplay'); // pause
await sleep(800);
out.pauseWorks = await page.evaluate(() => streamListener.audioPlayer.paused);
await sleep(3000); // buffer grows while paused; resume must snap back to live
await page.click('.chrow[aria-current="true"] .chplay'); // resume
out.resumeWorks = false;
for (let i = 0; i < 6 && !out.resumeWorks; i++) {
  await sleep(1000);
  out.resumeWorks = await page.evaluate(() => !streamListener.audioPlayer.paused && !!streamListener.llPlayer);
}
out.afterResume = await page.evaluate(() => streamListener.llPlayer?.stats());

// --- C) Same browser, plain-src baseline (what the old build effectively did)
await page.evaluate(() => {
  const sl = streamListener;
  sl.llPlayer && sl.llPlayer.stop();
  sl.llPlayer = null;
  sl.audioPlayer.src = `/api/streams/play/${encodeURIComponent(sl.currentStream)}`;
  sl.audioPlayer.play().catch(() => {});
});
await sleep(12000);
out.plainSrc = await page.evaluate(() => {
  const a = streamListener.audioPlayer;
  const b = a.buffered;
  return b.length ? +(b.end(b.length - 1) - a.currentTime).toFixed(2) : null;
});

await page.screenshot({ path: 'screenshots/latency-mse.png' });
await browser.close();
console.log(JSON.stringify(out, null, 2));
const pass = out.mseMode === 'mse' && out.mseAvgAhead < 1.0 && out.mseMaxAhead < 1.5 && out.pauseWorks && out.resumeWorks;
console.log(pass ? 'PASS (MSE avg ahead < 1s)' : 'FAIL');
process.exit(pass ? 0 : 1);

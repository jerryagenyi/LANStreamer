/** Verify listener-side error capture end-to-end:
 *  browser hook fires on a real playback error → POST /api/telemetry/client-event
 *  → server forwards to PostHog (capture() real, not mocked). Sends 10+ events so
 *  posthog-node's flushAt(10) fires — watch them arrive in PostHog Live. */
import puppeteer from 'puppeteer';
const BASE = process.env.BASE_URL || 'http://localhost:3001';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 120000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();

const responses = [];
page.on('response', async r => {
  if (r.url().includes('/api/telemetry/client-event')) {
    let body = null;
    try { body = await r.json(); } catch { /* ignore */ }
    responses.push({ status: r.status(), body });
  }
});

await page.goto(BASE + '/streams', { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(1500);

// 1) REAL trigger: simulate the audio element failing mid-stream (same handler path)
const triggered = await page.evaluate(() => {
  const sl = streamListener;
  if (!sl) return false;
  sl.currentStream = 'electron_test_1_1793293640919';
  sl.streams = [{ id: 'electron_test_1_1793293640919', name: 'Electron Test 1', label: 'S1', status: 'running' }];
  sl.audioPlayer.dispatchEvent(new Event('error'));
  return true;
});
await sleep(1500);

// 2) Direct method call (grace + giveup path shape) + enough volume to hit flushAt(10)
await page.evaluate(() => {
  const sl = streamListener;
  sl.reportClientEvent('reconnect_grace', { streamId: 'electron_test_1_1793293640919' });
  for (let i = 0; i < 10; i++) {
    sl.reportClientEvent('playback_stalled', { streamId: 'electron_test_1_1793293640919', note: 'flush volume ' + i });
  }
});
await sleep(2000);
await browser.close();

const ok200 = responses.filter(r => r.status === 200);
const captured = ok200.filter(r => r.body?.captured === true);
console.log(JSON.stringify({
  triggered,
  totalResponses: responses.length,
  ok: ok200.length,
  capturedTrue: captured.length,
  sample: responses[0]
}, null, 2));
const pass = triggered && responses.length >= 11 && ok200.length === responses.length && captured.length === ok200.length;
console.log(pass ? 'PASS' : 'FAIL');
console.log('If captured:true, events are queued in posthog-node; 10+ sent → flush fired → check PostHog Live for lanstreamer_client_playback_error / _stalled / _reconnect_grace');
process.exit(pass ? 0 : 1);

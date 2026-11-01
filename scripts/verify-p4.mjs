/**
 * P4 listener verification: start a stream via API, load the page, click play
 * through the GUI, verify player/channels/pill/mini, then stop.
 */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 140)));

// Control-plane calls run from Node (not in-page) so slow routes can't stall evaluate
const api = async (p, method = 'POST', body = null) => {
  const res = await fetch('http://localhost:3001' + p, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return { ok: res.ok, data: await res.json().catch(() => null) };
};

// Start a known-good stream so the listener has something live
await page.goto('http://localhost:3001/streams', { waitUntil: 'domcontentloaded' });
await api('/api/streams/restart', 'POST', { id: 'shot_stream_1' });

// Wait until the poller (5s cycle) sees the live channel
let waitCount = 0;
while (waitCount++ < 8) {
  await sleep(2000);
  const ch = await page.evaluate(() => document.querySelectorAll('#channels-list .chrow:not(.off)').length);
  if (ch > 0) break;
}

const state = await page.evaluate(() => {
  const pill = document.getElementById('onair-pill');
  return {
    onairActive: !pill.classList.contains('inactive'),
    onairText: document.getElementById('onair-text').textContent,
    channels: document.querySelectorAll('#channels-list .chrow').length,
    offChannels: document.querySelectorAll('#channels-list .chrow.off').length,
    playerChannel: document.getElementById('player-channel').textContent,
    bigplayIcon: document.getElementById('bigplay-icon').textContent,
    noStreamsHidden: document.getElementById('no-streams-state').classList.contains('hidden'),
    heroTitle: document.getElementById('event-title').textContent,
  };
});
await page.screenshot({ path: 'gui-test-screenshots/p4-listener-dark.jpg', type: 'jpeg', quality: 85 });

// Click the big play button through the GUI (autoplay may be blocked headless — check state honestly)
await page.click('#bigplay');
await sleep(3000);
const playing = await page.evaluate(() => ({
  currentStream: window.streamListener?.currentStream,
  bodyPlaying: document.body.classList.contains('playing'),
  icon: document.getElementById('bigplay-icon').textContent,
  chipVisible: document.getElementById('player-chip').style.display !== 'none',
  toastCount: document.querySelectorAll('#toast-stack .toast').length,
}));

// Light theme via the real toggle
await page.click('[data-theme-toggle]');
await sleep(700);
await page.screenshot({ path: 'gui-test-screenshots/p4-listener-light.jpg', type: 'jpeg', quality: 85 });

// Mobile viewport: mini-player appears while playing + scrolled
await page.setViewport({ width: 390, height: 844 });
await sleep(600);
await page.evaluate(() => window.scrollTo(0, 500));
await sleep(600);
const mini = await page.evaluate(() => {
  const mp = document.getElementById('mini-player');
  return { visible: getComputedStyle(mp).display !== 'none', name: document.getElementById('mp-name').textContent };
});
await page.screenshot({ path: 'gui-test-screenshots/p4-listener-mobile.jpg', type: 'jpeg', quality: 85 });

// Stop the stream, watch off-air: grace (reconnecting) then No Live Stream
await api('/api/streams/stop', 'POST', { id: 'shot_stream_1' });
await sleep(6500); // > one poll cycle, inside the 15s grace
const grace = await page.evaluate(() => ({
  reconnecting: document.getElementById('player-reconnecting').style.display !== 'none',
  chRowHasReconnecting: !!document.querySelector('#channels-list .chip-warn'),
}));
await sleep(12000); // past grace
const given = await page.evaluate(() => ({
  noStreams: !document.getElementById('no-streams-state').classList.contains('hidden'),
  onairOff: document.getElementById('onair-text').textContent,
}));

console.log(JSON.stringify({ state, playing, mini, grace, given, errors: errors.slice(0, 5) }, null, 1));
await browser.close();

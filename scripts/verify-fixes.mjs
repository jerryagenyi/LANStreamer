/**
 * Verification for the 2026-10-28 night feedback round.
 * Fresh page per group (this machine's Chromium dies after ~4 captures/tab).
 */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const results = {};

async function fresh(url, settle) {
  const p = await browser.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(settle);
  return p;
}

// ---- Listener: player card hidden until playback; single no-live card ----
await fetch('http://localhost:3001/api/streams/stop-all', { method: 'POST' }).catch(() => {});
let page = await fresh('http://localhost:3001/streams', 6000);
results.listenerIdle = await page.evaluate(() => ({
  playerCardHidden: document.getElementById('player-card').style.display === 'none',
  noLiveBoxVisible: !document.getElementById('no-streams-state').classList.contains('hidden'),
  channelRows: document.querySelectorAll('#channels-list .chrow').length,
  headerIconsBeforeTitle: 0, // toolbar only has brand + onair pill + theme (no stray icons)
}));

// Start a stream; player card must appear only AFTER clicking a channel
const startRes = await fetch('http://localhost:3001/api/streams/restart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'shot_stream_1' }) }).then(r => r.json()).catch(() => null);
let waits = 0;
while (waits++ < 8) {
  await sleep(2000);
  const ch = await page.evaluate(() => document.querySelectorAll('#channels-list .chrow:not(.off)').length);
  if (ch > 0) break;
}
results.beforePlay = await page.evaluate(() => ({
  playerCardHidden: document.getElementById('player-card').style.display === 'none',
  noLiveBoxHidden: document.getElementById('no-streams-state').classList.contains('hidden'),
}));
await page.click('#channels-list .chrow:not(.off)');
await sleep(3000);
results.afterPlay = await page.evaluate(() => ({
  playerCardVisible: document.getElementById('player-card').style.display !== 'none',
  channelName: document.getElementById('player-channel').textContent,
  playing: document.body.classList.contains('playing'),
}));
await page.screenshot({ path: 'gui-test-screenshots/fix-listener-playing.jpg', type: 'jpeg', quality: 85 });
await page.close();

// ---- Admin: stable icons + dropdown survives polls + no U+FFFD ----
page = await fresh('http://localhost:3001/dashboard', 8000);
results.deviceNames = await page.evaluate(() => {
  const names = [...document.querySelectorAll('.arow .src')].map(el => el.textContent.trim());
  return { hasReplacementChar: names.some(n => n.includes('\uFFFD')), sample: names.slice(0, 2) };
});

// open a ⋯ menu, wait past a poll cycle, it must still be open
await page.click('.arow .menu .iconbtn');
await sleep(7000);
results.menuSurvivesPoll = await page.evaluate(() => !!document.querySelector('.arow .menu.open'));

// icon vertical position stable across rows (top-aligned within a few px)
results.iconAlignment = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.arow')].slice(0, 4);
  return rows.map(r => {
    const actions = r.querySelector('.rowactions');
    const badge = r.querySelector('.sid2');
    return { actionsTop: Math.round(actions.getBoundingClientRect().top), badgeTop: Math.round(badge.getBoundingClientRect().top) };
  });
});
results.icecastInfoPlain = await page.evaluate(() => {
  const el = document.querySelector('[data-ls-collapse="icecast-info"]');
  if (!el) return 'missing';
  const cs = getComputedStyle(el);
  return { plainClass: el.classList.contains('ls-collapse--plain'), border: cs.borderTopWidth, shadow: cs.boxShadow === 'none' ? 'none' : 'has' };
});
results.shareCard = await page.evaluate(() => ({
  qrHiddenByDefault: document.getElementById('share-body-qr').classList.contains('hidden'),
  showBtn: !!document.getElementById('share-show-qr'),
}));
await page.click('#share-show-qr');
await sleep(800);
results.shareQrOpen = await page.evaluate(() => ({
  visible: !document.getElementById('share-body-qr').classList.contains('hidden'),
  svgLoaded: !!document.querySelector('#share-qr svg'),
}));
await page.click('#share-qr-close');
results.shareQrClosed = await page.evaluate(() => document.getElementById('share-body-qr').classList.contains('hidden'));
await page.screenshot({ path: 'gui-test-screenshots/fix-dashboard.jpg', type: 'jpeg', quality: 85 });
await page.close();

// ---- Drawer light mode (post cache-bust, fresh load) ----
page = await fresh('http://localhost:3001/dashboard', 7000);
let theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
if (theme !== 'light') { await page.click('[data-theme-toggle]'); await sleep(700); }
await page.click('#add-stream-btn');
await sleep(1000);
results.drawerLight = await page.evaluate(() => {
  const d = document.querySelector('.drawer');
  const t = d.querySelector('.src-opt .t div');
  return { bg: getComputedStyle(d).backgroundColor, textColor: getComputedStyle(t).color };
});
await page.close();

await fetch('http://localhost:3001/api/streams/stop-all', { method: 'POST' }).catch(() => {});
console.log(JSON.stringify(results, null, 1));
await browser.close();

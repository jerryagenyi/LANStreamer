/**
 * E2E reproduction of the user's failure scenario (2026-10-28 night, round 3):
 * duplicate-device start error must arrive (not hang) and be closable; editing
 * the holding stream must free the device; no zombie ffmpeg; drawer over
 * header with dropdown sources; QR icon shows a real code.
 */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const results = {};
const api = async (p, method = 'POST', body = null) =>
  fetch('http://localhost:3001' + p, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json().catch(() => null));

// Clean slate
await api('/api/streams/stop-all', 'POST');
await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(8000);

// 1) Start dash_demo (cable-output) — the holder
await api('/api/streams/restart', 'POST', { id: 'dash_demo' });
await sleep(4000);
let waits = 0;
while (waits++ < 6) {
  const running = await page.evaluate(() => (window.ffmpegStreamsManager?.activeStreams || []).some(s => s.status === 'running'));
  if (running) break;
  await sleep(2000);
}

// 2) Click play on shot_stream_1 (same device) via the GUI — error must arrive + be closable
const busyStart = Date.now();
await page.evaluate(() => {
  const btn = document.querySelector('[data-stream-row="shot_stream_1"] .playbtn');
  if (btn) btn.click();
});
await sleep(4000);
results.duplicateStart = await page.evaluate((elapsed) => {
  const modal = [...document.querySelectorAll('.fixed.inset-0')].find(m => m.textContent.includes('already') || m.textContent.includes('busy') || m.textContent.includes('Audio source'));
  const toasts = [...document.querySelectorAll('#toast-stack .toast')].map(t => t.textContent.trim().slice(0, 60));
  const row = document.querySelector('[data-stream-row="shot_stream_1"]');
  const errbox = row?.querySelector('.errbox b')?.textContent;
  return { responseArrivedMs: elapsed, modalPresent: !!modal, toasts, rowError: errbox, menuClickable: !!row?.querySelector('.menu .iconbtn') };
}, Date.now() - busyStart);
await page.screenshot({ path: 'gui-test-screenshots/r3-duplicate-error.jpg', type: 'jpeg', quality: 85 });
// Close any modal via its close/backdrop
await page.evaluate(() => {
  const modal = [...document.querySelectorAll('.fixed.inset-0')].pop();
  if (modal) modal.remove();
});

// 3) Edit the holder to another device via the API-equivalent GUI path (use the
//    edit modal Save which hits /api/streams/update) — then shot_stream_1 must start.
await page.evaluate(() => {
  const btn = document.querySelector('[data-stream-row="dash_demo"] .menu .iconbtn');
  if (btn) btn.click();
});
await sleep(400);
await page.evaluate(() => {
  const item = [...document.querySelectorAll('[data-stream-row="dash_demo"] .menu-pop button')].find(b => b.textContent.trim() === 'Edit');
  if (item) item.click();
});
await sleep(1200);
results.editModal = await page.evaluate(() => ({
  open: !!document.getElementById('editStreamForm'),
  deviceSelect: !!document.getElementById('editStreamDevice'),
}));
// change device to the cable-a source and save through the modal's own submit
await page.evaluate(() => {
  const sel = document.getElementById('editStreamDevice');
  if (!sel) return;
  const opt = [...sel.options].find(o => o.textContent.toLowerCase().includes('cable-a')) || [...sel.options].find(o => o.value && o.value.includes('cable-a'));
  if (opt) sel.value = opt.value;
  const form = document.getElementById('editStreamForm');
  if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
});
await sleep(5000);
results.afterEdit = await page.evaluate(() => ({
  dashDemoDevice: (window.ffmpegStreamsManager?.activeStreams || []).find(s => s.id === 'dash_demo')?.deviceId,
}));

// 4) Now shot_stream_1 (cable-output) must be able to start — device freed, no zombie
await page.evaluate(() => {
  const btn = document.querySelector('[data-stream-row="shot_stream_1"] .playbtn');
  if (btn) btn.click();
});
await sleep(6000);
results.freedStart = await page.evaluate(async () => {
  const res = await fetch('/api/streams/status');
  const j = await res.json();
  const s1 = j.streams.find(x => x.id === 'shot_stream_1');
  const dd = j.streams.find(x => x.id === 'dash_demo');
  return { shotStream1: s1?.status, dashDemo: dd?.status, ddDevice: dd?.deviceId };
});

// 5) Drawer: above header + dropdown sources
await page.click('#add-stream-btn');
await sleep(900);
results.drawer = await page.evaluate(() => {
  const drawer = document.querySelector('.drawer');
  const header = document.querySelector('.header-glass') || document.querySelector('header');
  const dz = drawer ? parseInt(getComputedStyle(drawer).zIndex) : 0;
  const hz = header ? parseInt(getComputedStyle(header).zIndex) : 0;
  const sel = document.getElementById('stream-device');
  return {
    drawerOverHeader: dz > hz,
    z: { drawer: dz, header: hz },
    sourceSelect: !!sel,
    optionCount: sel ? sel.options.length : 0,
    usedByOption: sel ? [...sel.options].some(o => o.textContent.includes('used by')) : false,
    missingOption: sel ? [...sel.options].some(o => o.textContent.includes('MISSING')) : false,
  };
});
await page.keyboard.press('Escape');
await sleep(400);

// 6) QR: inline icon → real sized svg → close
await page.click('#share-show-qr');
await sleep(1500);
results.qr = await page.evaluate(() => {
  const svg = document.querySelector('#share-qr svg');
  return {
    visible: !document.getElementById('share-body-qr').classList.contains('hidden'),
    svgPresent: !!svg,
    svgWidth: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
  };
});
await page.click('#share-qr-close');
results.qrClosed = await page.evaluate(() => document.getElementById('share-body-qr').classList.contains('hidden'));

// cleanup: stop all
await api('/api/streams/stop-all', 'POST');
console.log(JSON.stringify(results, null, 1));
await browser.close();

import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 60000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)); });

await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(8000);
const dash = await page.evaluate(() => ({
  strip: document.querySelectorAll('#status-strip .stat').length,
  stripOnAir: document.querySelector('#status-strip .stat .v')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 30),
  groups: [...document.querySelectorAll('.group-label')].map((g) => g.textContent.trim()),
  rows: document.querySelectorAll('.arow').length,
  menus: document.querySelectorAll('.arow .menu').length,
  shareUrl: document.getElementById('share-url-text')?.textContent,
  qrLoaded: !!document.querySelector('#share-qr svg'),
  inputs: document.querySelectorAll('#audio-devices li').length,
  filterBtns: document.querySelectorAll('#stream-filter button').length,
  newStreamLabel: document.getElementById('add-stream-btn')?.textContent.trim(),
}));
await page.screenshot({ path: 'gui-test-screenshots/p2-dashboard.jpg', type: 'jpeg', quality: 85 });

// Open the drawer via the real button
await page.click('#add-stream-btn');
await sleep(900);
const drawer = await page.evaluate(() => ({
  open: document.body.classList.contains('drawer-open'),
  srcCards: document.querySelectorAll('#stream-drawer-root .src-opt').length,
  inUseChips: [...document.querySelectorAll('#stream-drawer-root .src-opt')].filter((l) => l.textContent.includes('IN USE')).length,
  missing: [...document.querySelectorAll('#stream-drawer-root .src-opt')].filter((l) => l.textContent.includes('Missing')).length,
  qualityCards: document.querySelectorAll('#stream-drawer-root .quality label').length,
  autoStart: !!document.getElementById('drawer-autostart'),
  buttons: ['drawer-cancel', 'drawer-save', 'drawer-golive'].map((id) => !!document.getElementById(id)),
}));
await page.screenshot({ path: 'gui-test-screenshots/p3-drawer.jpg', type: 'jpeg', quality: 85 });

// Save-as-stopped flow: fill name, pick 2nd source, Save
await page.click('#stream-name');
await page.type('#stream-name', 'Save Test');
const srcs = await page.$$('#stream-drawer-root .src-opt input:not([disabled])');
if (srcs.length > 1) await srcs[1].click();
await page.click('#drawer-save');
await sleep(1200);
const saved = await page.evaluate(async () => {
  const res = await fetch('/api/streams/status');
  const j = await res.json();
  const s = j.streams.find((x) => x.name === 'Save Test');
  return { found: !!s, status: s?.status, drawerClosed: !document.body.classList.contains('drawer-open') };
});
// cleanup test stream
await page.evaluate(async () => {
  const res = await fetch('/api/streams/status');
  const j = await res.json();
  const s = j.streams.find((x) => x.name === 'Save Test');
  if (s) await fetch('/api/streams/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) });
});
console.log(JSON.stringify({ dash, drawer, saved, errors: errors.slice(0, 6) }, null, 1));
await browser.close();

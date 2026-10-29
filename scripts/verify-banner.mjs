/** Verify event banner: cover + lightbox on both pages, and the DEFAULT banner
 *  (/assets/default-event.jpg — never the logo) whenever no custom image is set,
 *  including right after the operator removes their own. Full cycle via the real API. */
import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const base = 'http://localhost:3001';
const out = {};

// ---- API helpers (admin) ----
const { token } = await (await fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'lanstreamer123' })
})).json();
const auth = { Authorization: 'Bearer ' + token };
const getConfig = async () => (await (await fetch(base + '/api/contact-details')).json());
const saveConfig = async (cfg) => fetch(base + '/api/contact-details', {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(cfg)
});

const original = await getConfig();
if (original.eventImage) throw new Error('precondition: config.eventImage must be empty for the fallback test (got ' + original.eventImage + ')');

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const readListener = async () => {
  const page = await browser.newPage();
  await page.goto(base + '/streams', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#event-image-container:not(.hidden) img', { timeout: 15000 });
  await sleep(800);
  const state = await page.evaluate(() => {
    const i = document.getElementById('event-image');
    return {
      src: new URL(i.src).pathname,
      loaded: i.naturalWidth > 0,
      fit: getComputedStyle(i).objectFit,
      cursor: getComputedStyle(i).cursor,
      alt: i.alt
    };
  });
  // lightbox opens for whatever banner is showing
  await page.click('#event-image');
  await sleep(700);
  state.lightbox = await page.evaluate(() => {
    const img = document.querySelector('[role=dialog] img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { fits: r.width <= innerWidth && r.height <= innerHeight, contain: getComputedStyle(img).objectFit };
  });
  await page.keyboard.press('Escape');
  await page.close();
  return state;
};

// ---- Phase A: no custom image → DEFAULT banner, never the logo ----
out.fallback = await readListener();
await browser.pages()[0] && null; // no-op keep-alive

// ---- Phase B: custom image uploaded → custom shows; removed → default returns ----
const fd = new FormData();
fd.append('eventImage', new Blob([await readFile('public/assets/default-event.jpg'), { type: 'image/jpeg' }]), 'banner-test.jpg');
const up = await (await fetch(base + '/api/upload-event-image', { method: 'POST', headers: auth, body: fd })).json();
if (!up.imageUrl) throw new Error('upload failed: ' + JSON.stringify(up));
await saveConfig({ ...original, eventImage: up.imageUrl });

out.custom = await readListener();
out.custom.isUpload = out.custom.src === up.imageUrl;

// Admin preview shows the custom image (cover + lightbox)
const ap = await browser.newPage();
await ap.goto(base + '/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (new URL(ap.url()).pathname === '/login') {
  await ap.type('#login-username', 'admin');
  await ap.type('#login-password', 'lanstreamer123');
  await ap.click('#login-submit');
  await ap.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
}
await ap.waitForSelector('#event-manager img[data-lightbox]', { timeout: 20000 });
await sleep(2500); // EventManager data re-render settle
out.adminCustom = await ap.evaluate(() => {
  const i = document.querySelector('#event-manager img[data-lightbox]');
  if (!i) return null;
  return { fit: getComputedStyle(i).objectFit, cursor: getComputedStyle(i).cursor, loaded: i.naturalWidth > 0 };
});
await ap.close();

// Remove: file deleted + config cleared (what the admin card's X does)
await fetch(base + '/api/remove-event-image', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: up.imageUrl }) });
await saveConfig({ ...original, eventImage: '' });
out.afterRemove = await readListener();
await browser.close();

const isDefault = (s) => s.src === '/assets/default-event.jpg' && s.loaded && s.fit === 'cover' && s.cursor === 'zoom-in' && s.lightbox && s.lightbox.fits;
const pass = isDefault(out.fallback)
  && out.custom.isUpload && out.custom.loaded && out.custom.fit === 'cover'
  && out.adminCustom && out.adminCustom.fit === 'cover' && out.adminCustom.cursor === 'zoom-in' && out.adminCustom.loaded
  && isDefault(out.afterRemove);
console.log(JSON.stringify(out, null, 1));
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);

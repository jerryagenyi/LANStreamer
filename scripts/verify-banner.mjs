/** Verify banner cover + lightbox on both pages (listener + admin). */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, args: ['--no-sandbox', '--disable-gpu'] });
const out = {};

// Listener
const lp = await browser.newPage();
await lp.goto('http://localhost:3001/streams', { waitUntil: 'networkidle2', timeout: 30000 });
await lp.waitForSelector('#event-image-container:not(.hidden) img', { timeout: 10000 });
await sleep(800);
out.listenerCard = await lp.evaluate(() => {
  const i = document.getElementById('event-image');
  const r = i.getBoundingClientRect();
  return { fit: getComputedStyle(i).objectFit, cursor: getComputedStyle(i).cursor, ratio: (r.width / r.height).toFixed(2) };
});
await lp.click('#event-image');
await sleep(700);
out.listenerLightbox = await lp.evaluate(() => {
  const img = document.querySelector('[role=dialog] img');
  if (!img) return null;
  const r = img.getBoundingClientRect();
  return { natural: img.naturalWidth + 'x' + img.naturalHeight, shown: Math.round(r.width) + 'x' + Math.round(r.height), fits: r.width <= innerWidth && r.height <= innerHeight, contain: getComputedStyle(img).objectFit };
});
await lp.screenshot({ path: 'screenshots/round9-lightbox-listener.png' });
await lp.keyboard.press('Escape');
await sleep(300);
out.listenerEsc = await lp.evaluate(() => !document.querySelector('[role=dialog]'));
await lp.close();

// Admin
const ap = await browser.newPage();
await ap.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (new URL(ap.url()).pathname === '/login') {
  await ap.type('#login-username', 'admin');
  await ap.type('#login-password', 'lanstreamer123');
  await ap.click('#login-submit');
  await ap.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
}
await ap.waitForSelector('#event-manager img[data-lightbox]', { timeout: 20000 });
await sleep(2500); // let EventManager finish its data re-render
await ap.evaluate(() => document.querySelector('[data-ls-collapse-toggle="event-details"]')?.click());
await sleep(800);
out.adminCard = await ap.evaluate(() => {
  const i = document.querySelector('#event-manager img[data-lightbox]');
  if (!i) return null;
  const r = i.getBoundingClientRect();
  return { fit: getComputedStyle(i).objectFit, cursor: getComputedStyle(i).cursor, ratio: (r.width / r.height).toFixed(2), loaded: i.naturalWidth > 0, visible: !!i.offsetParent };
});
if (out.adminCard && out.adminCard.visible) {
  await ap.evaluate(() => document.querySelector('#event-manager img[data-lightbox]').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await ap.evaluate(() => document.querySelector('#event-manager img[data-lightbox]').click());
  await sleep(700);
  out.adminLightbox = await ap.evaluate(() => {
    const img = document.querySelector('[role=dialog] img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { fits: r.width <= innerWidth && r.height <= innerHeight, contain: getComputedStyle(img).objectFit };
  });
  await ap.screenshot({ path: 'screenshots/round9-admin-lightbox.png' });
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
const pass = out.listenerCard.fit === 'cover' && out.listenerCard.ratio === '1.33' && out.listenerCard.cursor === 'zoom-in'
  && out.listenerLightbox && out.listenerLightbox.fits && out.listenerLightbox.contain === 'contain' && out.listenerLightbox.natural === '2400x800'
  && out.listenerEsc
  && out.adminCard && out.adminCard.fit === 'cover' && out.adminCard.ratio === '1.78' && out.adminCard.visible && out.adminCard.cursor === 'zoom-in'
  && out.adminLightbox && out.adminLightbox.fits && out.adminLightbox.contain === 'contain';
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);

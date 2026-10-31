/** Verify: sticky header hides nothing — toasts above it, menus above it, opaque bg. */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (new URL(page.url()).pathname === '/login') {
  await page.type('#login-username', 'admin');
  await page.type('#login-password', 'lanstreamer123');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
}
await page.waitForSelector('.arow', { timeout: 30000 });
await sleep(2500);
const out = {};

// 1) Header opaque + sticky
out.header = await page.evaluate(() => {
  const h = document.querySelector('.header-glass');
  const cs = getComputedStyle(h);
  return {
    sticky: cs.position === 'sticky',
    bg: cs.backgroundColor,
    opaque: (() => { const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(','); return m.length < 4 || parseFloat(m[3]) === 1; })(),
    backdropFilter: cs.backdropFilter
  };
});

// 2) Toast renders ABOVE the header (elementFromPoint hits the toast, not the header)
await page.evaluate(() => window.LSToasts.show('Verification toast', 'success', { duration: 8000 }));
await sleep(700);
out.toast = await page.evaluate(() => {
  const t = document.querySelector('.toast-stack .toast');
  if (!t) return { fail: 'no toast' };
  const r = t.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 10);
  return { toastRect: Math.round(r.top) + '..' + Math.round(r.bottom), covered: !!hit.closest('.header-glass'), onTop: !!hit.closest('.toast') };
});

// 3) ⋯ menu on the FIRST row (right below the header) renders above the header
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(300);
await page.click('.arow .menu .iconbtn');
await sleep(600);
out.menu = await page.evaluate(() => {
  const pop = document.querySelector('.menu-pop');
  const menu = pop && pop.parentElement;
  if (!pop || !getComputedStyle(pop).display || getComputedStyle(pop).display === 'none') return { fail: 'menu not open' };
  const r = pop.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + 10, Math.max(r.top + 5, 0));
  return { menuTop: Math.round(r.top), covered: !!hit?.closest?.('.header-glass'), onTop: !!hit?.closest?.('.menu') };
});
await page.screenshot({ path: 'screenshots/round11-header.png' });

// 4) Scroll mid-page: header stays, content passes under an opaque bar
await page.evaluate(() => window.scrollTo(0, 600));
await sleep(400);
out.scrolledHeaderVisible = await page.evaluate(() => {
  const h = document.querySelector('.header-glass');
  return h.getBoundingClientRect().top === 0;
});
await page.screenshot({ path: 'screenshots/round11-header-scrolled.png' });

await browser.close();
console.log(JSON.stringify(out, null, 1));
const pass = out.header.sticky && out.header.opaque
  && out.toast && out.toast.onTop && !out.toast.covered
  && out.menu && out.menu.onTop && !out.menu.covered
  && out.scrolledHeaderVisible;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);

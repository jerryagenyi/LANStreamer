/** Verify sticky headers BEHAVIORALLY: scroll the page, the header must stay at top==0.
 *  (computed position==='sticky' passes even when an overflow ancestor disables it —
 *   that is exactly how the dashboard bug slipped through.) */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const out = {};

async function check(pathname, key) {
  await page.goto('http://localhost:3001' + pathname, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  if (new URL(page.url()).pathname === '/login') {
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'lanstreamer123');
    await page.click('#login-submit');
    await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 20000 });
  }
  await sleep(2000); // let EventManager re-render settle (stale-node trap)
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(200);
  out[key] = await page.evaluate(async () => {
    const h = document.querySelector('.header-glass');
    if (!h) return { fail: 'no .header-glass found' };
    const doc = document.documentElement;
    const before = h.getBoundingClientRect().top;
    window.scrollTo(0, 700);
    await new Promise(r => setTimeout(r, 400));
    const after = h.getBoundingClientRect().top;
    return {
      scrolledTo: window.scrollY,
      headerTopBeforeScroll: Math.round(before),
      headerTopAtScroll700: Math.round(after),
      STICKS: Math.abs(after) <= 1,           // glued to viewport top
      horizOverflow: doc.scrollWidth - doc.clientWidth // must stay 0 after overflow-x-hidden removal
    };
  });
  await page.screenshot({ path: `screenshots/sticky-${key}-scrolled.png` });
}

await check('/dashboard', 'admin');
await check('/streams', 'listener');
await browser.close();
console.log(JSON.stringify(out, null, 2));
const ok = out.admin?.STICKS && out.listener?.STICKS && !out.admin?.horizOverflow && !out.listener?.horizOverflow;
process.exit(ok ? 0 : 1);

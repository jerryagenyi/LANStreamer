/**
 * Verify stream-row action icons are pinned RIGHT and never move:
 * - .rowactions right edge identical across all rows (different text lengths)
 * - right edge unchanged when a row's status flips live -> stopped (chip + meta change)
 * - actions sit at the row's right end (right edge ≈ row right edge − padding)
 * - ⋯ popup opens LEFTWARD from the ⋯ button, fully inside the card
 */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();

await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (new URL(page.url()).pathname === '/login') {
  await page.waitForSelector('#login-form', { timeout: 10000 });
  await page.type('#login-username', 'admin');
  await page.type('#login-password', 'lanstreamer123');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
}
await page.waitForSelector('.arow', { timeout: 30000 });
await sleep(2500);

const edges = await page.evaluate(() =>
  [...document.querySelectorAll('.arow')].map(r => {
    const a = r.querySelector('.rowactions');
    const rr = r.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    return { right: Math.round(ar.right), rowRight: Math.round(rr.right), gap: Math.round(rr.right - ar.right) };
  })
);
const allSame = edges.length > 0 && edges.every(e => e.right === edges[0].right);
const atRightEnd = edges.length > 0 && edges.every(e => e.gap >= 0 && e.gap <= 24); // row padding 18px + rounding
console.log('rowactions right-edge per row:', edges.map(e => e.right).join(', '), allSame ? '(all identical)' : '(DIFFER — jitter!)');
console.log('actions at row right end:', atRightEnd, `(gap row→actions: ${edges[0]?.gap}px, expect ~18)`);

// Live row -> stop -> same right edge?
const liveRow = await page.$('.arow.is-live');
let stopTest = 'no live row';
if (liveRow) {
  const before = Math.round((await (await page.$('.arow.is-live .rowactions')).boundingBox()).x
    + (await (await page.$('.arow.is-live .rowactions')).boundingBox()).width);
  await page.click('.arow.is-live .playbtn.stop');
  await sleep(4000);
  const box = await (await page.$('.arow .rowactions')).boundingBox();
  const after = Math.round(box.x + box.width);
  stopTest = before === after ? `right edge stable across live->stopped (${before}px)` : `MOVED: ${before} -> ${after}`;
}
console.log('status flip:', stopTest);

// Menu popup opens LEFTWARD from ⋯ and stays inside the card
await page.click('.arow .menu .iconbtn');
await sleep(600);
const pop = await page.evaluate(() => {
  const p = document.querySelector('.menu-pop');
  const menuBtn = document.querySelector('.arow .menu .iconbtn');
  const card = document.querySelector('.arow')?.closest('.glass-card, .streams-card, section') || null;
  if (!p) return null;
  const r = p.getBoundingClientRect();
  const b = menuBtn.getBoundingClientRect();
  const c = card ? card.getBoundingClientRect() : { left: 0, right: window.innerWidth };
  return {
    popRight: Math.round(r.right), btnRight: Math.round(b.right),
    anchoredToButton: Math.abs(r.right - b.right) <= 1,
    inside: r.left >= c.left - 1 && r.right <= c.right + 1,
    visible: r.width > 0
  };
});
console.log('menu popup:', JSON.stringify(pop));
await page.screenshot({ path: 'screenshots/round22-right-actions.png' });

const pass = allSame && atRightEnd && !stopTest.includes('MOVED') && pop && pop.anchoredToButton && pop.inside && pop.visible;
console.log(pass ? 'PASS' : 'FAIL');
await browser.close();
process.exit(pass ? 0 : 1);

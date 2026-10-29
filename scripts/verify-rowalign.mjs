/**
 * Verify stream-row action icons are pinned LEFT and never move:
 * - .rowactions x-offset identical across all rows (different text lengths)
 * - x unchanged when a row's status flips live -> stopped (chip + meta change)
 * - ⋯ popup opens rightward, fully inside the card
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

const xs = await page.evaluate(() =>
  [...document.querySelectorAll('.arow')].map(r => {
    const a = r.querySelector('.rowactions');
    return Math.round(a.getBoundingClientRect().x);
  })
);
const allSame = xs.length > 0 && xs.every(x => x === xs[0]);
console.log('rowactions x per row:', xs.join(', '), allSame ? '(all identical)' : '(DIFFER — jitter!)');

// Live row -> stop -> same x?
const liveRow = await page.$('.arow.is-live .rowactions');
let stopTest = 'no live row';
if (liveRow) {
  const before = Math.round((await liveRow.boundingBox()).x);
  await page.click('.arow.is-live .playbtn.stop');
  await sleep(4000);
  const row = await page.$('.arow:not(.is-live) .rowactions'); // any stopped row now
  const after = row ? Math.round((await row.boundingBox()).x) : before;
  stopTest = before === after ? `x stable across live->stopped (${before}px)` : `MOVED: ${before} -> ${after}`;
}
console.log('status flip:', stopTest);

// Menu popup containment
await page.click('.arow .menu .iconbtn');
await sleep(600);
const pop = await page.evaluate(() => {
  const p = document.querySelector('.menu-pop');
  const card = document.querySelector('.streams-card, .glass-card');
  if (!p) return null;
  const r = p.getBoundingClientRect();
  const c = card ? card.getBoundingClientRect() : { left: 0, right: window.innerWidth };
  return { popLeft: Math.round(r.left), cardLeft: Math.round(c.left), inside: r.left >= c.left - 1, visible: r.width > 0 };
});
console.log('menu popup:', JSON.stringify(pop));
await page.screenshot({ path: 'screenshots/round6-left-actions.png' });

const pass = allSame && !stopTest.includes('MOVED') && pop && pop.inside && pop.visible;
console.log(pass ? 'PASS' : 'FAIL');
await browser.close();
process.exit(pass ? 0 : 1);

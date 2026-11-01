/**
 * Light-mode audio-source dropdown check:
 * - edit modal select: computed bg vs color must contrast (was #1a1a1a + dark text)
 * - color-scheme flips with theme (native popups follow theme)
 * - option rows painted from tokens
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

// Switch to light mode
await page.evaluate(() => { localStorage.setItem('theme', 'light'); document.documentElement.setAttribute('data-theme', 'light'); });
await sleep(800);

// Open the edit modal (⋯ menu -> Edit) on the first row
await page.click('.arow .menu .iconbtn');
await sleep(500);
await page.click('.menu.open .menu-pop button:nth-of-type(2)'); // Edit
await sleep(1000);

const check = await page.evaluate(() => {
  const sel = document.getElementById('editStreamDevice');
  if (!sel) return { fail: 'edit select not found' };
  const cs = getComputedStyle(sel);
  const opt = sel.options[1] || sel.options[0];
  const optCs = getComputedStyle(opt);
  const lum = (c) => {
    const m = c.match(/\d+/g).map(Number);
    return m.length >= 3 ? (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 : null;
  };
  const bgL = lum(cs.backgroundColor), fgL = lum(cs.color);
  return {
    bg: cs.backgroundColor,
    color: cs.color,
    optionBg: optCs.backgroundColor,
    optionColor: optCs.color,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    contrast: bgL !== null && fgL !== null ? Math.abs(bgL - fgL) : null,
    readable: bgL !== null && fgL !== null ? Math.abs(bgL - fgL) > 0.35 : false
  };
});
console.log(JSON.stringify(check, null, 2));
await page.screenshot({ path: 'screenshots/round7-light-edit-select.png' });

// Also the new-stream drawer select
await page.keyboard.press('Escape');
await sleep(400);
const drawerCheck = await page.evaluate(async () => {
  const btn = document.getElementById('add-stream-btn');
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 700));
  const sel = document.getElementById('stream-device');
  if (!sel) return { fail: 'drawer select not found' };
  const cs = getComputedStyle(sel);
  return { bg: cs.backgroundColor, color: cs.color };
});
console.log('drawer select:', JSON.stringify(drawerCheck));
await page.screenshot({ path: 'screenshots/round7-light-drawer.png' });

const pass = check.readable && check.colorScheme === 'light' && !drawerCheck.fail;
console.log(pass ? 'PASS' : 'FAIL');
await browser.close();
process.exit(pass ? 0 : 1);

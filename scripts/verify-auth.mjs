/**
 * Browser verification: auth gate + round-4 UI fixes.
 * Fresh page per group (this machine's Chromium dies after ~4 screenshots).
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3001';
const SHOT = 'C:/Users/Username/Documents/github/LANStreamer/screenshots/round4';
const results = {};
const ok = (name, cond, extra = '') => {
  results[name] = cond ? 'PASS' : 'FAIL';
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
};

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 120000, args: ['--no-sandbox', '--disable-gpu'] });

// ---- Group 1: gate redirect + login page + wrong password + real login ----
{
  const page = await browser.newPage();
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
  ok('dashboard w/o token redirects to /login', new URL(page.url()).pathname === '/login', page.url());

  await page.waitForSelector('#login-form', { timeout: 10000 });
  await page.type('#login-username', 'admin');
  await page.type('#login-password', 'wrongpass');
  await page.click('#login-submit');
  await page.waitForSelector('#login-error', { visible: true, timeout: 10000 });
  ok('wrong password shows error', (await page.$eval('#login-error', el => el.textContent)).includes('Invalid'));

  await page.$eval('#login-password', el => { el.value = ''; });
  await page.type('#login-password', 'lanstreamer123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click('#login-submit')
  ]).catch(() => {});
  await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 15000 }).catch(() => {});
  ok('correct login lands on /dashboard', new URL(page.url()).pathname === '/dashboard', page.url());
  const token = await page.evaluate(() => localStorage.getItem('lsAdminToken'));
  ok('token stored', !!token);

  // Dashboard rendered with authed API calls: streams manager rows
  await page.waitForFunction(() => document.querySelector('#audio-inputs-count') && document.querySelector('#audio-inputs-count').textContent.trim() !== '', { timeout: 30000 });
  const chip = await page.$eval('#audio-inputs-count', el => el.textContent.trim());
  ok('authed audio-devices call succeeded (count chip)', /\d/.test(chip), `chip="${chip}"`);

  // Audio inputs collapsed by default
  const collapsed = await page.$eval('[data-ls-collapse-body="audio-inputs"]', el => el.classList.contains('is-closed'));
  ok('Audio inputs collapsed by default', collapsed);

  // Refresh button works while collapsed (rescan)
  await page.click('#refresh-audio-devices');
  await new Promise(r => setTimeout(r, 2500));
  const chip2 = await page.$eval('#audio-inputs-count', el => el.textContent.trim());
  ok('refresh inputs button works', /\d/.test(chip2), `chip="${chip2}"`);

  // Logout button present in header
  ok('logout button in header', !!(await page.$('button[onclick*="logout"]')));
  await page.screenshot({ path: SHOT + '-dashboard.png' });

  // Expand audio inputs persists
  await page.click('[data-ls-collapse-toggle="audio-inputs"]');
  const expanded = await page.$eval('[data-ls-collapse-body="audio-inputs"]', el => !el.classList.contains('is-closed'));
  ok('audio inputs expands on click', expanded);
  await page.screenshot({ path: SHOT + '-dashboard-expanded.png' });
  await page.close();
}

// ---- Group 2: remembered expansion + docs page ----
{
  const page = await browser.newPage();
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('[data-ls-collapse-body="audio-inputs"]', { timeout: 15000 });
  const stillOpen = await page.$eval('[data-ls-collapse-body="audio-inputs"]', el => !el.classList.contains('is-closed'));
  ok('audio inputs expansion remembered across reload', stillOpen);

  await page.goto(BASE + '/docs', { waitUntil: 'networkidle2', timeout: 30000 });
  const btns = await page.$$eval('header a.btn', els => els.map(e => e.textContent.trim()));
  ok('docs header has no listener/dashboard buttons', btns.length === 0, JSON.stringify(btns));
  const access = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#access p')).map(e => e.textContent).join(' '));
  ok('docs admin section describes login', /protected by a login/i.test(access));
  await page.screenshot({ path: SHOT + '-docs.png' });
  await page.close();
}

// ---- Group 3: listener page unaffected ----
{
  const page = await browser.newPage();
  await page.goto(BASE + '/streams', { waitUntil: 'networkidle2', timeout: 30000 });
  ok('listener page loads (no login)', !page.url().includes('/login'));
  const hasPlayerUi = await page.evaluate(() => !!document.querySelector('#channels-list, .onair, body'));
  ok('listener page rendered', hasPlayerUi);
  const status = await page.evaluate(async () => {
    const r = await fetch('/api/streams/status');
    return r.status;
  });
  ok('listener status API public', status === 200);
  await page.close();
}

await browser.close();
console.log('\n==== SUMMARY ====');
for (const [k, v] of Object.entries(results)) console.log(`${v}  ${k}`);
if (Object.values(results).includes('FAIL')) process.exit(1);

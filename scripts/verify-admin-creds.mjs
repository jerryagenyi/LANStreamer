/** Verify the in-app admin settings path end-to-end on a scratch port + scratch store:
 *  card renders with defaults chip + banner → wrong current pw rejected inline →
 *  change succeeds (toast, banner retires, chip flips, page stays logged in — no
 *  bounce to /login despite the JWT rotation) → reload stays logged in → old
 *  default login no longer works on the login page. */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = process.env.BASE_URL || 'http://localhost:3010';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const out = {};

await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (new URL(page.url()).pathname === '/login') {
  await page.type('#login-username', 'admin');
  await page.type('#login-password', 'lanstreamer123');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
}
await sleep(2500);

// 1) Card + banner render with defaults
out.card = await page.evaluate(() => ({
  chip: document.getElementById('admin-account-chip')?.textContent,
  chipWarn: document.getElementById('admin-account-chip')?.className.includes('chip-warn'),
  bannerShown: !!document.querySelector('#admin-creds-banner .banner')
}));

console.log("phase1", JSON.stringify(out.card));
// 2) Open the card, try a WRONG current password
await page.click('[data-ls-collapse-toggle="admin-account"]');
await sleep(400);
await page.type('#admin-cur-pw', 'wrong-current');
await page.type('#admin-new-user', 'op');
await page.type('#admin-new-pw', 'new-secret-9');
await page.type('#admin-new-pw2', 'new-secret-9');
await page.click('#admin-save');
await sleep(1200);
out.wrongCurrent = await page.evaluate(() => ({
  error: document.getElementById('admin-account-error')?.textContent,
  stillOnDashboard: window.location.pathname === '/dashboard'
}));

console.log("phase2-wrongpw", JSON.stringify(out.wrongCurrent));
// 3) Correct change
await page.evaluate(() => { document.getElementById('admin-cur-pw').value = ''; });
await page.type('#admin-cur-pw', 'lanstreamer123');
await page.click('#admin-save');
await sleep(2000);
out.changed = await page.evaluate(() => ({
  toast: !!document.querySelector('.toast-stack .toast'),
  bannerGone: !document.querySelector('#admin-creds-banner .banner'),
  chip: document.getElementById('admin-account-chip')?.textContent,
  chipOff: document.getElementById('admin-account-chip')?.className.includes('chip-off'),
  stillOnDashboard: window.location.pathname === '/dashboard', // race fix: no /login bounce
  storedTokenIsNew: (localStorage.getItem('lsAdminToken') || '').length > 20
}));
await page.screenshot({ path: 'screenshots/admin-account-card.png' });

console.log("phase3-changed", JSON.stringify(out.changed));
// 4) Reload: session survives with the rotated token
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2500);
out.afterReload = await page.evaluate(() => ({
  stayedLoggedIn: window.location.pathname === '/dashboard',
  chip: document.getElementById('admin-account-chip')?.textContent
}));

console.log("phase4-reload", JSON.stringify(out.afterReload));
// 5) Old default login is dead (isolated context — the main profile still
//    holds the new token and /login would auto-forward)
const ctx2 = await browser.createBrowserContext();
const page2 = await ctx2.newPage();
await page2.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
await sleep(600);
await page2.type('#login-username', 'admin');
await page2.type('#login-password', 'lanstreamer123');
await page2.click('#login-submit');
await sleep(1500);
out.oldLoginRejected = await page2.evaluate(() => window.location.pathname !== '/dashboard');
await ctx2.close();

await browser.close();
console.log(JSON.stringify(out, null, 2));
const pass = out.card.chip === 'admin' && out.card.chipWarn && out.card.bannerShown
  && /incorrect/i.test(out.wrongCurrent.error || '') && out.wrongCurrent.stillOnDashboard
  && out.changed.bannerGone && out.changed.chip === 'op' && out.changed.chipOff
  && out.changed.stillOnDashboard && out.changed.storedTokenIsNew
  && out.afterReload.stayedLoggedIn && out.afterReload.chip === 'op'
  && out.oldLoginRejected;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);

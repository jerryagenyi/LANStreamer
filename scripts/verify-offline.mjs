/**
 * Offline capability check: render dashboard + listener with EVERY non-localhost
 * request aborted. Fonts must load from the vendored files, icons must render as
 * real glyphs (24px), and the app itself must issue zero external requests.
 * (Antivirus script injections, e.g. Kaspersky's gc.kis.v2.scr.kaspersky-labs.com,
 * are not app requests — filter them from the failure condition.)
 */
import puppeteer from 'puppeteer';

const AV_NOISE = /kaspersky|symante|mcAfee|avast|avg/i;
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const results = {};

for (const [name, path, needsLogin] of [['dashboard', '/dashboard', true], ['listener', '/streams', false]]) {
  const page = await browser.newPage();
  const external = [];
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('http://localhost:3001')) return req.continue();
    if (!AV_NOISE.test(u)) external.push(u.slice(0, 80));
    req.abort();
  });
  await page.goto('http://localhost:3001' + path, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => { });
  if (needsLogin && new URL(page.url()).pathname === '/login') {
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'lanstreamer123');
    await page.click('#login-submit');
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 }).catch(() => { });
  }
  await new Promise(r => setTimeout(r, 2500));
  results[name] = await page.evaluate(async () => {
    await document.fonts.ready;
    const icon = document.querySelector('.material-symbols-rounded');
    let iconWidth = null;
    if (icon) {
      const t = icon.textContent;
      icon.textContent = 'play_arrow';
      iconWidth = Math.round(icon.getBoundingClientRect().width);
      icon.textContent = t;
    }
    return {
      materialFont: document.fonts.check('24px "Material Symbols Rounded"'),
      spaceGrotesk: document.fonts.check('16px "Space Grotesk"'),
      iconWidth,
      bodyRendered: document.body.innerText.length > 100
    };
  });
  results[name + '_externalRequests'] = external;
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
const pass = results.dashboard.materialFont && results.listener.materialFont
  && results.dashboard.iconWidth === 24 && results.listener.iconWidth === 24
  && results.dashboard.bodyRendered && results.listener.bodyRendered
  && results.dashboard_externalRequests.length === 0
  && results.listener_externalRequests.length === 0;
console.log(pass ? 'PASS — fully offline' : 'FAIL');
process.exit(pass ? 0 : 1);

/**
 * GUI-test visual evidence (web-gui-tester pass, 2026-10-28).
 * Real GUI clicks only — theme changes use the page's own toggle button.
 *
 * NOTE: this machine's Chromium renderer stops serving Page.captureScreenshot
 * after ~4 captures per tab (then "Internal error" forever), so each test
 * group runs on a fresh page. DOM verdicts are collected alongside shots.
 */
import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(process.cwd(), 'gui-test-screenshots');

const browser = await puppeteer.launch({
  headless: 'new',
  defaultViewport: { width: 1200, height: 900 },
  protocolTimeout: 60000,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
});

async function freshPage(url, settle = 1500) {
  page?.close().catch(() => {});
  page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(settle);
  return page;
}
let page;
const shot = async (n, tries = 3) => {
  for (let a = 1; a <= tries; a++) {
    try {
      await page.screenshot({ path: path.join(OUT, n), type: 'jpeg', quality: 88 });
      return;
    } catch (e) {
      console.log(`retry ${a} ${n}: ${e.message.slice(0, 50)}`);
      await sleep(1200);
    }
  }
  throw new Error(`shot failed: ${n}`);
};
const byText = (t) => page.evaluateHandle((txt) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(txt)), t);
const results = {};

// ---- T2: showcase in light (toggle clicked for real) ----
await freshPage('http://localhost:3001/showcase.html');
await page.click('[data-theme-toggle]');
await sleep(800);
results.t2 = await page.evaluate(() => ({
  theme: document.documentElement.getAttribute('data-theme'),
  logo: document.querySelector('img[data-theme-logo]')?.getAttribute('src'),
  firstSwatch: document.querySelector('.sc-swatch > div:last-child')?.textContent.replace(/\s+/g, ' ').trim()
}));
await shot('t2-showcase-light.jpg');

// ---- T3: toast stacking ----
await freshPage('http://localhost:3001/showcase.html');
await shot('t3-before.jpg');
await (await byText('Burst ×3')).asElement().click();
await sleep(700);
await shot('t3-after-burst.jpg');
results.t3 = await page.evaluate(() => [...document.querySelectorAll('#toast-stack .toast')].map((t) => ({
  text: t.textContent.trim().slice(0, 24),
  top: Math.round(t.getBoundingClientRect().top)
})));

// ---- T4: tagged replacement ----
await freshPage('http://localhost:3001/showcase.html');
await (await byText('Tagged replace demo')).asElement().click();
await sleep(500);
await shot('t4-connecting.jpg');
await sleep(1700);
await shot('t4-replaced.jpg');
results.t4 = await page.evaluate(() => [...document.querySelectorAll('#toast-stack .toast')].map((t) => t.textContent.trim().slice(0, 40)));

// ---- T5: bell badge + panel ----
await freshPage('http://localhost:3001/showcase.html');
await (await byText('Push error notification')).asElement().click();
await sleep(400);
results.badgeBefore = await page.evaluate(() => ({
  badge: !!document.getElementById('header-bell-badge'),
  lit: document.getElementById('header-bell-btn').classList.contains('has-notifications')
}));
await page.click('#header-bell-btn');
await sleep(400);
results.t5 = await page.evaluate(() => ({
  panelVisible: !document.getElementById('lsn-panel').classList.contains('is-hidden'),
  items: [...document.querySelectorAll('.lsn-item-title')].map((t) => t.textContent)
}));
await shot('t5-bell-panel.jpg');
results.badgeAfter = await page.evaluate(() => !!document.getElementById('header-bell-badge'));

// ---- T6: migrated add modal, dark + light ----
await freshPage('http://localhost:3001/dashboard', 7000);
await page.click('#add-stream-btn');
await sleep(1500);
results.t6dark = await page.evaluate(() => {
  const m = document.querySelector('.fixed.inset-0 .glass-card');
  return m ? {
    labelColor: getComputedStyle(m.querySelector('label')).color,
    goLiveClass: m.querySelector('button[type=submit]').className,
    infoBoxBg: getComputedStyle(m.querySelector('.mb-4.p-3')).backgroundColor
  } : 'modal missing';
});
await shot('t6-modal-dark.jpg');
await page.click('[data-theme-toggle]');
await sleep(800);
results.t6light = await page.evaluate(() => {
  const m = document.querySelector('.fixed.inset-0 .glass-card');
  const input = m?.querySelector('input#stream-name');
  return m ? {
    labelColor: getComputedStyle(m.querySelector('label')).color,
    inputBg: getComputedStyle(input).backgroundColor,
    inputColor: getComputedStyle(input).color
  } : 'modal missing';
});
await shot('t6-modal-light.jpg');

console.log(JSON.stringify(results, null, 1));
await browser.close();

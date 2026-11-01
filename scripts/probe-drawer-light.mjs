import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 120000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(7000);
// force light theme via the toggle if needed
let theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
if (theme !== 'light') { await page.click('[data-theme-toggle]'); await sleep(700); }
await page.click('#add-stream-btn');
await sleep(1000);
const probe = await page.evaluate(() => {
  const cs = (el) => el ? { bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color } : null;
  return {
    theme: document.documentElement.getAttribute('data-theme'),
    drawer: cs(document.querySelector('.drawer')),
    srcOpt: cs(document.querySelector('.src-opt')),
    srcOptTitle: cs(document.querySelector('.src-opt .t div')),
    srcOptSub: cs(document.querySelector('.src-opt .t .mono, .src-opt .t div:last-child')),
    nameInput: cs(document.getElementById('stream-name')),
    qualityLabel: cs(document.querySelector('.quality label')),
    autoStartRow: cs(document.querySelector('#drawer-form > label')),
    footerBtns: [...document.querySelectorAll('.drawer-f .btn')].map(b => cs(b)),
  };
});
await page.screenshot({ path: 'gui-test-screenshots/probe-drawer-light.jpg', type: 'jpeg', quality: 88 });
console.log(JSON.stringify(probe, null, 1));
await browser.close();

/** Diagnose the listener page: console errors, failed requests, boot overlay state. */
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 120000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();

const consoleMsgs = [];
page.on('console', m => consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
page.on('pageerror', e => consoleMsgs.push(`[pageerror] ${e.message.slice(0, 300)}`));
const failed = [];
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace('http://localhost:3001', '')}`); });
page.on('requestfailed', r => failed.push(`REQFAIL ${r.url().replace('http://localhost:3001', '')} ${r.failure()?.errorText}`));

await page.goto('http://localhost:3001/streams', { waitUntil: 'networkidle2', timeout: 45000 }).catch(e => console.log('goto:', e.message));
await new Promise(r => setTimeout(r, 14000)); // past the 12s boot timeout

const state = await page.evaluate(() => ({
  url: location.href,
  bootOverlayPresent: !!document.querySelector('#boot-overlay, .boot-overlay, [id*="boot"]'),
  bootOverlayVisible: (() => { const el = document.querySelector('#boot-overlay, .boot-overlay, [id*="boot"]'); return el ? getComputedStyle(el).display !== 'none' && getComputedStyle(el).opacity !== '0' : false; })(),
  bodyChildren: document.body.children.length,
  hasChannels: !!document.querySelector('#channels-list'),
  channelRows: document.querySelectorAll('.chrow').length,
  heroText: document.querySelector('h1, .hero h1')?.textContent?.slice(0, 60) || null,
  noStreamsCard: !!document.querySelector('[class*="empty"], .no-streams') || document.body.textContent.includes('No Live Stream'),
}));

console.log('\n=== PAGE STATE ===');
console.log(JSON.stringify(state, null, 2));
console.log('\n=== HTTP >= 400 / FAILED REQUESTS ===');
failed.length ? failed.forEach(f => console.log(f)) : console.log('(none)');
console.log('\n=== CONSOLE (first 25) ===');
consoleMsgs.slice(0, 25).forEach(m => console.log(m));
await browser.close();

/** Diagnose why the Event Details collapse toggle click does nothing. */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, args: ['--no-sandbox', '--disable-gpu'] });
const ap = await browser.newPage();
ap.on('console', m => { const t = m.text(); if (t.includes('click') || t.includes('Event')) console.log('[console]', t.slice(0, 120)); });
await ap.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (new URL(ap.url()).pathname === '/login') {
  await ap.type('#login-username', 'admin');
  await ap.type('#login-password', 'lanstreamer123');
  await ap.click('#login-submit');
  await ap.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
}
await ap.waitForSelector('[data-ls-collapse-toggle="event-details"]', { timeout: 20000 });
await ap.evaluate(() => {
  window.__clicks = [];
  document.addEventListener('click', (e) => {
    window.__clicks.push(e.target.tagName + '|' + (e.target.className.toString().slice(0, 40)));
  }, true);
});
const connected = await ap.evaluate(() => {
  const btn = document.querySelector('[data-ls-collapse-toggle="event-details"]');
  return { connected: btn.isConnected };
});
console.log('button connected:', JSON.stringify(connected));
const btnBox = await (await ap.$('[data-ls-collapse-toggle="event-details"]')).boundingBox();
console.log('button box:', JSON.stringify(btnBox));
await ap.click('[data-ls-collapse-toggle="event-details"]');
await sleep(600);
const log = await ap.evaluate(() => ({
  clicks: window.__clicks,
  stored: localStorage.getItem('ls-collapse:event-details'),
  ariaNow: document.querySelector('[data-ls-collapse-toggle="event-details"]')?.getAttribute('aria-expanded')
}));
console.log('after click:', JSON.stringify(log, null, 1));
await browser.close();

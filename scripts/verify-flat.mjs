/** Verify flat cards: no shadows/hover-lift/animations; only header shadowed (reduced). */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const out = {};

async function sweep(page, label) {
  out[label] = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.glass-card')];
    const shadowed = cards.filter(c => getComputedStyle(c).boxShadow !== 'none');
    const animated = cards.filter(c => {
      const cs = getComputedStyle(c);
      return cs.animationName !== 'none' || (cs.transitionDuration !== '0s' && cs.transitionProperty !== 'all' && cs.transitionProperty !== 'none');
    });
    const header = document.querySelector('.header-glass');
    const chevrons = [...document.querySelectorAll('.ls-collapse-chevron')];
    const chevStillAnimating = chevrons.filter(c => getComputedStyle(c).transitionDuration !== '0s');
    // drop-shadow FILTERS are shadows too (the logo-glow bug slipped past the box-shadow check)
    const imgs = [...document.querySelectorAll('img')];
    const filteredImgs = imgs.filter(i => getComputedStyle(i).filter !== 'none');
    return {
      cards: cards.length,
      shadowedCards: shadowed.length,
      animatedCards: animated.length,
      headerShadow: header ? getComputedStyle(header).boxShadow.slice(0, 60) : 'no header',
      chevrons: chevrons.length,
      chevronsStillAnimated: chevStillAnimating.length,
      filteredImgs: filteredImgs.length
    };
  });
}

// Dashboard
const ap = await browser.newPage();
await ap.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (new URL(ap.url()).pathname === '/login') {
  await ap.type('#login-username', 'admin');
  await ap.type('#login-password', 'lanstreamer123');
  await ap.click('#login-submit');
  await ap.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
}
await ap.waitForSelector('.glass-card', { timeout: 30000 });
await sleep(2500);
await sweep(ap, 'dashboard-dark');
await ap.screenshot({ path: 'screenshots/round10-flat-dashboard-dark.png' });

// Listener
const lp = await browser.newPage();
await lp.goto('http://localhost:3001/streams', { waitUntil: 'networkidle2', timeout: 30000 });
await lp.waitForSelector('.glass-card', { timeout: 15000 });
await sleep(1500);
await sweep(lp, 'listener-dark');
await lp.screenshot({ path: 'screenshots/round10-flat-listener-dark.png' });
await lp.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
await sleep(500);
await sweep(lp, 'listener-light');
await lp.screenshot({ path: 'screenshots/round10-flat-listener-light.png' });

await browser.close();
console.log(JSON.stringify(out, null, 1));
const ok = Object.values(out).every(r => r.shadowedCards === 0 && r.chevronsStillAnimated === 0 && r.filteredImgs === 0 && r.headerShadow.includes('8px'));
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);

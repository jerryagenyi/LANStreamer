/** Verify the channel-row play button renders and toggles BOTH ways on the live app:
 *  play_arrow → (click) → pause → (click) → play_arrow → (click) → pause. */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 120000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto('http://localhost:3001/streams', { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('.chrow:not(.off)', { timeout: 20000 });

const readState = () => page.evaluate(() => {
  const row = document.querySelector('.chrow[aria-current="true"]') || document.querySelector('.chrow:not(.off)');
  const audio = document.querySelector('audio, #audio-player');
  return {
    icon: row?.querySelector('.chplay .material-symbols-rounded')?.textContent?.trim(),
    audioPaused: audio ? audio.paused : null,
    playerCardVisible: !!document.querySelector('#player-card') && getComputedStyle(document.querySelector('#player-card')).display !== 'none'
  };
});

const before = await readState();
console.log('before click:', JSON.stringify(before));

// 1) Click play → row icon flips to pause, audio playing, player card visible
await page.click('.chrow:not(.off) .chplay');
await sleep(9000);
const afterPlay = await readState();
console.log('after 1st click (play):', JSON.stringify(afterPlay));
await page.screenshot({ path: 'screenshots/chplay-playing.png' });

// 2) Click again → pause: icon MUST flip back to play_arrow, audio paused
await page.click('.chrow[aria-current="true"] .chplay');
await sleep(1500);
const afterPause = await readState();
console.log('after 2nd click (pause):', JSON.stringify(afterPause));
await page.screenshot({ path: 'screenshots/chplay-paused.png' });

// 3) Click a third time → resume: icon flips to pause again, audio playing
await page.click('.chrow[aria-current="true"] .chplay');
await sleep(3000);
const afterResume = await readState();
console.log('after 3rd click (resume):', JSON.stringify(afterResume));

const pass = before.icon === 'play_arrow'
  && afterPlay.icon === 'pause' && afterPlay.audioPaused === false && afterPlay.playerCardVisible
  && afterPause.icon === 'play_arrow' && afterPause.audioPaused === true
  && afterResume.icon === 'pause' && afterResume.audioPaused === false;
console.log(pass ? 'PASS' : 'FAIL');
await browser.close();
process.exit(pass ? 0 : 1);

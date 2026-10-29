/** Verify the channel-row play button renders and toggles on the live app. */
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 120000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto('http://localhost:3001/streams', { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('.chrow:not(.off)', { timeout: 20000 });

const before = await page.evaluate(() => {
  const row = document.querySelector('.chrow:not(.off)');
  return {
    hasPlayBtn: !!row?.querySelector('.chplay'),
    icon: row?.querySelector('.chplay .material-symbols-rounded')?.textContent?.trim(),
    cssLoaded: row ? getComputedStyle(row.querySelector('.chplay')).width : 'none'
  };
});
console.log('before click:', JSON.stringify(before));

// Tap the play circle itself (what a listener would aim for)
await page.click('.chrow:not(.off) .chplay');
await new Promise(r => setTimeout(r, 9000));

const after = await page.evaluate(() => {
  const row = document.querySelector('.chrow[aria-current="true"]');
  const audio = document.querySelector('audio, #audio-player');
  return {
    rowCurrent: !!row,
    icon: row?.querySelector('.chplay .material-symbols-rounded')?.textContent?.trim(),
    playerCardVisible: !!document.querySelector('#player-card:not([hidden])'),
    audioState: audio ? { paused: audio.paused, readyState: audio.readyState, src: audio.currentSrc?.slice(0, 60) } : null
  };
});
console.log('after click:', JSON.stringify(after));

const pass = before.hasPlayBtn && before.icon === 'play_arrow'
  && after.rowCurrent && after.icon === 'pause'
  && after.playerCardVisible
  && after.audioState && !after.audioState.paused;
console.log(pass ? 'PASS' : 'FAIL');
await browser.close();
process.exit(pass ? 0 : 1);

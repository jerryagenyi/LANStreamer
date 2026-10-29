/**
 * Controlled conflict test against live state: create two throwaway streams on
 * the same input, verify the busy error arrives + is closable, edit the holder
 * to free the device, then the second stream starts. Cleans up after itself.
 */
import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1360, height: 950 }, protocolTimeout: 180000, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const api = (p, m = 'POST', b = null) =>
  fetch('http://localhost:3001' + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then(r => r.json().catch(() => null));
const results = {};

await api('/api/streams/stop-all');
// clean any leftovers from earlier runs
{
  const j = await api('/api/streams/status', 'GET');
  for (const s of (j?.streams || [])) {
    if (s.name === 'Conflict A' || s.name === 'Conflict B' || s.name === 'Conflict Probe') {
      await api('/api/streams/delete', 'POST', { id: s.id });
    }
  }
}
const devices = (await api('/api/system/audio-devices', 'GET'))?.devices || [];
// Pin to the primary VB cable (known-good on this machine) — NOT the first
// device in the list, which is the broken OBS camera.
const input = devices.find(d => d.id === 'cable-output-vb-audio-virtual-cable')
  || devices.find(d => d.deviceType === 'input' && !d.fallback && !/obs/i.test(d.id));
const other = devices.find(d => d.id === 'cable-a-output-vb-audio-virtual-cable-a')
  || devices.find(d => d.deviceType === 'input' && d.id !== input?.id);
results.input = input ? input.id : 'NO DEVICE';
if (!input || !other) {
  console.log(JSON.stringify({ fatal: 'need two distinct input devices', devices: devices.map(d => d.id) }));
  process.exit(0);
}

// Create A (holder) and B (conflict) on the same input — log raw responses
const aRes = await api('/api/streams/create', 'POST', { name: 'Conflict A', deviceId: input.id, bitrate: 96 });
const bRes = await api('/api/streams/create', 'POST', { name: 'Conflict B', deviceId: input.id, bitrate: 96 });
const a = aRes, b = bRes;
results.created = { a: a?.streamId || a, b: b?.streamId || b };

await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
await sleep(8000);

// Start A via GUI play button
await page.evaluate((id) => {
  const btn = document.querySelector(`[data-stream-row="${id}"] .playbtn`);
  if (btn) btn.click();
}, a.streamId);
await sleep(6000);
results.holderA = await page.evaluate(async (id) => {
  const j = await (await fetch('/api/streams/status')).json();
  const s = j.streams.find(x => x.id === id);
  return { status: s?.status, err: s?.errorShort };
}, a.streamId);

// Drawer while A runs: dropdown must mark the input as used
await page.click('#add-stream-btn');
await sleep(900);
results.drawerSelect = await page.evaluate((devId) => {
  const sel = document.getElementById('stream-device');
  const opt = sel ? [...sel.options].find(o => o.value === devId) : null;
  const drawer = document.querySelector('.drawer');
  const header = document.querySelector('header');
  return {
    drawerOpen: !!drawer,
    usedByLabel: opt?.textContent || 'option missing',
    drawerOverHeader: drawer && header ? parseInt(getComputedStyle(drawer).zIndex) > parseInt(getComputedStyle(header).zIndex) : null,
  };
}, input.id);
await page.keyboard.press('Escape');
await sleep(400);

if (results.holderA.status === 'running') {
  // Play B via GUI → must get the busy error (arriving, closable), NOT a hang
  const t0 = Date.now();
  await page.evaluate((id) => {
    document.querySelector(`[data-stream-row="${id}"] .playbtn`)?.click();
  }, b.streamId);
  await sleep(5000);
  results.conflictB = await page.evaluate(() => {
    const toasts = [...document.querySelectorAll('#toast-stack .toast')].map(t => t.textContent.trim().slice(0, 70));
    const errbox = document.querySelector('.errbox b')?.textContent;
    return { toasts, firstErrbox: errbox };
  });

  // Edit A to the other device via the manager (same call the Edit modal makes)
  const upd = await api('/api/streams/update', 'POST', { streamId: a.streamId, name: 'Conflict A', deviceId: other.id });
  results.editA = upd?.message || upd?.error;
  await sleep(3000);

  // B must now start (device freed + no zombie holding it)
  await page.evaluate((id) => {
    document.querySelector(`[data-stream-row="${id}"] .playbtn`)?.click();
  }, b.streamId);
  await sleep(6000);
  results.freedB = await page.evaluate(async (id) => {
    const j = await (await fetch('/api/streams/status')).json();
    const s = j.streams.find(x => x.id === id);
    return { status: s?.status, err: s?.errorShort };
  }, b.streamId);
}

// cleanup
await api('/api/streams/stop-all');
await api('/api/streams/delete', 'POST', { id: a.streamId });
await api('/api/streams/delete', 'POST', { id: b.streamId });
console.log(JSON.stringify(results, null, 1));
await browser.close();

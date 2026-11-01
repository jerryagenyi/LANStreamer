/**
 * Full UI screenshot suite for the external design review.
 *
 * Captures the dashboard (multi-stream, add-modal, empty) and the listener
 * page (desktop + mobile), each in dark AND light mode, into
 * images/screenshots/redesign-<date>/.
 *
 * Assumes the dev server is already running on :3001.
 * Does NOT modify persistent stream state — the empty state is produced by
 * deleting streams via the API; restore config/streams.json afterwards
 * (see run-notes in the PR).
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3001';
const OUT_DIR = process.argv[2] || path.join(__dirname, '..', 'images', 'screenshots', 'redesign-2026-10-28');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1440, height: 1000 },
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run']
  });
  const page = await browser.newPage();

  const setTheme = async (theme) => {
    await page.evaluate((t) => localStorage.setItem('lanstreamer.theme', t), theme);
  };

  const shot = async (file, { fullPage = true } = {}) => {
    await page.screenshot({ path: path.join(OUT_DIR, file), fullPage, type: 'png' });
    console.log('📸', file);
  };

  const goto = async (url, settleMs) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(settleMs);
  };

  const api = (path_, method = 'POST', body = null) =>
    page.evaluate(async ({ p, m, b }) => {
      const res = await fetch(p, {
        method: m,
        headers: { 'Content-Type': 'application/json' },
        body: b ? JSON.stringify(b) : undefined
      });
      return { status: res.status, data: await res.json().catch(() => null) };
    }, { p: path_, m: method, b: body });

  // ---------- Dashboard: multi-stream (1 running, 1 error, rest stopped) ----------
  await goto(`${BASE}/dashboard`, 9000); // icecast scan takes ~7s on cold load
  await setTheme('dark');
  await goto(`${BASE}/dashboard`, 9000);
  await shot('01-dashboard-multi-dark.png');

  await setTheme('light');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(9000);
  await shot('02-dashboard-multi-light.png');

  // ---------- Dashboard: add-stream modal ----------
  await setTheme('dark');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(9000);
  await page.click('#add-stream-btn');
  await sleep(1500);
  await shot('03-dashboard-add-modal-dark.png', { fullPage: false });

  await setTheme('light');
  await sleep(700);
  await shot('04-dashboard-add-modal-light.png', { fullPage: false });
  await page.keyboard.press('Escape');
  await sleep(500);

  // ---------- Listener: desktop (a stream is running) ----------
  await page.setViewport({ width: 1280, height: 900 });
  await setTheme('dark');
  await goto(`${BASE}/streams`, 4500);
  await shot('07-listener-desktop-dark.png');

  await setTheme('light');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  await shot('08-listener-desktop-light.png');

  // ---------- Listener: mobile ----------
  await page.setViewport({ width: 390, height: 844 });
  await setTheme('dark');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  await shot('09-listener-mobile-dark.png');

  await setTheme('light');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  await shot('10-listener-mobile-light.png');

  // ---------- Dashboard: empty (delete all streams) ----------
  await page.setViewport({ width: 1440, height: 1000 });
  const status = await api('/api/streams/status', 'GET');
  const ids = (status.data?.streams || []).map((s) => s.id);
  for (const id of ids) {
    await api(`/api/streams/delete`, 'POST', { id });
  }
  console.log(`🗑️ deleted ${ids.length} streams for empty-state shots`);

  await setTheme('dark');
  await goto(`${BASE}/dashboard`, 8000);
  await shot('05-dashboard-empty-dark.png');

  await setTheme('light');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(8000);
  await shot('06-dashboard-empty-light.png');

  await browser.close();
  console.log('✅ suite complete →', OUT_DIR);
}

main().catch((err) => {
  console.error('❌ screenshot suite failed:', err.message);
  process.exit(1);
});

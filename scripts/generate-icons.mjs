/**
 * Regenerate the app icon set from the current brand mark (public/assets/logo-mark.svg):
 *  - public/assets/favicon.png  (512px square PNG; tray + BrowserWindow + web fallback)
 *  - electron/icon.ico          (16-256px multi-size; electron-builder win icon — NOT build/,
 *                                which is gitignored and wouldn't survive a fresh clone)
 * No server needed: node scripts/generate-icons.mjs
 */
import puppeteer from 'puppeteer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const svgDataUrl = 'data:image/svg+xml;base64,' + readFileSync('public/assets/logo-mark.svg').toString('base64');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();

async function renderPng(size) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;background:transparent;">
    <img src="${svgDataUrl}" style="width:${size}px;height:${size}px;display:block;">`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('img')?.complete);
  const img = await page.$('img');
  return img.screenshot({ omitBackground: true }); // Uint8Array PNG with alpha
}

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const pngs = {};
for (const s of SIZES) pngs[s] = await renderPng(s);
pngs[512] = await renderPng(512);
await browser.close();

// favicon.png — square 512 render of the mark
writeFileSync('public/assets/favicon.png', pngs[512]);
console.log('wrote public/assets/favicon.png (' + pngs[512].length + ' bytes, 512x512)');

// icon.ico — PNG-embedded multi-size (valid on Vista+; electron-builder accepts)
mkdirSync('electron', { recursive: true });
const entries = SIZES.map((s) => ({ size: s, data: pngs[s] }));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
let offset = 6 + entries.length * 16;
const dir = [];
const blobs = [];
for (const e of entries) {
  const d = Buffer.alloc(16);
  d.writeUInt8(e.size === 256 ? 0 : e.size, 0);
  d.writeUInt8(e.size === 256 ? 0 : e.size, 1);
  d.writeUInt8(0, 2); d.writeUInt8(0, 3);   // colors, reserved
  d.writeUInt16LE(1, 4);                     // planes
  d.writeUInt16LE(32, 6);                    // bit count
  d.writeUInt32LE(e.data.length, 8);
  d.writeUInt32LE(offset, 12);
  dir.push(d);
  blobs.push(Buffer.from(e.data));
  offset += e.data.length;
}
const ico = Buffer.concat([header, ...dir, ...blobs]);
writeFileSync('electron/icon.ico', ico);
console.log('wrote electron/icon.ico (' + ico.length + ' bytes, sizes: ' + SIZES.join(',') + ')');

#!/usr/bin/env node
/**
 * Download Google Fonts css2 stylesheets + woff2 files and rewrite them to local paths,
 * so the UI works fully offline (LAN use case) and can be packaged for Electron.
 *
 * Usage: node scripts/vendor-fonts.mjs
 * Output: public/assets/vendor/fonts/*.woff2 + public/assets/vendor/fonts/fonts.css
 */
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'vendor', 'fonts');

// Chrome UA so Google serves modern woff2 with unicode-range subsets
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const FONT_CSS_URLS = [
  // Inter weights used across dashboard + listener pages
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap',
  // Noto Sans weights (dashboard)
  'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700;900&display=swap',
  // Redesign (2026-10-28): UI + mono faces from the designer mock
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
  // Material Symbols Rounded: variable axes (listener page) and FILL@1 instance class (dashboard/login)
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL@1',
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seenFiles = new Map(); // remote url -> local filename
  const cssParts = [];
  const classRules = new Map(); // keep .material-symbols-rounded class defs (deduped)

  for (const url of FONT_CSS_URLS) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    let css = await res.text();

    // Extract every font file URL in this stylesheet
    const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
    for (const fileUrl of urls) {
      if (seenFiles.has(fileUrl)) continue;
      const name = new URL(fileUrl).pathname.split('/').pop(); // e.g. inter-latin-400.woff2 style hash names
      const local = `fonts/${name}`;
      seenFiles.set(fileUrl, local);
      const fontRes = await fetch(fileUrl, { headers: { 'User-Agent': UA } });
      if (!fontRes.ok) throw new Error(`Failed to fetch font ${fileUrl}: ${fontRes.status}`);
      const buf = Buffer.from(await fontRes.arrayBuffer());
      fs.writeFileSync(path.join(OUT_DIR, name), buf);
      console.log(`downloaded ${name} (${(buf.length / 1024).toFixed(0)} KB)`);
    }

    // Rewrite urls to relative local paths (fonts.css sits in the same dir as the woff2 files)
    css = css.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, u) => `url(${path.basename(new URL(u).pathname)})`);

    // Capture/dedupe the .material-symbols-rounded helper class
    for (const m of css.matchAll(/^\.material-symbols-rounded\s*\{[^}]*\}/gm)) {
      classRules.set(m[0], true);
    }
    cssParts.push(css);
  }

  // Strip the class rules from raw css parts to avoid duplicates, then append once
  const classRuleKeys = [...classRules.keys()];
  let combined = cssParts
    .map(c => c.replace(/^\.material-symbols-rounded\s*\{[^}]*\}\s*/gm, ''))
    .join('\n\n');

  combined += '\n\n/* Material Symbols Rounded icon class (from Google Fonts stylesheet) */\n'
    + classRuleKeys.join('\n')
    + '\n';

  // Comments in css2 output reference the request URL; keep as provenance
  fs.writeFileSync(path.join(OUT_DIR, 'fonts.css'), combined);
  console.log(`\nwrote fonts.css (${(combined.length / 1024).toFixed(0)} KB) with ${seenFiles.size} font files`);
}

main().catch(err => { console.error(err); process.exit(1); });

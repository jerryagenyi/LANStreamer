#!/usr/bin/env node
/**
 * Design-token + UI-rule integrity linter (adopted from the devops repo's
 * check-conflicts.mjs convention, 2026-10-28).
 *
 * Enforces the "UI rules (enforced)" section of CLAUDE.md mechanically so
 * CI can fail before review:
 *   R1 hex-color   — no hardcoded 6-digit hex colors outside the token
 *                    sources (tokens.css, ui.css)
 *   R2 gray-class  — no dark-only Tailwind gray-* classes (use semantic
 *                    tokens: surface, muted, line, accent)
 *   R3 native-dlg  — no alert()/confirm()/prompt() (use the page toast)
 *   R4 runtime-cdn — no runtime CDN references (offline rule)
 *
 * Existing debt is grandfathered through scripts/design-token-baseline.json
 * (per file+rule violation COUNTS). CI fails only on NEW violations. To
 * accept new debt deliberately:
 *   node scripts/check-design-tokens.mjs --update-baseline
 * and commit the baseline with your reasoning.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const BASELINE_PATH = join(ROOT, 'scripts', 'design-token-baseline.json');

const TOKEN_SOURCES = new Set([
  'public/assets/css/tokens.css',
  'public/assets/css/ui.css',
]);

const SCAN_ROOTS = ['public/components', 'public/assets/js', 'src'];
const SCAN_FILES = ['public/index.html', 'public/streams.html',
  'public/showcase.html', 'public/docs.html'];

const RULES = {
  'hex-color': (text) => (text.match(/#[0-9a-fA-F]{6}\b/g) || []).length,
  'gray-class': (text) => (text.match(/(?:bg|text|border|from|to|via|ring|fill|stroke|placeholder)-gray-\d+/g) || []).length,
  'native-dlg': (text) => (text.match(/\b(?:alert|confirm|prompt)\s*\(/g) || []).length,
  'runtime-cdn': (text) => (text.match(/https?:\/\/(?:[a-z0-9-]+\.)*(?:cdn\.|unpkg\.com|jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)/g) || []).length,
};

function walkDir(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return []; }
  const out = [];
  for (const e of entries) {
    const full = join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) out.push(...walkDir(full));
    else out.push(full);
  }
  return out;
}

function collectFiles() {
  const files = SCAN_FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f));
  for (const r of SCAN_ROOTS) {
    const abs = join(ROOT, r);
    if (!existsSync(abs)) continue;
    files.push(...walkDir(abs).filter((f) => f.endsWith('.js') || f.endsWith('.html')));
  }
  return [...new Set(files)];
}

function main() {
  const found = {};
  for (const abs of collectFiles()) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    const text = readFileSync(abs, 'utf8');
    for (const [rule, countOf] of Object.entries(RULES)) {
      if (rule === 'hex-color' && TOKEN_SOURCES.has(rel)) continue;
      const n = countOf(text);
      if (n > 0) found[`${rel}:${rule}`] = n;
    }
  }

  if (process.argv.includes('--update-baseline')) {
    writeFileSync(BASELINE_PATH, JSON.stringify(found, null, 2) + '\n');
    const total = Object.values(found).reduce((a, b) => a + b, 0);
    console.log(`baseline updated: ${Object.keys(found).length} file-rule entries, ${total} violations`);
    return;
  }

  const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : {};

  let bad = 0;
  for (const [key, n] of Object.entries(found)) {
    const allowed = baseline[key] ?? 0;
    if (n > allowed) {
      console.error(`FAIL ${key}: ${n} violations (baseline ${allowed})`);
      bad += n - allowed;
    }
  }
  if (bad > 0) {
    console.error(`\n${bad} NEW UI-rule violation(s). Fix them, or accept deliberately:`);
    console.error('  node scripts/check-design-tokens.mjs --update-baseline  # then commit with reasoning');
    process.exit(1);
  }
  const total = Object.values(found).reduce((a, b) => a + b, 0);
  console.log(`design tokens OK — ${total} grandfathered violations, 0 new`);
}

main();

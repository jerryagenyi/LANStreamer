#!/usr/bin/env node
/**
 * PostHog query console — connects this dev machine directly to the
 * maintainer's PostHog project (read-only) so field reports ("6s latency in
 * Nigeria, same gear") can be answered from event data without opening the
 * dashboard UI.
 *
 * Auth: a PERSONAL ACCESS TOKEN (phx_…), not the ingest key — the ingest key
 * (phc_…) can only capture, never query. Token lives in ~/.secrets/posthog
 * (same store the app reads, same convention: read at runtime, never print):
 *
 *   POSTHOG_API_TOKEN=phx_...          <- eu.posthog.com → Settings → Personal access tokens
 *   POSTHOG_HOST=https://eu.posthog.com  (default; project is on EU)
 *   POSTHOG_PROJECT_ID=12345            (optional — auto-resolved via /api/projects)
 *
 * Usage:
 *   node scripts/posthog-query.mjs status              # masked connectivity check + 7-day event counts
 *   node scripts/posthog-query.mjs events [hours=48]   # recent lanstreamer_* events, newest first
 *   node scripts/posthog-query.mjs "SELECT event, count() FROM events WHERE ..."
 *   ... append --json to any command for raw JSON output
 *
 * Exit codes: 0 ok, 1 bad usage/credentials, 2 query failed.
 */
import os from 'os';
import fs from 'fs';
import path from 'path';

const DEFAULT_HOST = 'https://eu.posthog.com'; // maintainer's project region

function readSecrets() {
  const p = path.join(os.homedir(), '.secrets', 'posthog');
  const map = {};
  try {
    if (!fs.existsSync(p)) return map;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m) map[m[1]] = m[2];
    }
  } catch { /* unreadable -> treat as absent */ }
  return map;
}

const secrets = readSecrets();
const TOKEN = secrets.POSTHOG_API_TOKEN || process.env.POSTHOG_API_TOKEN || '';
const HOST = (secrets.POSTHOG_HOST || process.env.POSTHOG_HOST || DEFAULT_HOST).replace(/\/+$/, '');

function authedHeaders() {
  return { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
}

async function resolveProjectId() {
  if (secrets.POSTHOG_PROJECT_ID) return secrets.POSTHOG_PROJECT_ID;
  if (process.env.POSTHOG_PROJECT_ID) return process.env.POSTHOG_PROJECT_ID;
  const res = await fetch(`${HOST}/api/projects?limit=50`, { headers: authedHeaders() });
  if (!res.ok) throw new Error(`project listing failed: ${res.status} ${await res.text().then(t => t.slice(0, 200))}`);
  const { results = [] } = await res.json();
  if (!results.length) throw new Error('token can see no projects — check its scope/access');
  const preferred = results.find(p => /lanstreamer/i.test(p.name || ''));
  if (results.length === 1 || preferred) return String((preferred || results[0]).id);
  console.error('Token can see multiple projects — pick one and set POSTHOG_PROJECT_ID in ~/.secrets/posthog:');
  for (const p of results) console.error(`  ${p.id}  ${p.name}`);
  process.exit(1);
}

async function runHogQL(query) {
  const id = await resolveProjectId();
  const res = await fetch(`${HOST}/api/environments/${id}/query`, {
    method: 'POST',
    headers: authedHeaders(),
    body: JSON.stringify({ query })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`query failed: HTTP ${res.status} — ${body.error || JSON.stringify(body).slice(0, 300)}`);
  }
  return body; // { results: [...], columns: [...] }
}

const mask = (t) => (t ? `${t.slice(0, 6)}…${t.slice(-4)}` : '(absent)');

function printResults(body, { json = false } = {}) {
  if (json) { console.log(JSON.stringify(body.results ?? body, null, 2)); return; }
  const cols = body.columns || [];
  const rows = body.results || [];
  const idx = Object.fromEntries(cols.map((c, i) => [c, i]));
  const tsIdx = idx.timestamp ?? -1;
  const evIdx = idx.event ?? -1;
  const prIdx = idx.properties ?? -1;
  if (tsIdx === -1 && evIdx === -1) {
    // generic table
    console.log(cols.join(' | '));
    for (const r of rows) console.log(r.join(' | '));
    return;
  }
  for (const r of rows) {
    const ts = tsIdx >= 0 ? String(r[tsIdx]).replace('T', ' ').slice(0, 19) : '';
    const ev = evIdx >= 0 ? r[evIdx] : '';
    let props = '';
    if (prIdx >= 0 && r[prIdx] != null) {
      try { props = JSON.stringify(r[prIdx]); } catch { props = String(r[prIdx]); }
    }
    console.log(`${ts}  ${String(ev).padEnd(34)} ${props}`);
  }
  console.log(`\n${rows.length} row(s)`);
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const rest = args.filter(a => a !== '--json');
  const cmd = rest[0] || 'status';

  if (!TOKEN) {
    console.error('No POSTHOG_API_TOKEN found in ~/.secrets/posthog (or env).\n' +
      'Create one at eu.posthog.com → Settings → Personal access tokens (read scope),\n' +
      'then add:   POSTHOG_API_TOKEN=phx_...   to ~/.secrets/posthog');
    process.exit(1);
  }
  if (cmd === 'status') {
    console.log(`host:    ${HOST}`);
    console.log(`token:   ${mask(TOKEN)} (personal access token)`);
    const id = await resolveProjectId();
    console.log(`project: ${id}`);
    const body = await runHogQL(
      `SELECT event, count() AS n FROM events
       WHERE timestamp > now() - interval 7 day AND properties.app = 'lanstreamer'
       GROUP BY event ORDER BY n DESC`
    );
    console.log('\nlanstreamer events, last 7 days:');
    printResults(body, { json });
    return;
  }
  if (cmd === 'events') {
    const hours = parseInt(rest[1], 10) || 48;
    const like = rest[2] ? `AND event LIKE '%${rest[2].replace(/'/g, '')}%'` : '';
    const body = await runHogQL(
      `SELECT timestamp, event, properties FROM events
       WHERE timestamp > now() - interval ${hours} hour
         AND properties.app = 'lanstreamer' ${like}
       ORDER BY timestamp DESC LIMIT 500`
    );
    printResults(body, { json });
    return;
  }
  // Anything else is treated as raw HogQL
  const body = await runHogQL(rest.join(' '));
  printResults(body, { json });
}

main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(2); });

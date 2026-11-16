#!/usr/bin/env node
/**
 * PostHog query console — connects this dev machine directly to the
 * maintainer's PostHog project (read-only) so field reports ("6s latency in
 * Nigeria, same gear") can be answered from event data without opening the
 * dashboard UI.
 *
 * Auth: a PERSONAL ACCESS TOKEN (phx_…), not the ingest key — the ingest key
 * (phc_…) can only capture, never query. Tokens are ORG-SCOPED: this script
 * needs the phx_ created while switched into the LANSTREAMER organization
 * (the ChurchAfrica org's key cannot see this project and vice versa).
 * ~/.secrets/posthog is sectioned per product (read at runtime, never printed):
 *
 *   LS_POSTHOG_API_TOKEN=phx_...       <- created in the LANStreamer org (query:read + project:read)
 *   LS_POSTHOG_PROJECT_ID=12345        <- numeric id, needed if the key is project-scoped
 *   LS_POSTHOG_API_HOST=https://eu.posthog.com   (default; store host lines are INGEST hosts and get normalized)
 *
 * Usage:
 *   node scripts/posthog-query.mjs status              # masked connectivity check + 7-day event counts
 *   node scripts/posthog-query.mjs events [hours=48]   # recent lanstreamer_* events, newest first
 *   node scripts/posthog-query.mjs "SELECT event, count() FROM events WHERE ..."
 *   ... append --json for raw JSON, --project <id> to target a specific project
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
const _pIdx = process.argv.indexOf('--project');
const cliProject = _pIdx >= 0 ? process.argv[_pIdx + 1] : null;
const TOKEN = secrets.LS_POSTHOG_API_TOKEN || secrets.POSTHOG_API_TOKEN || process.env.POSTHOG_API_TOKEN || '';
const PROJECT = secrets.LS_POSTHOG_PROJECT_ID || secrets.POSTHOG_PROJECT_ID || process.env.POSTHOG_PROJECT_ID || '';
// The store's host lines point at the INGEST endpoint (eu.i.posthog.com);
// queries go to the app API host — normalize instead of 404ing.
function queryHost(raw) {
  return (raw || DEFAULT_HOST)
    .replace(/\/+$/, '')
    .replace('//eu.i.posthog.com', '//eu.posthog.com')
    .replace('//us.i.posthog.com', '//us.posthog.com');
}
const HOST = queryHost(secrets.LS_POSTHOG_API_HOST || secrets.POSTHOG_API_HOST || secrets.LS_POSTHOG_HOST || secrets.POSTHOG_HOST || secrets.CA_POSTHOG_HOST);

function authedHeaders() {
  return { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
}

async function resolveProjectId() {
  if (cliProject) return cliProject;
  if (PROJECT) return PROJECT;
  const res = await fetch(`${HOST}/api/projects?limit=50`, { headers: authedHeaders() });
  if (!res.ok) throw new Error(`project listing failed: HTTP ${res.status} — if this is a project-scoped key, add LS_POSTHOG_PROJECT_ID=<numeric id> to ~/.secrets/posthog`);
  const { results = [] } = await res.json();
  if (!results.length) throw new Error('token can see no projects — check its scope/access (must be created inside the LANStreamer org)');
  const preferred = results.find(p => /lanstreamer/i.test(p.name || ''));
  if (results.length === 1 || preferred) return String((preferred || results[0]).id);
  console.error('Token can see multiple projects — pick one and set LS_POSTHOG_PROJECT_ID in ~/.secrets/posthog:');
  for (const p of results) console.error(`  ${p.id}  ${p.name}`);
  process.exit(1);
}

async function runHogQL(query) {
  const id = await resolveProjectId();
  const res = await fetch(`${HOST}/api/environments/${id}/query`, {
    method: 'POST',
    headers: authedHeaders(),
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } })
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
  const rest = args.filter((a, i) => a !== '--json' && i !== _pIdx && i !== _pIdx + 1);
  const cmd = rest[0] || 'status';

  if (!TOKEN) {
    console.error('No LS_POSTHOG_API_TOKEN found in ~/.secrets/posthog (or env).\n' +
      'Create one while switched into the LANSTREAMER org: eu.posthog.com → Settings → Personal access tokens\n' +
      '(scopes: query:read + project:read), then add:   LS_POSTHOG_API_TOKEN=phx_...   to ~/.secrets/posthog\n' +
      'Add the numeric project id as LS_POSTHOG_PROJECT_ID if the key is project-scoped.');
    process.exit(1);
  }
  if (cmd === 'status') {
    console.log(`host:    ${HOST}`);
    console.log(`token:   ${mask(TOKEN)} (personal access token)`);
    const id = await resolveProjectId();
    // Name the project: the org holds more than one app, and a project-scoped
    // key gives no other hint which one this id is.
    const pr = await fetch(`${HOST}/api/projects/${id}/`, { headers: authedHeaders() });
    const pj = pr.ok ? await pr.json().catch(() => ({})) : {};
    console.log(`project: ${id}${pj.name ? ` — "${pj.name}"` : ` (name unavailable: HTTP ${pr.status})`}`);
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

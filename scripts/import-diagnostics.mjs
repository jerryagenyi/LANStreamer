#!/usr/bin/env node
/**
 * import-diagnostics.mjs — maintainer-side importer for hand-carried
 * LANStreamer diagnostics bundles (offline telemetry, layer 3).
 *
 * Usage:
 *   node scripts/import-diagnostics.mjs <file.json> [more.json ...]
 *   node scripts/import-diagnostics.mjs --dry-run <file.json>
 *
 * Reads each lanstreamer-diagnostics bundle the operator exported on an
 * offline machine, validates it HARD (it is untrusted input: wrong format,
 * non-UUID install ids, oversized lists, foreign event names and bad
 * timestamps are rejected; nested property values are dropped), then sends
 * the events to PostHog in batches with delivery:'handcarry' — the journal
 * id becomes the event uuid so re-importing the same file is a server-side
 * no-op (PostHog dedupes on uuid).
 *
 * Key/host resolution reuses TelemetryService (env > config file > bundled
 * key). The key is NEVER printed. Exit codes: 0 ok / dry-run, 1 no key
 * configured, 2 validation or upload failure.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS = 20_000;
const MAX_ERRORS = 50;

/**
 * Validate + sanitize one diagnostics file's contents.
 * @param {string} raw file contents
 * @returns {{ok: boolean, errors: string[], data: object|null, summary: object|null}}
 *   data is a SANITIZED COPY (never the parsed original); summary carries
 *   { installId, appVersion, eventCount, firstEventAt, lastEventAt, droppedProps }.
 */
export function validateDiagnosticsFile(raw) {
  const errors = [];
  let overflow = 0;
  const pushError = (msg) => {
    if (errors.length < MAX_ERRORS) errors.push(msg);
    else overflow++;
  };
  let parsed;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return { ok: false, errors: ['File is not valid JSON'], data: null, summary: null };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['File is not a diagnostics object'], data: null, summary: null };
  }
  if (parsed.format !== 'lanstreamer-diagnostics') pushError('Wrong format: expected lanstreamer-diagnostics');
  if (parsed.formatVersion !== 1) pushError('Wrong formatVersion: expected 1');
  if (typeof parsed.installId !== 'string' || !UUID_RE.test(parsed.installId)) {
    pushError('installId is not a UUID');
  }
  if (!Array.isArray(parsed.events)) pushError('events is not an array');
  else if (parsed.events.length > MAX_EVENTS) pushError(`Too many events: ${parsed.events.length} > ${MAX_EVENTS}`);
  if (errors.length) return { ok: false, errors, data: null, summary: null };

  const seenIds = new Set();
  const events = [];
  let droppedProps = 0;
  for (const e of parsed.events) {
    if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !e.id) {
      pushError('Event without a string id');
      continue;
    }
    if (seenIds.has(e.id)) continue; // dedupe on id (same export imported twice)
    seenIds.add(e.id);
    if (typeof e.event !== 'string' || !e.event.startsWith('lanstreamer_')) {
      pushError(`Event name must start with lanstreamer_ (got ${JSON.stringify(String(e.event).slice(0, 40))})`);
      continue;
    }
    const ts = typeof e.ts === 'string' ? e.ts : '';
    if (!ts || Number.isNaN(Date.parse(ts))) {
      pushError(`Event ts is not an ISO timestamp (got ${JSON.stringify(ts.slice(0, 40))})`);
      continue;
    }
    const props = {};
    if (e.props && typeof e.props === 'object') {
      for (const [k, v] of Object.entries(e.props)) {
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean' || v === null) props[k] = v;
        else droppedProps++;
      }
    }
    events.push({ id: e.id, ts, event: e.event, props });
  }
  if (overflow) errors.push(`…and ${overflow} more errors`);
  if (errors.length) return { ok: false, errors, data: null, summary: null };
  const data = {
    format: 'lanstreamer-diagnostics',
    formatVersion: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
    installId: parsed.installId,
    appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : null,
    events,
  };
  return {
    ok: true,
    errors: [],
    data,
    summary: {
      installId: data.installId,
      appVersion: data.appVersion,
      eventCount: events.length,
      firstEventAt: events.length ? events[0].ts : null,
      lastEventAt: events.length ? events[events.length - 1].ts : null,
      droppedProps,
    },
  };
}

/** Map validated events to PostHog batch bodies (uuid = journal id). */
function toBatchEvents(events, installId) {
  return events.map((e) => ({
    event: e.event,
    properties: { ...e.props, delivery: 'handcarry', $geoip_disable: true },
    distinct_id: installId,
    timestamp: e.ts,
    uuid: e.id,
  }));
}

async function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const files = argv.filter((a) => !a.startsWith('--'));
  if (!files.length) {
    console.error('Usage: node scripts/import-diagnostics.mjs [--dry-run] <bundle.json> [...]');
    return 2;
  }

  // Read + validate every file up front — one bad file stops the import.
  const bundles = [];
  for (const f of files) {
    let raw;
    try {
      raw = fs.readFileSync(path.resolve(f), 'utf8');
    } catch (error) {
      console.error(`✗ ${f}: cannot read (${error.message})`);
      return 2;
    }
    const r = validateDiagnosticsFile(raw);
    if (!r.ok) {
      console.error(`✗ ${f}: invalid diagnostics file`);
      for (const e of r.errors.slice(0, 10)) console.error(`    - ${e}`);
      return 2;
    }
    console.log(`✓ ${f}: ${r.summary.eventCount} events, install ${r.summary.installId.slice(0, 8)}, ${r.summary.firstEventAt || 'no events'} → ${r.summary.lastEventAt || '-'}`);
    const perEvent = {};
    for (const e of r.data.events) perEvent[e.event] = (perEvent[e.event] || 0) + 1;
    for (const [name, n] of Object.entries(perEvent).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(6)}  ${name}`);
    if (r.summary.droppedProps) console.log(`    (${r.summary.droppedProps} non-primitive property values dropped)`);
    bundles.push(r);
  }

  if (dryRun) {
    console.log('Dry run only — nothing sent.');
    return 0;
  }

  // Resolve the ingest key exactly like the app does (never printed).
  const { default: telemetry } = await import('../src/services/TelemetryService.js');
  telemetry._loadState();
  const key = telemetry.getKey();
  if (!key) {
    console.error('No PostHog key configured (POSTHOG_KEY, config/telemetry.json, or the bundled key).');
    return 1;
  }
  const { createPostHogBatchTransport } = await import('../src/services/TelemetryJournal.js');
  const transport = createPostHogBatchTransport({
    getKey: () => key,
    getHost: () => telemetry.getHost(),
  });

  let failed = false;
  for (const { data, summary } of bundles) {
    const batchEvents = toBatchEvents(data.events, data.installId);
    for (let i = 0; i < batchEvents.length; i += 100) {
      const batch = batchEvents.slice(i, i + 100);
      const ok = await transport(batch);
      if (!ok) {
        console.error(`✗ upload failed for install ${data.installId} (batch ${Math.floor(i / 100) + 1}); retry the import — already-sent events dedupe on uuid.`);
        failed = true;
        break;
      }
    }
    if (!failed) console.log(`✓ sent ${summary.eventCount} events for install ${data.installId.slice(0, 8)} (delivery: handcarry)`);
  }
  return failed ? 2 : 0;
}

// Run as CLI only when invoked directly (safe to import from tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await main(process.argv.slice(2));
  process.exit(code);
}

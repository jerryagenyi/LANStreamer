/**
 * TelemetryJournal unit tests (offline telemetry, layer 1).
 *
 * The journal is the crash-safe local record of every telemetry event:
 *  - events append as JSONL lines { id, ts, event, props }
 *  - a torn/garbage last line (power loss mid-write) is skipped, never thrown
 *  - the file is capped at maxEvents; the oldest are dropped and counted
 *  - the uploader (injectable transport) removes events ONLY on confirmed
 *    success, sends the ORIGINAL timestamp and the journal id as the event
 *    uuid, marks old events delivery:'late', and never runs twice at once
 *  - exports bundle every event still on disk, mark them, and log themselves
 *  - pending/remind logic separates previous-session events from this session
 *  - destroy() (telemetry turned OFF) deletes both files
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { TelemetryJournal } from '../../src/services/TelemetryJournal.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ls-journal-'));
}

function readLines(dir) {
  const p = path.join(dir, 'telemetry-journal.jsonl');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
}

function readState(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'telemetry-delivery.json'), 'utf8'));
}

describe('TelemetryJournal', () => {
  let dir;

  beforeEach(() => {
    dir = tmpDir();
  });

  describe('appending and reading back', () => {
    it('writes one JSON line per event with id, ts, full event name and exact props', () => {
      const j = new TelemetryJournal({ dir });
      const id = j.record({ event: 'lanstreamer_app_start', props: { app: 'lanstreamer', schema: 1 } });
      expect(id).toBeTruthy();
      const lines = readLines(dir);
      expect(lines).toHaveLength(1);
      const rec = JSON.parse(lines[0]);
      expect(rec.id).toBe(id);
      expect(rec.event).toBe('lanstreamer_app_start');
      expect(rec.props).toEqual({ app: 'lanstreamer', schema: 1 });
      expect(typeof rec.ts).toBe('string');
      expect(Number.isNaN(Date.parse(rec.ts))).toBe(false);
    });

    it('uses ts from the injected clock and an ISO timestamp', () => {
      const fixed = 1_700_000_000_000;
      const j = new TelemetryJournal({ dir, now: () => fixed });
      j.record({ event: 'lanstreamer_x', props: {} });
      expect(JSON.parse(readLines(dir)[0]).ts).toBe(new Date(fixed).toISOString());
    });

    it('skips a torn/garbage last line instead of throwing', () => {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'telemetry-journal.jsonl'),
        JSON.stringify({ id: 'a', ts: new Date().toISOString(), event: 'lanstreamer_a', props: {} }) + '\n{"broken": tr');
      const j = new TelemetryJournal({ dir });
      expect(() => j.status()).not.toThrow();
      expect(j.status().pendingCount).toBe(1); // only the intact line counts
      const id = j.record({ event: 'lanstreamer_b', props: {} });
      expect(id).toBeTruthy();
      expect(j.status().pendingCount).toBe(2);
    });
  });

  describe('bounds', () => {
    it('drops the oldest events past maxEvents and counts them in droppedEvents', () => {
      const j = new TelemetryJournal({ dir, maxEvents: 3 });
      for (let i = 0; i < 5; i++) j.record({ event: `lanstreamer_e${i}`, props: { i } });
      const lines = readLines(dir).map((l) => JSON.parse(l));
      expect(lines.map((l) => l.event)).toEqual(['lanstreamer_e2', 'lanstreamer_e3', 'lanstreamer_e4']);
      expect(readState(dir).droppedEvents).toBe(2);
    });

    it('trims in chunks once full, so a full journal is not rewritten on every event', () => {
      // An offline PC sits at the cap for weeks; rewriting ~4 MB synchronously
      // per event would stall the process that also proxies the audio.
      const j = new TelemetryJournal({ dir, maxEvents: 100 });
      for (let i = 0; i < 101; i++) j.record({ event: 'lanstreamer_e', props: { i } });
      expect(readLines(dir)).toHaveLength(90);           // one trim: down to 90 %
      expect(readState(dir).droppedEvents).toBe(11);

      for (let i = 101; i < 110; i++) j.record({ event: 'lanstreamer_e', props: { i } });
      expect(readLines(dir)).toHaveLength(99);           // plain appends, no further trim
      expect(readState(dir).droppedEvents).toBe(11);
      expect(JSON.parse(readLines(dir)[98]).props.i).toBe(109); // newest is kept
    });
  });

  describe('upload', () => {
    it('removes events only after the transport confirms success', async () => {
      const j = new TelemetryJournal({ dir });
      j.record({ event: 'lanstreamer_a', props: {} });
      j.record({ event: 'lanstreamer_b', props: {} });
      const fail = jest.fn().mockResolvedValue(false);
      const r1 = await j.upload({ transport: fail, installId: 'install-1' });
      expect(r1.sent).toBe(0);
      expect(fail).toHaveBeenCalledTimes(1);
      expect(readLines(dir)).toHaveLength(2); // failure keeps events
      expect(j.status().pendingCount).toBe(2);

      const ok = jest.fn().mockResolvedValue(true);
      const r2 = await j.upload({ transport: ok, installId: 'install-1' });
      expect(r2.sent).toBe(2);
      expect(readLines(dir)).toHaveLength(0); // success removes them
      expect(j.status().pendingCount).toBe(0);
      expect(readState(dir).lastUploadAt).toBeTruthy();
    });

    it('sends the ORIGINAL timestamp and the journal id as the event uuid', async () => {
      const fixed = 1_700_000_000_000;
      const j = new TelemetryJournal({ dir, now: () => fixed });
      const id = j.record({ event: 'lanstreamer_app_start', props: { app: 'lanstreamer' } });
      const transport = jest.fn().mockResolvedValue(true);
      await j.upload({ transport, installId: 'install-42' });
      expect(transport).toHaveBeenCalledTimes(1);
      const [events] = transport.mock.calls[0];
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'lanstreamer_app_start',
        distinct_id: 'install-42',
        timestamp: new Date(fixed).toISOString(),
        uuid: id,
      });
      expect(events[0].properties.app).toBe('lanstreamer');
      expect(events[0].properties.$geoip_disable).toBe(true);
    });

    it('marks delivery:"late" only on events older than the threshold', async () => {
      let clock = 1_700_000_000_000;
      const j = new TelemetryJournal({ dir, now: () => clock });
      j.record({ event: 'lanstreamer_old', props: {} }); // 10 min before upload
      clock += 10 * 60 * 1000;
      j.record({ event: 'lanstreamer_fresh', props: {} }); // just happened
      const transport = jest.fn().mockResolvedValue(true);
      await j.upload({ transport, installId: 'i' });
      const [events] = transport.mock.calls[0];
      const old = events.find((e) => e.event === 'lanstreamer_old');
      const fresh = events.find((e) => e.event === 'lanstreamer_fresh');
      expect(old.properties.delivery).toBe('late');
      expect(fresh.properties.delivery).toBeUndefined();
    });

    it('batches oldest-first (max 100) and stops at the first failure', async () => {
      const j = new TelemetryJournal({ dir });
      for (let i = 0; i < 205; i++) j.record({ event: `lanstreamer_e${i}`, props: {} });
      const transport = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false); // 3rd batch fails -> rest stays
      const r = await j.upload({ transport, installId: 'i' });
      expect(transport).toHaveBeenCalledTimes(3);
      expect(r.sent).toBe(200);
      expect(j.status().pendingCount).toBe(5);
      // oldest (e0..e199) gone; what is left is the newest 5
      const left = readLines(dir).map((l) => JSON.parse(l).event);
      expect(left).toEqual(['lanstreamer_e200', 'lanstreamer_e201', 'lanstreamer_e202', 'lanstreamer_e203', 'lanstreamer_e204']);
    });

    it('never runs two uploads at once (no double-send)', async () => {
      const j = new TelemetryJournal({ dir });
      j.record({ event: 'lanstreamer_a', props: {} });
      j.record({ event: 'lanstreamer_b', props: {} });
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      const transport = jest.fn().mockImplementation(() => new Promise((resolve) => gate.then(() => resolve(true))));
      const first = j.upload({ transport, installId: 'i' });
      const second = await j.upload({ transport, installId: 'i' });
      expect(second.sent).toBe(0);
      expect(second.skipped).toBe(true);
      release();
      await first;
      expect(transport).toHaveBeenCalledTimes(1); // events handed over exactly once
    });

    it('keeps an event recorded during an upload even when the cap evicts part of the batch', async () => {
      const j = new TelemetryJournal({ dir, maxEvents: 3 });
      for (const n of ['a', 'b', 'c']) j.record({ event: `lanstreamer_${n}`, props: {} });
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      const transport = jest.fn()
        .mockImplementationOnce(() => gate.then(() => true)) // a, b, c in flight…
        .mockResolvedValue(false);                           // …then the network drops
      const upload = j.upload({ transport, installId: 'i' });

      j.record({ event: 'lanstreamer_d', props: {} }); // full journal: evicts "a" mid-upload
      release();
      await upload;

      // a, b, c were delivered; d never was, so d must still be on disk
      expect(readLines(dir).map((l) => JSON.parse(l).event)).toEqual(['lanstreamer_d']);
      expect(new TelemetryJournal({ dir }).status().pendingCount).toBe(1);
    });

    it('tells PostHog when the batch was sent, so a wrong PC clock can be corrected', async () => {
      const calls = [];
      const realFetch = globalThis.fetch;
      globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true }; };
      try {
        const { createPostHogBatchTransport } = await import('../../src/services/TelemetryJournal.js');
        const transport = createPostHogBatchTransport({ getKey: () => 'k', getHost: () => 'https://ph.example/' });
        expect(await transport([{ event: 'lanstreamer_a' }])).toBe(true);
      } finally {
        globalThis.fetch = realFetch;
      }
      expect(calls[0].url).toBe('https://ph.example/batch/');
      expect(Number.isNaN(Date.parse(calls[0].body.sent_at))).toBe(false);
      expect(calls[0].body.batch).toHaveLength(1);
    });
  });

  describe('export', () => {
    it('bundles every event still on disk (including previously exported ones) and logs the export', () => {
      const j = new TelemetryJournal({ dir });
      j.record({ event: 'lanstreamer_a', props: { x: 1 } });
      j.record({ event: 'lanstreamer_b', props: {} });
      const b1 = j.exportBundle({ installId: 'uuid-install', appVersion: '2.1.0', platform: 'win32', osVersion: '10.0.26100', arch: 'x64' });
      expect(b1.format).toBe('lanstreamer-diagnostics');
      expect(b1.formatVersion).toBe(1);
      expect(b1.installId).toBe('uuid-install');
      expect(b1.appVersion).toBe('2.1.0');
      expect(b1.eventCount).toBe(2);
      expect(b1.events.map((e) => e.event)).toEqual(['lanstreamer_a', 'lanstreamer_b']);
      expect(b1.firstEventAt).toBe(b1.events[0].ts);
      expect(b1.lastEventAt).toBe(b1.events[1].ts);

      // Exported events are no longer "pending" (they already left via the file)
      expect(j.status().pendingCount).toBe(0);
      expect(j.status().lastExportAt).toBe(b1.exportedAt);
      expect(j.status().exports).toHaveLength(1);
      expect(j.status().exports[0]).toMatchObject({ eventCount: 2 });

      // But they STAY in the journal and appear in the next export too
      j.record({ event: 'lanstreamer_c', props: {} });
      expect(j.status().pendingCount).toBe(1); // only the new one is pending
      const b2 = j.exportBundle({ installId: 'uuid-install' });
      expect(b2.eventCount).toBe(3);
    });

    it('adds no export log entry for an empty export', () => {
      const j = new TelemetryJournal({ dir });
      const b = j.exportBundle({ installId: 'uuid-install' });
      expect(b.eventCount).toBe(0);
      expect(b.events).toEqual([]);
      expect(fs.existsSync(path.join(dir, 'telemetry-delivery.json'))).toBe(false); // nothing logged
    });
  });

  describe('pending / remind logic', () => {
    it('counts only previous-session, un-exported events as remind-worthy', async () => {
      let clock = 1_700_000_000_000;
      const j = new TelemetryJournal({ dir, now: () => clock });
      j.record({ event: 'lanstreamer_prev1', props: {} });
      j.record({ event: 'lanstreamer_prev2', props: {} });
      const appStart = clock + 1000;
      expect(j.pendingBefore(appStart)).toBe(2);

      clock += 60_000; // this session adds one more event
      j.record({ event: 'lanstreamer_this', props: {} });
      expect(j.pendingBefore(appStart)).toBe(2); // still the two from before

      // "startup upload attempt" clears the previous-session backlog
      await j.upload({ transport: jest.fn().mockResolvedValue(true), installId: 'i' });
      expect(j.pendingBefore(appStart)).toBe(0);
    });
  });

  describe('turning telemetry off', () => {
    it('destroy() deletes both files', () => {
      const j = new TelemetryJournal({ dir });
      j.record({ event: 'lanstreamer_a', props: {} });
      j.exportBundle({ installId: 'uuid-install' });
      expect(fs.existsSync(path.join(dir, 'telemetry-journal.jsonl'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'telemetry-delivery.json'))).toBe(true);
      j.destroy();
      expect(fs.existsSync(path.join(dir, 'telemetry-journal.jsonl'))).toBe(false);
      expect(fs.existsSync(path.join(dir, 'telemetry-delivery.json'))).toBe(false);
    });
  });
});

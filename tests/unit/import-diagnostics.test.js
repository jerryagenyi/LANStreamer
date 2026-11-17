/**
 * import-diagnostics.mjs validation unit tests (offline telemetry, layer 3).
 *
 * A diagnostics file is untrusted input handed to us by an operator: it may
 * be truncated, hand-edited, or hostile. validateDiagnosticsFile() must
 * reject wrong format/formatVersion, non-UUID install ids, oversized event
 * lists, non-lanstreamer event names and non-ISO timestamps — and silently
 * drop property values that are not string/number/boolean/null.
 */
import { validateDiagnosticsFile } from '../../scripts/import-diagnostics.mjs';

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function baseFile(overrides = {}) {
  return JSON.stringify({
    format: 'lanstreamer-diagnostics',
    formatVersion: 1,
    exportedAt: '2026-11-16T12:00:00.000Z',
    installId: UUID,
    appVersion: '2.1.0',
    eventCount: 1,
    events: [
      { id: 'e1', ts: '2026-11-16T11:00:00.000Z', event: 'lanstreamer_app_start', props: { app: 'lanstreamer' } },
    ],
    ...overrides,
  });
}

describe('validateDiagnosticsFile', () => {
  it('accepts a valid file and returns a sanitized copy + summary', () => {
    const r = validateDiagnosticsFile(baseFile());
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.data.installId).toBe(UUID);
    expect(r.data.events).toHaveLength(1);
    expect(r.summary).toMatchObject({ installId: UUID, eventCount: 1 });
  });

  it('rejects invalid JSON', () => {
    const r = validateDiagnosticsFile('{not json');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/JSON/i);
  });

  it('rejects a wrong format / formatVersion', () => {
    expect(validateDiagnosticsFile(baseFile({ format: 'something-else' })).ok).toBe(false);
    expect(validateDiagnosticsFile(baseFile({ formatVersion: 2 })).ok).toBe(false);
    expect(validateDiagnosticsFile(baseFile({ format: 'something-else' })).errors.join(' ')).toMatch(/format/);
  });

  it('rejects an installId that is not a UUID', () => {
    const r = validateDiagnosticsFile(baseFile({ installId: '../../etc/passwd' }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/installId/i);
  });

  it('rejects more than 20000 events', () => {
    const events = Array.from({ length: 20001 }, (_, i) => ({
      id: `e${i}`, ts: '2026-11-16T11:00:00.000Z', event: 'lanstreamer_x', props: {},
    }));
    const r = validateDiagnosticsFile(baseFile({ events }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/20000|too many/i);
  });

  it('rejects event names without the lanstreamer_ prefix', () => {
    const r = validateDiagnosticsFile(baseFile({
      events: [{ id: 'e1', ts: '2026-11-16T11:00:00.000Z', event: '$autocapture', props: {} }],
    }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/lanstreamer_/);
  });

  it('rejects non-ISO timestamps', () => {
    const r = validateDiagnosticsFile(baseFile({
      events: [{ id: 'e1', ts: 'yesterday, probably', event: 'lanstreamer_x', props: {} }],
    }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/ts/i);
  });

  it('drops property values that are not string/number/boolean/null', () => {
    const r = validateDiagnosticsFile(baseFile({
      events: [{
        id: 'e1', ts: '2026-11-16T11:00:00.000Z', event: 'lanstreamer_stream_crashed',
        props: { keep: 'yes', n: 3, b: false, nil: null, dropObj: { nested: true }, dropArr: [1] },
      }],
    }));
    expect(r.ok).toBe(true);
    expect(r.data.events[0].props).toEqual({ keep: 'yes', n: 3, b: false, nil: null });
  });
});

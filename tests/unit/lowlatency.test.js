/**
 * LSLowLatency (listener page MSE player) — connection-loss behaviour.
 *
 * Field case (Nigeria, 2026-11): a wired listener sat at ~1 s while Wi-Fi
 * listeners on Chrome/Edge (both MSE-capable) sat at 5–6 s on the same
 * stream. The player treated ANY network error as "low-latency is broken"
 * and handed the listener to the plain <audio> path for the rest of the page
 * load — silently, and that path's delay grows with every Wi-Fi hiccup.
 * A dropped connection is not an MSE failure: reconnect and stay live.
 */
import { jest } from '@jest/globals';

class FakeSourceBuffer {
  constructor() { this.listeners = {}; this.updating = false; this.appended = []; this.aborts = 0; this.buffered = { length: 0 }; }
  addEventListener(type, cb) { (this.listeners[type] ||= []).push(cb); }
  appendBuffer(chunk) {
    if (this.updating) { const e = new Error('still updating'); e.name = 'InvalidStateError'; throw e; }
    this.appended.push(chunk); queueMicrotask(() => (this.listeners.updateend || []).forEach(cb => cb())); }
  abort() { this.aborts++; }
  remove() {}
  emit(type, arg) { (this.listeners[type] || []).forEach(cb => cb(arg)); }
}
class FakeMediaSource {
  static isTypeSupported() { return true; }
  constructor() { this.readyState = 'open'; this.listeners = {}; FakeMediaSource.last = this; }
  addEventListener(type, cb) { this.listeners[type] = cb; }
  addSourceBuffer() { this.sb = new FakeSourceBuffer(); return this.sb; }
  endOfStream() {}
  open() { this.listeners.sourceopen?.(); }
}

globalThis.window = globalThis;
globalThis.MediaSource = FakeMediaSource;
URL.createObjectURL = () => 'blob:fake';
URL.revokeObjectURL = () => {};

await import('../../public/assets/js/lowlatency.js');
const LSLowLatency = globalThis.LSLowLatency;

const CHUNK = new Uint8Array([1, 2, 3]);
const HANG = Symbol('hang');
const END = Symbol('end');

/** One fake HTTP response whose body yields `steps` in order:
 *  a Uint8Array = data, an Error = the connection drops, END = clean close,
 *  HANG = connection stays open with no more data. */
function response(steps) {
  const queue = [...steps];
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: () => {
          const step = queue.shift();
          if (step === HANG || step === undefined) return new Promise(() => {});
          if (step === END) return Promise.resolve({ done: true });
          if (step instanceof Error) return Promise.reject(step);
          return Promise.resolve({ done: false, value: step });
        }
      })
    }
  };
}

function fakeAudio() {
  return { addEventListener() {}, removeEventListener() {}, currentTime: 0, playbackRate: 1, paused: false, buffered: { length: 0 }, src: '' };
}

describe('LSLowLatency connection loss', () => {
  let onError, player;

  beforeEach(() => {
    jest.useFakeTimers();
    onError = jest.fn();
    player = new LSLowLatency(fakeAudio(), { onError });
  });

  afterEach(() => {
    player.stop();
    jest.useRealTimers();
  });

  const start = async () => {
    player.load('/api/streams/play/s1');
    FakeMediaSource.last.open();
    await jest.advanceTimersByTimeAsync(0);
  };

  it('reconnects on the low-latency path when the connection drops (no fallback)', async () => {
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(response([CHUNK, new TypeError('network error')]))
      .mockResolvedValueOnce(response([CHUNK, HANG]));

    await start();
    await jest.advanceTimersByTimeAsync(1000);

    expect(onError).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(player.stats().reconnects).toBe(1);
    // parser state from the dead connection is discarded before new data
    expect(FakeMediaSource.last.sb.aborts).toBeGreaterThanOrEqual(1);
    expect(FakeMediaSource.last.sb.appended).toHaveLength(2);
  });

  it('reconnects when the server closes the stream cleanly', async () => {
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(response([CHUNK, END]))
      .mockResolvedValueOnce(response([CHUNK, HANG]));

    await start();
    await jest.advanceTimersByTimeAsync(1000);

    expect(onError).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps trying through a long outage instead of giving up to the slow path', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await start();
    await jest.advanceTimersByTimeAsync(60_000);

    expect(onError).not.toHaveBeenCalled();
    const attempts = globalThis.fetch.mock.calls.length;
    expect(attempts).toBeGreaterThan(8);   // still retrying a minute in
    expect(attempts).toBeLessThan(40);     // …with backoff, not a hot loop
  });

  it('comes back live on the low-latency path once the network returns', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await start();
    await jest.advanceTimersByTimeAsync(30_000);

    globalThis.fetch = jest.fn().mockResolvedValue(response([CHUNK, CHUNK, HANG]));
    await jest.advanceTimersByTimeAsync(10_000);

    expect(onError).not.toHaveBeenCalled();
    expect(FakeMediaSource.last.sb.appended.length).toBeGreaterThanOrEqual(2);
  });

  it('never appends over an append still in flight when it reconnects', async () => {
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(response([CHUNK, new TypeError('network error')]))
      .mockResolvedValueOnce(response([CHUNK, HANG]));
    await start();
    const sb = FakeMediaSource.last.sb;
    sb.updating = true;            // the browser is still digesting the last chunk…
    player.appending = true;       // …and the player knows it

    await jest.advanceTimersByTimeAsync(1000); // drop → reconnect → new data arrives

    expect(onError).not.toHaveBeenCalled();    // an InvalidStateError here would mean fallback
    expect(sb.aborts).toBe(0);                 // abort() is illegal mid-update too

    sb.updating = false;
    sb.emit('updateend');                      // digest finished → queued data goes in
    await jest.advanceTimersByTimeAsync(0);
    expect(sb.appended.length).toBeGreaterThanOrEqual(2);
  });

  it('stops reconnecting once the player is stopped', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await start();
    const before = globalThis.fetch.mock.calls.length;

    player.stop();
    await jest.advanceTimersByTimeAsync(30_000);

    expect(globalThis.fetch.mock.calls.length).toBe(before);
  });

  it('still falls back when MSE itself fails (decode error on the SourceBuffer)', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(response([CHUNK, HANG]));
    await start();

    FakeMediaSource.last.sb.emit('error', new Error('decode'));

    expect(onError).toHaveBeenCalledTimes(1);
  });
});

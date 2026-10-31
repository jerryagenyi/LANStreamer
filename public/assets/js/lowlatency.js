/**
 * LSLowLatency — MSE-backed low-latency playback for the listener page.
 *
 * WHY: a plain <audio src=...> streaming progressive MP3 lets the browser
 * choose its own buffer-ahead — typically 3-4.5s on a fast LAN, and it DRIFTS
 * upward after every WiFi hiccup (the reported "4-5 seconds" end-to-end).
 * We control latency instead: fetch the same play-proxy stream ourselves and
 * append it to a MediaSource SourceBuffer in small pieces, keeping only
 * ~0.5s buffered ahead and snapping playback back to live when it drifts.
 *
 * Fallback: Safari/iOS do not support 'audio/mpeg' in MSE — callers check
 * LSLowLatency.supported() and keep the plain <audio src> path there.
 *
 * The <audio> element itself is untouched — play()/pause()/paused/events all
 * behave exactly as before, so the page's existing logic (grace, auto-resume,
 * pause icon) keeps working on both paths.
 */
(function () {
  const TARGET_AHEAD = 0.45;   // seconds of buffered audio we keep ahead of playhead
  const MAX_AHEAD = 0.65;      // beyond this, snap back to live (drift grew)
  const SNAP_BACK = 0.30;      // after snapping, playhead sits this far behind live edge
  const MAX_TRIM = 12;         // periodically drop played-out buffer beyond this many seconds

  class LSLowLatency {
    static supported() {
      try {
        return !!(window.MediaSource && MediaSource.isTypeSupported &&
          MediaSource.isTypeSupported('audio/mpeg') && window.ReadableStream);
      } catch { return false; }
    }

    constructor(audioEl, { onError } = {}) {
      this.audio = audioEl;
      this.onError = onError || (() => {});
      this.mediaSource = null;
      this.sourceBuffer = null;
      this.controller = null;
      this.objectURL = null;
      this.queue = [];
      this.appending = false;
      this.stopped = false;
      this.lastSnapAt = 0;
    }

    /** Start feeding from url. The audio element's src is replaced by the
     *  MediaSource object URL — callers then call audio.play() as usual. */
    load(url) {
      this.stop(); // tear down any previous session
      this.stopped = false;
      try {
        this.mediaSource = new MediaSource();
      } catch (e) {
        this.onError(e); return false;
      }
      this.objectURL = URL.createObjectURL(this.mediaSource);
      this.audio.src = this.objectURL;

      this.mediaSource.addEventListener('sourceopen', () => {
        try {
          this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
          this.sourceBuffer.mode = 'sequence';
          // updateend = the previous append FINISHED — clear the in-flight flag
          // or every later _pump() returns early and the queue grows forever.
          this.sourceBuffer.addEventListener('updateend', () => { this.appending = false; this._pump(); });
          this.sourceBuffer.addEventListener('error', (e) => { this.appending = false; this.onError(e); });
          this._fetch(url);
        } catch (e) {
          this.onError(e);
        }
      }, { once: true });

      // Underrun recovery: when the buffer runs dry (WiFi jitter), jump to
      // the live edge as soon as data exists again instead of spinning.
      this._onWaiting = () => {
        const b = this._bufferedEnd();
        if (b !== null && b - this.audio.currentTime > 0.05) {
          this.audio.currentTime = b - 0.05;
        }
      };
      this.audio.addEventListener('waiting', this._onWaiting);
      return true;
    }

    async _fetch(url) {
      this.controller = new AbortController();
      try {
        const res = await fetch(url, { signal: this.controller.signal, cache: 'no-store' });
        if (!res.ok || !res.body) throw new Error('proxy ' + res.status);
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (this.stopped) return;
          this.queue.push(value);
          this._pump();
        }
      } catch (e) {
        if (this.stopped || e.name === 'AbortError') return;
        this.onError(e);
      }
    }

    _pump() {
      if (this.stopped || !this.sourceBuffer || this.appending) return;
      const chunk = this.queue.shift();
      if (!chunk) { this._trim(); return; }
      try {
        this.appending = true;
        this.sourceBuffer.appendBuffer(chunk);
      } catch (e) {
        this.appending = false;
        // QuotaExceeded or invalid state — drop the chunk; network continues
        if (e.name !== 'QuotaExceededError') this.onError(e);
      }
      this._trim();
    }

    /** Keep the playhead near the live edge and drop played-out buffer. */
    _trim() {
      const sb = this.sourceBuffer, a = this.audio;
      if (!sb || sb.updating) return;
      const end = this._bufferedEnd();
      if (end === null) return;

      // Drift snap: buffered-ahead grew past MAX_AHEAD → back to live.
      // Rate-limited to once per second (each snap is a tiny audible skip).
      const ahead = end - a.currentTime;
      const now = Date.now();
      if (ahead > MAX_AHEAD && now - this.lastSnapAt > 1000 && !a.paused) {
        a.currentTime = Math.max(0, end - SNAP_BACK);
        this.lastSnapAt = now;
      }

      // Remove played-out buffer so SourceBuffer quota never fills.
      for (let i = 0; i < sb.buffered.length; i++) {
        const s = sb.buffered.start(i), e2 = sb.buffered.end(i);
        if (e2 - s > MAX_TRIM && a.currentTime - s > 2) {
          try { sb.remove(s, Math.max(s, a.currentTime - 2)); } catch { /* busy; next pass */ }
          break;
        }
      }
    }

    _bufferedEnd() {
      const b = this.sourceBuffer ? this.sourceBuffer.buffered : this.audio.buffered;
      if (!b || b.length === 0) return null;
      return b.end(b.length - 1);
    }

    /** Latency in seconds between live edge and playhead (for diagnostics). */
    stats() {
      const end = this._bufferedEnd();
      return {
        mode: 'mse',
        bufferedAhead: end === null ? null : Math.max(0, +(end - this.audio.currentTime).toFixed(2)),
        queued: this.queue.length
      };
    }

    stop() {
      this.stopped = true;
      try { this.controller?.abort(); } catch { /* already */ }
      try { this.audio.removeEventListener('waiting', this._onWaiting); } catch { /* not attached */ }
      try { if (this.sourceBuffer && !this.sourceBuffer.updating) this.sourceBuffer.abort(); } catch { /* closed */ }
      try { if (this.mediaSource && this.mediaSource.readyState === 'open') this.mediaSource.endOfStream(); } catch { /* closed */ }
      if (this.objectURL) { URL.revokeObjectURL(this.objectURL); this.objectURL = null; }
      this.queue = [];
      this.appending = false;
      this.sourceBuffer = null;
      this.mediaSource = null;
    }
  }

  window.LSLowLatency = LSLowLatency;
})();

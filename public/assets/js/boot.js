/**
 * Boot screen controller.
 *
 * The overlay markup lives inline in each page (so it paints before any CSS
 * file loads). This script owns the lifecycle:
 *   - LSBoot.ready()  → fade the overlay out (called when the app finished init)
 *   - LSBoot.fail(msg) → swap the overlay to a load-failed state with the
 *     error and a Retry button. Also happens automatically after TIMEOUT_MS.
 *
 * Timeout choice: 12 seconds. Cold dashboard start (Icecast detection, FFmpeg
 * checks) can take several seconds; the overlay dismisses as soon as the main
 * components mount, so 12s only trips when something is genuinely broken.
 */
(function () {
  const overlay = document.getElementById('boot-overlay');
  if (!overlay) return;

  const TIMEOUT_MS = 12000;
  let done = false;

  function fail(message) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;padding:24px;max-width:420px;">
        <img src="/assets/logo-mark.svg" alt="" style="height:52px;width:52px;" onerror="this.style.display='none'">
        <div style="font-size:1.05rem;font-weight:700;color:#F2F5F9;">LANStreamer failed to load</div>
        <div style="font-size:0.85rem;color:#9AA3B2;line-height:1.5;">
          Check that the LANStreamer server is running, then retry.
        </div>
        ${message ? `<div id="boot-error" style="font-size:0.78rem;color:#F87171;word-break:break-word;line-height:1.4;"></div>` : ''}
        <button type="button" onclick="location.reload()"
          style="margin-top:4px;padding:10px 22px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:#00AEEF;color:#fff;font-weight:600;font-size:0.875rem;cursor:pointer;">
          Retry
        </button>
      </div>`;
    const errEl = document.getElementById('boot-error');
    if (errEl) errEl.textContent = String(message).slice(0, 200);
  }

  const timer = setTimeout(() => fail('Timed out while loading components.'), TIMEOUT_MS);

  function ready() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => overlay.remove(), 450);
    document.dispatchEvent(new CustomEvent('ls:boot-ready'));
  }

  window.LSBoot = { ready, fail };

  // Show the app version under the wordmark when the API is reachable
  fetch('/api/info').then(r => (r.ok ? r.json() : null)).then(j => {
    const el = document.getElementById('boot-version');
    if (el && j && j.data && j.data.version) el.textContent = 'v' + j.data.version;
  }).catch(() => { /* version stays blank */ });
})();

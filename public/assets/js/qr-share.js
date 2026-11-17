/**
 * Share popup with QR code: LSShare.show(url) opens a small modal with a
 * scannable QR (served offline by /api/qr), the URL, and a copy button.
 */
(function () {
  'use strict';

  function show(url) {
    close();
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4';
    modal.id = 'ls-share-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Share listener page');
    modal.innerHTML = `
      <div class="w-full max-w-sm rounded-2xl p-6 text-center"
           style="background:var(--tok-surface-1,#1A1A1A);border:1px solid var(--tok-line-strong,#2F2F2F);box-shadow:var(--tok-shadow-pop,0 12px 40px rgba(0,0,0,.55));">
        <h3 class="text-base font-semibold mb-1" style="color:var(--tok-text-1,#fff);">Scan to listen</h3>
        <p class="text-xs mb-4" style="color:var(--tok-text-3,#8A93A0);">Open the listener page on your phone</p>
        <div class="mx-auto w-fit p-3 bg-white rounded-xl">
          <img src="/api/system/qr?url=${encodeURIComponent(url)}" alt="QR code for ${url}"
               width="240" height="240" style="display:block;">
        </div>
        <p class="mt-4 text-xs break-all font-mono" style="color:var(--tok-text-2,#9AA3B2);">${url}</p>
        <div class="flex gap-2 mt-4">
          <button type="button" data-share-copy class="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold text-white"
                  style="background:linear-gradient(135deg,var(--tok-accent,#00AEEF),var(--tok-accent-strong,#0088CC));">
            Copy link
          </button>
          <button type="button" data-share-close class="px-4 py-2.5 rounded-full text-sm font-semibold"
                  style="background:var(--tok-surface-2,#12151C);color:var(--tok-text-1,#fff);border:1px solid var(--tok-line-strong,#2F2F2F);">
            Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('[data-share-close]').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('[data-share-copy]').addEventListener('click', async (e) => {
      const ok = await copy(url);
      e.target.textContent = ok ? 'Copied!' : 'Copy failed — select the link above';
      setTimeout(() => { e.target.textContent = 'Copy link'; }, ok ? 1500 : 4000);
    });
  }

  /** Copy text to the clipboard; resolves true/false and never opens a native
   *  dialog (UI rule). navigator.clipboard needs a secure context (localhost or
   *  HTTPS) — over plain http://<LAN-IP> fall back to execCommand. */
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through to the legacy path */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function close() {
    document.getElementById('ls-share-modal')?.remove();
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  window.LSShare = { show, close, copy };
})();

/**
 * Lightbox: click any <img data-lightbox> to view the full image scaled to
 * fit the window (contain), over a dim backdrop. Closes on backdrop click,
 * Esc, or the × button. Self-contained; used by the listener page and the
 * admin dashboard for the event banner.
 */
(function () {
  let overlay = null;

  function open(src, alt) {
    if (!src || overlay) return;
    overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Image preview');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(4,6,10,.82);backdrop-filter:blur(3px);cursor:zoom-out;padding:24px;';
    overlay.innerHTML =
      '<button type="button" aria-label="Close" style="position:fixed;top:16px;right:16px;width:40px;height:40px;border-radius:50%;' +
      'border:1px solid rgba(255,255,255,.25);background:rgba(15,18,26,.7);color:#fff;display:grid;place-items:center;cursor:pointer;">' +
      '<span class="material-symbols-rounded" style="font-size:20px;">close</span></button>' +
      '<img src="' + src + '" alt="' + (alt || 'Full image') + '" style="max-width:min(94vw,1600px);max-height:88vh;' +
      'object-fit:contain;display:block;border-radius:8px;cursor:default;">';
    overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('button')) close(); });
    document.body.appendChild(overlay);
    document.addEventListener('keydown', escClose);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay._prevOverflow = prevOverflow;
  }

  function escClose(e) { if (e.key === 'Escape') close(); }

  function close() {
    if (!overlay) return;
    document.removeEventListener('keydown', escClose);
    document.body.style.overflow = overlay._prevOverflow || '';
    overlay.remove();
    overlay = null;
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-lightbox]');
    if (!img) return;
    e.preventDefault();
    open(img.currentSrc || img.src, img.alt);
  });

  window.LSLightbox = { open, close };
})();

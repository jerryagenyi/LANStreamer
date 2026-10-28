/**
 * Marquee: single-line labels that scroll horizontally when they overflow
 * (e.g. long audio device names). Hover pauses the scroll and the native
 * title tooltip shows the full text. Auto-detects via MutationObserver —
 * any element structured as <span class="mq" title="..."><span class="mq-inner">…</span></span>
 * is scanned automatically after renders.
 */
(function () {
  'use strict';

  function scan() {
    document.querySelectorAll('.mq').forEach((el) => {
      const inner = el.querySelector('.mq-inner');
      if (!inner) return;
      const overflow = inner.scrollWidth - el.clientWidth;
      if (overflow > 8) {
        el.classList.add('mq-on');
        const shift = -(overflow + 16);
        el.style.setProperty('--mq-shift', shift + 'px');
        // ~35px per second, min 2s
        const dur = Math.max(2, Math.round(Math.abs(shift) / 35));
        el.style.setProperty('--mq-dur', dur + 's');
      } else {
        el.classList.remove('mq-on');
      }
    });
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  });

  function init() {
    scan();
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', scan);
  window.LSMarquee = { scan };
})();

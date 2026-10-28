/**
 * Dismissible notices helper.
 * Notices that the user has dismissed stay hidden (per browser, via localStorage)
 * and can be brought back with their inline "Show" stub.
 *
 * Usage:
 *   if (LSNotices.isDismissed('security-warning')) { ...render stub... }
 *   LSNotices.dismiss('security-warning');
 *   LSNotices.restore('security-warning');
 */
(function () {
  'use strict';

  const PREFIX = 'lanstreamer.dismissed.';

  function isDismissed(id) {
    try { return localStorage.getItem(PREFIX + id) === '1'; } catch { return false; }
  }

  function dismiss(id) {
    try { localStorage.setItem(PREFIX + id, '1'); } catch { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('lsnotice-dismissed', { detail: { id } }));
  }

  function restore(id) {
    try { localStorage.removeItem(PREFIX + id); } catch { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('lsnotice-restored', { detail: { id } }));
  }

  /**
   * Standard dismiss (x) button. Delegates the click, so it works from innerHTML.
   */
  function dismissButton(id, extraClasses) {
    return `<button type="button" data-ls-dismiss="${id}" aria-label="Dismiss notice" class="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 ${extraClasses || ''}">
      <span class="material-symbols-rounded text-lg" aria-hidden="true">close</span>
    </button>`;
  }

  /**
   * Compact stub shown in place of a dismissed notice, with a "Show" link.
   */
  function hiddenStub(id, label, extraClasses) {
    return `<div class="flex items-center justify-center gap-2 py-2 text-xs text-gray-500 ${extraClasses || ''}">
      <span>${label} hidden</span>
      <button type="button" data-ls-restore="${id}" class="underline hover:text-gray-300 transition-colors">Show</button>
    </div>`;
  }

  // Delegate clicks for data-ls-dismiss / data-ls-restore anywhere in the document
  document.addEventListener('click', (e) => {
    const dismissEl = e.target.closest('[data-ls-dismiss]');
    if (dismissEl) {
      dismiss(dismissEl.getAttribute('data-ls-dismiss'));
      return;
    }
    const restoreEl = e.target.closest('[data-ls-restore]');
    if (restoreEl) {
      restore(restoreEl.getAttribute('data-ls-restore'));
    }
  });

  window.LSNotices = { isDismissed, dismiss, restore, dismissButton, hiddenStub };
})();

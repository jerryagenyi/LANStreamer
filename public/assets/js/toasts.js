/**
 * Toast notifications that STACK instead of overlapping.
 *
 * Every earlier implementation positioned toasts at a fixed spot, so a second
 * toast covered the first. LSToasts keeps one container per page and appends
 * into it; new toasts push older ones down.
 *
 *   LSToasts.show('Connecting…', 'info', { tag: 'play' })   // same tag replaces
 *   LSToasts.show('Now playing', 'success', { tag: 'play' })
 *   LSToasts.dismiss('play')                                // remove by tag
 *
 * Toast styles come from .toast / .toast-* classes in ui.css (token-driven,
 * both themes).
 */
(function () {
  const DEFAULT_TIMEOUT = { info: 6000, success: 6000, warning: 10000, error: 30000 };
  const live = new Map(); // tag -> element

  function container() {
    let el = document.getElementById('toast-stack');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-stack';
      el.className = 'toast-stack';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  function dismiss(tag) {
    const el = live.get(tag);
    if (!el) return;
    live.delete(tag);
    remove(el);
  }

  function remove(el) {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 300);
  }

  function show(message, type = 'info', opts = {}) {
    // A tagged toast replaces its predecessor (e.g. "Connecting…" → "Now playing")
    if (opts.tag) dismiss(opts.tag);

    const stack = container();
    // Prune so a burst of toasts can't pile up unbounded
    while (stack.children.length >= 4) remove(stack.firstElementChild);

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="material-symbols-rounded toast-icon" aria-hidden="true">${
        type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'
      }</span>
      <span class="toast-message"></span>
      <button type="button" class="toast-close" aria-label="Dismiss notification">
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>`;
    // Fill text via textContent — message may contain user-controlled stream names
    toast.querySelector('.toast-message').textContent = message;

    if (opts.tag) live.set(opts.tag, toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
      if (opts.tag) live.delete(opts.tag);
      remove(toast);
    });
    if (opts.linkUrl && opts.linkText) {
      const a = document.createElement('a');
      a.href = opts.linkUrl;
      a.textContent = opts.linkText;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.cssText = 'color:var(--tok-accent);text-decoration:underline;white-space:nowrap;margin-left:0.375rem;';
      toast.querySelector('.toast-message').appendChild(a);
    }

    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT[type] ?? 6000;
    setTimeout(() => {
      if (toast.isConnected) {
        if (opts.tag && live.get(opts.tag) === toast) live.delete(opts.tag);
        remove(toast);
      }
    }, timeout);
  }

  window.LSToasts = { show, dismiss };
})();

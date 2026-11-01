/**
 * Collapsible card sections whose open/closed state is remembered per browser.
 *
 * Usage from component templates:
 *   LSCollapse.wrap(key, { icon, title, badge, aside }, innerHtml, defaultOpen)
 *     - key         unique storage key ('event-details', 'icecast-info', ...)
 *     - badge       optional HTML chip rendered next to the title
 *     - aside       optional HTML rendered on the right of the toggle row
 *     - defaultOpen used until the user toggles (state persists after that)
 *
 * The toggle itself is a delegated listener on document, so re-rendered
 * components keep working without re-binding.
 */
(function () {
  const PREFIX = 'ls-collapse:';

  function isOpen(key, defaultOpen = false) {
    try {
      const saved = localStorage.getItem(PREFIX + key);
      if (saved === 'open') return true;
      if (saved === 'closed') return false;
    } catch (e) { /* storage unavailable — fall through to default */ }
    return defaultOpen;
  }

  function save(key, open) {
    try { localStorage.setItem(PREFIX + key, open ? 'open' : 'closed'); } catch (e) { /* ignore */ }
  }

  function wrap(key, opts, innerHtml, defaultOpen = false) {
    const o = opts || {};
    const open = isOpen(key, defaultOpen);
    const icon = o.iconHtml ? o.iconHtml
      : (o.icon ? `<span class="material-symbols-rounded text-lg ls-collapse-icon" aria-hidden="true">${o.icon}</span>` : '');
    // plain: no card chrome — just a bottom-bordered row + arrow (nested disclosures)
    const cls = `ls-collapse glass-card${o.plain ? ' ls-collapse--plain' : ''}`;
    return `
      <div class="${cls}" data-ls-collapse="${key}">
        <button type="button" class="ls-collapse-toggle" data-ls-collapse-toggle="${key}" aria-expanded="${open}">
          <span class="flex items-center gap-2.5 min-w-0">
            ${icon}
            <span class="ls-collapse-title">${o.title || key}</span>
            ${o.badge || ''}
          </span>
          <span class="flex items-center gap-2">
            ${o.aside || ''}
            <span class="material-symbols-rounded ls-collapse-chevron ${open ? 'is-open' : ''}" aria-hidden="true">expand_more</span>
          </span>
        </button>
        <div class="ls-collapse-body ${open ? '' : 'is-closed'}" data-ls-collapse-body="${key}">
          ${innerHtml}
        </div>
      </div>`;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ls-collapse-toggle]');
    if (!btn) return;
    // Don't swallow clicks on interactive elements placed in `aside`
    if (e.target.closest('button:not([data-ls-collapse-toggle]), a, input')) return;
    const key = btn.getAttribute('data-ls-collapse-toggle');
    const body = document.querySelector(`[data-ls-collapse-body="${key}"]`);
    if (!body) return;
    const willOpen = body.classList.contains('is-closed');
    body.classList.toggle('is-closed', !willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
    const chevron = btn.querySelector('.ls-collapse-chevron');
    if (chevron) chevron.classList.toggle('is-open', willOpen);
    save(key, willOpen);
  });

  // Hydrate statically-authored collapsibles (not built via wrap()) from the
  // remembered state, so a saved "open" survives reloads.
  function hydrateStatic() {
    document.querySelectorAll('[data-ls-collapse]').forEach(el => {
      const key = el.getAttribute('data-ls-collapse');
      const open = isOpen(key, el.hasAttribute('data-ls-default-open'));
      const body = el.querySelector(`[data-ls-collapse-body="${key}"]`);
      const btn = el.querySelector(`[data-ls-collapse-toggle="${key}"]`);
      if (!body || !btn) return;
      body.classList.toggle('is-closed', !open);
      btn.setAttribute('aria-expanded', String(open));
      const chevron = btn.querySelector('.ls-collapse-chevron');
      if (chevron) chevron.classList.toggle('is-open', open);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateStatic);
  } else {
    hydrateStatic();
  }

  window.LSCollapse = { wrap, isOpen, save };
})();

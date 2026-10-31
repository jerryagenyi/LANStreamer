/**
 * Theme toggle: dark (default) / light mode.
 * Persists choice in localStorage, honours prefers-color-scheme on first
 * visit, and swaps any logo with [data-theme-logo] between the dark and
 * light SVG variants.
 */
(function () {
  'use strict';

  const KEY = 'lanstreamer.theme';
  const DARK_LOGO = '/assets/logo.svg?v=3';
  const LIGHT_LOGO = '/assets/logo-light.svg?v=3';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('img[data-theme-logo]').forEach((img) => {
      if (img.getAttribute('src') !== DARK_LOGO && img.getAttribute('src') !== LIGHT_LOGO) {
        // Custom/fallback logo in play — leave it alone
        return;
      }
      img.setAttribute('src', theme === 'light' ? LIGHT_LOGO : DARK_LOGO);
    });
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      btn.setAttribute('aria-pressed', String(theme === 'light'));
      const icon = btn.querySelector('.material-symbols-rounded');
      if (icon) icon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
    });
  }

  function current() {
    try { return localStorage.getItem(KEY) || 'dark'; } catch { return 'dark'; }
  }

  function init() {
    let theme = current();
    if (!localStorage.getItem(KEY) && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
    apply(theme);
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      const next = current() === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
      apply(next);
    });
  }

  // For components rendered AFTER init() ran (the dashboard header is injected
  // post-boot, so apply()'s one-time swap misses it): ask for the right logo
  // at render time. Attribute is the source of truth (set by every apply()).
  window.LSTheme = {
    logoSrc: () => (document.documentElement.getAttribute('data-theme') === 'light' ? LIGHT_LOGO : DARK_LOGO)
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

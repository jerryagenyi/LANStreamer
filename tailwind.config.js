import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/**
 * LANStreamer design system.
 * Single source of truth: public/assets/css/tokens.css defines the --tok-*
 * CSS variables (dark default + [data-theme="light"] overrides). This config
 * maps them into Tailwind (v3 theme.extend) so semantic utilities like
 * `bg-surface-1`, `text-muted`, `border-line` work in markup and stay
 * theme-aware automatically. Do NOT hardcode hex colors in new UI code.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './public/**/*.html',
    './public/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--tok-bg)',
        'surface-1': 'var(--tok-surface-1)',
        'surface-2': 'var(--tok-surface-2)',
        inset: 'var(--tok-surface-inset)',
        ink: 'var(--tok-text-1)',
        muted: 'var(--tok-text-2)',
        faint: 'var(--tok-text-3)',
        line: 'var(--tok-line)',
        'line-strong': 'var(--tok-line-strong)',
        accent: 'var(--tok-accent)',
        'accent-strong': 'var(--tok-accent-strong)',
        live: 'var(--tok-live)',
        warn: 'var(--tok-warning)',
        danger: 'var(--tok-danger)',
      },
      borderRadius: {
        card: 'var(--tok-radius-card)',
        input: 'var(--tok-radius-input)',
        pill: 'var(--tok-radius-btn)',
      },
      boxShadow: {
        card: 'var(--tok-shadow-card)',
        pop: 'var(--tok-shadow-pop)',
        glow: 'var(--tok-accent-glow)',
      },
    },
  },
  plugins: [
    forms,
    containerQueries,
  ],
};

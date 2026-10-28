import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './public/**/*.html',
    './public/**/*.js',
  ],
  plugins: [
    forms,
    containerQueries,
  ],
};

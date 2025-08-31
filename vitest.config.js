import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude end-to-end tests from the unit/integration test runner
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
  },
});

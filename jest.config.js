/**
 * Jest Configuration for LANStreamer
 *
 * Test Organization:
 * - tests/unit/       : Isolated unit tests for individual functions/modules
 * - tests/integration/: Tests that verify multiple components working together
 * - tests/e2e/        : End-to-end tests simulating real user workflows
 *
 * Run tests:
 *   npm test                  # Run all tests once
 *   npm test -- --watch       # Watch mode for development
 *   npm test -- --coverage    # Generate coverage report
 *   npm test -- unit          # Run only unit tests
 *   npm test -- integration   # Run only integration tests
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',           // Entry point, low value
    '!src/**/*.test.js',        // Exclude test files
    '!src/config/index.js'      // Config files are environment-specific
  ],

  coverageThreshold: {
    global: {
      statements: 30,
      branches: 25,
      functions: 30,
      lines: 30
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout for integration tests (may need more time for Icecast/FFmpeg)
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for better debugging
  verbose: true,

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ]
};

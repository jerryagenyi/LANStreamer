// @ts-check
const { defineConfig, devices } = require('@playwright/test')

/**
 * Playwright Configuration for LANStreamer E2E Testing
 * 
 * This file configures Playwright for end-to-end testing of the LANStreamer application.
 * It includes settings for different browsers, test environments, and reporting.
 */

module.exports = defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Global test timeout
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
})

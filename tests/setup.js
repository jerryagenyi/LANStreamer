/**
 * Jest Setup File
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOST = '127.0.0.1';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to silence logs during tests:
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Cleanup: Kill any lingering processes after all tests
afterAll(async () => {
  // Give processes time to clean up
  await new Promise(resolve => setTimeout(resolve, 500));
});

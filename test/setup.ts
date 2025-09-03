/**
 * Jest test setup file
 * 
 * This file runs before all tests to set up the testing environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.FYND_APPLICATION_KEY = 'test_key';
process.env.FYND_APPLICATION_TOKEN = 'test_token';
process.env.LOG_LEVEL = 'silent';
process.env.CACHE_TTL_SECONDS = '60';
process.env.CACHE_MAX_SIZE = '100';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(10000);

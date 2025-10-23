module.exports = {
  // Test environment configuration
  testEnvironment: "node",

  // Setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // Test patterns - E2E tests
  testMatch: [
    "<rootDir>/tests/e2e/extension.test.js",
    "<rootDir>/tests/e2e/user-journey.test.js",
    "<rootDir>/tests/e2e/first-install.test.js",
  ],

  // Module paths for extension files
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@tests/(.*)$": "<rootDir>/tests/$1",
  },

  // Mock Chrome extension APIs
  setupFiles: ["<rootDir>/tests/chrome-mock.js"],

  // Test timeout
  testTimeout: 60000,

  // FORCE console output to be visible
  verbose: true,
  silent: false,

  // Disable coverage for cleaner output
  collectCoverage: false,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Transform node_modules for ES modules
  transformIgnorePatterns: ["node_modules/(?!(fake-indexeddb)/)"],

  // Transform files for testing
  transform: {
    "^.+\\.js$": "babel-jest",
  },
};

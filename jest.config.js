module.exports = {
  // Test environment configuration
  testEnvironment: "node",

  // Setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // Test patterns
  testMatch: ["<rootDir>/tests/**/*.test.js", "<rootDir>/tests/**/*.spec.js"],

  // Module paths for extension files
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@tests/(.*)$": "<rootDir>/tests/$1",
  },

  // Collect coverage from these files
  collectCoverageFrom: [
    "src/service/**/*.js",
    "src/shared/**/*.js",
    "src/content/**/*.js",
    "src/pages/**/*.js",
    "src/exercise/**/*.js",
    "src/stats/**/*.js",
    "src/templates/**/*.js",
    "!**/node_modules/**",
    "!**/tests/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Transform files for testing
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Mock Chrome extension APIs
  setupFiles: ["<rootDir>/tests/chrome-mock.js"],

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: false, // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Transform node_modules for ES modules
  transformIgnorePatterns: ["node_modules/(?!(fake-indexeddb)/)"],
};

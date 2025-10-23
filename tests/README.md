# Testing Documentation for Veris Chrome Extension

## Overview

This document describes the comprehensive test suite for the Veris Chrome Extension, covering unit tests, integration tests, and end-to-end tests for all major features including translation, vocabulary management, spaced repetition system (SRS), and user interface components.

## Test Structure

```
tests/
├── setup.js              # Global test setup and utilities
├── chrome-mock.js         # Chrome extension API mocks
├── unit/                  # Unit tests for individual components
│   ├── database.service.test.js     # Database operations tests
│   ├── exercise.service.test.js     # SRS and exercise tests
│   ├── api.test.js                  # Translation API tests
│   ├── content-script.test.js       # Content script functionality
│   └── exercise-settings-loading.test.js # Exercise settings loading tests
├── integration/           # Integration tests for UI components
│   ├── popup.test.js               # Popup interface tests
│   ├── options.test.js             # Options page tests
│   └── exercise-settings.test.js   # Exercise settings integration tests
└── e2e/                  # End-to-end tests with Puppeteer
    └── extension.test.js           # Complete user workflow tests
```

## Test Categories

### 1. Unit Tests

#### Database Service Tests (`database.service.test.js`)

- **IndexedDB Operations**: Database initialization, connection handling
- **Vocabulary CRUD**: Create, read, update, delete operations
- **Search and Filtering**: Language pairs, date ranges, word searches
- **Statistics**: Vocabulary stats calculation and aggregation
- **Error Handling**: Database failures, transaction errors
- **Performance**: Large dataset handling, concurrent operations

#### Exercise Service Tests (`exercise.service.test.js`)

- **SRS (Leitner System)**: Box progression, due date calculations
- **Exercise Scheduling**: Daily alarms, time validation
- **Settings Management**: Exercise preferences, validation
- **Language Filtering**: Multi-language support
- **Progress Tracking**: Statistics and completion rates
- **Notification Integration**: Exercise reminders

#### Translation API Tests (`api.test.js`)

- **Translation Requests**: Text translation via Chrome's Translation API
- **Error Handling**: Network failures, quota limits, API unavailability
- **Language Support**: Multiple language pairs, auto-detection
- **Input Validation**: Text sanitization, empty input handling
- **Performance**: Concurrent translations, caching behavior

#### Content Script Tests (`content-script.test.js`)

- **Text Selection**: DOM selection detection and handling
- **Translation Bubbles**: Bubble creation, positioning, removal
- **Keyboard Shortcuts**: Hotkey detection and handling
- **Word Pills**: Vocabulary selection and saving
- **Context Preservation**: Text context extraction
- **Event Management**: Mouse/keyboard event handling

#### Exercise Settings Loading Tests (`exercise-settings-loading.test.js`)

- **loadExerciseSettings Method**: Settings loading from storage
- **Questions Per Session Loading**: Custom question count handling
- **Difficulty Loading**: User-defined difficulty settings
- **Error Handling**: Storage failure graceful degradation
- **Default Fallback**: Behavior when settings are missing
- **UI Updates**: Difficulty button selection updates

### 2. Integration Tests

#### Popup Integration Tests (`popup.test.js`)

- **Vocabulary Browser**: List rendering, search, filtering
- **Edit Mode**: Inline editing, save/delete operations
- **Navigation**: Exercise, options, stats page navigation
- **Extension Toggle**: Enable/disable functionality
- **Context Display**: Context panel toggling
- **Error States**: Loading failures, empty states

#### Options Integration Tests (`options.test.js`)

- **Settings Forms**: Translation preferences, exercise settings
- **Form Validation**: Input validation, error messages
- **Data Persistence**: Settings save/load operations
- **UI Interactions**: Form controls, responsive design
- **Import/Export**: Data management operations
- **Accessibility**: Keyboard navigation, ARIA support

#### Exercise Settings Integration Tests (`exercise-settings.test.js`)

- **Settings Loading**: User preference integration with exercise system
- **Questions Per Session**: Custom question count validation
- **Difficulty Settings**: User-defined difficulty persistence
- **Fallback Behavior**: Default values when settings fail to load
- **Mixed Difficulty**: Handling of user-selectable difficulty mode
- **Storage Integration**: Chrome storage sync operations

### 3. End-to-End Tests

#### Extension E2E Tests (`extension.test.js`)

- **Installation**: Extension loading and initialization
- **Complete Workflows**: Translation → vocabulary saving → exercises
- **Cross-page Functionality**: Content script injection across sites
- **User Interactions**: Real browser interactions and flows
- **Performance**: Load times, memory usage, responsiveness
- **Error Recovery**: Offline mode, corrupted data handling
- **Accessibility**: Keyboard navigation, focus management

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  setupFiles: ["<rootDir>/tests/chrome-mock.js"],
  collectCoverageFrom: [
    "service/**/*.js",
    "src/**/*.js",
    "popup.js",
    "background.js",
    "content_script.js",
    "options.js",
    "exercise/**/*.js",
    "stats/**/*.js",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Chrome Extension Mocking

- **Storage API**: Sync and local storage simulation
- **Runtime API**: Message passing, extension lifecycle
- **Tabs API**: Tab management and language detection
- **Alarms API**: Scheduled notifications and exercises
- **Notifications API**: System notifications
- **IndexedDB**: Fake IndexedDB for database testing

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### End-to-End Tests Only

```bash
npm run test:e2e
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

## Test Utilities

### Custom Matchers

- `toBeValidVocabularyEntry()`: Validates vocabulary entry structure
- `toBeValidLanguageCode()`: Validates ISO language codes

### Test Helpers

- `testUtils.createMockVocabularyEntry()`: Creates mock vocabulary entries
- `testUtils.createMockExerciseSettings()`: Creates mock exercise settings
- `testUtils.waitFor()`: Async condition waiting
- `testUtils.flushPromises()`: Promise resolution helper

### Mock Data

- **Vocabulary Entries**: Realistic translation data
- **Exercise Settings**: Valid configuration objects
- **User Preferences**: Chrome storage data
- **Translation Results**: API response simulation

## Coverage Requirements

### Minimum Coverage Thresholds

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Critical Path Coverage

- **Translation Flow**: 95% coverage required
- **Data Persistence**: 90% coverage required
- **SRS Algorithm**: 85% coverage required
- **User Interface**: 80% coverage required

## Test Data Management

### Mock Data Files

```javascript
// Example vocabulary entry
const mockEntry = {
  id: 1,
  timestamp: "2023-10-04T10:00:00.000Z",
  originalWord: "hello",
  translatedWord: "hola",
  sourceLanguage: "en",
  targetLanguage: "es",
  context: "Hello, how are you?",
  contextTranslation: "Hola, ¿cómo estás?",
  url: "https://example.com",
  domain: "example.com",
  sessionId: "session_123",
};
```

### Test Database

- **Isolation**: Each test uses fresh IndexedDB instance
- **Cleanup**: Automatic cleanup after each test
- **Seeding**: Consistent test data setup

## Continuous Integration

### GitHub Actions / CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:coverage
      - run: npm run test:e2e
```

### Pre-commit Hooks

- **Lint Tests**: ESLint validation
- **Type Checking**: TypeScript/JSDoc validation
- **Test Execution**: Run affected tests only

## Debugging Tests

### Chrome DevTools

```bash
# Debug specific test file
npm run test:debug -- tests/unit/database.service.test.js
```

### Puppeteer Debugging

```javascript
// Enable visual debugging
const browser = await puppeteer.launch({
  headless: false,
  devtools: true,
  slowMo: 250,
});
```

### Jest Debugging

```bash
# Run with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Testing

### Load Testing

- **Large Vocabularies**: 10,000+ entries
- **Concurrent Operations**: Multiple translations
- **Memory Usage**: Long-running sessions
- **Storage Limits**: Quota management

### Benchmarking

```javascript
// Example performance test
test("should handle large vocabulary search within 100ms", async () => {
  const startTime = performance.now();
  const results = await searchVocabulary(query);
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(100);
});
```

## Accessibility Testing

### WCAG Compliance

- **Keyboard Navigation**: Tab order and focus management
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: Visual accessibility standards
- **Focus Indicators**: Visible focus states

### Testing Tools

- **axe-core**: Automated accessibility testing
- **Lighthouse**: Performance and accessibility audits
- **Manual Testing**: Keyboard and screen reader testing

## Security Testing

### Content Security Policy

- **XSS Prevention**: Input sanitization tests
- **Script Injection**: Malicious content handling
- **Data Validation**: User input validation

### Permission Testing

- **Minimal Permissions**: Required permissions only
- **Data Access**: Proper data isolation
- **Cross-origin**: Secure content script injection

## Best Practices

### Test Writing Guidelines

1. **Descriptive Names**: Clear test descriptions
2. **Single Responsibility**: One assertion per test
3. **Arrange-Act-Assert**: Consistent test structure
4. **Mock External Dependencies**: Isolated testing
5. **Test Edge Cases**: Error conditions and boundaries

### Test Maintenance

1. **Regular Updates**: Keep tests current with code changes
2. **Refactor Tests**: Remove duplicate code
3. **Review Coverage**: Monitor coverage metrics
4. **Update Mocks**: Keep mocks realistic

### Performance Guidelines

1. **Fast Execution**: Tests should run quickly
2. **Parallel Execution**: Independent tests only
3. **Resource Cleanup**: Proper test cleanup
4. **Selective Testing**: Run relevant tests only

## Troubleshooting

### Common Issues

1. **Chrome Extension Loading**: Extension path issues
2. **IndexedDB Persistence**: Database cleanup problems
3. **Async Testing**: Promise handling errors
4. **Mock Timing**: Race condition issues

### Solutions

1. **Check Extension Manifest**: Validate manifest.json
2. **Reset Test Environment**: Clear test databases
3. **Use Proper Async/Await**: Handle promises correctly
4. **Add Wait Conditions**: Use proper timing

## Future Improvements

### Planned Enhancements

1. **Visual Regression Testing**: Screenshot comparison
2. **API Integration Testing**: Real Chrome Translation API
3. **Cross-browser Testing**: Firefox, Edge support
4. **Mobile Testing**: Responsive design validation
5. **Internationalization Testing**: Multi-language UI

### Test Infrastructure

1. **Parallel Test Execution**: Faster CI/CD
2. **Test Result Analytics**: Historical trend analysis
3. **Automated Test Generation**: AI-assisted test creation
4. **Real User Monitoring**: Production usage validation

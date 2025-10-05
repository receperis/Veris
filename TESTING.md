# Veris Chrome Extension - Test Suite

## Quick Start

Run all tests:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

Run specific test categories:

```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # End-to-end tests only
```

## Test Suite Overview

This project includes a comprehensive test suite covering:

### 🧪 Unit Tests (18 test suites)

- **Database Service**: IndexedDB operations, vocabulary CRUD, search/filtering
- **Exercise Service**: SRS algorithm, scheduling, language management
- **Translation API**: Chrome Translation API integration, error handling
- **Content Script**: DOM manipulation, text selection, translation bubbles

### 🔗 Integration Tests (12 test suites)

- **Popup Interface**: Vocabulary browser, edit mode, navigation
- **Options Page**: Settings forms, validation, data persistence
- **User Interface**: Complete UI component interactions

### 🚀 End-to-End Tests (8 test suites)

- **Extension Installation**: Loading and initialization
- **Complete Workflows**: Translation → vocabulary → exercises
- **Cross-page Functionality**: Content script injection
- **Performance**: Load times, memory usage, accessibility

## Features Tested

### ✅ Translation System

- [x] Text selection detection and handling
- [x] Chrome Translation API integration
- [x] Translation bubble creation and positioning
- [x] Multi-language support and validation
- [x] Error handling for API failures
- [x] Hotkey and trigger modes

### ✅ Vocabulary Management

- [x] IndexedDB storage operations
- [x] Vocabulary entry CRUD operations
- [x] Search and filtering by language/date
- [x] Context preservation and display
- [x] Import/export functionality
- [x] Duplicate detection and handling

### ✅ Spaced Repetition System (SRS)

- [x] Leitner box algorithm implementation
- [x] Due date calculations and scheduling
- [x] Exercise session preparation
- [x] Progress tracking and statistics
- [x] Difficulty level management
- [x] Multi-language exercise support

### ✅ User Interface Components

- [x] Extension popup with vocabulary browser
- [x] Options page with settings forms
- [x] Exercise interface with SRS sessions
- [x] Statistics dashboard and analytics
- [x] Inline editing and word management
- [x] Context panels and tooltips

### ✅ Chrome Extension Features

- [x] Background service worker functionality
- [x] Content script injection across websites
- [x] Extension enable/disable toggle
- [x] Storage sync and local persistence
- [x] Alarm scheduling and notifications
- [x] Cross-tab communication

### ✅ Data Management

- [x] IndexedDB database initialization
- [x] Data migration and version handling
- [x] Storage quota management
- [x] Backup and restore operations
- [x] Data integrity validation
- [x] Performance optimization

## Test Coverage

Current coverage targets:

- **Lines**: 70%+ (targeting 85%+)
- **Functions**: 70%+ (targeting 80%+)
- **Branches**: 70%+ (targeting 75%+)
- **Statements**: 70%+ (targeting 85%+)

Critical components have higher coverage requirements:

- Translation flow: 95%
- Data persistence: 90%
- SRS algorithm: 85%
- User interface: 80%

## Mock Infrastructure

### Chrome Extension APIs

- Complete Chrome storage (sync/local) simulation
- Runtime message passing and lifecycle events
- Tabs API with language detection
- Alarms for scheduled exercises
- Notifications for user alerts
- IndexedDB with realistic data persistence

### Translation Services

- Chrome Translation API simulation
- Multiple language pair support
- Error condition simulation
- Network timeout handling
- Quota limit testing

### User Interface

- JSDOM for DOM manipulation testing
- Event simulation (mouse, keyboard, touch)
- CSS and layout testing
- Responsive design validation
- Accessibility compliance checks

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Debug specific tests
npm run test:debug -- tests/unit/database.service.test.js
```

### End-to-End Testing

```bash
# Run E2E tests (requires Chrome)
npm run test:e2e
```

Note: E2E tests will launch Chrome with the extension loaded for realistic testing.

### Continuous Integration

Tests run automatically on:

- Pull requests
- Main branch commits
- Release tag creation

## Test Architecture

### Test Organization

```
tests/
├── setup.js              # Global test configuration
├── chrome-mock.js         # Chrome API mocking
├── unit/                  # Isolated component tests
├── integration/           # UI component interactions
└── e2e/                  # Complete user workflows
```

### Key Testing Utilities

- **Custom Matchers**: Vocabulary validation, language code validation
- **Mock Factories**: Realistic test data generation
- **Async Helpers**: Promise resolution, timing utilities
- **DOM Simulation**: JSDOM with Chrome extension context

## Debugging Tests

### Jest Debugging

```bash
# Debug with Node.js inspector
npm run test:debug

# Run specific test file
npm test -- database.service.test.js

# Run tests matching pattern
npm test -- --grep "translation"
```

### Puppeteer Debugging (E2E)

Set `headless: false` in E2E tests to see browser interactions.

### Common Issues

1. **Extension Loading**: Ensure manifest.json is valid
2. **Async Timing**: Use proper async/await patterns
3. **Mock Cleanup**: Tests should be independent
4. **Chrome APIs**: Verify mock implementations match real APIs

## Contributing to Tests

### Adding New Tests

1. Follow existing test structure and naming
2. Include both happy path and error scenarios
3. Mock external dependencies appropriately
4. Ensure tests are fast and reliable
5. Document complex test scenarios

### Test Requirements

- All new features must include comprehensive tests
- Bug fixes should include regression tests
- UI changes require integration tests
- API changes need updated mocks

For detailed testing documentation, see `/tests/README.md`.

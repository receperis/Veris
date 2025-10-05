// Test setup file - runs before each test
require("fake-indexeddb/auto");

// Add custom matchers
expect.extend({
  toBeValidVocabularyEntry(received) {
    const requiredFields = [
      "id",
      "timestamp",
      "originalWord",
      "translatedWord",
      "sourceLanguage",
      "targetLanguage",
    ];
    const missing = requiredFields.filter((field) => !(field in received));

    if (missing.length > 0) {
      return {
        message: () =>
          `Expected vocabulary entry to have required fields: ${missing.join(
            ", "
          )}`,
        pass: false,
      };
    }

    return {
      message: () => `Expected vocabulary entry to be invalid`,
      pass: true,
    };
  },

  toBeValidLanguageCode(received) {
    const validCodes = [
      "en",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "ru",
      "ja",
      "ko",
      "zh",
      "ar",
      "auto",
    ];
    const pass = validCodes.includes(received);

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid language code`
          : `Expected ${received} to be a valid language code`,
      pass,
    };
  },
});

// Global test utilities
global.testUtils = {
  createMockVocabularyEntry: (overrides = {}) => ({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    originalWord: "test",
    translatedWord: "prueba",
    sourceLanguage: "en",
    targetLanguage: "es",
    context: "This is a test sentence.",
    contextTranslation: "Esta es una oración de prueba.",
    url: "https://example.com",
    domain: "example.com",
    sessionId: "session_123",
    ...overrides,
  }),

  createMockExerciseSettings: (overrides = {}) => ({
    enabled: true,
    time: "09:00",
    days: [1, 2, 3, 4, 5],
    difficulty: "mixed",
    questionsPerSession: 10,
    ...overrides,
  }),

  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const interval = 100;
      let elapsed = 0;

      const check = () => {
        if (condition()) {
          resolve();
        } else if (elapsed >= timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          elapsed += interval;
          setTimeout(check, interval);
        }
      };

      check();
    });
  },

  flushPromises: () => new Promise((resolve) => setTimeout(resolve, 0)),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();

  // Reset chrome mocks
  chrome.storage.sync.get.mockImplementation((keys) => {
    const defaultValues = {
      extensionEnabled: true,
      target_lang: "en",
      bubbleMode: "auto",
    };

    if (typeof keys === "string") {
      return Promise.resolve({ [keys]: defaultValues[keys] });
    } else if (typeof keys === "object") {
      const result = {};
      Object.keys(keys).forEach((key) => {
        result[key] =
          defaultValues[key] !== undefined ? defaultValues[key] : keys[key];
      });
      return Promise.resolve(result);
    }
    return Promise.resolve(defaultValues);
  });
});

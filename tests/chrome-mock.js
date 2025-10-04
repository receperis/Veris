// Chrome extension API mock for testing
global.chrome = {
  // Storage API
  storage: {
    sync: {
      get: jest.fn().mockImplementation((keys) => {
        const defaultValues = {
          extensionEnabled: true,
          target_lang: "en",
          bubbleMode: "auto",
          bubbleIconDelay: 500,
          bubbleHotkey: "ctrl+t",
          exerciseSettings: {
            enabled: true,
            time: "09:00",
            days: [1, 2, 3, 4, 5],
            difficulty: "mixed",
            questionsPerSession: 10,
          },
        };

        if (typeof keys === "string") {
          return Promise.resolve({ [keys]: defaultValues[keys] });
        } else if (typeof keys === "object" && keys !== null) {
          const result = {};
          Object.keys(keys).forEach((key) => {
            result[key] =
              defaultValues[key] !== undefined ? defaultValues[key] : keys[key];
          });
          return Promise.resolve(result);
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((key) => {
            if (defaultValues[key] !== undefined) {
              result[key] = defaultValues[key];
            }
          });
          return Promise.resolve(result);
        }
        return Promise.resolve(defaultValues);
      }),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
    },
  },

  // Runtime API
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    onStartup: {
      addListener: jest.fn(),
    },
    getURL: jest
      .fn()
      .mockImplementation((path) => `chrome-extension://mock-id/${path}`),
    openOptionsPage: jest.fn(),
    lastError: null,
  },

  // Tabs API
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({}),
    detectLanguage: jest.fn().mockImplementation((tabId, callback) => {
      callback("en");
    }),
    onUpdated: {
      addListener: jest.fn(),
    },
  },

  // Alarms API
  alarms: {
    create: jest.fn(),
    clear: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    getAll: jest.fn().mockResolvedValue([]),
    onAlarm: {
      addListener: jest.fn(),
    },
  },

  // Notifications API
  notifications: {
    create: jest.fn().mockImplementation((id, options, callback) => {
      if (callback) callback(id);
      return Promise.resolve(id);
    }),
    clear: jest.fn().mockResolvedValue(true),
    onClicked: {
      addListener: jest.fn(),
    },
    onButtonClicked: {
      addListener: jest.fn(),
    },
  },

  // Action API (replaces browserAction in MV3)
  action: {
    setPopup: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },

  // Permissions API
  permissions: {
    contains: jest.fn().mockResolvedValue(true),
    request: jest.fn().mockResolvedValue(true),
  },
};

// IndexedDB mock
const FDBFactory = require("fake-indexeddb/lib/FDBFactory");
const FDBKeyRange = require("fake-indexeddb/lib/FDBKeyRange");
global.indexedDB = new FDBFactory();
global.IDBKeyRange = FDBKeyRange;

// Self object for service workers
global.self = global;

// Mock Translation API
global.Translator = {
  create: jest.fn().mockImplementation(({ sourceLanguage, targetLanguage }) => {
    return Promise.resolve({
      translate: jest.fn().mockImplementation((text) => {
        // Simple mock translation
        const translations = {
          hello: "hola",
          world: "mundo",
          test: "prueba",
          example: "ejemplo",
        };
        return Promise.resolve(
          translations[text.toLowerCase()] || `translated_${text}`
        );
      }),
    });
  }),
};

// Console methods for testing
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

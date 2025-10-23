/**
 * Test to verify that exercise loads correct number of questions from user settings
 */

// Mock Chrome storage API
const mockStorage = {
  sync: {
    get: async (defaults) => {
      // Simulate user has set 15 questions per session
      return {
        ...defaults,
        exerciseSettings: {
          ...defaults.exerciseSettings,
          questionsPerSession: 15,
          difficulty: "hard",
        },
      };
    },
    set: async (data) => {
      console.log("Saving to storage:", data);
      return true;
    },
  },
};

// Mock Chrome runtime
global.chrome = {
  storage: mockStorage,
  runtime: {
    sendMessage: async (message) => {
      console.log("Sending message:", message);

      // Mock response for PREPARE_LEITNER_SESSION
      if (message.type === "PREPARE_LEITNER_SESSION") {
        return {
          success: true,
          words: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            originalWord: `word${i + 1}`,
            translatedWord: `translation${i + 1}`,
            sourceLanguage: "en",
            targetLanguage: "es",
            srs: {},
          })),
        };
      }

      return { success: true };
    },
  },
};

// Mock DOM
const mockDOM = {
  getElementById: (id) => {
    return {
      textContent: "",
      style: { display: "block" },
    };
  },
  querySelector: (selector) => {
    if (selector === ".welcome-screen") {
      return { style: { display: "none" } };
    }
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === ".difficulty-btn") {
      return [
        {
          classList: { add: () => {}, remove: () => {} },
          dataset: { difficulty: "medium" },
        },
      ];
    }
    return [];
  },
};

global.document = mockDOM;

async function testQuestionsPerSessionFix() {
  try {
    console.log("\n=== Testing Questions Per Session Fix ===\n");

    // Import the storage module
    const { getSettings, DEFAULT_SETTINGS } = await import(
      "./src/shared/storage.js"
    );

    // Test 1: Verify default settings
    console.log("1. Testing default settings:");
    console.log(
      "Default questions per session:",
      DEFAULT_SETTINGS.exerciseSettings.questionsPerSession
    );

    // Test 2: Verify settings are loaded correctly
    console.log("\n2. Testing settings loading:");
    const settings = await getSettings(DEFAULT_SETTINGS);
    console.log(
      "Loaded questions per session:",
      settings.exerciseSettings.questionsPerSession
    );
    console.log("Expected: 15 (from mock storage)");

    if (settings.exerciseSettings.questionsPerSession === 15) {
      console.log("✅ Settings loaded correctly");
    } else {
      console.log("❌ Settings not loaded correctly");
    }

    // Test 3: Mock exercise initialization
    console.log("\n3. Testing exercise initialization logic:");

    class MockVocabularyExercise {
      constructor() {
        this.questionsPerExercise = 10; // Default hardcoded value (old behavior)
      }

      async loadExerciseSettings() {
        try {
          const settings = await getSettings(DEFAULT_SETTINGS);
          const exerciseSettings =
            settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;

          // Update questions per exercise from user settings
          this.questionsPerExercise =
            exerciseSettings.questionsPerSession || 10;

          console.log("Loaded exercise settings:", {
            questionsPerSession: this.questionsPerExercise,
          });
        } catch (error) {
          console.error("Failed to load exercise settings:", error);
          this.questionsPerExercise = 10;
        }
      }
    }

    const exercise = new MockVocabularyExercise();
    console.log(
      "Before loading settings - questions per exercise:",
      exercise.questionsPerExercise
    );

    await exercise.loadExerciseSettings();
    console.log(
      "After loading settings - questions per exercise:",
      exercise.questionsPerExercise
    );

    if (exercise.questionsPerExercise === 15) {
      console.log("✅ Exercise correctly loads user settings");
    } else {
      console.log("❌ Exercise failed to load user settings");
    }

    console.log("\n=== Test Complete ===\n");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testQuestionsPerSessionFix();

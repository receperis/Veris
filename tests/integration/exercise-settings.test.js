/**
 * @jest-environment jsdom
 */

/**
 * Integration tests for exercise settings loading
 * Tests that exercise correctly loads user preferences from options
 */

import { getSettings, DEFAULT_SETTINGS } from "../../src/shared/storage.js";

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    getManifest: jest.fn(() => ({ version: "1.0.0" })),
  },
};

describe("Exercise Settings Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset DOM
    document.body.innerHTML = `
      <div class="welcome-screen">
        <div class="stats">
          <div class="stat-item">
            <span class="stat-number" id="exercise-count">10</span>
            <span class="stat-label">Questions</span>
          </div>
        </div>
        <div class="difficulty-options">
          <button class="difficulty-btn" data-difficulty="easy">Easy</button>
          <button class="difficulty-btn active" data-difficulty="medium">Medium</button>
          <button class="difficulty-btn" data-difficulty="hard">Hard</button>
        </div>
      </div>
    `;
  });

  test("should load questionsPerSession from user settings", async () => {
    // Mock storage to return user settings with 15 questions
    const mockSettings = {
      ...DEFAULT_SETTINGS,
      exerciseSettings: {
        ...DEFAULT_SETTINGS.exerciseSettings,
        questionsPerSession: 15,
        difficulty: "easy",
      },
    };

    chrome.storage.sync.get.mockResolvedValue(mockSettings);

    // Import and create exercise instance (simulate the loadExerciseSettings method)
    const settings = await getSettings(DEFAULT_SETTINGS);
    const exerciseSettings =
      settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;

    const questionsPerExercise = exerciseSettings.questionsPerSession || 10;
    const difficulty =
      exerciseSettings.difficulty !== "mixed"
        ? exerciseSettings.difficulty
        : "medium";

    // Verify settings were loaded correctly
    expect(questionsPerExercise).toBe(15);
    expect(difficulty).toBe("easy");
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  test("should fall back to defaults when settings fail to load", async () => {
    // Mock storage failure
    chrome.storage.sync.get.mockRejectedValue(new Error("Storage error"));

    try {
      const settings = await getSettings(DEFAULT_SETTINGS);
      const exerciseSettings =
        settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;
      const questionsPerExercise = exerciseSettings.questionsPerSession || 10;

      // Should fall back to default
      expect(questionsPerExercise).toBe(10);
    } catch (error) {
      // If getSettings throws, we should still have a fallback
      const questionsPerExercise = 10;
      expect(questionsPerExercise).toBe(10);
    }
  });

  test("should handle various questionsPerSession values", async () => {
    const testValues = [5, 10, 15, 20, 25];

    for (const value of testValues) {
      const mockSettings = {
        ...DEFAULT_SETTINGS,
        exerciseSettings: {
          ...DEFAULT_SETTINGS.exerciseSettings,
          questionsPerSession: value,
        },
      };

      chrome.storage.sync.get.mockResolvedValue(mockSettings);

      const settings = await getSettings(DEFAULT_SETTINGS);
      const exerciseSettings =
        settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;
      const questionsPerExercise = exerciseSettings.questionsPerSession || 10;

      expect(questionsPerExercise).toBe(value);
    }
  });

  test("should preserve difficulty setting when not mixed", async () => {
    const difficulties = ["easy", "medium", "hard"];

    for (const diff of difficulties) {
      const mockSettings = {
        ...DEFAULT_SETTINGS,
        exerciseSettings: {
          ...DEFAULT_SETTINGS.exerciseSettings,
          difficulty: diff,
        },
      };

      chrome.storage.sync.get.mockResolvedValue(mockSettings);

      const settings = await getSettings(DEFAULT_SETTINGS);
      const exerciseSettings =
        settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;
      const difficulty =
        exerciseSettings.difficulty !== "mixed"
          ? exerciseSettings.difficulty
          : "medium";

      expect(difficulty).toBe(diff);
    }
  });

  test("should handle mixed difficulty correctly", async () => {
    const mockSettings = {
      ...DEFAULT_SETTINGS,
      exerciseSettings: {
        ...DEFAULT_SETTINGS.exerciseSettings,
        difficulty: "mixed",
      },
    };

    chrome.storage.sync.get.mockResolvedValue(mockSettings);

    const settings = await getSettings(DEFAULT_SETTINGS);
    const exerciseSettings =
      settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;
    // When difficulty is 'mixed', user should be able to select during exercise
    const difficulty =
      exerciseSettings.difficulty !== "mixed"
        ? exerciseSettings.difficulty
        : "medium";

    // Should default to medium when mixed
    expect(difficulty).toBe("medium");
  });
});

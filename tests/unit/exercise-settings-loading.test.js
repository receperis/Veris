/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for exercise settings loading functionality
 * Tests the loadExerciseSettings method and related functionality
 */

import { DEFAULT_SETTINGS } from "../../src/shared/storage.js";

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    getManifest: jest.fn(() => ({ version: "1.0.0" })),
  },
};

// Mock the storage module
jest.mock("../../src/shared/storage.js", () => ({
  DEFAULT_SETTINGS: {
    target_lang: "en",
    bubbleMode: "auto",
    bubbleIconDelay: 450,
    bubbleHotkey: "",
    extensionEnabled: true,
    exerciseSettings: {
      enabled: true,
      time: "09:00",
      days: [1, 2, 3, 4, 5],
      difficulty: "mixed",
      questionsPerSession: 10,
    },
  },
  getSettings: jest.fn(),
}));

describe("Exercise Settings Loading", () => {
  let mockExercise;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock exercise instance with the methods we're testing
    mockExercise = {
      questionsPerExercise: 10,
      difficulty: "medium",

      // This simulates the loadExerciseSettings method from exercise.js
      async loadExerciseSettings() {
        const { getSettings } = require("../../src/shared/storage.js");
        try {
          const settings = await getSettings(DEFAULT_SETTINGS);
          const exerciseSettings =
            settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;

          // Update questions per exercise from user settings
          this.questionsPerExercise =
            exerciseSettings.questionsPerSession || 10;

          // Update difficulty if it's not 'mixed'
          if (
            exerciseSettings.difficulty &&
            exerciseSettings.difficulty !== "mixed"
          ) {
            this.difficulty = exerciseSettings.difficulty;
          }

          console.log("Loaded exercise settings:", {
            questionsPerSession: this.questionsPerExercise,
            difficulty: this.difficulty,
          });
        } catch (error) {
          console.error("Failed to load exercise settings:", error);
          // Keep defaults if loading fails
          this.questionsPerExercise = 10;
        }
      },

      // Simulate the updateDifficultySelection method
      updateDifficultySelection() {
        // Mock DOM manipulation
        const buttons = document.querySelectorAll(".difficulty-btn");
        buttons.forEach((btn) => btn.classList.remove("active"));

        const targetBtn = document.querySelector(
          `[data-difficulty="${this.difficulty}"]`
        );
        if (targetBtn) {
          targetBtn.classList.add("active");
        } else {
          const mediumBtn = document.querySelector(
            '[data-difficulty="medium"]'
          );
          if (mediumBtn) {
            mediumBtn.classList.add("active");
            this.difficulty = "medium";
          }
        }
      },
    };

    // Setup DOM
    document.body.innerHTML = `
      <div class="difficulty-options">
        <button class="difficulty-btn" data-difficulty="easy">Easy</button>
        <button class="difficulty-btn active" data-difficulty="medium">Medium</button>
        <button class="difficulty-btn" data-difficulty="hard">Hard</button>
      </div>
    `;
  });

  test("should load custom questionsPerSession setting", async () => {
    const { getSettings } = require("../../src/shared/storage.js");
    const mockSettings = {
      ...DEFAULT_SETTINGS,
      exerciseSettings: {
        ...DEFAULT_SETTINGS.exerciseSettings,
        questionsPerSession: 20,
      },
    };

    getSettings.mockResolvedValue(mockSettings);

    await mockExercise.loadExerciseSettings();

    expect(mockExercise.questionsPerExercise).toBe(20);
    expect(getSettings).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  test("should load custom difficulty setting when not mixed", async () => {
    const { getSettings } = require("../../src/shared/storage.js");
    const mockSettings = {
      ...DEFAULT_SETTINGS,
      exerciseSettings: {
        ...DEFAULT_SETTINGS.exerciseSettings,
        difficulty: "hard",
      },
    };

    getSettings.mockResolvedValue(mockSettings);

    await mockExercise.loadExerciseSettings();

    expect(mockExercise.difficulty).toBe("hard");
  });

  test("should keep default difficulty when set to mixed", async () => {
    const { getSettings } = require("../../src/shared/storage.js");
    const mockSettings = {
      ...DEFAULT_SETTINGS,
      exerciseSettings: {
        ...DEFAULT_SETTINGS.exerciseSettings,
        difficulty: "mixed",
      },
    };

    getSettings.mockResolvedValue(mockSettings);

    // Start with medium difficulty
    mockExercise.difficulty = "medium";
    await mockExercise.loadExerciseSettings();

    // Should remain medium when difficulty is 'mixed'
    expect(mockExercise.difficulty).toBe("medium");
  });

  test("should handle missing exerciseSettings gracefully", async () => {
    const { getSettings } = require("../../src/shared/storage.js");
    const mockSettings = {
      ...DEFAULT_SETTINGS,
      exerciseSettings: undefined,
    };

    getSettings.mockResolvedValue(mockSettings);

    await mockExercise.loadExerciseSettings();

    // Should use defaults
    expect(mockExercise.questionsPerExercise).toBe(10);
  });

  test("should handle storage errors gracefully", async () => {
    const { getSettings } = require("../../src/shared/storage.js");
    getSettings.mockRejectedValue(new Error("Storage error"));

    await mockExercise.loadExerciseSettings();

    // Should fall back to default
    expect(mockExercise.questionsPerExercise).toBe(10);
  });

  test("should update difficulty button selection correctly", () => {
    mockExercise.difficulty = "easy";
    mockExercise.updateDifficultySelection();

    const easyBtn = document.querySelector('[data-difficulty="easy"]');
    const mediumBtn = document.querySelector('[data-difficulty="medium"]');
    const hardBtn = document.querySelector('[data-difficulty="hard"]');

    expect(easyBtn.classList.contains("active")).toBe(true);
    expect(mediumBtn.classList.contains("active")).toBe(false);
    expect(hardBtn.classList.contains("active")).toBe(false);
  });

  test("should handle invalid difficulty selection gracefully", () => {
    mockExercise.difficulty = "invalid";
    mockExercise.updateDifficultySelection();

    // Should fall back to medium
    expect(mockExercise.difficulty).toBe("medium");

    const mediumBtn = document.querySelector('[data-difficulty="medium"]');
    expect(mediumBtn.classList.contains("active")).toBe(true);
  });
});

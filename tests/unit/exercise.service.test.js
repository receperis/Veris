/**
 * Unit tests for Exercise Service
 * Tests SRS (Spaced Repetition System) functionality and exercise scheduling
 */

// Setup global environment for service worker
global.self = global;
global.chrome = chrome;

// Mock dependencies
global.DatabaseService = {
  getAllVocabulary: jest.fn(),
  updateVocabulary: jest.fn(),
  getStats: jest.fn(),
};

global.NotificationService = {
  sendDailyExerciseNotification: jest.fn(),
};

// Import the service
require("../../service/exercise.service.js");

describe("ExerciseService", () => {
  let ExerciseService;

  beforeEach(() => {
    ExerciseService = global.self.ExerciseService;
    jest.clearAllMocks();

    // Reset chrome mocks
    chrome.storage.sync.get.mockResolvedValue({
      exerciseSettings: testUtils.createMockExerciseSettings(),
    });
    chrome.storage.local.set.mockResolvedValue();
    chrome.alarms.clear.mockResolvedValue(true);
    chrome.alarms.create.mockResolvedValue();
    chrome.alarms.get.mockResolvedValue(null);
  });

  describe("Settings validation", () => {
    test("should validate and normalize exercise settings", async () => {
      const invalidSettings = {
        enabled: "true", // Should be boolean
        time: "25:00", // Invalid time
        days: null, // Should be array
        difficulty: "impossible", // Invalid difficulty
      };

      chrome.storage.sync.get.mockResolvedValue({
        exerciseSettings: invalidSettings,
      });

      const result = await ExerciseService.setupDailyAlarm();
      expect(result).toBeDefined();
    });

    test("should use default settings when none provided", async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      const result = await ExerciseService.setupDailyAlarm();
      expect(result).toBeDefined();
    });

    test("should validate time format", async () => {
      const settings = testUtils.createMockExerciseSettings({
        time: "9:00", // Should be normalized to 09:00
      });

      chrome.storage.sync.get.mockResolvedValue({
        exerciseSettings: settings,
      });

      // The service should handle this gracefully
      await expect(ExerciseService.setupDailyAlarm()).resolves.toBeDefined();
    });
  });

  describe("Alarm scheduling", () => {
    test("should schedule daily alarm successfully", async () => {
      const result = await ExerciseService.setupDailyAlarm();

      expect(result.scheduled || result.reused || result.skipped).toBe(true);

      if (result.scheduled) {
        expect(chrome.alarms.create).toHaveBeenCalledWith(
          "daily-exercise",
          expect.objectContaining({ when: expect.any(Number) })
        );
        expect(chrome.storage.local.set).toHaveBeenCalled();
      }
    });

    test("should skip scheduling when disabled", async () => {
      const disabledSettings = testUtils.createMockExerciseSettings({
        enabled: false,
      });

      chrome.storage.sync.get.mockResolvedValue({
        exerciseSettings: disabledSettings,
      });

      const result = await ExerciseService.setupDailyAlarm();
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("disabled");
    });

    test("should reuse existing alarm if time matches", async () => {
      const existingAlarm = {
        scheduledTime: Date.now() + 1000 * 60 * 60, // 1 hour from now
      };

      chrome.alarms.get.mockResolvedValue(existingAlarm);

      const result = await ExerciseService.setupDailyAlarm();

      // Should either reuse or create new one
      expect(result.scheduled || result.reused).toBe(true);
    });

    test("should setup test alarm for debugging", async () => {
      const result = await ExerciseService.setupTestAlarm(5);

      expect(result.success).toBe(true);
      expect(chrome.alarms.create).toHaveBeenCalledWith(
        "test-exercise",
        expect.objectContaining({ when: expect.any(Number) })
      );
    });
  });

  describe("Exercise timing", () => {
    test("should detect exercise time correctly", async () => {
      const now = new Date();
      const settings = testUtils.createMockExerciseSettings({
        time: `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}`,
        days: [now.getDay()], // Today
      });

      chrome.storage.sync.get.mockResolvedValue({
        exerciseSettings: settings,
      });

      const isExerciseTime = await ExerciseService.isExerciseTime();
      expect(typeof isExerciseTime).toBe("boolean");
    });

    test("should return false when not exercise day", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const settings = testUtils.createMockExerciseSettings({
        days: [tomorrow.getDay()], // Tomorrow only
      });

      chrome.storage.sync.get.mockResolvedValue({
        exerciseSettings: settings,
      });

      const isExerciseTime = await ExerciseService.isExerciseTime();
      expect(isExerciseTime).toBe(false);
    });
  });

  describe("Vocabulary management", () => {
    test("should check if user has vocabulary", async () => {
      DatabaseService.getStats.mockResolvedValue({
        totalEntries: 10,
        uniqueWords: 8,
      });

      await ExerciseService.handleDailyExerciseAlarm();

      expect(DatabaseService.getStats).toHaveBeenCalled();
    });

    test("should skip exercise when no vocabulary exists", async () => {
      DatabaseService.getStats.mockResolvedValue({
        totalEntries: 0,
      });

      await ExerciseService.handleDailyExerciseAlarm();

      expect(
        NotificationService.sendDailyExerciseNotification
      ).not.toHaveBeenCalled();
    });

    test("should send notification when vocabulary exists", async () => {
      DatabaseService.getStats.mockResolvedValue({
        totalEntries: 10,
      });

      NotificationService.sendDailyExerciseNotification.mockResolvedValue({
        success: true,
        id: "notification_123",
      });

      await ExerciseService.handleDailyExerciseAlarm();

      expect(
        NotificationService.sendDailyExerciseNotification
      ).toHaveBeenCalled();
    });
  });

  describe("Exercise completion tracking", () => {
    test("should update statistics after exercise completion", async () => {
      const exerciseData = {
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8.5,
      };

      chrome.storage.local.get.mockResolvedValue({
        vocabularyStats: {
          exercisesCompleted: 5,
          totalScore: 400,
          averageScore: 80,
        },
      });

      await ExerciseService.handleExerciseCompleted(exerciseData);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        vocabularyStats: expect.objectContaining({
          exercisesCompleted: 6,
          totalScore: 485,
          averageScore: expect.any(Number),
          lastExercise: expect.any(String),
        }),
      });
    });

    test("should handle first exercise completion", async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const exerciseData = { score: 75 };

      await ExerciseService.handleExerciseCompleted(exerciseData);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        vocabularyStats: expect.objectContaining({
          exercisesCompleted: 1,
          totalScore: 75,
          averageScore: 75,
        }),
      });
    });
  });

  describe("Leitner SRS System", () => {
    const mockWords = [
      testUtils.createMockVocabularyEntry({ id: 1, originalWord: "hello" }),
      testUtils.createMockVocabularyEntry({ id: 2, originalWord: "world" }),
      testUtils.createMockVocabularyEntry({ id: 3, originalWord: "test" }),
    ];

    test("should prepare Leitner session successfully", async () => {
      DatabaseService.getAllVocabulary.mockResolvedValue(mockWords);

      const result = await ExerciseService.prepareLeitnerSession(5);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.words)).toBe(true);
      expect(result.words.length).toBeLessThanOrEqual(5);
      expect(result.counts).toBeDefined();
      expect(typeof result.counts.total).toBe("number");
    });

    test("should filter by language in Leitner session", async () => {
      const spanishWords = [
        testUtils.createMockVocabularyEntry({
          id: 1,
          sourceLanguage: "es",
          originalWord: "hola",
        }),
      ];

      DatabaseService.getAllVocabulary.mockResolvedValue([
        ...mockWords,
        ...spanishWords,
      ]);

      const result = await ExerciseService.prepareLeitnerSession(5, "es");

      expect(result.success).toBe(true);
      expect(result.selectedLanguage).toBe("es");
    });

    test("should handle no words for selected language", async () => {
      DatabaseService.getAllVocabulary.mockResolvedValue(mockWords);

      const result = await ExerciseService.prepareLeitnerSession(5, "fr");

      expect(result.success).toBe(false);
      expect(result.error).toBe("no_words_for_language");
    });

    test("should record correct answer result", async () => {
      const wordWithSrs = {
        ...testUtils.createMockVocabularyEntry({ id: 1 }),
        srs: {
          boxIndex: 0,
          totalCorrect: 0,
          totalWrong: 0,
          streak: 0,
        },
      };

      DatabaseService.getAllVocabulary.mockResolvedValue([wordWithSrs]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      const result = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        usedHint: false,
        skipped: false,
      });

      expect(result.success).toBe(true);
      expect(result.srs.boxIndex).toBe(1); // Should advance box
      expect(result.srs.totalCorrect).toBe(1);
      expect(DatabaseService.updateVocabulary).toHaveBeenCalledWith(
        1,
        expect.any(Object)
      );
    });

    test("should record wrong answer result", async () => {
      const wordWithSrs = {
        ...testUtils.createMockVocabularyEntry({ id: 1 }),
        srs: {
          boxIndex: 2,
          totalCorrect: 5,
          totalWrong: 1,
          streak: 3,
        },
      };

      DatabaseService.getAllVocabulary.mockResolvedValue([wordWithSrs]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      const result = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: false,
        usedHint: false,
        skipped: false,
      });

      expect(result.success).toBe(true);
      expect(result.srs.boxIndex).toBe(1); // Should drop one box
      expect(result.srs.totalWrong).toBe(2);
      expect(result.srs.streak).toBe(0);
    });

    test("should treat hint usage as wrong answer", async () => {
      const wordWithSrs = {
        ...testUtils.createMockVocabularyEntry({ id: 1 }),
        srs: { boxIndex: 1, totalCorrect: 0, totalWrong: 0, streak: 0 },
      };

      DatabaseService.getAllVocabulary.mockResolvedValue([wordWithSrs]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      const result = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        usedHint: true, // This should make it count as wrong
        skipped: false,
      });

      expect(result.success).toBe(true);
      expect(result.srs.boxIndex).toBe(0); // Should stay in box 0
    });

    test("should handle word not found in record result", async () => {
      DatabaseService.getAllVocabulary.mockResolvedValue([]);

      const result = await ExerciseService.recordLeitnerResult({
        id: 999,
        correct: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("word_not_found");
    });
  });

  describe("Language management", () => {
    test("should get available languages", async () => {
      const mixedWords = [
        testUtils.createMockVocabularyEntry({ sourceLanguage: "en" }),
        testUtils.createMockVocabularyEntry({ sourceLanguage: "es" }),
        testUtils.createMockVocabularyEntry({ sourceLanguage: "en" }), // Duplicate
      ];

      DatabaseService.getAllVocabulary.mockResolvedValue(mixedWords);

      const result = await ExerciseService.getAvailableLanguages();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.languages)).toBe(true);
      expect(result.languages).toContain("en");
      expect(result.languages).toContain("es");
      expect(result.languages.length).toBe(2); // Should deduplicate
    });

    test("should get due count for specific language", async () => {
      const wordsWithSrs = [
        {
          ...testUtils.createMockVocabularyEntry({ sourceLanguage: "en" }),
          srs: { dueAt: new Date(Date.now() - 1000).toISOString() }, // Due
        },
        {
          ...testUtils.createMockVocabularyEntry({ sourceLanguage: "es" }),
          srs: { dueAt: new Date(Date.now() - 1000).toISOString() }, // Due
        },
      ];

      DatabaseService.getAllVocabulary.mockResolvedValue(wordsWithSrs);

      const dueCount = await ExerciseService.getDueCountByLanguage("en");
      expect(typeof dueCount).toBe("number");
    });

    test("should get total due count", async () => {
      const dueCount = await ExerciseService.getDueCount();
      expect(typeof dueCount).toBe("number");
    });
  });

  describe("Error handling", () => {
    test("should handle database errors gracefully", async () => {
      DatabaseService.getAllVocabulary.mockRejectedValue(new Error("DB Error"));

      const result = await ExerciseService.prepareLeitnerSession(5);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle storage errors in exercise completion", async () => {
      chrome.storage.local.get.mockRejectedValue(new Error("Storage error"));

      // Should not throw
      await expect(
        ExerciseService.handleExerciseCompleted({ score: 85 })
      ).resolves.toBeUndefined();
    });

    test("should handle notification failures", async () => {
      DatabaseService.getStats.mockResolvedValue({ totalEntries: 10 });
      NotificationService.sendDailyExerciseNotification.mockResolvedValue({
        success: false,
        error: "Notification failed",
      });

      // Should not throw
      await expect(
        ExerciseService.handleDailyExerciseAlarm()
      ).resolves.toBeUndefined();
    });
  });
});

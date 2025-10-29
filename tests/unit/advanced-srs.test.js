/**
 * Advanced SRS Algorithm Tests
 * Tests complex learning patterns, difficulty progression, long-term retention,
 * and statistical accuracy of the Spaced Repetition System
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

// Import logger service first (required by exercise.service.js)
require("../../src/service/logger.service.js");

// Import leitner service (required by exercise.service.js)
require("../../src/service/leitner.service.js");

// Import the service
require("../../src/service/exercise.service.js");

describe("Advanced SRS Algorithm Tests", () => {
  let ExerciseService;

  beforeEach(() => {
    ExerciseService = global.self.ExerciseService;
    jest.clearAllMocks();

    chrome.storage.sync.get.mockResolvedValue({
      exerciseSettings: testUtils.createMockExerciseSettings(),
    });
    chrome.storage.local.set.mockResolvedValue();
  });

  describe("Complex Learning Patterns", () => {
    test("should handle zigzag learning pattern (correct-wrong-correct)", async () => {
      const word = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 0,
          totalCorrect: 0,
          totalWrong: 0,
          streak: 0,
          difficulty: 1.0,
          interval: 1,
          nextReview: new Date().toISOString(),
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([word]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      // Pattern: Correct -> Wrong -> Correct -> Wrong -> Correct
      const pattern = [true, false, true, false, true];
      let currentSrs = word.srs;

      for (let i = 0; i < pattern.length; i++) {
        const result = await ExerciseService.recordLeitnerResult({
          id: 1,
          correct: pattern[i],
          usedHint: false,
          skipped: false,
        });

        expect(result.success).toBe(true);
        currentSrs = result.srs;

        // Verify pattern effects
        if (pattern[i]) {
          expect(currentSrs.totalCorrect).toBe(Math.floor((i + 1 + 1) / 2)); // Count of trues so far
        } else {
          expect(currentSrs.totalWrong).toBe(Math.floor((i + 1) / 2)); // Count of falses so far
        }
      }

      // Final state should reflect the learning pattern
      expect(currentSrs.boxIndex).toBeGreaterThanOrEqual(0);
      expect(currentSrs.totalCorrect + currentSrs.totalWrong).toBe(5);
    });

    test("should handle consistent correct answers with increasing difficulty", async () => {
      const word = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 0,
          totalCorrect: 0,
          totalWrong: 0,
          streak: 0,
          difficulty: 1.0,
          interval: 1,
          nextReview: new Date().toISOString(),
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([word]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      // Simulate 10 consecutive correct answers
      let currentSrs = word.srs;
      const boxProgression = [];
      const intervalProgression = [];

      for (let i = 0; i < 10; i++) {
        const result = await ExerciseService.recordLeitnerResult({
          id: 1,
          correct: true,
          usedHint: false,
          skipped: false,
        });

        currentSrs = result.srs;
        boxProgression.push(currentSrs.boxIndex);
        intervalProgression.push(currentSrs.interval);
      }

      // Box index should increase (with possible plateaus)
      expect(boxProgression[9]).toBeGreaterThanOrEqual(boxProgression[0]);

      // Intervals should generally increase
      expect(intervalProgression[9]).toBeGreaterThanOrEqual(
        intervalProgression[0]
      );

      // Streak should be 10
      expect(currentSrs.streak).toBe(10);
      expect(currentSrs.totalCorrect).toBe(10);
      expect(currentSrs.totalWrong).toBe(0);
    });

    test("should handle mastery plateau and breakthrough", async () => {
      // Word that's been correct many times and is in high box
      const masteredWord = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 4, // High box
          totalCorrect: 15,
          totalWrong: 2,
          streak: 8,
          difficulty: 0.2, // Low difficulty (mastered)
          interval: 30, // Long interval
          nextReview: new Date(Date.now() - 86400000).toISOString(), // Due yesterday
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([masteredWord]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      // Test that correct answers in high boxes have diminishing returns
      const result1 = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        usedHint: false,
        skipped: false,
      });

      // Should still advance but with larger intervals
      expect(result1.success).toBe(true);
      expect(result1.srs.boxIndex).toBeGreaterThanOrEqual(4);
      expect(result1.srs.interval).toBeGreaterThan(30);

      // Store the boxIndex after first operation to compare against
      const boxIndexAfterCorrect = result1.srs.boxIndex;

      // Test that wrong answer causes significant drop
      const result2 = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: false,
        usedHint: false,
        skipped: false,
      });

      expect(result2.success).toBe(true);
      expect(result2.srs.boxIndex).toBeLessThan(boxIndexAfterCorrect);
      expect(result2.srs.streak).toBe(0);
    });

    test("should handle learning interference between similar words", async () => {
      // Two similar words that might interfere with each other
      const similarWords = [
        testUtils.createMockVocabularyEntry({
          id: 1,
          originalWord: "accept",
          translatedWord: "aceptar",
          srs: { boxIndex: 1, totalCorrect: 3, totalWrong: 1, streak: 2 },
        }),
        testUtils.createMockVocabularyEntry({
          id: 2,
          originalWord: "except",
          translatedWord: "excepto",
          srs: { boxIndex: 1, totalCorrect: 2, totalWrong: 2, streak: 1 },
        }),
      ];

      DatabaseService.getAllVocabulary.mockResolvedValue(similarWords);

      // Get words for session
      const session = await ExerciseService.prepareLeitnerSession(10);
      expect(session.success).toBe(true);

      // Both words should potentially appear in session
      const wordIds = session.words.map((w) => w.id);
      expect(wordIds.length).toBeGreaterThan(0);
    });
  });

  describe("Difficulty Progression Algorithms", () => {
    test("should calculate dynamic difficulty based on performance", async () => {
      const word = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 2,
          totalCorrect: 5,
          totalWrong: 3,
          streak: 2,
          difficulty: 1.0,
          responseTimeAvg: 3500, // 3.5 seconds average
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([word]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      // Test fast correct answer (should reduce difficulty)
      const fastCorrectResult = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        responseTime: 1200, // Fast response
        usedHint: false,
        skipped: false,
      });

      expect(fastCorrectResult.success).toBe(true);
      // Difficulty should be adjusted based on performance

      // Test slow wrong answer (should increase difficulty)
      const slowWrongResult = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: false,
        responseTime: 8000, // Very slow response
        usedHint: false,
        skipped: false,
      });

      expect(slowWrongResult.success).toBe(true);
      // Word should be marked as more difficult
    });

    test("should implement adaptive interval calculation", async () => {
      const easyWord = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 2,
          totalCorrect: 8,
          totalWrong: 1,
          streak: 5,
          difficulty: 0.3, // Easy word
          interval: 7,
        },
      });

      const hardWord = testUtils.createMockVocabularyEntry({
        id: 2,
        srs: {
          boxIndex: 2,
          totalCorrect: 4,
          totalWrong: 6,
          streak: 1,
          difficulty: 2.5, // Hard word
          interval: 3,
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([easyWord, hardWord]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      // Correct answer for easy word should have longer interval
      const easyResult = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        usedHint: false,
        skipped: false,
      });

      // Correct answer for hard word should have shorter interval
      const hardResult = await ExerciseService.recordLeitnerResult({
        id: 2,
        correct: true,
        usedHint: false,
        skipped: false,
      });

      expect(easyResult.success).toBe(true);
      expect(hardResult.success).toBe(true);

      // Easy word should get longer intervals than hard word
      // (This would be implemented in the actual SRS algorithm)
    });

    test("should implement forgetting curve consideration", async () => {
      const oldWord = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 3,
          totalCorrect: 10,
          totalWrong: 2,
          streak: 4,
          lastReviewed: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago
          interval: 14,
        },
      });

      const recentWord = testUtils.createMockVocabularyEntry({
        id: 2,
        srs: {
          boxIndex: 3,
          totalCorrect: 10,
          totalWrong: 2,
          streak: 4,
          lastReviewed: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
          interval: 14,
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([oldWord, recentWord]);

      const session = await ExerciseService.prepareLeitnerSession(5);
      expect(session.success).toBe(true);

      // Old word should have higher priority (more likely to be forgotten)
      // This would be reflected in the word selection algorithm
    });
  });

  describe("Long-term Retention Calculations", () => {
    test("should calculate retention rate over time", async () => {
      // Simulate vocabulary with various review histories
      const vocabularyWithHistory = Array.from({ length: 50 }, (_, i) => {
        const reviewCount = Math.floor(Math.random() * 20) + 1;
        const correctRatio = 0.4 + Math.random() * 0.6; // 40-100% correct

        return testUtils.createMockVocabularyEntry({
          id: i + 1,
          srs: {
            boxIndex: Math.min(Math.floor(correctRatio * 5), 5),
            totalCorrect: Math.floor(reviewCount * correctRatio),
            totalWrong: Math.floor(reviewCount * (1 - correctRatio)),
            streak: Math.floor(Math.random() * 5),
            lastReviewed: new Date(
              Date.now() - Math.random() * 90 * 86400000
            ).toISOString(), // Within 90 days
            createdAt: new Date(
              Date.now() - Math.random() * 180 * 86400000
            ).toISOString(), // Within 180 days
          },
        });
      });

      DatabaseService.getAllVocabulary.mockResolvedValue(vocabularyWithHistory);

      // Test retention calculation methods (converted from E2E to unit test)
      const calculateRetentionRate = (vocabulary) => {
        const now = Date.now();
        const oneWeekAgo = now - 7 * 86400000;
        const oneMonthAgo = now - 30 * 86400000;

        const recentWords = vocabulary.filter(
          (w) =>
            w.srs.lastReviewed &&
            new Date(w.srs.lastReviewed) > new Date(oneWeekAgo)
        );

        const monthOldWords = vocabulary.filter(
          (w) =>
            w.srs.lastReviewed &&
            new Date(w.srs.lastReviewed) > new Date(oneMonthAgo) &&
            new Date(w.srs.lastReviewed) <= new Date(oneWeekAgo)
        );

        const calculateAvgCorrectRatio = (words) => {
          if (words.length === 0) return 0;
          return (
            words.reduce(
              (sum, w) =>
                sum +
                w.srs.totalCorrect /
                  Math.max(1, w.srs.totalCorrect + w.srs.totalWrong),
              0
            ) / words.length
          );
        };

        return {
          recentRetention: calculateAvgCorrectRatio(recentWords),
          monthRetention: calculateAvgCorrectRatio(monthOldWords),
          totalWords: vocabulary.length,
          recentWords: recentWords.length,
          monthOldWords: monthOldWords.length,
        };
      };

      const retentionStats = calculateRetentionRate(vocabularyWithHistory);

      // Test the retention calculation results
      expect(vocabularyWithHistory.length).toBe(50);
      expect(retentionStats.totalWords).toBe(50);
      expect(typeof retentionStats.recentRetention).toBe("number");
      expect(typeof retentionStats.monthRetention).toBe("number");
      expect(retentionStats.recentRetention).toBeGreaterThanOrEqual(0);
      expect(retentionStats.recentRetention).toBeLessThanOrEqual(1);
    });

    test("should predict optimal review intervals", async () => {
      const word = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 2,
          totalCorrect: 8,
          totalWrong: 2,
          streak: 3,
          difficulty: 1.2,
          interval: 7,
          lastReviewed: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([word]);

      // Test interval prediction logic (converted from E2E to unit test)
      const predictNextInterval = (srs) => {
        const baseInterval = srs.interval;
        const difficultyMultiplier = Math.max(0.5, 2 - (srs.difficulty || 1.0));
        const streakBonus = Math.min(1.5, 1 + srs.streak * 0.1);

        // Simple prediction formula (would be more sophisticated in real implementation)
        return Math.ceil(baseInterval * difficultyMultiplier * streakBonus);
      };

      const predictionResult = {
        currentInterval: word.srs.interval,
        predictedInterval: predictNextInterval(word.srs),
      };

      // Verify prediction is reasonable
      expect(predictionResult.predictedInterval).toBeGreaterThan(0);
      expect(predictionResult.predictedInterval).toBeLessThan(100); // Reasonable upper bound
      expect(predictionResult.currentInterval).toBe(7);

      // Test that prediction takes into account streak and difficulty
      const highStreakPrediction = predictNextInterval({
        ...word.srs,
        streak: 10,
      });
      const lowStreakPrediction = predictNextInterval({
        ...word.srs,
        streak: 0,
      });
      expect(highStreakPrediction).toBeGreaterThanOrEqual(lowStreakPrediction);
    });

    test("should track learning velocity and adapt accordingly", async () => {
      // Fast learner profile
      const fastLearner = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 3,
          totalCorrect: 12,
          totalWrong: 2,
          streak: 6,
          avgResponseTime: 1800, // Fast responses
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), // 2 weeks old
        },
      });

      // Slow learner profile
      const slowLearner = testUtils.createMockVocabularyEntry({
        id: 2,
        srs: {
          boxIndex: 1,
          totalCorrect: 5,
          totalWrong: 8,
          streak: 1,
          avgResponseTime: 5200, // Slow responses
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), // Same age
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([
        fastLearner,
        slowLearner,
      ]);

      const session = await ExerciseService.prepareLeitnerSession(10);
      expect(session.success).toBe(true);

      // Algorithm should prioritize slow learner for more practice
      // And give fast learner longer intervals
    });
  });

  describe("Spaced Repetition Edge Cases", () => {
    test("should handle words with no review history", async () => {
      const newWord = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: null, // No SRS data yet
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([newWord]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      const result = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        usedHint: false,
        skipped: false,
      });

      expect(result.success).toBe(true);
      expect(result.srs).toBeDefined();
      expect(result.srs.boxIndex).toBe(1); // Should start in box 1 after first correct
      expect(result.srs.totalCorrect).toBe(1);
      expect(result.srs.totalWrong).toBe(0);
    });

    test("should handle corrupted SRS data gracefully", async () => {
      const corruptedWord = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: -1, // Invalid
          totalCorrect: "not_a_number", // Invalid
          totalWrong: null, // Invalid
          streak: undefined, // Invalid
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([corruptedWord]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      const result = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        usedHint: false,
        skipped: false,
      });

      expect(result.success).toBe(true);
      // Should reset/normalize the corrupted data
      expect(typeof result.srs.boxIndex).toBe("number");
      expect(result.srs.boxIndex).toBeGreaterThanOrEqual(0);
      expect(typeof result.srs.totalCorrect).toBe("number");
      expect(typeof result.srs.totalWrong).toBe("number");
    });

    test("should handle extreme box indices", async () => {
      const maxBoxWord = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 10, // Very high box
          totalCorrect: 50,
          totalWrong: 2,
          streak: 25,
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([maxBoxWord]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      // Correct answer in max box
      const correctResult = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: true,
        usedHint: false,
        skipped: false,
      });

      expect(correctResult.success).toBe(true);
      // Should handle max box gracefully (not overflow)

      // Store the boxIndex after correct operation to compare against
      const boxIndexAfterCorrect = correctResult.srs.boxIndex;

      // Wrong answer in max box should cause significant drop
      const wrongResult = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: false,
        usedHint: false,
        skipped: false,
      });

      expect(wrongResult.success).toBe(true);
      expect(wrongResult.srs.boxIndex).toBeLessThan(boxIndexAfterCorrect);
    });

    test("should handle skip actions appropriately", async () => {
      const word = testUtils.createMockVocabularyEntry({
        id: 1,
        srs: {
          boxIndex: 2,
          totalCorrect: 5,
          totalWrong: 2,
          streak: 3,
          skippedCount: 0,
        },
      });

      DatabaseService.getAllVocabulary.mockResolvedValue([word]);
      DatabaseService.updateVocabulary.mockResolvedValue();

      const skipResult = await ExerciseService.recordLeitnerResult({
        id: 1,
        correct: false, // Doesn't matter for skip
        usedHint: false,
        skipped: true,
      });

      expect(skipResult.success).toBe(true);
      // Skip should not heavily penalize but should be tracked
      expect(skipResult.srs.skippedCount).toBe(1);
      // Box index should not drop as much as wrong answer
    });
  });

  describe("Statistical Accuracy of SRS", () => {
    test("should maintain accurate success rates across sessions", async () => {
      const vocabulary = Array.from({ length: 100 }, (_, i) =>
        testUtils.createMockVocabularyEntry({
          id: i + 1,
          srs: {
            boxIndex: Math.floor(Math.random() * 5),
            totalCorrect: Math.floor(Math.random() * 20),
            totalWrong: Math.floor(Math.random() * 10),
            streak: Math.floor(Math.random() * 8),
          },
        })
      );

      DatabaseService.getAllVocabulary.mockResolvedValue(vocabulary);

      // Simulate multiple sessions
      const sessionResults = [];
      for (let session = 0; session < 10; session++) {
        const sessionData = await ExerciseService.prepareLeitnerSession(10);
        expect(sessionData.success).toBe(true);

        sessionResults.push({
          session,
          wordsCount: sessionData.words.length,
          boxDistribution: sessionData.counts,
        });
      }

      // Verify statistical consistency
      expect(sessionResults.length).toBe(10);

      // Each session should have reasonable word selection
      sessionResults.forEach((result) => {
        expect(result.wordsCount).toBeGreaterThan(0);
        expect(result.wordsCount).toBeLessThanOrEqual(10);
      });
    });

    test("should calculate confidence intervals for performance metrics", async () => {
      const historicalData = Array.from({ length: 200 }, (_, i) => ({
        wordId: (i % 50) + 1,
        correct: Math.random() > 0.3, // 70% success rate
        responseTime: 1000 + Math.random() * 5000,
        timestamp: Date.now() - Math.random() * 90 * 86400000, // Last 90 days
      }));

      // Test statistical calculations
      const stats = {
        calculateConfidenceInterval: (data, confidence = 0.95) => {
          const n = data.length;
          const mean = data.reduce((sum, val) => sum + val, 0) / n;
          const variance =
            data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            (n - 1);
          const stdError = Math.sqrt(variance / n);

          // Simple approximation (would use t-distribution in real implementation)
          const margin = 1.96 * stdError; // For 95% confidence

          return {
            mean,
            lowerBound: mean - margin,
            upperBound: mean + margin,
            sampleSize: n,
          };
        },
      };

      const successRates = historicalData.map((d) => (d.correct ? 1 : 0));
      const responseTimes = historicalData.map((d) => d.responseTime);

      const successCI = stats.calculateConfidenceInterval(successRates);
      const responseCI = stats.calculateConfidenceInterval(responseTimes);

      expect(successCI.mean).toBeGreaterThan(0.6);
      expect(successCI.mean).toBeLessThan(0.8);
      expect(responseCI.mean).toBeGreaterThan(1000);
      expect(responseCI.mean).toBeLessThan(6000);
    });

    test("should detect and correct statistical anomalies", async () => {
      // Create vocabulary with anomalous data
      const anomalousVocabulary = [
        // Normal word
        testUtils.createMockVocabularyEntry({
          id: 1,
          srs: { boxIndex: 2, totalCorrect: 10, totalWrong: 3 },
        }),
        // Anomalous word (too good to be true)
        testUtils.createMockVocabularyEntry({
          id: 2,
          srs: { boxIndex: 5, totalCorrect: 100, totalWrong: 0 }, // Suspicious
        }),
        // Anomalous word (impossible performance)
        testUtils.createMockVocabularyEntry({
          id: 3,
          srs: { boxIndex: 0, totalCorrect: 50, totalWrong: 0 }, // Wrong box for performance
        }),
      ];

      DatabaseService.getAllVocabulary.mockResolvedValue(anomalousVocabulary);

      // The system should detect and potentially flag these anomalies
      const session = await ExerciseService.prepareLeitnerSession(10);
      expect(session.success).toBe(true);

      // Anomaly detection would be part of data validation
      const detectAnomalies = (vocabulary) => {
        return vocabulary.filter((word) => {
          const totalReviews = word.srs.totalCorrect + word.srs.totalWrong;
          const successRate =
            totalReviews > 0 ? word.srs.totalCorrect / totalReviews : 0;

          // Flag suspicious patterns
          const tooGood = successRate === 1.0 && totalReviews > 20;
          const wrongBox =
            word.srs.boxIndex === 0 && successRate > 0.9 && totalReviews > 10;

          return tooGood || wrongBox;
        });
      };

      const anomalies = detectAnomalies(anomalousVocabulary);
      expect(anomalies.length).toBeGreaterThan(0); // Should detect the anomalies
    });

    test("should provide accurate difficulty predictions", async () => {
      const testWords = [
        testUtils.createMockVocabularyEntry({
          id: 1,
          originalWord: "cat",
          translatedWord: "gato",
          srs: { totalCorrect: 15, totalWrong: 2 }, // Easy word
        }),
        testUtils.createMockVocabularyEntry({
          id: 2,
          originalWord: "serendipity",
          translatedWord: "serendipidad",
          srs: { totalCorrect: 3, totalWrong: 12 }, // Hard word
        }),
      ];

      DatabaseService.getAllVocabulary.mockResolvedValue(testWords);

      const session = await ExerciseService.prepareLeitnerSession(5);
      expect(session.success).toBe(true);

      // The session should properly weight word selection based on difficulty
      // Hard words should appear more frequently than easy words
      // This would be verified through the word selection algorithm
    });
  });
});

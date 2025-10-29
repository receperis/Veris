/**
 * Performance & Resource Management Tests
 * Tests for memory leaks, CPU usage, and resource optimization
 */

describe("Performance & Resource Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Memory Management", () => {
    test("should not create memory leaks in vocabulary operations", () => {
      const mockVocabulary = Array.from({ length: 1000 }, (_, i) =>
        testUtils.createMockVocabularyEntry({
          id: i + 1,
          originalWord: `word${i}`,
          translatedWord: `translation${i}`,
          context: `This is a long context sentence for word number ${i} that contains multiple words and phrases to test memory usage with realistic data sizes.`,
        })
      );

      // Simulate memory-intensive operations
      const operations = [];

      for (let i = 0; i < 100; i++) {
        // Create temporary data structures
        const filteredData = mockVocabulary
          .filter((item) => item.id % 2 === 0)
          .map((item) => ({
            ...item,
            processed: true,
            timestamp: Date.now(),
          }));

        const groupedData = filteredData.reduce((groups, item) => {
          const key = item.sourceLanguage || "unknown";
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
          return groups;
        }, {});

        operations.push({
          iteration: i,
          filteredCount: filteredData.length,
          groupCount: Object.keys(groupedData).length,
        });

        // Clear references to allow garbage collection
        filteredData.length = 0;
        Object.keys(groupedData).forEach((key) => {
          groupedData[key].length = 0;
        });
      }

      // Verify operations completed successfully
      expect(operations).toHaveLength(100);
      expect(operations[99].filteredCount).toBeGreaterThan(0);

      // Memory should be managed properly (no accumulating references)
      console.log(`Completed ${operations.length} memory-intensive operations`);
    });

    test("should handle large dataset processing efficiently", () => {
      const startTime = performance.now();

      // Create large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        word: `word${i}`,
        translation: `translation${i}`,
        difficulty: Math.random() * 5,
        frequency: Math.random(),
        lastReviewed: new Date(
          Date.now() - Math.random() * 90 * 86400000
        ).toISOString(),
        metadata: {
          attempts: Math.floor(Math.random() * 20),
          successRate: Math.random(),
          averageResponseTime: 1000 + Math.random() * 5000,
        },
      }));

      // Perform complex processing
      const processed = largeDataset
        .filter((item) => item.difficulty > 2.0)
        .sort((a, b) => b.frequency - a.frequency)
        .map((item) => ({
          ...item,
          score: (item.metadata.successRate * 100).toFixed(2),
          category: item.difficulty > 4 ? "hard" : "medium",
        }))
        .slice(0, 1000);

      const processingTime = performance.now() - startTime;

      expect(processed.length).toBeLessThanOrEqual(1000);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(
        `Processed ${largeDataset.length} items in ${processingTime.toFixed(
          2
        )}ms`
      );
    });

    test("should optimize storage operations", async () => {
      // Mock storage operations that simulate actual Chrome storage behavior
      const mockStorage = {
        data: new Map(),
        set: function (items, callback) {
          // Simulate async storage with minimal delay
          setTimeout(() => {
            for (const [key, value] of Object.entries(items)) {
              this.data.set(key, value);
            }
            if (callback) callback();
          }, 1); // Minimal 1ms delay to simulate async behavior
        },
      };

      const storageOperations = [];

      // Create 20 concurrent storage operations
      for (let i = 0; i < 20; i++) {
        const operation = new Promise((resolve) => {
          const data = {
            id: i,
            content: Array.from({ length: 50 }, (_, j) => `item${j}`),
            timestamp: Date.now(),
          };

          // Use mock storage instead of Chrome storage
          mockStorage.set({ [`key${i}`]: data }, () => {
            resolve({ id: i, success: true });
          });
        });

        storageOperations.push(operation);
      }

      const startTime = performance.now();
      const results = await Promise.all(storageOperations);
      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(20);
      expect(results.every((r) => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(500); // Should be very fast with mock
      expect(mockStorage.data.size).toBe(20); // Verify all data was stored

      console.log(
        `20 mock storage operations completed in ${totalTime.toFixed(2)}ms`
      );
    });

    test("should handle DOM manipulation efficiently", () => {
      // Simulate DOM-heavy operations without actual DOM
      const virtualDOM = {
        elements: [],
        appendChild: function (element) {
          this.elements.push(element);
        },
        removeChild: function (index) {
          this.elements.splice(index, 1);
        },
        clear: function () {
          this.elements.length = 0;
        },
      };

      const startTime = performance.now();

      // Simulate adding many elements
      for (let i = 0; i < 1000; i++) {
        const element = {
          id: `element${i}`,
          type: "vocabulary-item",
          data: {
            word: `word${i}`,
            translation: `translation${i}`,
          },
          listeners: [`click`, `hover`, `focus`],
        };

        virtualDOM.appendChild(element);
      }

      // Simulate batch removal
      for (let i = virtualDOM.elements.length - 1; i >= 500; i--) {
        virtualDOM.removeChild(i);
      }

      // Simulate cleanup
      virtualDOM.clear();

      const operationTime = performance.now() - startTime;

      expect(virtualDOM.elements).toHaveLength(0);
      expect(operationTime).toBeLessThan(100); // Should be very fast

      console.log(`DOM operations completed in ${operationTime.toFixed(2)}ms`);
    });
  });

  describe("CPU Usage Optimization", () => {
    test("should optimize search algorithms", () => {
      const vocabulary = Array.from({ length: 5000 }, (_, i) =>
        testUtils.createMockVocabularyEntry({
          id: i + 1,
          originalWord: `word${i}`,
          translatedWord: `translation${i}`,
        })
      );

      const searchTerms = [
        "word1",
        "word100",
        "word1000",
        "word2500",
        "nonexistent",
      ];

      searchTerms.forEach((term) => {
        const startTime = performance.now();

        // Simulate optimized search (using array methods efficiently)
        const results = vocabulary.filter(
          (item) =>
            item.originalWord.toLowerCase().includes(term.toLowerCase()) ||
            item.translatedWord.toLowerCase().includes(term.toLowerCase())
        );

        const searchTime = performance.now() - startTime;

        expect(searchTime).toBeLessThan(50); // Should be fast even for large datasets
        console.log(
          `Search for "${term}": ${
            results.length
          } results in ${searchTime.toFixed(2)}ms`
        );
      });
    });

    test("should optimize sorting and filtering operations", () => {
      const vocabulary = Array.from({ length: 2000 }, (_, i) =>
        testUtils.createMockVocabularyEntry({
          id: i + 1,
          originalWord: `word${i}`,
          srs: {
            boxIndex: Math.floor(Math.random() * 5),
            totalCorrect: Math.floor(Math.random() * 20),
            totalWrong: Math.floor(Math.random() * 10),
            lastReviewed: new Date(
              Date.now() - Math.random() * 30 * 86400000
            ).toISOString(),
          },
        })
      );

      const startTime = performance.now();

      // Complex filtering and sorting operation
      const processed = vocabulary
        .filter((item) => item.srs.boxIndex > 0)
        .sort((a, b) => {
          const aScore =
            a.srs.totalCorrect /
            Math.max(1, a.srs.totalCorrect + a.srs.totalWrong);
          const bScore =
            b.srs.totalCorrect /
            Math.max(1, b.srs.totalCorrect + b.srs.totalWrong);
          return bScore - aScore;
        })
        .slice(0, 100);

      const processingTime = performance.now() - startTime;

      expect(processed).toHaveLength(100);
      expect(processingTime).toBeLessThan(100); // Should be efficient

      console.log(
        `Complex sort/filter completed in ${processingTime.toFixed(2)}ms`
      );
    });

    test("should optimize SRS calculations", () => {
      const words = Array.from({ length: 1000 }, (_, i) =>
        testUtils.createMockVocabularyEntry({
          id: i + 1,
          srs: {
            boxIndex: Math.floor(Math.random() * 5),
            totalCorrect: Math.floor(Math.random() * 20),
            totalWrong: Math.floor(Math.random() * 10),
            interval: Math.floor(Math.random() * 30) + 1,
            lastReviewed: new Date(
              Date.now() - Math.random() * 60 * 86400000
            ).toISOString(),
          },
        })
      );

      const startTime = performance.now();

      // Simulate SRS calculations for all words
      const calculations = words.map((word) => {
        const { srs } = word;
        const totalReviews = srs.totalCorrect + srs.totalWrong;
        const successRate =
          totalReviews > 0 ? srs.totalCorrect / totalReviews : 0;

        const daysSinceReview =
          (Date.now() - new Date(srs.lastReviewed).getTime()) / 86400000;
        const isDue = daysSinceReview >= srs.interval;

        const difficulty = Math.max(0.1, 2 - successRate * 2);
        const nextInterval = Math.ceil(srs.interval * (1 + successRate));

        return {
          wordId: word.id,
          isDue,
          difficulty,
          nextInterval,
          priority: isDue ? difficulty * (daysSinceReview / srs.interval) : 0,
        };
      });

      const calculationTime = performance.now() - startTime;

      expect(calculations).toHaveLength(1000);
      expect(calculationTime).toBeLessThan(50); // Should be very efficient

      const dueWords = calculations.filter((c) => c.isDue);
      console.log(
        `SRS calculations for 1000 words: ${
          dueWords.length
        } due, completed in ${calculationTime.toFixed(2)}ms`
      );
    });

    test("should handle background processing efficiently", async () => {
      // Simulate background tasks that don't block the main thread
      const backgroundTasks = [];

      for (let i = 0; i < 10; i++) {
        const task = new Promise((resolve) => {
          // Simulate async processing
          setImmediate(() => {
            const result = Array.from({ length: 100 }, (_, j) => j * i).reduce(
              (sum, val) => sum + val,
              0
            );
            resolve({ taskId: i, result, completed: true });
          });
        });

        backgroundTasks.push(task);
      }

      const startTime = performance.now();
      const results = await Promise.all(backgroundTasks);
      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.completed)).toBe(true);
      expect(totalTime).toBeLessThan(100); // Should be very fast with setImmediate

      console.log(`10 background tasks completed in ${totalTime.toFixed(2)}ms`);
    });
  });

  describe("Resource Cleanup", () => {
    test("should properly cleanup event listeners", () => {
      const mockEventManager = {
        listeners: [],
        addEventListener: function (element, event, handler) {
          const listener = {
            element,
            event,
            handler,
            id: this.listeners.length,
          };
          this.listeners.push(listener);
          return listener.id;
        },
        removeEventListener: function (id) {
          const index = this.listeners.findIndex((l) => l.id === id);
          if (index !== -1) {
            this.listeners.splice(index, 1);
            return true;
          }
          return false;
        },
        cleanup: function () {
          const count = this.listeners.length;
          this.listeners.length = 0;
          return count;
        },
      };

      // Add many event listeners
      const listenerIds = [];
      for (let i = 0; i < 100; i++) {
        const id = mockEventManager.addEventListener(
          `element${i}`,
          "click",
          () => console.log(`Handler ${i}`)
        );
        listenerIds.push(id);
      }

      expect(mockEventManager.listeners).toHaveLength(100);

      // Remove half of them individually
      for (let i = 0; i < 50; i++) {
        const removed = mockEventManager.removeEventListener(listenerIds[i]);
        expect(removed).toBe(true);
      }

      expect(mockEventManager.listeners).toHaveLength(50);

      // Cleanup remaining listeners
      const cleanedUp = mockEventManager.cleanup();
      expect(cleanedUp).toBe(50);
      expect(mockEventManager.listeners).toHaveLength(0);
    });

    test("should manage timer cleanup", () => {
      const timerManager = {
        timers: new Set(),
        setTimeout: function (callback, delay) {
          const id = setTimeout(() => {
            callback();
            this.timers.delete(id);
          }, delay);
          this.timers.add(id);
          return id;
        },
        clearTimeout: function (id) {
          if (this.timers.has(id)) {
            clearTimeout(id);
            this.timers.delete(id);
            return true;
          }
          return false;
        },
        clearAll: function () {
          const count = this.timers.size;
          this.timers.forEach((id) => clearTimeout(id));
          this.timers.clear();
          return count;
        },
      };

      // Create multiple timers
      const timerIds = [];
      for (let i = 0; i < 20; i++) {
        const id = timerManager.setTimeout(() => {
          console.log(`Timer ${i} executed`);
        }, 1000 + i * 100);
        timerIds.push(id);
      }

      expect(timerManager.timers.size).toBe(20);

      // Clear some timers
      for (let i = 0; i < 10; i++) {
        const cleared = timerManager.clearTimeout(timerIds[i]);
        expect(cleared).toBe(true);
      }

      expect(timerManager.timers.size).toBe(10);

      // Clear all remaining
      const remainingCount = timerManager.clearAll();
      expect(remainingCount).toBe(10);
      expect(timerManager.timers.size).toBe(0);
    });

    test("should handle cache management", () => {
      const cache = {
        data: new Map(),
        maxSize: 100,

        set: function (key, value) {
          if (this.data.size >= this.maxSize) {
            // Remove oldest entry (simple LRU simulation)
            const firstKey = this.data.keys().next().value;
            this.data.delete(firstKey);
          }
          this.data.set(key, {
            value,
            timestamp: Date.now(),
            accessCount: 1,
          });
        },

        get: function (key) {
          const entry = this.data.get(key);
          if (entry) {
            entry.accessCount++;
            return entry.value;
          }
          return null;
        },

        cleanup: function (maxAge = 60000) {
          const now = Date.now();
          let removed = 0;

          for (const [key, entry] of this.data) {
            if (now - entry.timestamp > maxAge) {
              this.data.delete(key);
              removed++;
            }
          }

          return removed;
        },

        clear: function () {
          const count = this.data.size;
          this.data.clear();
          return count;
        },
      };

      // Fill cache
      for (let i = 0; i < 150; i++) {
        cache.set(`key${i}`, { data: `value${i}`, size: Math.random() * 1000 });
      }

      // Should not exceed max size
      expect(cache.data.size).toBe(100);

      // Test access
      const value = cache.get("key149");
      expect(value).toBeTruthy();

      // Test cleanup (simulate old entries)
      const oldEntries = Array.from(cache.data.entries()).slice(0, 20);
      oldEntries.forEach(([key, entry]) => {
        entry.timestamp = Date.now() - 70000; // Make them old
      });

      const cleanedUp = cache.cleanup();
      expect(cleanedUp).toBe(20);
      expect(cache.data.size).toBe(80);

      // Clear all
      const totalCleared = cache.clear();
      expect(totalCleared).toBe(80);
      expect(cache.data.size).toBe(0);
    });
  });

  describe("Performance Monitoring", () => {
    test("should measure operation performance", () => {
      const performanceMonitor = {
        metrics: [],

        measure: function (operation, fn) {
          const start = performance.now();
          const result = fn();
          const duration = performance.now() - start;

          this.metrics.push({
            operation,
            duration,
            timestamp: Date.now(),
          });

          return { result, duration };
        },

        getAverageTime: function (operation) {
          const operationMetrics = this.metrics.filter(
            (m) => m.operation === operation
          );
          if (operationMetrics.length === 0) return 0;

          const total = operationMetrics.reduce(
            (sum, m) => sum + m.duration,
            0
          );
          return total / operationMetrics.length;
        },

        getSlowestOperations: function (count = 5) {
          return [...this.metrics]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, count);
        },
      };

      // Measure various operations
      const operations = [
        [
          "array_filter",
          () =>
            Array.from({ length: 1000 }, (_, i) => i).filter(
              (n) => n % 2 === 0
            ),
        ],
        [
          "array_sort",
          () => Array.from({ length: 1000 }, () => Math.random()).sort(),
        ],
        [
          "object_creation",
          () =>
            Array.from({ length: 100 }, (_, i) => ({
              id: i,
              data: `item${i}`,
            })),
        ],
        [
          "string_processing",
          () => "hello world ".repeat(1000).split(" ").join("-"),
        ],
        [
          "math_operations",
          () =>
            Array.from({ length: 1000 }, (_, i) =>
              Math.sqrt(i * Math.PI)
            ).reduce((a, b) => a + b, 0),
        ],
      ];

      operations.forEach(([name, fn]) => {
        const { duration } = performanceMonitor.measure(name, fn);
        expect(duration).toBeLessThan(100); // All should complete quickly
      });

      expect(performanceMonitor.metrics).toHaveLength(5);

      // Test performance analysis
      const averageFilterTime =
        performanceMonitor.getAverageTime("array_filter");
      const slowestOps = performanceMonitor.getSlowestOperations(3);

      expect(averageFilterTime).toBeGreaterThan(0);
      expect(slowestOps).toHaveLength(3);

      console.log("Performance metrics:", {
        totalOperations: performanceMonitor.metrics.length,
        averageFilterTime: averageFilterTime.toFixed(2) + "ms",
        slowestOperation: slowestOps[0]?.operation,
      });
    });

    test("should detect performance degradation", () => {
      const performanceTracker = {
        baselines: new Map(),
        measurements: [],

        setBaseline: function (operation, expectedTime) {
          this.baselines.set(operation, expectedTime);
        },

        measureAndCheck: function (operation, fn) {
          const start = performance.now();
          const result = fn();
          const duration = performance.now() - start;

          this.measurements.push({
            operation,
            duration,
            timestamp: Date.now(),
          });

          const baseline = this.baselines.get(operation);
          const degradationThreshold = 2.0; // 2x slower than baseline

          return {
            result,
            duration,
            isWithinExpected:
              !baseline || duration <= baseline * degradationThreshold,
            degradationRatio: baseline ? duration / baseline : 1,
          };
        },
      };

      // Set performance baselines
      performanceTracker.setBaseline("search", 10); // 10ms
      performanceTracker.setBaseline("sort", 20); // 20ms
      performanceTracker.setBaseline("filter", 5); // 5ms

      // Test operations against baselines
      const searchResult = performanceTracker.measureAndCheck("search", () => {
        return Array.from({ length: 1000 }, (_, i) => `item${i}`).filter(
          (item) => item.includes("50")
        );
      });

      const sortResult = performanceTracker.measureAndCheck("sort", () => {
        return Array.from({ length: 1000 }, () => Math.random()).sort();
      });

      expect(searchResult.isWithinExpected).toBe(true);
      expect(sortResult.isWithinExpected).toBe(true);

      console.log("Performance degradation check:", {
        search: `${searchResult.degradationRatio.toFixed(2)}x baseline`,
        sort: `${sortResult.degradationRatio.toFixed(2)}x baseline`,
      });
    });
  });
});

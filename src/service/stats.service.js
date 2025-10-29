/* Stats Service - Handles vocabulary statistics and analytics */

// Service works with importScripts - no import needed, DatabaseService is global

const StatsService = (() => {
  const { error } = createLogger("[StatsService]");

  // Default stats object
  const defaultStats = {
    totalWords: 0,
    uniqueWords: 0,
    lastExercise: null,
    exercisesCompleted: 0,
    averageScore: 0,
    totalScore: 0,
  };

  return {
    async updateVocabularyStats() {
      try {
        const dbStats = await DatabaseService.getStats();
        const result = await chrome.storage.local.get(["vocabularyStats"]);
        const exerciseStats = result.vocabularyStats || {};

        const combinedStats = {
          totalWords: dbStats?.totalEntries || 0,
          uniqueWords: dbStats?.uniqueWords || 0,
          lastExercise: exerciseStats.lastExercise,
          exercisesCompleted: exerciseStats.exercisesCompleted || 0,
          averageScore: exerciseStats.averageScore || 0,
          totalScore: exerciseStats.totalScore || 0,
        };

        await chrome.storage.local.set({ vocabularyStats: combinedStats });
        return combinedStats;
      } catch (e) {
        error("updateVocabularyStats", e);
        return defaultStats;
      }
    },

    async getDetailedStats() {
      try {
        const [dbStats, storageResult] = await Promise.all([
          DatabaseService.getStats(),
          chrome.storage.local.get(["vocabularyStats"]),
        ]);

        return {
          database: dbStats,
          exercises: storageResult.vocabularyStats || {},
          combined: await this.updateVocabularyStats(),
        };
      } catch (e) {
        error("getDetailedStats", e);
        return null;
      }
    },
  };
})();

self.StatsService = StatsService;

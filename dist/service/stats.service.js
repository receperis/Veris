/* Stats Service - Handles vocabulary statistics and analytics */

// Service works with importScripts - no import needed, DatabaseService is global

const StatsService = {
  async updateVocabularyStats() {
    try {
      // Get real stats from IndexedDB
      const dbStats = await DatabaseService.getStats();
      
      // Get exercise stats from storage
      const result = await chrome.storage.local.get(['vocabularyStats']);
      let exerciseStats = result.vocabularyStats || {
        lastExercise: null,
        exercisesCompleted: 0,
        averageScore: 0,
        totalScore: 0
      };
      
      // Combine database stats with exercise stats
      const combinedStats = {
        totalWords: dbStats ? dbStats.totalEntries : 0,
        uniqueWords: dbStats ? dbStats.uniqueWords : 0,
        lastExercise: exerciseStats.lastExercise,
        exercisesCompleted: exerciseStats.exercisesCompleted,
        averageScore: exerciseStats.averageScore,
        totalScore: exerciseStats.totalScore
      };
      
      // Update storage with current vocabulary count
      await chrome.storage.local.set({ vocabularyStats: combinedStats });
      
      return combinedStats;
    } catch (error) {
      console.error('Error updating vocabulary stats:', error);
      return {
        totalWords: 0,
        uniqueWords: 0,
        lastExercise: null,
        exercisesCompleted: 0,
        averageScore: 0,
        totalScore: 0
      };
    }
  },

  async getDetailedStats() {
    try {
      const dbStats = await DatabaseService.getStats();
      const storageResult = await chrome.storage.local.get(['vocabularyStats']);
      const exerciseStats = storageResult.vocabularyStats || {};
      
      return {
        database: dbStats,
        exercises: exerciseStats,
        combined: await this.updateVocabularyStats()
      };
    } catch (error) {
      console.error('Error getting detailed stats:', error);
      return null;
    }
  }
};
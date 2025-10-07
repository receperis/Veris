/* Message Service - Handles all Chrome runtime message communication */

// Service works with importScripts - no import needed
// DatabaseService, ExerciseService, StatsService, and NotificationService are globally available

const MessageService = {
  // Main message handler
  async handleMessage(request, sender, sendResponse) {
    try {
      // Handle vocabulary database operations
      if (request.type === "SAVE_VOCABULARY") {
        const result = await DatabaseService.saveVocabulary(request.data);
        sendResponse({ success: true, id: result });
        return true;
      }

      if (request.type === "GET_ALL_VOCABULARY") {
        const result = await DatabaseService.getAllVocabulary();
        sendResponse({ success: true, data: result });
        return true;
      }

      if (request.type === "GET_VOCABULARY_STATS") {
        const result = await DatabaseService.getStats();
        sendResponse({ success: true, stats: result });
        return true;
      }

      if (request.type === "GET_RANDOM_WORDS") {
        const { count = 10, difficulty = "mixed" } = request.data || {};
        const result = await DatabaseService.getRandomWords(count, difficulty);
        sendResponse({ success: true, words: result });
        return true;
      }

      // Leitner session preparation
      if (request.type === "PREPARE_LEITNER_SESSION") {
        const { limit = 10, selectedLanguage = null } = request.data || {};
        const result = await ExerciseService.prepareLeitnerSession(
          limit,
          selectedLanguage
        );
        sendResponse(result);
        return true;
      }

      if (request.type === "WORD_RESULT") {
        const res = await ExerciseService.recordLeitnerResult(request.data);
        sendResponse(res);
        return true;
      }

      if (request.type === "DELETE_VOCABULARY") {
        await DatabaseService.deleteVocabulary(request.data.id);
        sendResponse({ success: true });
        return true;
      }

      if (request.type === "DELETE_ALL_VOCABULARY") {
        const result = await DatabaseService.deleteAllVocabulary();
        sendResponse({ success: true, deletedCount: result });
        return true;
      }

      if (request.type === "UPDATE_VOCABULARY") {
        const result = await DatabaseService.updateVocabulary(
          request.data.id,
          request.data.updates
        );
        sendResponse({ success: true, id: result });
        return true;
      }

      if (request.type === "GET_WORDS_BY_LANGUAGE") {
        const result = await DatabaseService.getWordsByLanguage(
          request.data.sourceLanguage,
          request.data.targetLanguage
        );
        sendResponse({ success: true, words: result });
        return true;
      }

      if (request.type === "GET_WORDS_BY_DOMAIN") {
        const result = await DatabaseService.getWordsByDomain(
          request.data.domain
        );
        sendResponse({ success: true, words: result });
        return true;
      }

      // Handle stats updates
      if (
        request.type === "UPDATE_VOCABULARY_STATS" ||
        request.type === "UPDATE_STATS"
      ) {
        const stats = await StatsService.updateVocabularyStats();
        sendResponse({ success: true, stats });
        return true;
      }

      if (request.type === "GET_DETAILED_STATS") {
        const stats = await StatsService.getDetailedStats();
        sendResponse({ success: true, data: stats });
        return true;
      }

      if (request.type === "CHECK_EXERCISE_TIME") {
        const isExerciseTime = await ExerciseService.isExerciseTime();
        sendResponse({ isExerciseTime });
        return true;
      }

      // Handle exercise operations
      if (request.type === "EXERCISE_COMPLETED") {
        await ExerciseService.handleExerciseCompleted(request.data);
        sendResponse({ success: true });
        return true;
      }

      if (request.type === "UPDATE_EXERCISE_SETTINGS") {
        await ExerciseService.setupDailyAlarm();
        sendResponse({ success: true });
        return true;
      }

      // Handle notification testing
      if (request.type === "TEST_NOTIFICATION") {
        const result = await NotificationService.testNotification();
        sendResponse({ success: result });
        return true;
      }

      if (request.type === "TEST_DAILY_NOTIFICATION") {
        const result =
          await NotificationService.sendDailyExerciseNotification();
        sendResponse({ success: result });
        return true;
      }

      // Handle language-related operations
      if (request.type === "GET_AVAILABLE_LANGUAGES") {
        const result = await ExerciseService.getAvailableLanguages();
        sendResponse(result);
        return true;
      }

      if (request.type === "GET_DUE_COUNT_BY_LANGUAGE") {
        const { selectedLanguage = null } = request.data || {};
        const count = await ExerciseService.getDueCountByLanguage(
          selectedLanguage
        );
        sendResponse({ success: true, count });
        return true;
      }

      // Handle page language detection requests
      if (request.type === "DETECT_PAGE_LANGUAGE") {
        try {
          // Get the active tab or the sender's tab
          const tabId = sender.tab?.id;
          if (!tabId) {
            sendResponse({ ok: false, error: "No tab information available" });
            return true;
          }

          // Detect language for the specific tab
          chrome.tabs.detectLanguage(tabId, (language) => {
            if (chrome.runtime.lastError) {
              console.warn('Language detection error:', chrome.runtime.lastError.message);
              sendResponse({ ok: false, error: chrome.runtime.lastError.message });
            } else if (language && language !== 'und') {
              // Store the detected language for future use
              chrome.storage.sync.set({ sourceLanguage: language }, () => {
                sendResponse({ ok: true, language: language });
              });
            } else {
              // If language detection returns 'und' (undetermined) or null, fallback
              sendResponse({ ok: false, error: "Language could not be determined" });
            }
          });
          return true; // Will respond asynchronously
        } catch (error) {
          console.error("Error in language detection:", error);
          sendResponse({ ok: false, error: error.message });
          return true;
        }
      }

      // Unknown message type
      sendResponse({ success: false, error: "Try refreshing the page" });
      return false;
    } catch (error) {
      console.error("Error handling message:", request.type, error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  },

  // Setup message listener
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Will respond asynchronously
    });
  },
};

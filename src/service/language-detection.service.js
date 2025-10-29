/**
 * Language Detection Service for Service Worker
 * Provides language detection functionality compatible with service workers (no ES modules)
 */

const LanguageDetectionService = (() => {
  /**
   * Detect language for a specific tab and store it
   * @param {number} tabId - Chrome tab ID
   * @param {Function} callback - Optional callback for success/error
   */
  function detectAndStore(tabId, callback = null) {
    chrome.tabs.detectLanguage(tabId, (language) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Language detection error:",
          chrome.runtime.lastError.message
        );
        if (callback) callback(null, chrome.runtime.lastError);
      } else if (language && language !== "und") {
        chrome.storage.sync.set({ sourceLanguage: language }, () => {
          if (chrome.runtime.lastError) {
            console.error("Persist error:", chrome.runtime.lastError.message);
            if (callback) callback(null, chrome.runtime.lastError);
          } else {
            console.log(
              `Language detected and stored: ${language} for tab ${tabId}`
            );
            if (callback) callback(language, null);
          }
        });
      } else {
        console.log(
          `Language detection returned: ${language} (undetermined) for tab ${tabId}`
        );
        if (callback) callback(null, new Error("Language undetermined"));
      }
    });
  }

  /**
   * Set up automatic language detection on tab events
   * @param {number} delayMs - Delay before detection (default 500ms)
   */
  function setupAutoDetection(delayMs = 500) {
    // Detect language when tab is updated
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (
        changeInfo.status === "complete" &&
        tab.url &&
        !tab.url.startsWith("chrome://")
      ) {
        setTimeout(() => {
          detectAndStore(tabId);
        }, delayMs);
      }
    });

    // Detect language when tab becomes active
    chrome.tabs.onActivated.addListener((activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError) return;

        if (
          tab.url &&
          !tab.url.startsWith("chrome://") &&
          tab.status === "complete"
        ) {
          detectAndStore(activeInfo.tabId);
        }
      });
    });
  }

  return {
    detectAndStore,
    setupAutoDetection,
  };
})();

// Make available globally for service worker
self.LanguageDetectionService = LanguageDetectionService;
